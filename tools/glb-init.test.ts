import { describe, expect, it } from 'vitest';

import type { Vec3 } from '../src/models/tuples.ts';
import { jointMap, proposeConfig } from './glb-init.ts';
import type { GlbInspection } from './glb-init.ts';

/** The colors of the synthetic figure, in sRGB. */
const FUR: Vec3 = [0.8, 0.78, 0.75];
const PINK: Vec3 = [0.9, 0.6, 0.6];
const EYE: Vec3 = [0.1, 0.08, 0.07];
const RIM: Vec3 = [0.55, 0.42, 0.4];

/** The joints of a Mixamo skeleton of the figure, in the axes of Blender. */
function mixamoHeads() {
  const entries: [string, Vec3][] = [
    ['mixamorig:Hips', [0, 0, 0.6]],
    ['mixamorig:Spine', [0, 0, 0.75]],
    ['mixamorig:Spine1', [0, 0, 0.9]],
    ['mixamorig:Spine2', [0, 0, 1]],
    ['mixamorig:Neck', [0, 0, 1.2]],
    ['mixamorig:Head', [0, -0.02, 1.25]],
    ['headfront', [0, -0.2, 1.25]],
  ];
  for (const [side, x] of [
    ['Left', 1],
    ['Right', -1],
  ] as const) {
    entries.push(
      [`mixamorig:${side}Shoulder`, [0.05 * x, 0, 1.15]],
      [`mixamorig:${side}Arm`, [0.2 * x, 0, 1.15]],
      [`mixamorig:${side}ForeArm`, [0.4 * x, 0, 1.15]],
      [`mixamorig:${side}Hand`, [0.6 * x, 0, 1.15]],
      [`mixamorig:${side}UpLeg`, [0.12 * x, 0, 0.55]],
      [`mixamorig:${side}Leg`, [0.12 * x, 0, 0.3]],
      [`mixamorig:${side}Foot`, [0.12 * x, 0, 0.1]],
      [`mixamorig:${side}ToeBase`, [0.12 * x, -0.1, 0.02]],
    );
  }
  return Object.fromEntries(entries);
}

/**
 * Builds the inspection of a figure from small triangles: a head from z 1.2 to the crown at 1.5,
 * pink ears up to z 1.7, dark eyes on the front, a dark nose on the middle plane, a darker rim
 * around the eyes, arms with paws to x ±0.72, and a body down to the floor.
 */
function figure(eyes = true): GlbInspection {
  const vertices: Vec3[] = [];
  const faces: number[][] = [];
  const colors: Vec3[] = [];
  const add = (c: Vec3, color: Vec3): void => {
    const first = vertices.length;
    vertices.push(c, [c[0] + 0.005, c[1], c[2]], [c[0], c[1], c[2] + 0.005]);
    faces.push([first, first + 1, first + 2]);
    colors.push(color);
  };
  for (let x = -0.15; x <= 0.151; x += 0.05) {
    for (let z = 1.2; z <= 1.501; z += 0.05) {
      add([x, -0.2, z], FUR);
      add([x, 0.1, z], FUR);
    }
  }
  for (const side of [1, -1]) {
    for (let z = 1.5; z <= 1.701; z += 0.025) {
      add([0.1 * side, 0, z], z > 1.55 ? PINK : FUR);
    }
    for (let x = 0.2; x <= 0.721; x += 0.04) {
      add([x * side, 0, 1.15], FUR);
    }
    if (eyes) {
      add([0.08 * side, -0.21, 1.38], EYE);
      add([0.09 * side, -0.21, 1.4], EYE);
    }
    add([0.11 * side, -0.21, 1.42], RIM);
    for (let z = 0; z <= 1.1; z += 0.05) {
      add([0.15 * side, 0, z], FUR);
    }
  }
  add([0, -0.25, 1.3], EYE);
  return { floor: 0, top: 1.705, heads: mixamoHeads(), vertices, faces, colors };
}

describe('jointMap (pnpm glb-init)', () => {
  it('maps the Mixamo joints onto the bones of the player, with or without the prefix', () => {
    const map = jointMap(['mixamorig:Spine1', 'mixamorig1:LeftForeArm', 'Hips', 'headfront']);
    expect(map).toEqual({
      Hips: 'hips',
      'mixamorig:Spine1': 'spine',
      headfront: 'head',
      'mixamorig1:LeftForeArm': 'forearmL',
    });
    expect(jointMap(['mixamorig:RightHandIndex2'])).toEqual({
      'mixamorig:RightHandIndex2': 'handR',
    });
  });

  it('refuses a joint that is no joint of a Mixamo skeleton', () => {
    expect(() => jointMap(['mixamorig:Hips', 'Tail_01'])).toThrow(/Tail_01/);
  });
});

describe('proposeConfig (pnpm glb-init)', () => {
  const config = proposeConfig(figure(), 'assets/models/x/x.glb', 0.9);

  it('runs the head height from the neck to the crown, and centers the head on it', () => {
    expect(config.headHeight).toBeCloseTo(0.305, 3);
    expect(config.headCenter[2]).toBeCloseTo(1.2 + 0.305 / 2, 3);
  });

  it('takes the fur from the largest color cluster, the dark from the darkest, and the accent from the rest', () => {
    const rgb = (hex: string): number[] =>
      [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
    const near = (hex: string, color: Vec3): number =>
      Math.max(...rgb(hex).map((v, k) => Math.abs(v - (color[k] ?? 0))));
    expect(near(config.colors.palette.fur, FUR)).toBeLessThan(0.02);
    expect(near(config.colors.palette.accent, PINK)).toBeLessThan(0.02);
    expect(near(config.colors.palette.dark, EYE)).toBeLessThan(0.02);
  });

  it('boxes the dark faces on the front of the head off the middle plane as the eyes', () => {
    const [lo, hi] = config.colors.eyeBox;
    const inside = (p: Vec3): boolean =>
      [0, 1, 2].every((k) => (lo[k] ?? 0) <= (p[k] ?? 0) && (p[k] ?? 0) <= (hi[k] ?? 0));
    expect(inside([0.08, -0.21, 1.38])).toBe(true);
    expect(inside([-0.09, -0.21, 1.4])).toBe(true);
    const [noseLo, noseHi] = config.colors.noseBox;
    expect(noseLo[0] <= 0 && noseHi[0] >= 0 && noseHi[1] < -0.01).toBe(true);
  });

  it('runs each ear bone from the crown to the top of its side, and each finger block to the end of the paw', () => {
    const bone = (name: string) => config.extraBones.find((b) => b.bone === name);
    expect(bone('earL')?.head[2]).toBeCloseTo(1.505, 3);
    expect(bone('earL')?.tail[2]).toBeCloseTo(1.705, 3);
    expect(bone('earR')?.tail[0]).toBeLessThan(0);
    expect(bone('fingersL')?.tail[0]).toBeCloseTo(0.725, 2);
    expect(bone('fingersR')?.tail[0]).toBeCloseTo(-0.72, 2);
    expect(bone('tail1')?.reach).toBe(0);
  });

  it('scales the body so that its head center reaches the target height', () => {
    expect((config.headCenter[2] / 1.705) * config.height).toBeCloseTo(0.9, 3);
  });

  it('stops when no dark eye faces are on both sides of the head', () => {
    expect(() => proposeConfig(figure(false), 'x.glb', 0.9)).toThrow(/eye/);
  });
});
