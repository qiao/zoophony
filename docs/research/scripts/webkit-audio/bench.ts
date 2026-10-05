// Renders demo 1 offline with SynthEngine and times each 128-frame block. The same code runs in
// Node and in the jsc shell of JavaScriptCore (jsc-main.ts), so the two engines get one workload.

import { BLOCK_FRAMES, SynthEngine } from '../../../../src/audio/engine.ts';
import { packSynthEvents } from '../../../../src/audio/synth-events.ts';
import type { SynthEvent } from '../../../../src/score/types.ts';

const SAMPLE_RATE = 48_000;

/** The data that prepare.ts writes. */
export interface BenchInput {
  readonly durationSec: number;
  readonly events: readonly SynthEvent[];
  readonly banks: readonly { readonly id: string; readonly data: ArrayBuffer }[];
}

/** The synth settings to compare. Each one is a system parameter of spessasynth_core. */
export interface BenchOptions {
  readonly label?: string;
  /** Song seconds to render. The default is the full song. */
  readonly seconds?: number;
  readonly effects?: boolean;
  /** 0 linear, 1 nearest neighbor, 2 hermite (the default). */
  readonly interpolation?: number;
}

/**
 * Renders the song and returns one line of statistics of the block times.
 *
 * @param input The events and banks.
 * @param now A clock in milliseconds with a resolution of 1 microsecond or better.
 * @param options The settings of this run.
 * @returns The statistics.
 */
export function runBench(input: BenchInput, now: () => number, options: BenchOptions): string {
  const engine = new SynthEngine(SAMPLE_RATE, () => undefined);
  // SAFETY: research script. The engine keeps the synth private, and only this script reads it.
  const synth = (engine as unknown as { synth: { setSystemParameter(k: string, v: unknown): void } })
    .synth;
  if (options.effects === false) {
    synth.setSystemParameter('effectsEnabled', false);
  }
  if (options.interpolation !== undefined) {
    synth.setSystemParameter('interpolationType', options.interpolation);
  }
  engine.loadScore(packSynthEvents(input.events), input.durationSec);
  engine.addBanks(input.banks.map((bank) => ({ id: bank.id, data: bank.data.slice(0) })));
  const left = new Float32Array(BLOCK_FRAMES);
  const right = new Float32Array(BLOCK_FRAMES);
  // Silent blocks before play, as in the worklet while the context runs before the click.
  for (let i = 0; i < 375; i++) {
    engine.render(i * (BLOCK_FRAMES / SAMPLE_RATE), left, right);
  }
  engine.enqueue({ type: 'play' });
  const budgetMs = (BLOCK_FRAMES / SAMPLE_RATE) * 1000;
  const blocks = Math.ceil(((options.seconds ?? input.durationSec) * SAMPLE_RATE) / BLOCK_FRAMES);
  const times = new Float64Array(blocks);
  for (let i = 0; i < blocks; i++) {
    const start = now();
    engine.render((375 + i) * (BLOCK_FRAMES / SAMPLE_RATE), left, right);
    times[i] = now() - start;
  }
  const sorted = times.toSorted();
  const at = (q: number): string => (sorted[Math.floor(q * (blocks - 1))] ?? 0).toFixed(3);
  const slow: string[] = [];
  let sum = 0;
  times.forEach((ms, i) => {
    sum += ms;
    if (ms > budgetMs) {
      slow.push(`${((i * BLOCK_FRAMES) / SAMPLE_RATE).toFixed(2)} s: ${ms.toFixed(2)} ms`);
    }
  });
  return (
    `${options.label ?? ''}: ${blocks} blocks, mean ${(sum / blocks).toFixed(4)} ms, ` +
    `median ${at(0.5)}, p99 ${at(0.99)}, p99.9 ${at(0.999)}, max ${at(1)} ms, ` +
    `${slow.length} above ${budgetMs.toFixed(2)} ms (${slow.slice(0, 5).join('; ')})`
  );
}
