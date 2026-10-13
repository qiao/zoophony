import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { STUDIO_BONES, unpackStudioMesh } from '../src/models/studio-format.ts';
import { studioBody, studioModule } from './studio-body.ts';

/** The GLB file of the studio bear. */
const SOURCE = 'lowpoly-studio/animals/bear/out/bear.glb';

describe('pnpm studio-body (design 4.4)', async () => {
  const bytes = await readFile(join(import.meta.dirname, '..', SOURCE));
  const { body, sheetWeights } = studioBody(bytes, SOURCE, {
    shoulderHeight: 1,
    constant: 'STUDIO_BEAR',
  });
  const mesh = unpackStudioMesh(body.mesh);

  it('scales the animal so that its shoulder joints are at the height of the settings', () => {
    expect(body.heads.upper_arm_L[1]).toBeCloseTo(1, 5);
    expect(body.heads.upper_arm_R[1]).toBeCloseTo(1, 5);
    expect(body.scale).toBeGreaterThan(1);
  });

  it('turns the animal to face -z with its left side at -x', () => {
    expect(body.heads.upper_arm_L[0]).toBeLessThan(0);
    expect(body.heads.upper_arm_R[0]).toBeGreaterThan(0);
    expect(body.nose[2]).toBeLessThan(body.headCenter[2]);
    expect(body.heads.eye_L[0]).toBeLessThan(0);
  });

  it('keeps the two sides of the skeleton mirror images', () => {
    for (const bone of STUDIO_BONES.filter((b) => b.endsWith('_L'))) {
      const left = body.heads[bone];
      const right = body.heads[STUDIO_BONES.find((b) => b === bone.replace(/_L$/, '_R')) ?? bone];
      expect(right[0], bone).toBeCloseTo(-left[0], 5);
      expect(right[1], bone).toBeCloseTo(left[1], 5);
      expect(right[2], bone).toBeCloseTo(left[2], 5);
    }
  });

  it('keeps the body and the eyes, and drops the baton of the studio', () => {
    expect(mesh.corners.length / 3).toBeGreaterThan(2000);
    const used = new Set<number>();
    for (let v = 0; v < mesh.weights.length; v++) {
      if ((mesh.weights[v] ?? 0) > 0) {
        used.add(mesh.joints[v] ?? 0);
      }
    }
    expect(used.has(STUDIO_BONES.indexOf('eye_L'))).toBe(true);
    expect(used.has(STUDIO_BONES.indexOf('eye_R'))).toBe(true);
    expect(Math.max(...used)).toBeLessThan(STUDIO_BONES.length);
  });

  it('gives each vertex weights that add up to 1', () => {
    for (let v = 0; v < mesh.positions.length / 3; v++) {
      const sum = [0, 1, 2, 3].reduce((s, k) => s + (mesh.weights[v * 4 + k] ?? 0), 0);
      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it('keeps the faces turned outward', () => {
    // The signed volume of the closed shells is positive when the faces point out.
    let volume = 0;
    const at = (v: number, k: number): number => mesh.positions[v * 3 + k] ?? 0;
    for (let t = 0; t < mesh.corners.length; t += 3) {
      const [a, b, c] = [mesh.corners[t] ?? 0, mesh.corners[t + 1] ?? 0, mesh.corners[t + 2] ?? 0];
      volume +=
        (at(a, 0) * (at(b, 1) * at(c, 2) - at(b, 2) * at(c, 1)) -
          at(a, 1) * (at(b, 0) * at(c, 2) - at(b, 2) * at(c, 0)) +
          at(a, 2) * (at(b, 0) * at(c, 1) - at(b, 1) * at(c, 0))) /
        6;
    }
    expect(volume).toBeGreaterThan(0);
  });

  it('moves only the skin of its own side with each corrective shape', () => {
    const [left, right] = mesh.correctives;
    expect(left && right).toBeTruthy();
    let movedLeft = 0;
    for (let v = 0; v < mesh.positions.length / 3; v++) {
      const x = mesh.positions[v * 3] ?? 0;
      const moveLeft = Math.hypot(...[0, 1, 2].map((k) => left?.[v * 3 + k] ?? 0));
      const moveRight = Math.hypot(...[0, 1, 2].map((k) => right?.[v * 3 + k] ?? 0));
      if (moveLeft > 0) {
        movedLeft += 1;
        expect(x).toBeLessThan(0.05);
      }
      if (moveRight > 0) {
        expect(x).toBeGreaterThan(-0.05);
      }
    }
    expect(movedLeft).toBeGreaterThan(100);
  });

  it('gives the corrective shapes their full weight in the pose of the sheet', () => {
    expect(sheetWeights).toEqual([1, 1]);
    // The arms of the sheet hang down and a little out.
    expect(body.sheetArms.L[1]).toBeLessThan(-0.5);
    expect(body.sheetArms.L[0]).toBeLessThan(0);
    expect(body.sheetArms.R[0]).toBeGreaterThan(0);
  });

  it('writes a module with the constant of the body', () => {
    const text = studioModule('bear', 'STUDIO_BEAR', body);
    expect(text).toContain('export const STUDIO_BEAR: StudioBody = {');
    expect(text).toContain(body.sha256);
  });
});
