import { describe, expect, it } from 'vitest';

import { sceneOf } from '../src/pose/test-scene.ts';
import { VIOLINIST_SWEEP } from '../src/pose/test-sweep-roles.ts';
import type { PairDepth, RoleSweep } from '../src/pose/test-sweep.ts';
import { FOLD_ROLES, roleBodies } from './fold-probe.ts';
import type { FoldCount, FoldReport, RoleSource } from './fold-probe.ts';
import {
  FIT_DEMOS,
  FIT_STEP,
  chooseDemos,
  fitSweep,
  fitJson,
  fitTable,
  foldShares,
  parseFitOptions,
  readFit,
  worstPairs,
} from './hold-fit.ts';
import type { FitRow } from './hold-fit.ts';
import type { HoldReach } from './hold-reach.ts';
import { patchedDemo } from './patch-demos.ts';
import type { DemoResult } from './pose-depth.ts';

/**
 * Gives a role of `FOLD_ROLES`.
 *
 * @param name The name of the role.
 * @returns The role.
 */
function foldRole(name: string): RoleSource {
  const role = FOLD_ROLES.get(name);
  if (!role) {
    throw new Error(`FOLD_ROLES has no ${name}.`);
  }
  return role;
}

/**
 * Makes the deepest point of a pair.
 *
 * @param part The moving part.
 * @param into The obstacle.
 * @param depth The depth, in meters.
 * @returns The pair.
 */
function pair(part: string, into: string, depth: number): PairDepth {
  return { part, into, depth, song: 1, wall: 11, bone: null, along: Number.NaN };
}

/**
 * Makes a count of a sample set.
 *
 * @param samples The samples.
 * @param withFold The samples with a fold.
 * @returns The count.
 */
function count(samples: number, withFold: number): FoldCount {
  return {
    samples,
    withFold,
    most: 0,
    worst: '',
    bones: new Map(),
    byFace: new Map(),
    faceWorst: new Map(),
  };
}

/** A report of folds with 2% play folds and 10% lift folds. */
const FOLDS: FoldReport = {
  demos: ['a.mid'],
  faces: 10,
  mesh: null,
  sets: { rest: count(1, 0), play: count(100, 2), lift: count(10, 1) },
};

describe('parseFitOptions', () => {
  it('takes the base first, each variant, the demos with no .mid, and the step of 1 s', () => {
    const options = parseFitOptions([
      'fox-violinist',
      '--set',
      'violin@fox-red.slant=-20deg',
      '--demo',
      'brahms-2.mid',
      '--demo',
      'beethoven-8',
    ]);
    expect(options.variants).toEqual(['', 'violin@fox-red.slant=-20deg']);
    expect(options.demos).toEqual(['brahms-2', 'beethoven-8']);
    expect(options.step).toBe(FIT_STEP);
    expect(FIT_STEP).toBe(1);
    expect(parseFitOptions(['pianist', '--step', '0.5']).step).toBe(0.5);
    expect(parseFitOptions(['pianist', '--base', 'main']).base).toBe('main');
    expect(parseFitOptions(['pianist', '--json', 'out.json']).json).toBe('out.json');
  });

  it('stops on --base with --json', () => {
    expect(() => parseFitOptions(['pianist', '--base', 'main', '--json', 'out.json'])).toThrow(
      'do not go together',
    );
  });

  it('stops on an unknown role, an unknown option, a change that does not fit, or a bad step', () => {
    expect(() => parseFitOptions(['harpist'])).toThrow(/Usage/);
    expect(() => parseFitOptions(['pianist', '--gaps', 'x'])).toThrow(/not known/);
    expect(() => parseFitOptions(['pianist', '--set', 'piano.nothing=1'])).toThrow(/not known/);
    expect(() => parseFitOptions(['pianist', '--step', '0'])).toThrow(/above 0/);
    expect(() => parseFitOptions(['pianist', '--demo'])).toThrow(/no value/);
  });
});

describe('chooseDemos', () => {
  const withRole = ['a', 'beethoven-8', 'brahms-2', 'mozart-k525'];

  it('takes the demos of FIT_DEMOS with the role by default', () => {
    expect(FIT_DEMOS).toContain('beethoven-8');
    expect(FIT_DEMOS).toContain('mozart-k525');
    expect(chooseDemos([], withRole)).toEqual(['beethoven-8', 'mozart-k525']);
  });

  it('takes all demos of the role when none of FIT_DEMOS has it, or with all', () => {
    expect(chooseDemos([], ['a', 'b'])).toEqual(['a', 'b']);
    expect(chooseDemos(['all'], withRole)).toEqual(withRole);
  });

  it('takes the demos of --demo', () => {
    expect(chooseDemos(['brahms-2', 'a'], withRole)).toEqual(['a', 'brahms-2']);
  });
});

describe('worstPairs', () => {
  const role: RoleSweep = {
    ...VIOLINIST_SWEEP,
    contact: 0.015,
    accepted: [
      {
        part: 'paws',
        into: 'body',
        samples: 'play',
        depth: 0.05,
        reason: 'test',
        decision: 'test',
      },
    ],
  };
  const results: DemoResult[] = [
    {
      demo: 'a violinist 1 (rabbit, chair)',
      species: 'rabbit',
      headHeight: 0.3,
      sets: [
        {
          name: 'play',
          pairs: [pair('paws', 'body', 0.04), pair('bow', 'violin', 0.01)],
          gaps: [],
        },
      ],
      targets: [],
    },
    {
      demo: 'b violinist 2 (fox-red, chair)',
      species: 'fox-red',
      headHeight: 0.3,
      sets: [
        { name: 'play', pairs: [pair('bow', 'violin', 0.012)], gaps: [] },
        { name: 'lift', pairs: [pair('forearms', 'body', 0.02)], gaps: [] },
      ],
      targets: [],
    },
  ];

  it('gives the pair of each set nearest to its limit or most over it, with its demo', () => {
    const worst = worstPairs(role, results);
    expect(worst.map((w) => [w.set, w.demo, w.pair.part, w.pair.depth, w.limit])).toEqual([
      ['play', 'b violinist 2 (fox-red, chair)', 'bow', 0.012, 0.015],
      ['lift', 'b violinist 2 (fox-red, chair)', 'forearms', 0.02, 0.015],
    ]);
  });
});

describe('fitTable', () => {
  const reach: HoldReach = {
    arms: { L: 0.4, R: 0.4 },
    length: 0.25,
    scale: 0.5,
    scroll: 0.38,
    stopRange: [0, 1],
    bowRange: [0.03, 0.18],
    hairLength: 0.2,
    ruleFactor: 0.9,
  };
  const row: FitRow = {
    variant: '',
    folds: foldShares(FOLDS),
    depths: [
      { set: 'play', demo: 'a', pair: pair('paws', 'body', 0.02), limit: 0.015 },
      { set: 'lift', demo: 'a', pair: pair('bow', 'violin', 0.01), limit: 0.015 },
    ],
    reach: null,
    seconds: 1,
    results: [],
  };

  it('marks a depth over its limit and play folds over the goal of 1%', () => {
    const [header, , base] = fitTable([row]);
    expect(header).toBe(
      '| Variant | Play folds | Lift folds | play depth cm (limit) | lift depth cm (limit) |',
    );
    expect(base).toBe(
      '| base | 2.0% (2/100) OVER | 10.0% (1/10) | 2.0 paws>body (1.5) OVER | 1.0 bow>violin (1.5) |',
    );
  });

  it('gives back the rows of its JSON text, with NaN for a depth with no bone', () => {
    const none = { ...pair('claws', 'body', 0), bone: null, along: Number.NaN };
    const results: DemoResult[] = [
      {
        demo: 'a violinist 1 (rabbit, chair)',
        species: 'rabbit',
        headHeight: 0.3,
        sets: [{ name: 'play', pairs: [none], gaps: [] }],
        targets: [],
      },
    ];
    const run = {
      demos: ['a'],
      rows: [{ ...row, depths: [{ set: 'play', demo: 'a', pair: none, limit: 0.015 }], results }],
    };
    expect(readFit(fitJson(run))).toEqual(run);
  });

  it('adds the rule scale, the violin length, and the reached ranges for a violin role', () => {
    const lines = fitTable([{ ...row, variant: 'violin.lean=1', reach }]);
    expect(lines[0]).toContain('| Rule scale | Violin m | stopRange | bowRange |');
    expect(lines[2]).toMatch(
      /^\| violin\.lean=1 \| .* \| 0\.450 \| 0\.250 \| 0\.00 to 1\.00 \| 0\.030 to 0\.180 m of 0\.200 m \|$/,
    );
  });
});

describe('fitSweep', async () => {
  const scene = sceneOf((await patchedDemo('brahms-2.mid')).bytes);

  it('sweeps only the bodies of the role in the sweep role that holds them', () => {
    const foxes = foldRole('fox-violinist');
    const rabbits = foldRole('violinist');
    const foxModels = new Set(roleBodies(foxes, scene).map((body) => body.model));
    const rabbitModels = new Set(roleBodies(rabbits, scene).map((body) => body.model));
    const foxSweep = fitSweep(foxes, scene);
    const rabbitSweep = fitSweep(rabbits, scene);

    expect(foxSweep?.role).toBe('violinist');
    expect(rabbitSweep?.role).toBe('violinist');
    const foxPlayers = foxSweep?.players(scene) ?? [];
    const rabbitPlayers = rabbitSweep?.players(scene) ?? [];
    expect(foxPlayers.length).toBeGreaterThan(0);
    expect(rabbitPlayers.length).toBeGreaterThan(0);
    expect(foxPlayers.every((player) => foxModels.has(player.model))).toBe(true);
    expect(rabbitPlayers.every((player) => rabbitModels.has(player.model))).toBe(true);
  });
});
