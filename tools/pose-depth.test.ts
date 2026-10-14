import { describe, expect, it } from 'vitest';

import { sceneOf } from '../src/pose/test-scene.ts';
import { VIOLINIST_SWEEP, playSample } from '../src/pose/test-sweep-roles.ts';
import type { RoleSweep, SweepSample } from '../src/pose/test-sweep.ts';
import { patchedDemos } from './patch-demos.ts';
import { parseOptions, playerLabel, sweepDemos } from './pose-depth.ts';

/**
 * Gives the bytes of a demo with its patches, as the sweep reads it.
 *
 * @param id The name of the file with no `.mid`.
 * @returns The bytes.
 */
async function demoBytes(id: string): Promise<Uint8Array> {
  const demo = (await patchedDemos()).find((d) => d.file === `${id}.mid`);
  if (!demo) {
    throw new Error(`No demo ${id}.`);
  }
  return demo.bytes;
}

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

describe('playerLabel', () => {
  it('adds the species inside the parentheses of a name, or in new parentheses', () => {
    expect(playerLabel('violinist 4 (chair)', 'fox-red')).toBe('violinist 4 (fox-red, chair)');
    expect(playerLabel('pianist 20', 'polar-bear')).toBe('pianist 20 (polar-bear)');
    expect(playerLabel('conductor', null)).toBe('conductor');
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

    // Each label names the species of its player, and each result has the H of its body.
    const scene = sceneOf(await demoBytes('brahms-2'));
    const players = VIOLINIST_SWEEP.players(scene);
    for (const [i, { demo, species, headHeight }] of results.entries()) {
      const player = players[i];
      // The name of a violinist holds the index of its place in the layout.
      const index = Number(/^violinist (\d+)/.exec(player?.name ?? '')?.[1]);
      expect(species).toBe(scene.layout.players[index]?.cast.species);
      expect(demo).toBe(
        `brahms-2 violinist ${index} (${species ?? ''}, ${player?.model.support ?? ''})`,
      );
      expect(headHeight).toBe(player?.model.body.headHeight);
    }
    expect(new Set(results.map((result) => result.species))).toEqual(
      new Set(['rabbit', 'fox-red']),
    );
  }, 30_000);
});
