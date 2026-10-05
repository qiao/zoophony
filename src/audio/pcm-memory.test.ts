import { beforeAll, describe, expect, it } from 'vitest';

import { MEMORY_LIMIT_BYTES } from '../../tools/measure-targets.ts';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { scoreOf } from '../score/test-score.ts';
import type { ScorePreset } from '../score/types.ts';
import { resolvePresetFiles } from './preset-index.ts';
import type { PresetFileEntry } from './preset-index.ts';
import { testBanks, testIndex } from './test-banks.ts';

describe('the decoded samples of each demo (design 9.7, "Memory")', () => {
  /** The presets of each demo, by file name. */
  let demoPresets: Map<string, readonly ScorePreset[]>;
  let index: PresetFileEntry[];
  /** The PCM SF2 size of each preset file of any demo, in bytes. */
  let sizes: Map<string, number>;

  beforeAll(async () => {
    const demos = await patchedDemos();
    demoPresets = new Map(demos.map((demo) => [demo.file, scoreOf(demo.bytes).presets]));
    index = await testIndex();
    // The same conversion as the decode Worker: one PCM SF2 file for each preset file (6.3).
    // Each file of any demo converts one time.
    const banks = await testBanks([...demoPresets.values()].flat());
    sizes = new Map(banks.map((bank) => [bank.id, bank.data.byteLength]));
  });

  it('decodes the presets of each demo to at most 100 MB of PCM', () => {
    expect(demoPresets.size).toBe(6);
    for (const [file, presets] of demoPresets) {
      const bytes = resolvePresetFiles(index, presets).reduce(
        (sum, entry) => sum + (sizes.get(entry.file) ?? 0),
        0,
      );

      expect(bytes, file).toBeGreaterThan(1_000_000);
      expect(bytes, file).toBeLessThanOrEqual(MEMORY_LIMIT_BYTES);
    }
  });

  it('keeps the banks of all six demos of one session in at most 100 MB of PCM (design 6.3)', () => {
    // The synth keeps each bank for the session, and the Worker keeps no copy. After all six
    // demos, the synth holds one bank for each preset file of any demo.
    const presets = new Set(
      [...demoPresets.values()].flat().map((preset) => `${preset.bank}:${preset.program}`),
    );
    const bytes = [...sizes.values()].reduce((sum, size) => sum + size, 0);

    expect(presets.size).toBe(20);
    expect(bytes).toBeLessThanOrEqual(MEMORY_LIMIT_BYTES);
  });
});
