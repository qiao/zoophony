import { beforeAll, describe, expect, it } from 'vitest';

import { MEMORY_LIMIT_BYTES } from '../../tools/measure-targets.ts';
import { patchedDemos } from '../../tools/patch-demos.ts';
import type { DemoFile } from '../../tools/patch-demos.ts';
import { buildScore } from '../score/score.ts';
import type { ScorePreset } from '../score/types.ts';
import { testBanks } from './test-banks.ts';

describe('the decoded samples of each demo (design 9.7, "Memory")', () => {
  let demos: DemoFile[];

  beforeAll(async () => {
    demos = await patchedDemos();
  });

  it('decodes the presets of each demo to at most 100 MB of PCM', async () => {
    const sizes = new Map(
      await Promise.all(
        demos.map(async (demo) => {
          const result = buildScore(demo.bytes, 'auto');
          if (!result.ok) {
            throw new Error(`${demo.file} was refused: ${result.error}.`);
          }
          // The same conversion as the decode Worker: one PCM SF2 file for each preset (6.3).
          const banks = await testBanks(result.score.presets);
          return [demo.file, banks.reduce((sum, bank) => sum + bank.data.byteLength, 0)] as const;
        }),
      ),
    );

    expect(sizes.size).toBe(6);
    for (const [file, bytes] of sizes) {
      expect(bytes, file).toBeGreaterThan(1_000_000);
      expect(bytes, file).toBeLessThanOrEqual(MEMORY_LIMIT_BYTES);
    }
  });

  it('keeps the banks of all six demos of one session in at most 100 MB of PCM (design 6.3)', async () => {
    // The synth keeps each bank for the session, and the Worker keeps no copy. After all six
    // demos, the synth holds one bank for each preset of any demo.
    const presets = new Map<string, ScorePreset>();
    for (const demo of demos) {
      const result = buildScore(demo.bytes, 'auto');
      if (!result.ok) {
        throw new Error(`${demo.file} was refused: ${result.error}.`);
      }
      for (const preset of result.score.presets) {
        presets.set(`${preset.bank}:${preset.program}`, preset);
      }
    }
    const banks = await testBanks([...presets.values()]);
    const bytes = banks.reduce((sum, bank) => sum + bank.data.byteLength, 0);

    expect(presets.size).toBe(20);
    expect(bytes).toBeLessThanOrEqual(MEMORY_LIMIT_BYTES);
  });
});
