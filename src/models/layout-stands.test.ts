import { describe, expect, it } from 'vitest';

import { pianoSoloFile } from '../score/test-audit-files.ts';
import { scoreOf } from '../score/test-score.ts';
import { obstaclesTouch } from './footprint.ts';
import { layoutObstacles, layoutScene } from './layout-scene.ts';
import { ModelCache } from './model-cache.ts';
import {
  stringQuartetFile,
  stringSextetFile,
  violinPianoDuoFile,
  windQuintetFile,
} from './test-chamber.ts';

describe('the music stands of a chamber group (design 4.5)', () => {
  it('keeps the stands of each chamber test file apart', () => {
    // The stand of a string player with no partner stands where a partner would share it. The
    // arc between two players alone does not keep the stands apart: the stands of the second
    // violin and the viola of the string quartet can go into each other.
    const models = new ModelCache();
    for (const [name, file] of [
      ['piano solo', pianoSoloFile()],
      ['violin and piano', violinPianoDuoFile()],
      ['string quartet', stringQuartetFile()],
      ['wind quintet', windQuintetFile()],
      ['string sextet', stringSextetFile()],
    ] as const) {
      const stands = layoutObstacles(layoutScene(scoreOf(file), models), models).filter((o) =>
        o.label.startsWith('stand '),
      );
      const touching = stands.flatMap((a, i) =>
        stands
          .slice(i + 1)
          .filter((b) => obstaclesTouch(a, b, 0))
          .map((b) => `${a.label} and ${b.label}`),
      );
      expect(touching, name).toEqual([]);
    }
  });
});
