import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { MeshBuilder, srgb } from '../src/models/mesh.ts';
import type { MeshData } from '../src/models/mesh.ts';
import { compareProbes, jointsOf, meshHash, probeRef, round, runProbe } from './body-probe.ts';

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

describe('runProbe', () => {
  it('gives the same output on each run', () => {
    expect(JSON.stringify(runProbe())).toBe(JSON.stringify(runProbe()));
  });

  it('probes each species on each support and the conductor', () => {
    const probe = runProbe();
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
    const probe = runProbe();
    const joints = Object.keys(probe.species['cat']?.['chair']?.joints ?? {});
    expect(joints[0]).toBe('headHeight');
    const bones = joints.slice(1, joints.indexOf('headCenter'));
    expect(bones).toEqual(bones.toSorted((a, b) => a.localeCompare(b)));
    expect(jointsOf).toBeTypeOf('function');
  });
});

describe('compareProbes', () => {
  it('finds no difference between two runs', () => {
    expect(compareProbes(runProbe(), runProbe())).toHaveLength(2);
  });

  it('names a body whose mesh changed and the bones of a moved player', () => {
    const base = runProbe();
    const cat = base.species['cat'];
    const player = base.players['viola/cat/viola'];
    if (!cat?.['chair'] || !player) {
      throw new Error('The probe has no cat on a chair.');
    }
    const next = {
      species: { ...base.species, cat: { ...cat, chair: { ...cat['chair'], mesh: 'x' } } },
      players: {
        ...base.players,
        'viola/cat/viola': {
          ...player,
          skeleton: { ...player.skeleton, head: [0, 0, 0] as const },
        },
      },
    };
    const lines = compareProbes(base, next);
    expect(lines).toContain('body cat chair: mesh differs, joints same');
    expect(
      lines.some((line) => line.startsWith('player viola/cat/viola') && line.endsWith('head')),
    ).toBe(true);
  });
});

describe('probeRef', () => {
  it('probes a commit in a temporary folder, and removes the folder also after a failure', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'probe-ref-test-'));
    try {
      const base = await probeRef('HEAD', parent);
      expect(Object.keys(base.species['bear'] ?? {})).toContain('stand');
      expect(Object.keys(base.players)).toContain('conductor/bear/baton');
      expect(await readdir(parent)).toEqual([]);

      await expect(probeRef('no-such-ref', parent)).rejects.toThrow('no-such-ref');
      expect(await readdir(parent)).toEqual([]);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  }, 30_000);
});
