import { describe, expect, it } from 'vitest';

import { sceneOf } from '../src/pose/test-scene.ts';
import { VIOLINIST_SWEEP, playSample } from '../src/pose/test-sweep-roles.ts';
import type { RoleSweep, SweepSample } from '../src/pose/test-sweep.ts';
import { patchedDemos } from './patch-demos.ts';
import {
  DEPTH_STEP,
  compareDepths,
  parseOptions,
  playerLabel,
  readRows,
  rowsJson,
  sweepDemos,
} from './pose-depth.ts';
import type { DemoResult } from './pose-depth.ts';

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

  it('reads the commit of --base and the file of --json, and refuses both together', () => {
    expect(parseOptions(['violinist', '--base', 'main']).base).toBe('main');
    expect(parseOptions(['violinist', '--json', 'out.json']).json).toBe('out.json');
    expect(() => parseOptions(['violinist', '--base', 'main', '--json', 'out.json'])).toThrow(
      'do not go together',
    );
  });
});

/**
 * Makes the result of one player with one pair in one set.
 *
 * @param species The species.
 * @param headHeight The head height H of its body, in meters.
 * @param depths The depth of each pair of the set `play`, in meters, by the name of the part.
 * @returns The result.
 */
function resultOf(
  species: 'rabbit' | 'fox-red',
  headHeight: number,
  depths: Readonly<Record<string, number>>,
): DemoResult {
  return {
    demo: `d violinist 1 (${species}, chair)`,
    species,
    headHeight,
    sets: [
      {
        name: 'play',
        pairs: Object.entries(depths).map(([part, depth]) => ({
          part,
          into: 'body',
          depth,
          song: 1,
          wall: 2,
          bone: depth > 0 ? 'handL' : null,
          along: depth > 0 ? 0.5 : Number.NaN,
        })),
        gaps: [{ part: 'paw L', into: 'body', gap: Infinity, song: 0, wall: 0, bone: null }],
      },
    ],
    targets: [],
  };
}

describe('compareDepths', () => {
  it('marks a depth that grows in H by more than one step of the print', () => {
    // The body grows by 1.2. The paws keep their depth in H, the claws go less than one step
    // deeper, and the forearms go more than one step deeper.
    const base = [resultOf('rabbit', 0.25, { paws: 0.01, claws: 0.01, forearms: 0.02 })];
    const tree = [
      resultOf('rabbit', 0.3, {
        paws: 0.012,
        claws: 0.012 + 0.8 * DEPTH_STEP,
        forearms: 0.024 + 1.2 * DEPTH_STEP,
      }),
    ];
    const lines = compareDepths('main', base, tree);
    expect(lines[0]).toBe('H of each body, main -> working tree: rabbit 0.250 m -> 0.300 m');
    expect(lines.slice(3)).toEqual([
      '| rabbit | play | paws in body | 1.0 | 0.040 | 1.2 | 0.040 |  |',
      '| rabbit | play | claws in body | 1.0 | 0.040 | 1.3 | 0.043 |  |',
      '| rabbit | play | forearms in body | 2.0 | 0.080 | 2.5 | 0.084 | GROWS |',
    ]);
  });

  it('groups the rows by species, and leaves out a pair with no depth on both sides', () => {
    const base = [resultOf('rabbit', 0.25, { paws: 0.01, claws: 0.0004 })];
    const tree = [
      resultOf('fox-red', 0.3, { paws: 0.02 }),
      resultOf('rabbit', 0.25, { paws: 0.01, claws: 0 }),
    ];
    expect(compareDepths('main', base, tree).slice(3)).toEqual([
      '| fox-red | play | paws in body | - | - | 2.0 | 0.067 |  |',
      '| rabbit | play | paws in body | 1.0 | 0.040 | 1.0 | 0.040 |  |',
    ]);
  });
});

describe('rowsJson', () => {
  it('gives back NaN and the infinite gaps of the rows that it writes', () => {
    const rows = [{ variant: '', seconds: 1, results: [resultOf('rabbit', 0.3, { paws: 0 })] }];
    expect(readRows(rowsJson(rows))).toEqual(rows);
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
