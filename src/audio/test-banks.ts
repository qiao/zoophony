import { join } from 'node:path';

import { loadSoundBank, presetTarget, splitPreset } from '../../tools/split-soundfont.ts';
import type { ScorePreset } from '../score/types.ts';
import type { ClockAnchor } from './clock.ts';
import { sf3ToPcmSf2 } from './decode.ts';
import { BLOCK_FRAMES, SynthEngine } from './engine.ts';
import type { EngineBank } from './engine.ts';
import type { SynthEventTable } from './synth-events.ts';

const SOURCE = join(import.meta.dirname, '..', '..', 'assets', 'soundfont', 'GeneralUserGS.sf3');

/** The sample rate of the offline renders, as on the development Mac. */
export const TEST_SAMPLE_RATE = 48_000;

/**
 * Makes PCM SF2 banks from the presets of GeneralUserGS.sf3, in the same way as the build split
 * and the decode Worker. Only tests and `tools/measure-targets.ts` use this function.
 *
 * @param targets The bank and program of each preset. Drum kits use bank 128.
 * @returns One bank for each target.
 * @throws Error if the SoundFont has no preset for a target.
 */
export async function testBanks(targets: readonly ScorePreset[]): Promise<EngineBank[]> {
  const source = await loadSoundBank(SOURCE);
  const banks = targets.map(async (target): Promise<EngineBank> => {
    const preset = source.presets.find((item) => {
      const found = presetTarget(item);
      return found?.bank === target.bank && found.program === target.program;
    });
    if (!preset) {
      throw new Error(`GeneralUserGS.sf3 has no preset ${target.bank}:${target.program}.`);
    }
    const data = await sf3ToPcmSf2(splitPreset(source, preset));
    return { id: `${target.bank}:${target.program}`, data };
  });
  return Promise.all(banks);
}

/**
 * Copies the buffers of banks. Each engine gets its own copy, because the synth can keep the
 * buffers.
 *
 * @param banks The banks.
 * @returns New banks with the same ids and copies of the data.
 */
export function copyBanks(banks: readonly EngineBank[]): EngineBank[] {
  return banks.map((bank) => ({ id: bank.id, data: bank.data.slice(0) }));
}

/**
 * A synth engine that renders offline at {@link TEST_SAMPLE_RATE}, for the Node tests and
 * `tools/measure-targets.ts`. It clears the output buffers for each block, as a worklet gets
 * clear buffers, because spessasynth_core adds into them.
 */
export class OfflineHarness {
  readonly engine: SynthEngine;
  /** The anchors that the engine posted, the oldest first. */
  readonly anchors: ClockAnchor[] = [];
  /** The `performance.now()` at the start of each block. */
  readonly starts: number[] = [];
  readonly #left = new Float32Array(BLOCK_FRAMES);
  readonly #right = new Float32Array(BLOCK_FRAMES);
  #frame = 0;

  /**
   * Creates the engine, loads the score, then adds a copy of the banks.
   *
   * @param table The synth events.
   * @param durationSec The song length.
   * @param banks The banks. The engine gets copies.
   */
  constructor(table: SynthEventTable, durationSec: number, banks: readonly EngineBank[]) {
    this.engine = new SynthEngine(TEST_SAMPLE_RATE, (anchor) => this.anchors.push(anchor));
    this.engine.loadScore(table, durationSec);
    this.engine.addBanks(copyBanks(banks));
  }

  /** The context time at the start of the next block, in seconds. */
  get time(): number {
    return this.#frame / TEST_SAMPLE_RATE;
  }

  /** The context frame at the start of the next block. */
  get frame(): number {
    return this.#frame;
  }

  /** The highest absolute sample of the last block, in both channels. */
  get peak(): number {
    let peak = 0;
    for (let i = 0; i < BLOCK_FRAMES; i++) {
      peak = Math.max(peak, Math.abs(this.#left[i] ?? 0), Math.abs(this.#right[i] ?? 0));
    }
    return peak;
  }

  /**
   * Renders one block.
   *
   * @returns The render time of the block in milliseconds.
   */
  timeBlock(): number {
    this.#left.fill(0);
    this.#right.fill(0);
    const start = performance.now();
    this.starts.push(start);
    this.engine.render(this.time, this.#left, this.#right);
    const elapsed = performance.now() - start;
    this.#frame += BLOCK_FRAMES;
    return elapsed;
  }

  /**
   * Renders blocks until the context time reaches a time.
   *
   * @param contextSec The context time in seconds.
   * @returns The highest absolute sample of the blocks, or 0 if no block rendered.
   */
  renderTo(contextSec: number): number {
    let peak = 0;
    while (this.time < contextSec) {
      this.timeBlock();
      peak = Math.max(peak, this.peak);
    }
    return peak;
  }
}
