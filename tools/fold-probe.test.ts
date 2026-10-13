import { describe, expect, it } from 'vitest';

import { patchedDemo } from './patch-demos.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
import {
  FOLD_ROLES,
  SAMPLE_SETS,
  foldLines,
  foldedFaces,
  mainBone,
  probeFolds,
} from './fold-probe.ts';

/** The identity matrix, column by column. */
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/**
 * Makes a mesh of one triangle: the first two corners on bone 0, the third corner on bone 1.
 *
 * @returns The mesh.
 */
function triangle(): Parameters<typeof foldedFaces>[0] {
  return {
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    joints: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]),
    weights: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
    corners: new Uint32Array([0, 1, 2]),
  };
}

describe('foldedFaces', () => {
  it('finds no fold in the bind pose', () => {
    const mesh = triangle();
    expect(foldedFaces(mesh, [...IDENTITY, ...IDENTITY], mesh.positions)).toEqual([]);
  });

  it('finds a face whose corner moves across the opposite edge', () => {
    const mesh = triangle();
    // Bone 1 moves the third corner 2 m down: from (0, 1, 0) to (0, -1, 0).
    const moved = [...IDENTITY.slice(0, 12), 0, -2, 0, 1];
    const posed = new Float32Array([0, 0, 0, 1, 0, 0, 0, -1, 0]);
    expect(foldedFaces(mesh, [...IDENTITY, ...moved], posed)).toEqual([0]);
  });
});

describe('mainBone', () => {
  it('gives the studio bone with the largest weight over the corners', () => {
    expect(mainBone(triangle(), 0)).toBe(STUDIO_BONES[0]);
  });
});

describe('probeFolds', async () => {
  const boulanger = await patchedDemo('boulanger-matin.mid');
  const beethoven = await patchedDemo('beethoven-9.mid');
  const pianist = FOLD_ROLES.get('pianist');
  if (!pianist) {
    throw new Error('The pianist has no role.');
  }

  it('counts each sample set of the demos with the role, and skips the other demos', () => {
    const report = probeFolds(pianist, [boulanger, beethoven], 8);
    expect(report.demos).toEqual(['boulanger-matin.mid']);
    expect(report.faces).toBeGreaterThan(1000);
    expect(report.sets.rest.samples).toBe(1);
    for (const set of SAMPLE_SETS) {
      const count = report.sets[set];
      expect(count.samples, set).toBeGreaterThan(0);
      expect(count.withFold, set).toBeLessThanOrEqual(count.samples);
      for (const bone of count.bones.keys()) {
        expect(STUDIO_BONES, bone).toContain(bone);
      }
    }

    const lines = foldLines('pianist', report, 8);
    for (const set of [...SAMPLE_SETS, 'all']) {
      expect(
        lines.some((line) => line.startsWith(`| ${set} |`)),
        set,
      ).toBe(true);
    }
  }, 30_000);
});
