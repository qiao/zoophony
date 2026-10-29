/**
 * Measures the loudness of each demo at the output of the app (design 6.8).
 *
 * Usage: `pnpm loudness [--mix <name>] [--demo <id>]... [--fit] [--target <LUFS>]... [--json]
 * [--check]`
 *
 * For each demo (all demos by default), it renders the synth output in Node with the
 * `SynthEngine`, the SoundFont of design 6.2, the room of the synth, and the stage mix of the
 * layout, as the app and its worklet do. Then the code of `src/audio/output-chain.ts` runs in an
 * `OfflineAudioContext` of headless Chromium, with the mix bus of the mix preset, its hall
 * impulse response, the glue compressor, the limiter, and their trims. The input gain is
 * `SOUNDFONT_HEADROOM_DB` plus `pieceGainDb()`, as in the `Player`. The render has the full song
 * and 3 s of tail, at 48 kHz.
 *
 * Each row gives the integrated loudness and the loudness range (ITU-R BS.1770-4, EBU Tech 3342),
 * the true peak, the median short-term loudness of the first 30 s, the share of the song with a
 * short-term loudness below -30 LUFS, the gain reduction of the glue compressor (its 95th
 * percentile and its highest value in a block of 50 ms), and the gain reduction of the limiter
 * (its highest value, and the share of the blocks above 1 dB and 3 dB).
 *
 * - `--mix <name>` selects the mix preset of `MIX_BUSES`: `hall` (the default) or `cinematic`.
 * - `--fit` finds the piece gain that brings each demo within 0.05 LU of `TARGET_LOUDNESS`, in
 *   steps of 0.1 dB, and gives the value for `DEMO_LOUDNESS`: the target minus that gain.
 * - `--target <LUFS>` fits to this target in place of `TARGET_LOUDNESS`. Each target gives one
 *   row for each demo, from one synth render.
 * - `--json` prints one JSON object for each demo, with the short-term loudness at each second.
 * - `--check` exits with 1 when a demo at the gain of `pieceGainDb()` is more than 0.5 LU from
 *   `TARGET_LOUDNESS`, or has a true peak above -1 dBTP. Run it for each mix preset after a
 *   change of a demo file, the SoundFont, the mix, the mix bus, the hall, or the limiter.
 *
 * The page server listens on a free port that the system gives. A run of all demos takes about
 * 5 minutes. The renders are deterministic, so two runs give the same numbers.
 */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { stripTypeScriptTypes } from 'node:module';
import { join } from 'node:path';

import { chromium } from '@playwright/test';
import type { Browser } from '@playwright/test';

import { DEMO_IDS, isDemoId } from '../src/app/demos.ts';
import type { DemoId } from '../src/app/demos.ts';
import { DEFAULT_MIX, isMixName } from '../src/app/mix-query.ts';
import { TARGET_LOUDNESS, pieceGainDb } from '../src/audio/demo-loudness.ts';
import type { MixName } from '../src/audio/output-chain.ts';
import { SOUNDFONT_HEADROOM_DB } from '../src/audio/soundfont-info.ts';
import { packSynthEvents } from '../src/audio/synth-events.ts';
import { OfflineHarness, TEST_SAMPLE_RATE, testBanks } from '../src/audio/test-banks.ts';
import { layoutScene } from '../src/models/layout-scene.ts';
import { ModelCache } from '../src/models/model-cache.ts';
import { buildScore } from '../src/score/score.ts';
import { channelGainsDb, mixSynthEvents, stageMix } from '../src/score/stage-mix.ts';
import {
  METER_RATE,
  QUIET_LUFS,
  gainReduction,
  measureLoudness,
  medianShortTerm,
  shareBelow,
} from './loudness-meter.ts';
import type { GainReduction, Loudness, Stereo } from './loudness-meter.ts';
import { patchedDemos } from './patch-demos.ts';
import { ROOT } from './ref-tree.ts';

/** The tail after the song end in seconds, for the release of the notes and the hall. */
const TAIL_SEC = 3;

/** The length of the start that the start column measures, in seconds. */
const START_SEC = 30;

/** The largest error of a fit in LU. */
const FIT_TOLERANCE = 0.05;

/** The most chain renders of one fit. */
const FIT_STEPS = 6;

/** The largest distance of a demo from the target in LU for `--check`. */
const CHECK_TOLERANCE = 0.5;

/** The highest true peak of a demo in dBTP for `--check` (EBU R 128). */
const CHECK_TRUE_PEAK = -1;

/** The synth output of one demo and its song length. */
export interface SynthRender {
  /** The stereo output of the synth at 48 kHz, with the tail. */
  readonly audio: Stereo;
  /** The song length in seconds. */
  readonly durationSec: number;
}

/** The output of the chain: the output of the app, and the inputs of the limiter and the glue. */
interface ChainRender {
  /** The output of the volume gain. */
  readonly output: Stereo;
  /** The output of the glue compressor after its trim. */
  readonly limiterInput: Stereo;
  /** The output of the tone EQ. */
  readonly glueInput: Stereo;
  /** The time of `startRendering()` in ms. */
  readonly renderMs: number;
}

/** The measures of one demo at one piece gain. */
interface Row {
  readonly demo: DemoId;
  /** The target of a fit in LUFS, or `null` for the gain of `pieceGainDb()`. */
  readonly target: number | null;
  readonly gainDb: number;
  /** The value for `DEMO_LOUDNESS` at the target, or `null` with no fit. */
  readonly tableValue: number | null;
  readonly loudness: Loudness;
  /** The median short-term loudness of the first {@link START_SEC} s in LUFS. */
  readonly start: number;
  /** The share of the song with a short-term loudness below {@link QUIET_LUFS}. */
  readonly quiet: number;
  /** The gain reduction of the limiter. */
  readonly reduction: GainReduction;
  /** The gain reduction of the glue compressor. */
  readonly glue: GainReduction;
  /** The time of the chain render in ms. */
  readonly renderMs: number;
}

/**
 * Renders the synth output of a demo as the worklet does, with the stage mix of design 6.1 and
 * the section size "Auto".
 *
 * @param demo The demo.
 * @returns The stereo output of the synth, before the output chain, and the song length.
 * @throws Error if the demo file does not give a score.
 */
export async function renderSynth(demo: DemoId): Promise<SynthRender> {
  const file = (await patchedDemos()).find((item) => item.file === `${demo}.mid`);
  if (!file) {
    throw new Error(`The demo file ${demo}.mid does not exist.`);
  }
  const result = buildScore(file.bytes, 'auto');
  if (!result.ok) {
    throw new Error(result.error);
  }
  const score = result.score;
  const mix = stageMix(score, layoutScene(score, new ModelCache()));
  const run = new OfflineHarness(
    packSynthEvents(mixSynthEvents(score.synthEvents, mix)),
    score.durationSec,
    await testBanks(score.presets),
    channelGainsDb(mix),
  );
  run.engine.enqueue({ type: 'play', countInSec: 0 });

  const block = 128;
  const frames = Math.ceil(((score.durationSec + TAIL_SEC) * TEST_SAMPLE_RATE) / block) * block;
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  const l = new Float32Array(block);
  const r = new Float32Array(block);
  for (let frame = 0; frame < frames; frame += block) {
    l.fill(0);
    r.fill(0);
    run.engine.render(frame / TEST_SAMPLE_RATE, l, r);
    left.set(l, frame);
    right.set(r, frame);
  }
  return { audio: { left, right }, durationSec: score.durationSec };
}

/**
 * Gives the JavaScript of `src/audio/output-chain.ts` for the page: the types removed, and each
 * URL import of Vite replaced by the route of its file in `assets/hall/`.
 *
 * @returns The module text.
 */
function chainModule(): string {
  const source = readFileSync(join(ROOT, 'src/audio/output-chain.ts'), 'utf8').replaceAll(
    /^import (\w+Url) from '\.\.\/\.\.\/assets\/hall\/([\w.-]+)\?url';$/gm,
    `const $1 = '/hall/$2';`,
  );
  return stripTypeScriptTypes(source);
}

/**
 * Reads the body of a request.
 *
 * @param request The request.
 * @returns The bytes.
 */
async function bodyOf(request: IncomingMessage): Promise<Buffer> {
  const parts: Buffer[] = [];
  for await (const part of request) {
    // SAFETY: a request with no encoding gives Buffer chunks.
    parts.push(part as Buffer);
  }
  return Buffer.concat(parts);
}

/** The headless browser of the chain, for all demos of a run. */
let browser: Browser | undefined;

/**
 * Sends a synth output through the output chain of the app in an `OfflineAudioContext`. The
 * page gets the six channels of the destination: the output of the volume gain, the input of the
 * limiter, and the input of the glue compressor.
 *
 * @param input The synth output at 48 kHz.
 * @param inputDb The gain of the input node in dB.
 * @param mix The mix preset.
 * @returns The output of the chain and the inputs of the limiter and the glue.
 */
async function renderChain(input: Stereo, inputDb: number, mix: MixName): Promise<ChainRender> {
  const frames = input.left.length;
  const interleaved = new Float32Array(frames * 2);
  for (let i = 0; i < frames; i++) {
    interleaved[2 * i] = input.left[i] ?? 0;
    interleaved[2 * i + 1] = input.right[i] ?? 0;
  }
  const rendered = new Float32Array(frames * 6);
  const module = chainModule();

  const serve = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/') {
      response.setHeader('content-type', 'text/html');
      response.end('<!doctype html><title>loudness</title>');
    } else if (url.pathname === '/chain.js') {
      response.setHeader('content-type', 'text/javascript');
      response.end(module);
    } else if (url.pathname === '/in.f32') {
      response.end(Buffer.from(interleaved.buffer));
    } else if (/^\/hall\/[\w-]+\.(wav|flac)$/.test(url.pathname)) {
      response.end(readFileSync(join(ROOT, 'assets', url.pathname)));
    } else if (url.pathname === '/out') {
      const body = await bodyOf(request);
      const values = new Float32Array(new Uint8Array(body).buffer);
      rendered.set(values, Number(url.searchParams.get('offset')));
      response.end('ok');
    } else {
      response.statusCode = 404;
      response.end();
    }
  };
  const server = createServer((request, response) => void serve(request, response));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = address instanceof Object ? address.port : 0;

  browser ??= await chromium.launch();
  const page = await browser.newPage();
  let renderMs = 0;
  try {
    page.on('console', (message) => console.error(message.text()));
    await page.goto(`http://127.0.0.1:${port}/`);
    renderMs = await page.evaluate(
      async ([gainDb, mixName]) => {
        const chainUrl = '/chain.js';
        const chainCode = await import(chainUrl);
        const raw = new Float32Array(await (await fetch('/in.f32')).arrayBuffer());
        const length = raw.length / 2;
        const context = new OfflineAudioContext(6, length, 48_000);
        const buffer = context.createBuffer(2, length, 48_000);
        const l = buffer.getChannelData(0);
        const r = buffer.getChannelData(1);
        for (let i = 0; i < length; i++) {
          l[i] = raw[2 * i] ?? 0;
          r[i] = raw[2 * i + 1] ?? 0;
        }
        const chain = chainCode.createOutputChain(context, chainCode.MIX_BUSES[mixName]);
        chain.convolver.buffer = await context.decodeAudioData(
          await (await fetch(chain.bus.hall.wavUrl)).arrayBuffer(),
        );
        chain.input.gain.value = chainCode.gainOfDb(gainDb);

        // The six channels: the output of the app, the input of the limiter, and the input of the
        // glue compressor.
        chain.volume.disconnect();
        const merger = context.createChannelMerger(6);
        [chain.volume, chain.glueTrim, chain.tone].forEach((node, index) => {
          const split = context.createChannelSplitter(2);
          node.connect(split);
          split.connect(merger, 0, 2 * index);
          split.connect(merger, 1, 2 * index + 1);
        });
        context.destination.channelInterpretation = 'discrete';
        merger.connect(context.destination);

        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(chain.input);
        source.start();
        const started = performance.now();
        const result = await context.startRendering();
        const elapsed = performance.now() - started;
        const channels = [0, 1, 2, 3, 4, 5].map((index) => result.getChannelData(index));
        const part = 48_000 * 20;
        for (let start = 0; start < length; start += part) {
          const end = Math.min(length, start + part);
          const chunk = new Float32Array((end - start) * 6);
          for (let i = start; i < end; i++) {
            for (let c = 0; c < 6; c++) {
              chunk[6 * (i - start) + c] = channels[c]?.[i] ?? 0;
            }
          }
          await fetch(`/out?offset=${6 * start}`, { method: 'POST', body: chunk });
        }
        return elapsed;
      },
      [inputDb, mix] as const,
    );
  } finally {
    await page.close();
    await new Promise((resolve) => server.close(resolve));
  }

  const channel = (index: number): Float32Array => {
    const values = new Float32Array(frames);
    for (let i = 0; i < frames; i++) {
      values[i] = rendered[6 * i + index] ?? 0;
    }
    return values;
  };
  return {
    output: { left: channel(0), right: channel(1) },
    limiterInput: { left: channel(2), right: channel(3) },
    glueInput: { left: channel(4), right: channel(5) },
    renderMs,
  };
}

/**
 * Measures one demo at one piece gain.
 *
 * @param demo The demo.
 * @param synth The synth output of the demo.
 * @param gainDb The piece gain in dB.
 * @param target The target of a fit, or `null`.
 * @param mix The mix preset.
 * @returns The row.
 */
async function measureAt(
  demo: DemoId,
  synth: SynthRender,
  gainDb: number,
  target: number | null,
  mix: MixName,
): Promise<Row> {
  const chain = await renderChain(synth.audio, SOUNDFONT_HEADROOM_DB + gainDb, mix);
  const loudness = measureLoudness(chain.output);
  return {
    demo,
    target,
    gainDb,
    tableValue: target === null ? null : Math.round((target - gainDb) * 10) / 10,
    loudness,
    start: medianShortTerm(loudness.shortTerm, 3, START_SEC),
    quiet: shareBelow(loudness.shortTerm, synth.durationSec, QUIET_LUFS),
    reduction: gainReduction(chain.limiterInput, chain.output),
    glue: gainReduction(chain.glueInput, chain.limiterInput),
    renderMs: chain.renderMs,
  };
}

/**
 * Finds the piece gain that brings a demo to a target, in steps of 0.1 dB.
 *
 * @param demo The demo.
 * @param synth The synth output of the demo.
 * @param target The target in LUFS.
 * @param first The measures at the gain of `pieceGainDb()`.
 * @param mix The mix preset.
 * @returns The row at the fitted gain.
 */
async function fit(
  demo: DemoId,
  synth: SynthRender,
  target: number,
  first: Row,
  mix: MixName,
): Promise<Row> {
  let row: Row = { ...first, target, tableValue: Math.round((target - first.gainDb) * 10) / 10 };
  const tried = new Set<number>([row.gainDb]);
  for (let step = 0; step < FIT_STEPS; step++) {
    const error = target - row.loudness.integrated;
    if (Math.abs(error) <= FIT_TOLERANCE) {
      break;
    }
    const gainDb = Math.round((row.gainDb + error) * 10) / 10;
    if (tried.has(gainDb)) {
      break;
    }
    tried.add(gainDb);
    row = await measureAt(demo, synth, gainDb, target, mix);
  }
  return row;
}

/**
 * Formats a number with a fixed count of decimals and a width.
 *
 * @param value The number.
 * @param digits The decimals.
 * @param width The width.
 * @returns The text, padded at the start.
 */
function cell(value: number, digits: number, width: number): string {
  return value.toFixed(digits).padStart(width);
}

/**
 * Formats one row of the text table.
 *
 * @param row The measures.
 * @returns The line.
 */
function line(row: Row): string {
  const { loudness, reduction, glue } = row;
  return [
    row.demo.padEnd(17),
    row.target === null ? '     app' : cell(row.target, 1, 8),
    cell(row.gainDb, 1, 6),
    row.tableValue === null ? '     -' : cell(row.tableValue, 1, 6),
    cell(loudness.integrated, 2, 7),
    cell(loudness.range, 1, 5),
    cell(loudness.truePeak, 2, 6),
    cell(row.start, 1, 6),
    cell(row.quiet * 100, 0, 5),
    cell(glue.p95, 1, 5),
    cell(glue.max, 1, 5),
    cell(reduction.max, 1, 5),
    cell(reduction.over1 * 100, 1, 6),
    cell(reduction.over3 * 100, 1, 6),
  ].join(' ');
}

/** The head of the text table. */
const HEAD = [
  'demo              target   gain  table    LUFS   LRA  dBTP  start quiet glue95 glue  GRmax  GR>1  GR>3',
  '                  LUFS     dB    LUFS                       LUFS    %     dB    dB     dB     %     %',
].join('\n');

/** The JSON object of one row of `--json`. The levels are in LUFS, dB, or dBTP. */
interface RowJson {
  readonly demo: DemoId;
  readonly target: number | null;
  readonly gainDb: number;
  readonly tableValue: number | null;
  readonly integrated: number;
  readonly range: number;
  readonly maxShortTerm: number;
  readonly samplePeak: number;
  readonly truePeak: number;
  /** The median short-term loudness of the first 30 s. */
  readonly start: number;
  /** The share of the song below -30 LUFS short-term, from 0 to 1. */
  readonly quiet: number;
  readonly reductionMax: number;
  /** The share of the blocks of 50 ms with more than 1 dB of gain reduction. */
  readonly reductionOver1: number;
  /** The share of the blocks of 50 ms with more than 3 dB of gain reduction. */
  readonly reductionOver3: number;
  /** The delay of the limiter in samples. */
  readonly limiterDelay: number;
  /** The 95th percentile of the gain reduction of the glue compressor in a block of 50 ms. */
  readonly glueP95: number;
  /** The highest gain reduction of the glue compressor in a block of 50 ms. */
  readonly glueMax: number;
  /** The time of the chain render in ms. */
  readonly renderMs: number;
  /** The short-term loudness at the end of each second, at least -99 LUFS. */
  readonly shortTerm: readonly number[];
}

/**
 * Gives the JSON object of a row, with the short-term loudness at each second.
 *
 * @param row The measures.
 * @returns The object.
 */
function jsonOf(row: Row): RowJson {
  const round = (value: number, digits: number): number => Number(value.toFixed(digits));
  const perSecond: number[] = [];
  for (let i = 9; i < row.loudness.shortTerm.length; i += 10) {
    perSecond.push(round(Math.max(-99, row.loudness.shortTerm[i] ?? -99), 1));
  }
  return {
    demo: row.demo,
    target: row.target,
    gainDb: row.gainDb,
    tableValue: row.tableValue,
    integrated: round(row.loudness.integrated, 2),
    range: round(row.loudness.range, 2),
    maxShortTerm: round(row.loudness.maxShortTerm, 2),
    samplePeak: round(row.loudness.samplePeak, 2),
    truePeak: round(row.loudness.truePeak, 2),
    start: round(row.start, 2),
    quiet: round(row.quiet, 4),
    reductionMax: round(row.reduction.max, 2),
    reductionOver1: round(row.reduction.over1, 4),
    reductionOver3: round(row.reduction.over3, 4),
    limiterDelay: row.reduction.delay,
    glueP95: round(row.glue.p95, 2),
    glueMax: round(row.glue.max, 2),
    renderMs: Math.round(row.renderMs),
    shortTerm: perSecond,
  };
}

/**
 * Gives the failures of the check of one demo at the gain of `pieceGainDb()`.
 *
 * @param row The measures.
 * @returns One text for each failed limit.
 */
function checkFailures(row: Row): string[] {
  const failures: string[] = [];
  const error = row.loudness.integrated - TARGET_LOUDNESS;
  if (Math.abs(error) > CHECK_TOLERANCE) {
    failures.push(`${row.demo}: ${error.toFixed(2)} LU from the target`);
  }
  if (row.loudness.truePeak > CHECK_TRUE_PEAK) {
    failures.push(`${row.demo}: true peak ${row.loudness.truePeak.toFixed(2)} dBTP`);
  }
  return failures;
}

/**
 * Reads the values of an option that can repeat.
 *
 * @param args The arguments.
 * @param name The option, such as `--demo`.
 * @returns The values, in order.
 * @throws Error if the option has no value.
 */
function optionValues(args: readonly string[], name: string): string[] {
  const values: string[] = [];
  args.forEach((arg, index) => {
    if (arg === name) {
      const value = args[index + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`The option ${name} needs a value.`);
      }
      values.push(value);
    }
  });
  return values;
}

/**
 * Runs the tool: `node tools/loudness.ts [--mix <name>] [--demo <id>]... [--fit]
 * [--target <LUFS>]... [--json] [--check]`.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log(
      'Usage: pnpm loudness [--mix <name>] [--demo <id>]... [--fit] [--target <LUFS>]... [--json] [--check]',
    );
    return;
  }
  const [mix = DEFAULT_MIX, ...extraMixes] = optionValues(args, '--mix');
  if (extraMixes.length || !isMixName(mix)) {
    throw new Error('Give one --mix: hall or cinematic.');
  }
  const names = optionValues(args, '--demo');
  const unknown = names.filter((name) => !isDemoId(name));
  if (unknown.length) {
    throw new Error(`No demo ${unknown.join(', ')}. The demos: ${DEMO_IDS.join(', ')}.`);
  }
  const demos = names.length ? names.filter(isDemoId) : [...DEMO_IDS];
  const targets = optionValues(args, '--target').map(Number);
  if (targets.some((target) => !Number.isFinite(target))) {
    throw new Error('A target is a number in LUFS, such as -16.');
  }
  if (args.includes('--fit') && !targets.length) {
    targets.push(TARGET_LOUDNESS);
  }
  const json = args.includes('--json');
  const check = args.includes('--check');
  if (METER_RATE !== TEST_SAMPLE_RATE) {
    throw new Error('The meter and the render need the same sample rate.');
  }

  if (!json) {
    console.log(
      `Output of the chain with the mix ${mix}, after the limiter. TARGET_LOUDNESS ${TARGET_LOUDNESS} LUFS.`,
    );
    console.log(HEAD);
  }
  const failures: string[] = [];
  try {
    for (const demo of demos) {
      const synth = await renderSynth(demo);
      const first = await measureAt(demo, synth, pieceGainDb(demo, mix), null, mix);
      failures.push(...checkFailures(first));
      const rows = [first];
      for (const target of targets) {
        rows.push(await fit(demo, synth, target, first, mix));
      }
      for (const row of rows) {
        console.log(json ? JSON.stringify(jsonOf(row)) : line(row));
      }
    }
  } finally {
    await browser?.close();
  }

  if (check) {
    for (const failure of failures) {
      console.error(`FAIL ${failure}`);
    }
    console.error(failures.length ? `${failures.length} failures.` : 'check: pass');
    process.exitCode = failures.length ? 1 : 0;
  }
}

if (import.meta.main) {
  await main();
}
