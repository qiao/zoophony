import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { MeshBuilder, srgb } from '../src/models/mesh.ts';
import type { MeshData } from '../src/models/mesh.ts';
import { BONE_NAMES } from '../src/models/rig.ts';
import { demoSceneOf } from '../src/pose/test-scene.ts';
import type { AnimalPose } from '../src/pose/types.ts';
import {
  POSE_SETS,
  STEP_DIGITS,
  compareProbes,
  errorCause,
  jointsOf,
  meshHash,
  poseValues,
  probeBodies,
  probeRef,
  probeScenePoses,
  round,
  stepHash,
  summarize,
} from './body-probe.ts';
import type { DemoPoses, Probe } from './body-probe.ts';

/**
 * Builds a mesh of one triangle.
 *
 * @param x The x of the first corner.
 * @returns The mesh data.
 */
function triangle(x: number): MeshData {
  const builder = new MeshBuilder();
  builder.add([x, 0, 0, 1, 0, 0, 0, 1, 0], { color: srgb('#808080') });
  return builder.build();
}

/**
 * Builds a pose with no rotation, with one changed value of the rotations.
 *
 * @param change The change of the x of the rotation of the head.
 * @returns The pose.
 */
function pose(change: number): AnimalPose {
  const rotations = new Float32Array(BONE_NAMES.length * 4);
  for (let bone = 0; bone < BONE_NAMES.length; bone++) {
    rotations[bone * 4 + 3] = 1;
  }
  rotations[BONE_NAMES.indexOf('head') * 4] = change;
  return { rotations, rootOffset: [0, 0, 0], slideOffset: [0, 0, 0], blink: 0 };
}

/**
 * Builds a probe that holds only the poses of one demo.
 *
 * @param poses The poses of the demo.
 * @returns The probe.
 */
function posesProbe(poses: DemoPoses): Probe {
  return { species: {}, players: {}, poses: { demo: poses } };
}

describe('meshHash', () => {
  it('gives the same hash for the same mesh', () => {
    expect(meshHash(triangle(0))).toBe(meshHash(triangle(0)));
  });

  it('changes when a corner moves by a millimeter', () => {
    expect(meshHash(triangle(0.001))).not.toBe(meshHash(triangle(0)));
  });

  it('ignores a move below a micrometer', () => {
    expect(meshHash(triangle(1e-8))).toBe(meshHash(triangle(0)));
  });
});

describe('round', () => {
  it('rounds to micrometers with no negative zero', () => {
    expect(round(0.1234567)).toBe(0.123457);
    expect(Object.is(round(-1e-9), 0)).toBe(true);
  });
});

describe('probeBodies', () => {
  it('gives the same output on each run', () => {
    expect(JSON.stringify(probeBodies())).toBe(JSON.stringify(probeBodies()));
  });

  it('probes each species on each support and the conductor', () => {
    const probe = probeBodies();
    expect(Object.keys(probe.species)).toContain('bear');
    expect(Object.keys(probe.species['bear'] ?? {})).toEqual([
      'chair',
      'stool',
      'high-stool',
      'bench',
      'stand',
    ]);
    expect(Object.keys(probe.players)).toContain('conductor/bear/baton');
  });
});

describe('jointsOf', () => {
  it('lists the joints in name order after the head height', () => {
    const probe = probeBodies();
    const joints = Object.keys(probe.species['cat']?.['chair']?.joints ?? {});
    expect(joints[0]).toBe('headHeight');
    const bones = joints.slice(1, joints.indexOf('headCenter'));
    expect(bones).toEqual(bones.toSorted((a, b) => a.localeCompare(b)));
    expect(jointsOf).toBeTypeOf('function');
  });
});

describe('poseValues and stepHash', () => {
  it('give two hashes for two poses that differ by a thousandth', () => {
    expect(stepHash(poseValues(pose(0.001)))).not.toBe(stepHash(poseValues(pose(0))));
  });

  it('give one hash for two poses that differ below a millionth', () => {
    expect(poseValues(pose(1e-8))).toEqual(poseValues(pose(0)));
    expect(stepHash(poseValues(pose(-1e-8)))).toBe(stepHash(poseValues(pose(0))));
  });

  it('give a short hash of a fixed length', () => {
    expect(stepHash(poseValues(pose(0.5)))).toMatch(new RegExp(`^[0-9a-f]{${STEP_DIGITS}}$`));
  });
});

describe('probeScenePoses', () => {
  it('gives the same poses on each run, with a short hash for each sample', async () => {
    const scene = await demoSceneOf('mozart-k525.mid');
    const poses = probeScenePoses(scene);
    expect(JSON.stringify(probeScenePoses(scene))).toBe(JSON.stringify(poses));
    expect(Object.keys(poses.samples)).toEqual([...POSE_SETS]);
    expect(Object.keys(poses.players)).toHaveLength(scene.layout.players.length + 1);
    for (const sets of Object.values(poses.players)) {
      for (const name of POSE_SETS) {
        const count = poses.samples[name]?.length ?? 0;
        expect(count).toBeGreaterThan(0);
        expect(sets[name]?.steps).toHaveLength(count * STEP_DIGITS);
      }
    }
  });

  it('names only the player whose pose changed', async () => {
    const scene = await demoSceneOf('mozart-k525.mid');
    const base = probeScenePoses(scene);
    const players = scene.plan.players.map((plan, i) =>
      i === 2 ? { ...plan, lookYaw: plan.lookYaw + 0.2 } : plan,
    );
    const next = probeScenePoses({ ...scene, plan: { ...scene.plan, players } });
    const { differences } = compareProbes(posesProbe(base), posesProbe(next));
    expect(differences).toHaveLength(1);
    expect(differences[0]).toMatch(/^pose demo 2 [a-z-]+\/[a-z-]+\/[a-z-]+: .* from sample \d+/);
  });
});

describe('compareProbes', () => {
  it('finds no difference between two runs', () => {
    const bodies = probeBodies();
    const { counts, differences } = compareProbes(
      { ...bodies, poses: {} },
      { ...probeBodies(), poses: {} },
    );
    expect(counts).toHaveLength(3);
    expect(differences).toEqual([]);
  });

  it('names a body whose mesh changed and the bones of a moved player', () => {
    const base = { ...probeBodies(), poses: {} };
    const cat = base.species['cat'];
    const player = base.players['viola/cat/viola'];
    if (!cat?.['chair'] || !player) {
      throw new Error('The probe has no cat on a chair.');
    }
    const next = {
      ...base,
      species: { ...base.species, cat: { ...cat, chair: { ...cat['chair'], mesh: 'x' } } },
      players: {
        ...base.players,
        'viola/cat/viola': {
          ...player,
          skeleton: { ...player.skeleton, head: [0, 0, 0] as const },
        },
      },
    };
    const { differences } = compareProbes(base, next);
    expect(differences).toContain('body cat chair: mesh differs, joints same');
    expect(
      differences.some(
        (line) => line.startsWith('player viola/cat/viola') && line.endsWith('head'),
      ),
    ).toBe(true);
  });

  it('gives the first sample of a set whose short hash differs', () => {
    const samples = {
      rest: [[-2, 10] as const],
      play: [0, 1, 2, 3].map((t) => [t, 12 + t] as const),
    };
    const steps = (changed: number): string =>
      [0, 1, 2, 3].map((i) => (i === changed ? 'ffffff' : '000000')).join('');
    const poses = (changed: number): DemoPoses => ({
      samples,
      players: {
        '0 viola/cat/viola': {
          rest: { hash: 'a', steps: '000000' },
          play: { hash: changed < 0 ? 'b' : 'c', steps: steps(changed) },
        },
      },
    });
    const { counts, differences } = compareProbes(posesProbe(poses(-1)), posesProbe(poses(2)));
    expect(counts).toContain('pose sets equal: 1 of 2');
    expect(differences).toEqual([
      'pose demo 0 viola/cat/viola: play from sample 3 of 4 (song 2.00 s, wall 14.00 s)',
    ]);
  });

  it('reads the missing poses of a file of an older tool as empty', () => {
    const bodies = probeBodies();
    const older: Probe = { species: bodies.species, players: bodies.players };
    const poses: DemoPoses = { samples: {}, players: { 'conductor/bear/baton': {} } };
    const { counts, differences } = compareProbes(older, { ...bodies, poses: { demo: poses } });
    expect(counts).toContain('pose sets equal: 0 of 4');
    expect(differences).toEqual(['poses missing in the base']);
    expect(compareProbes({ ...bodies, poses: {} }, older).differences).toEqual([
      'poses missing in the new probe',
    ]);
  });

  it('names a player that one probe does not have', () => {
    const poses: DemoPoses = { samples: {}, players: { 'conductor/bear/baton': {} } };
    const { differences } = compareProbes(
      posesProbe(poses),
      posesProbe({ samples: {}, players: {} }),
    );
    expect(differences).toEqual(['pose demo conductor/bear/baton: missing in the new probe']);
  });
});

describe('summarize', () => {
  it('counts the parts of a probe and hashes its JSON', () => {
    const sets = { rest: { hash: 'a', steps: '' }, play: { hash: 'b', steps: '' } };
    const probe: Probe = {
      species: {
        cat: {
          chair: { joints: {}, triangles: 1, mesh: 'm' },
          stand: { joints: {}, triangles: 1, mesh: 'n' },
        },
      },
      players: {},
      poses: { demo: { samples: {}, players: { '0 viola/cat/viola': sets, conductor: sets } } },
    };
    const json = JSON.stringify(probe);
    expect(summarize(probe, json)).toEqual([
      'species 1, bodies 2, players 0, demos 1, pose sets 4',
      `sha256 of the JSON: ${createHash('sha256').update(json).digest('hex')}`,
    ]);
  });
});

describe('errorCause', () => {
  it('keeps the lines before the stack of an error', () => {
    const errors = [
      'file:///tmp/body-probe-x/tools/body-probe.ts:37',
      "import { LOWER_MAX_SEC } from '../src/pose/rest.ts';",
      "SyntaxError: The requested module '../src/pose/rest.ts' does not provide an export named 'LOWER_MAX_SEC'",
      '    at ModuleJob._instantiate (node:internal/modules/esm/module_job:180:21)',
      '    at async ModuleJob.run (node:internal/modules/esm/module_job:369:5)',
      '',
      'Node.js v24.10.0',
    ].join('\n');
    expect(errorCause(errors).split('\n')).toEqual([
      'file:///tmp/body-probe-x/tools/body-probe.ts:37',
      "import { LOWER_MAX_SEC } from '../src/pose/rest.ts';",
      "SyntaxError: The requested module '../src/pose/rest.ts' does not provide an export named 'LOWER_MAX_SEC'",
    ]);
  });

  it('keeps all lines when there is no stack', () => {
    expect(errorCause('fatal: not a valid object name no-such-ref\n')).toBe(
      'fatal: not a valid object name no-such-ref',
    );
  });
});

describe('probeRef', () => {
  it('probes a commit in a temporary folder, and removes the folder also after a failure', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'probe-ref-test-'));
    try {
      // The poses take most of the time of a probe, and this test checks the folder only.
      const running = probeRef('HEAD', parent, false);
      // The child starts before the first await, so the probe of the caller runs beside it.
      const [dir] = readdirSync(parent);
      expect(existsSync(join(parent, dir ?? '', 'tools', 'body-probe.ts'))).toBe(true);
      const base = await running;
      expect(Object.keys(base.species['bear'] ?? {})).toContain('stand');
      expect(Object.keys(base.players)).toContain('conductor/bear/baton');
      expect(base.poses).toBeUndefined();
      expect(await readdir(parent)).toEqual([]);

      await expect(probeRef('no-such-ref', parent, false)).rejects.toThrow('no-such-ref');
      expect(await readdir(parent)).toEqual([]);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  }, 30_000);
});
