import { describe, expect, it } from 'vitest';

import { tempo } from '../midi/test-smf.ts';
import type { TestEvent } from '../midi/test-smf.ts';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { choirFile } from '../models/test-choir.ts';
import { scoreOf } from './test-score.ts';
import { ORCHESTRA, SOLOISTS, choir, vocalSoloistsFile } from './test-vocal-soloists.ts';
import type { Score, SectionSize } from './types.ts';

/** Builds the score of a test piece. */
function piece(parts: readonly TestEvent[][], size: SectionSize = 'auto'): Score {
  return scoreOf({ tracks: [[tempo(0, 120)], ...parts] }, size);
}

describe('findVocalSoloists (design 3.8)', () => {
  it('finds the soloists beside the choir, with one singer for each voice (audit 2, N8)', () => {
    for (const size of ['auto', 'one-per-part', 'full'] as const) {
      const score = scoreOf(vocalSoloistsFile(), size);
      const soloists = score.seats.findIndex((s) => s.sources[0]?.channel === 8);
      const singers = score.seats.findIndex((s) => s.sources[0]?.channel === 10);
      expect(score.vocalSoloists, size).toBe(soloists);
      expect(score.seats[soloists]?.playerCount, size).toBe(4);
      expect(score.seats[singers]?.playerCount, size).toBe(size === 'one-per-part' ? 4 : 8);
    }
  });

  it('finds no soloists that sing with the choir, or with no choir beside them', () => {
    expect(piece([...ORCHESTRA, SOLOISTS, choir(4)]).vocalSoloists).toBeNull();
    expect(piece([...ORCHESTRA, SOLOISTS]).vocalSoloists).toBeNull();
    // The four voices of the choir test file sing together on four channels.
    expect(scoreOf(choirFile()).vocalSoloists).toBeNull();
  });

  it('finds no vocal soloists in the demos (design 8.2)', async () => {
    // The excerpt of the Ode to Joy demo has only the choir.
    for (const demo of await patchedDemos()) {
      expect(scoreOf(demo.bytes).vocalSoloists, demo.file).toBeNull();
    }
  });
});
