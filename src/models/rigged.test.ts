import { describe, expect, it } from 'vitest';

import { BONE_NAMES } from './rig.ts';
import { RIGGED_JOINTS, decodeRigged } from './rigged.ts';
import { FOX_RED_RIGGED } from './rigged/fox-red.ts';

describe('decodeRigged', () => {
  const mesh = decodeRigged(FOX_RED_RIGGED.mesh, FOX_RED_RIGGED.regions);
  const joints = new Set<number>(RIGGED_JOINTS.map((joint) => BONE_NAMES.indexOf(joint)));

  it('gives the fox of route B its triangles, with three corners each (design 4.4)', () => {
    const triangles = mesh.finishes.length;

    expect(triangles).toBeGreaterThan(1800);
    expect(triangles).toBeLessThanOrEqual(2600);
    expect(mesh.positions).toHaveLength(triangles * 9);
    expect(mesh.skin?.indices).toHaveLength(triangles * 12);
  });

  it('gives each corner up to four bones of the rigged joints, with weights that add up to 1', () => {
    const { indices = new Uint8Array(), weights = new Float32Array() } = mesh.skin ?? {};
    for (let c = 0; c < mesh.bones.length; c++) {
      let sum = 0;
      for (let k = c * 4; k < c * 4 + 4; k++) {
        sum += weights[k] ?? 0;
        if ((weights[k] ?? 0) > 0) {
          expect(joints.has(indices[k] ?? -1)).toBe(true);
        }
      }
      expect(sum).toBeCloseTo(1, 6);
    }
  });

  it('makes the bone with the largest weight the main bone, and the next one the second bone', () => {
    const { indices = new Uint8Array(), weights = new Float32Array() } = mesh.skin ?? {};
    for (let c = 0; c < mesh.bones.length; c++) {
      const [first = 0, second = 0, third = 0] = weights.slice(c * 4, c * 4 + 3);
      expect(first).toBeGreaterThanOrEqual(second);
      expect(second).toBeGreaterThanOrEqual(third);
      expect(mesh.bones[c]).toBe(indices[c * 4]);
      expect(mesh.blendWeights[c]).toBeCloseTo(second / (first + second), 6);
      expect(mesh.blendWeights[c]).toBeLessThanOrEqual(0.5);
    }
  });

  it('refuses a triangle with a region that does not exist', () => {
    expect(() => decodeRigged(FOX_RED_RIGGED.mesh, [])).toThrow(/region/);
  });
});
