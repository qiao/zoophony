import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BONE_NAMES } from '../src/models/rig.ts';
import {
  RIG_BONES,
  ROUTE_B_PALETTE,
  accessorValues,
  packRigged,
  quantizeSkin,
  readGlb,
  riggedConstant,
  roleOf,
  speciesRegions,
} from './pack-rigged.ts';
import { RIGGED_JOINTS, WEIGHT_UNITS, decodeRigged } from './rigged-format.ts';
import { SCULPT_STEP } from './sculpt-format.ts';

/** The GLB file of the route B fox (design 4.4). */
const FOX_GLB = join(
  import.meta.dirname,
  '..',
  'docs',
  'research',
  '2026-10-08-fox-spike-gated',
  'fox.glb',
);

/** The GLB file of the fox, read one time. */
const glb = readGlb(new Uint8Array(readFileSync(FOX_GLB)));

/** The packed fox, one time. */
const fox = packRigged(glb, speciesRegions('fox-red'));

describe('quantizeSkin', () => {
  it('keeps the four largest weights in steps that add up to 1, the largest first', () => {
    const [bones, units] = quantizeSkin([
      [3, 0.1],
      [5, 0.5],
      [7, 0.05],
      [9, 0.2],
      [11, 0.15],
    ]);

    expect(bones).toEqual([5, 9, 11, 3]);
    expect(units.reduce((sum, u) => sum + u, 0)).toBe(WEIGHT_UNITS);
    expect(units[0]).toBeGreaterThan(units[1] ?? Infinity);
  });

  it('joins the weights of one bone, and fills the empty slots with the main bone', () => {
    expect(
      quantizeSkin([
        [4, 0.25],
        [4, 0.25],
        [2, 0.5],
      ]),
    ).toEqual([
      [2, 4, 2, 2],
      [128, 127, 0, 0],
    ]);
  });

  it('refuses a vertex with no weight', () => {
    expect(() => quantizeSkin([[1, 0]])).toThrow(/no bone/);
  });
});

describe('roleOf', () => {
  it('finds the role of each color of the palette of route B', () => {
    for (const [role, color] of Object.entries(ROUTE_B_PALETTE)) {
      expect(roleOf(color)).toBe(role);
    }
    expect(roleOf('#da7035')).toBe('fur');
  });
});

describe('packRigged', () => {
  it('maps each bone of the rig onto a bone of the player (design 4.7)', () => {
    const skin = glb.json.skins[0];
    const names = skin?.joints.map((node) => glb.json.nodes[node]?.name);

    expect(names?.toSorted()).toEqual(Object.keys(RIG_BONES).toSorted());
    expect(Object.keys(fox.joints).toSorted()).toEqual([...RIGGED_JOINTS].toSorted());
  });

  it('turns the axes of glTF into the axes of the model', () => {
    // The left hand holds the violin out to the left (-x) and to the front (-z), and the head
    // is above the chest.
    expect(fox.joints.handL[0]).toBeLessThan(-0.2);
    expect(fox.joints.handL[2]).toBeLessThan(-0.2);
    expect(fox.joints.head[1]).toBeGreaterThan(fox.joints.chest[1]);
    expect(fox.joints.eyeL[0]).toBeLessThan(fox.joints.eyeR[0]);
    expect(fox.nose[2]).toBeLessThan(fox.joints.eyeL[2]);
  });

  it('keeps each triangle and each corner of the GLB file, with its place and its skin', () => {
    const mesh = decodeRigged(fox.mesh, fox.regions);
    const primitives = glb.json.meshes[0]?.primitives ?? [];
    const glbTriangles = primitives.reduce(
      (sum, p) => sum + accessorValues(glb, p.indices).length / 3,
      0,
    );
    const points = new Set<string>();
    for (const p of primitives) {
      const positions = accessorValues(glb, p.attributes['POSITION'] ?? -1);
      for (let v = 0; v < positions.length; v += 3) {
        const step = (value: number): number => Math.round(value / SCULPT_STEP);
        points.add(
          [-(positions[v] ?? 0), positions[v + 1] ?? 0, -(positions[v + 2] ?? 0)].map(step).join(),
        );
      }
    }

    expect(mesh.finishes).toHaveLength(glbTriangles);
    for (let c = 0; c < mesh.bones.length; c++) {
      const step = (axis: number): number =>
        Math.round((mesh.positions[c * 3 + axis] ?? 0) / SCULPT_STEP);
      expect(points.has([step(0), step(1), step(2)].join())).toBe(true);
      const weights = mesh.skinWeights.slice(c * 4, c * 4 + 4);
      expect(weights.reduce((sum, w) => sum + w, 0)).toBeCloseTo(1, 6);
    }
  });

  it('puts the eyes on the eye bones, so that they blink (design 4.7)', () => {
    const mesh = decodeRigged(fox.mesh, fox.regions);
    const eyes = new Set([BONE_NAMES.indexOf('eyeL'), BONE_NAMES.indexOf('eyeR')]);
    const eyeCorners = [...mesh.bones.keys()].filter((c) => eyes.has(mesh.bones[c] ?? -1));

    expect(eyeCorners.length).toBeGreaterThan(100);
    for (const c of eyeCorners) {
      expect(mesh.skinWeights[c * 4]).toBe(1);
      const left = (mesh.positions[c * 3] ?? 0) < 0;
      expect(mesh.bones[c]).toBe(BONE_NAMES.indexOf(left ? 'eyeL' : 'eyeR'));
    }
  });

  it('gives the regions the stage colors of the species (design 4.5)', () => {
    const regions = speciesRegions('fox-red');

    expect(fox.regions).toContainEqual(regions.fur);
    expect(fox.regions).toContainEqual(regions.iris);
    expect(regions.fur.color).toBe('#f0934c');
  });

  it('names the constant of a module after the species', () => {
    expect(riggedConstant('fox-red')).toBe('FOX_RED_RIGGED');
  });
});
