import { describe, expect, it } from 'vitest';

import { VIOLINIST_SWEEP, playSample } from '../src/pose/test-sweep-roles.ts';
import type { RoleSweep, SweepSample } from '../src/pose/test-sweep.ts';
import { parseOptions, sweepDemos } from './pose-depth.ts';

describe('parseOptions', () => {
  it('reads the flag --gaps with no value beside the options with a value', () => {
    const options = parseOptions([
      'pianist',
      '--demo',
      'bach-bwv1048.mid',
      '--gaps',
      '--into',
      'case',
    ]);
    expect(options.gaps).toBe(true);
    expect(options.demos).toEqual(['bach-bwv1048']);
    expect(options.into).toEqual(['case']);
    expect(parseOptions(['conductor']).gaps).toBe(false);
  });
});

describe('sweepDemos', () => {
  it('sweeps each player over all samples of a set that is a generator', async () => {
    const counts = new Map<string, number>();
    // The play set is a generator of three samples, as the play of a role is.
    const role: RoleSweep = {
      ...VIOLINIST_SWEEP,
      parts: [],
      obstacles: [],
      sampleSets: (scene) => [
        {
          name: 'play',
          samples: (function* (): Generator<SweepSample> {
            yield* [1, 2, 3].map((song) => playSample(scene, song));
          })(),
        },
      ],
      players: (scene) =>
        VIOLINIST_SWEEP.players(scene).map((player) => ({
          ...player,
          poseAt: (sample: SweepSample) => {
            counts.set(player.name, (counts.get(player.name) ?? 0) + 1);
            return player.poseAt(sample);
          },
          targets: () => [],
        })),
    };

    const results = await sweepDemos({ demos: ['brahms-2'], times: null, gaps: false }, role);
    expect(results.length).toBeGreaterThan(1);
    expect([...counts.values()]).toEqual(results.map(() => 3));
  }, 30_000);
});
