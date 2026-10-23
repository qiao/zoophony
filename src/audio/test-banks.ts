import type { BasicSoundBank } from 'spessasynth_core';

import {
  SOUNDFONT_PATH,
  loadSoundBank,
  presetFilePath,
  presetTarget,
  splitPreset,
} from '../../tools/split-soundfont.ts';
import type { ScorePreset } from '../score/types.ts';
import type { ClockAnchor } from './clock.ts';
import { sf3ToPcmSf2 } from './decode.ts';
import { BLOCK_FRAMES, SynthEngine } from './engine.ts';
import type { EngineBank } from './engine.ts';
import { resolvePresetFiles } from './preset-index.ts';
import type { PresetFileEntry } from './preset-index.ts';
import type { SynthEventTable } from './synth-events.ts';

/** The sample rate of the offline renders, as on the development Mac. */
export const TEST_SAMPLE_RATE = 48_000;

/** The parsed source SoundFont. Each test file loads it one time. */
let sourceBank: Promise<BasicSoundBank> | undefined;

function loadSource(): Promise<BasicSoundBank> {
  sourceBank ??= loadSoundBank(SOUNDFONT_PATH);
  return sourceBank;
}

/**
 * Makes the entries of `sf/index.json` from the source SoundFont, as the build split does. Only
 * tests and `tools/measure-targets.ts` use this function.
 *
 * @returns The entries, with the size 0, because the split does not run.
 */
export async function testIndex(): Promise<PresetFileEntry[]> {
  const source = await loadSource();
  return source.presets.flatMap((preset): PresetFileEntry[] => {
    const target = presetTarget(preset);
    return target ? [{ ...target, file: presetFilePath(target), size: 0 }] : [];
  });
}

/**
 * Makes PCM SF2 banks from the presets of the source SoundFont, in the same way as the build split
 * and the decode Worker. The presets go through `resolvePresetFiles()`, as in the app, so a
 * preset with no file falls back, and presets that share a file give one bank. Only tests and
 * `tools/measure-targets.ts` use this function.
 *
 * @param presets The presets. Drum kits use bank 128.
 * @returns One bank for each file, in the order of `resolvePresetFiles()`. The id of a bank is
 *   the path of its file, such as `sf/0/40.sf3`.
 * @throws Error if the SoundFont has neither a preset nor its fallback.
 */
export async function testBanks(presets: readonly ScorePreset[]): Promise<EngineBank[]> {
  const source = await loadSource();
  const files = resolvePresetFiles(await testIndex(), presets);
  const banks = files.map(async (entry): Promise<EngineBank> => {
    const preset = source.presets.find((item) => {
      const found = presetTarget(item);
      return found?.bank === entry.bank && found.program === entry.program;
    });
    if (!preset) {
      throw new Error(`The SoundFont has no preset ${entry.bank}:${entry.program}.`);
    }
    const data = await sf3ToPcmSf2(splitPreset(source, preset));
    return { id: entry.file, data };
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
   * @param channelGainsDb The gain of each synth channel in dB, as `loadScore()` gets it.
   */
  constructor(
    table: SynthEventTable,
    durationSec: number,
    banks: readonly EngineBank[],
    channelGainsDb: readonly number[] = [],
  ) {
    this.engine = new SynthEngine(TEST_SAMPLE_RATE, (anchor) => this.anchors.push(anchor));
    this.engine.loadScore(table, durationSec, channelGainsDb);
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
