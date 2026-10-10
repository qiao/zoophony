import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { srgb } from '../mesh.ts';
import { buildPlayer } from '../player.ts';
import { boneIndex } from '../rig.ts';
import type { BoneName } from '../rig.ts';
import { NOSE_COLOR, SPECIES } from '../species.ts';

const bear = buildPlayer('bear', 'baton');
const h = bear.body.headHeight;

/**
 * Gives the triangles of some bones: the three corners and the color of the first corner.
 *
 * @param bones The bones.
 * @returns The triangles.
 */
function trianglesOf(bones: readonly BoneName[]): { corners: Vector3[]; color: number[] }[] {
  const wanted = new Set(bones.map(boneIndex));
  const { positions, colors, bones: cornerBones } = bear.mesh;
  const out: { corners: Vector3[]; color: number[] }[] = [];
  for (let t = 0; t < cornerBones.length / 3; t++) {
    if (wanted.has(cornerBones[t * 3] ?? -1)) {
      out.push({
        corners: [0, 1, 2].map((k) => new Vector3().fromArray(positions, (t * 3 + k) * 3)),
        color: [0, 1, 2].map((k) => colors[t * 9 + k] ?? 0),
      });
    }
  }
  return out;
}

/**
 * Tells if two linear colors are the same, after the 32-bit floats of the mesh.
 *
 * @param a The first color.
 * @param b The second color.
 * @returns True for the same color.
 */
function sameColor(a: readonly number[], b: readonly number[]): boolean {
  return a.every((v, i) => Math.abs(v - (b[i] ?? 0)) < 1e-6);
}

describe('the bear body of bear-views.png (design 4.4)', () => {
  it('builds the torso as one part on spine, and each leg as one part on its thigh', () => {
    // A split of the torso at the chest bone kept 0.4 of the light along the split, because the
    // baked occlusion counted the triangles of the other bone on one side of the hollow back as a
    // fold. A shin on its own bone gave a dark ring at the knee.
    expect(SPECIES.bear.body).toBe('bear');
    expect(trianglesOf(['spine']).length).toBeGreaterThan(0);
    expect(trianglesOf(['thighL', 'thighR']).length).toBeGreaterThan(0);
    for (const bone of ['chest', 'shinL', 'shinR'] as const) {
      expect(trianglesOf([bone]), bone).toHaveLength(0);
    }
  });

  it('paints only the muzzle tan, so that the eyes sit on the fur', () => {
    const muzzle = srgb(SPECIES.bear.colors.accent);
    const fur = srgb(SPECIES.bear.colors.fur);
    const skull = trianglesOf(['head']);
    const middle = (corners: readonly Vector3[]): Vector3 =>
      corners.reduce((sum, c) => sum.add(c), new Vector3()).divideScalar(3);
    for (const eye of ['eyeL', 'eyeR'] as const) {
      const at = new Vector3(...(bear.skeleton.positions[boneIndex(eye)] ?? [0, 0, 0]));
      const near = skull.filter((t) => middle(t.corners).distanceTo(at) < 0.07 * h);
      expect(near.length, eye).toBeGreaterThan(0);
      for (const t of near) {
        expect(sameColor(t.color, fur), eye).toBe(true);
      }
    }
    // The front of the muzzle, under the nose, is tan.
    const mouth = new Vector3(...bear.body.mouth);
    const front = skull.filter((t) => middle(t.corners).distanceTo(mouth) < 0.15 * h);
    expect(front.length).toBeGreaterThan(0);
    expect(front.every((t) => sameColor(t.color, muzzle))).toBe(true);
  });

  it('stands with the soles on the floor, and gives the paws and the feet dark claws', () => {
    const dark = srgb(NOSE_COLOR);
    for (const bone of ['footL', 'footR'] as const) {
      const feet = trianglesOf([bone]);
      const lowest = Math.min(...feet.flatMap((t) => t.corners.map((c) => c.y)));
      expect(lowest, bone).toBeCloseTo(0, 6);
      expect(
        feet.some((t) => sameColor(t.color, dark)),
        bone,
      ).toBe(true);
    }
    for (const bone of ['fingersL', 'fingersR'] as const) {
      expect(
        trianglesOf([bone]).some((t) => sameColor(t.color, dark)),
        bone,
      ).toBe(true);
    }
  });
});
