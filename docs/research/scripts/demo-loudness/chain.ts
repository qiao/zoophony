// Research script of docs/research/demo-loudness.md. It sends a synth render through the real
// output chain of the app: the code of src/audio/output-chain.ts runs in an OfflineAudioContext
// of headless Chromium, with the hall impulse response of assets/hall/. Thus the convolver and
// the limiter are the nodes of the browser, with no model.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { stripTypeScriptTypes } from 'node:module';
import { join } from 'node:path';

import { chromium } from '@playwright/test';
import type { Browser } from '@playwright/test';

import { ROOT } from './synth.ts';
import type { Stereo } from './synth.ts';

/** A call of the volume function of the chain at a context time (design 6.8). */
export interface VolumeCall {
  /** Seconds after the start. */
  readonly at: number;
  readonly gain: number;
}

/** The options of {@link runChain}. */
export interface ChainOptions {
  /** The gain of the input node in dB: the headroom of the SoundFont plus the piece gain. */
  readonly inputDb: number;
  /** Calls of `setOutputVolume()` of the chain, if the chain has the function. */
  readonly volume?: readonly VolumeCall[];
}

/**
 * Gives the JavaScript of `src/audio/output-chain.ts` for the page: the types removed, and the
 * URL import of Vite replaced by the route of the impulse response.
 */
function chainModule(): string {
  const source = readFileSync(join(ROOT, 'src/audio/output-chain.ts'), 'utf8').replace(
    /^import hallImpulseUrl from .*$/m,
    `const hallImpulseUrl = '/ir.wav';`,
  );
  return stripTypeScriptTypes(source);
}

let browser: Browser | undefined;

/** Closes the browser of {@link runChain}. */
export async function closeChain(): Promise<void> {
  await browser?.close();
  browser = undefined;
}

/**
 * Sends a signal through the output chain of the app in headless Chromium.
 *
 * @param input The synth output at 48 kHz.
 * @param options The input gain and the volume calls.
 * @returns The output of the chain at the destination.
 */
export async function runChain(input: Stereo, options: ChainOptions): Promise<Stereo> {
  browser ??= await chromium.launch();
  const page = await browser.newPage();
  const frames = input.left.length;
  const interleaved = new Float32Array(frames * 2);
  for (let i = 0; i < frames; i++) {
    interleaved[2 * i] = input.left[i]!;
    interleaved[2 * i + 1] = input.right[i]!;
  }
  const output = new Float32Array(frames * 2);
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/') {
      response.setHeader('content-type', 'text/html');
      response.end('<!doctype html><title>chain</title>');
    } else if (url.pathname === '/chain.js') {
      response.setHeader('content-type', 'text/javascript');
      response.end(chainModule());
    } else if (url.pathname === '/in.f32') {
      response.end(Buffer.from(interleaved.buffer));
    } else if (url.pathname === '/ir.wav') {
      response.end(readFileSync(join(ROOT, 'assets/hall/st-pauls-hall-c8m.wav')));
    } else if (url.pathname === '/out') {
      const parts: Buffer[] = [];
      request.on('data', (part: Buffer) => parts.push(part));
      request.on('end', () => {
        const body = Buffer.concat(parts);
        const offset = Number(url.searchParams.get('offset'));
        output.set(new Float32Array(new Uint8Array(body).buffer), offset);
        response.end('ok');
      });
    } else {
      response.statusCode = 404;
      response.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const origin = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
  page.on('crash', () => console.error('The page crashed.'));
  page.on('console', (message) => console.error(message.text()));
  await page.goto(`${origin}/`);
  await page.evaluate(
    async ({ inputDb, volume }) => {
      const chainUrl = '/chain.js';
      const mod = await import(chainUrl);
      const raw = new Float32Array(await (await fetch('/in.f32')).arrayBuffer());
      const length = raw.length / 2;
      const context = new OfflineAudioContext(2, length, 48_000);
      const buffer = context.createBuffer(2, length, 48_000);
      const l = buffer.getChannelData(0);
      const r = buffer.getChannelData(1);
      for (let i = 0; i < length; i++) {
        l[i] = raw[2 * i]!;
        r[i] = raw[2 * i + 1]!;
      }
      const chain = mod.createOutputChain(context);
      chain.convolver.buffer = await context.decodeAudioData(
        await (await fetch(mod.HALL_IMPULSE_URL)).arrayBuffer(),
      );
      chain.input.gain.value = mod.gainOfDb(inputDb);
      for (const call of volume) {
        // The render stops at each call, so the call reads the context time as the app does.
        void context.suspend(Math.round((call.at * 48_000) / 128) * (128 / 48_000)).then(() => {
          mod.setOutputVolume(chain, call.gain);
          void context.resume();
        });
      }
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(chain.input);
      source.start();
      const rendered = await context.startRendering();
      const outL = rendered.getChannelData(0);
      const outR = rendered.getChannelData(1);
      const part = 48_000 * 20;
      for (let start = 0; start < length; start += part) {
        const end = Math.min(length, start + part);
        const chunk = new Float32Array((end - start) * 2);
        for (let i = start; i < end; i++) {
          chunk[2 * (i - start)] = outL[i]!;
          chunk[2 * (i - start) + 1] = outR[i]!;
        }
        await fetch(`/out?offset=${2 * start}`, { method: 'POST', body: chunk });
      }
    },
    { inputDb: options.inputDb, volume: options.volume ?? [] },
  );
  await page.close();
  await new Promise((resolve) => server.close(resolve));
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    left[i] = output[2 * i]!;
    right[i] = output[2 * i + 1]!;
  }
  return { left, right };
}
