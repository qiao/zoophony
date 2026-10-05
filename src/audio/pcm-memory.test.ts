import { beforeAll, describe, expect, it } from 'vitest';

import { MEMORY_LIMIT_BYTES } from '../../tools/measure-targets.ts';
import { patchedDemos } from '../../tools/patch-demos.ts';
import type { DemoFile } from '../../tools/patch-demos.ts';
import { buildScore } from '../score/score.ts';
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
});
