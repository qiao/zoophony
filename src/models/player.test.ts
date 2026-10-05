import { describe, expect, it } from 'vitest';

import { INSTRUMENT_COLORS } from './colors.ts';
import { cross, dot, length, sub } from './math.ts';
import { buildPlayer } from './player.ts';
import { boneIndex } from './rig.ts';
import type { Vec3 } from './math.ts';
import { INSTRUMENT_SCALE, VIOLIN } from './instruments/strings.ts';

/** Measures the extent of the vertices of one bone along a unit direction. */
function extentAlong(positions: Float32Array, bones: Uint8Array, bone: number, axis: Vec3): number {
  let min = Infinity;
  let max = -Infinity;
  for (let v = 0; v < bones.length; v++) {
    if (bones[v] !== bone) {
      continue;
    }
    const p: Vec3 = [positions[v * 3] ?? 0, positions[v * 3 + 1] ?? 0, positions[v * 3 + 2] ?? 0];
    min = Math.min(min, dot(p, axis));
    max = Math.max(max, dot(p, axis));
  }
  return max - min;
}

function trianglesOn(bones: Uint8Array, wanted: readonly number[]): number {
  let count = 0;
  for (let t = 0; t < bones.length / 3; t++) {
    if (wanted.includes(bones[t * 3] ?? -1)) {
      count++;
    }
  }
  return count;
}

describe('buildPlayer', () => {
  const player = buildPlayer('rabbit', 'violin');
  const instrumentBones = [boneIndex('instrument'), boneIndex('bow')];

  it('keeps the violin and the bow within 500 triangles (design 4.5)', () => {
    const instrument = trianglesOn(player.mesh.bones, instrumentBones);
    expect(instrument).toBeGreaterThan(0);
    expect(instrument).toBeLessThanOrEqual(500);
  });

  it('keeps the body within 1,200 triangles (design 4.5)', () => {
    const total = player.mesh.positions.length / 9;
    const body = total - trianglesOn(player.mesh.bones, instrumentBones);
    expect(body).toBeLessThanOrEqual(1200);
  });

  it('merges the body, the violin, and the bow into one mesh of rigid parts (design 4.4)', () => {
    const { bones } = player.mesh;
    for (let t = 0; t < bones.length / 3; t++) {
      expect(bones[t * 3 + 1]).toBe(bones[t * 3]);
      expect(bones[t * 3 + 2]).toBe(bones[t * 3]);
    }
    expect(trianglesOn(bones, [boneIndex('bow')])).toBeGreaterThan(0);
    expect(trianglesOn(bones, [boneIndex('instrument')])).toBeGreaterThan(0);
    // All triangles are matte: the violin and the bow have no metal (design 4.5).
    expect(player.mesh.matteTriangles).toBe(bones.length / 3);
  });

  it('hangs the violin on the chest and puts its bone at the tail end (design 4.7)', () => {
    const { parents, positions } = player.skeleton;
    expect(parents[boneIndex('instrument')]).toBe(boneIndex('chest'));
    const tail = positions[boneIndex('instrument')] ?? [0, 0, 0];
    const contact = player.violin.bowContact;
    expect(length(sub(contact, tail))).toBeCloseTo(
      Math.hypot(VIOLIN.bowContact, VIOLIN.stringHeight) * INSTRUMENT_SCALE,
      6,
    );
  });

  it('holds the violin to the left, with the strings up (design 4.6)', () => {
    expect(player.violin.axis[0]).toBeLessThan(-0.5);
    expect(player.violin.top[1]).toBeGreaterThan(0);
    expect(dot(player.violin.axis, player.violin.top)).toBeCloseTo(0, 9);
  });

  it('makes the violin 0.51 m long and the bow 0.57 m long (design 4.6)', () => {
    const { positions, bones } = player.mesh;
    const violin = extentAlong(positions, bones, boneIndex('instrument'), player.violin.axis);
    expect(violin).toBeGreaterThan(0.505);
    expect(violin).toBeLessThan(0.52);
    const bow = extentAlong(positions, bones, boneIndex('bow'), player.bow.axis);
    expect(bow).toBeCloseTo(0.57, 2);
  });

  it('shows the strings as a thin dark strip (design 4.5, review of step 3)', () => {
    const { positions, colors } = player.mesh;
    const across = cross(player.violin.top, player.violin.axis);
    const strings: Vec3[] = [];
    for (let v = 0; v < colors.length / 3; v++) {
      const color = [colors[v * 3], colors[v * 3 + 1], colors[v * 3 + 2]];
      if (color.every((c, i) => c === Math.fround(INSTRUMENT_COLORS.strings[i] ?? -1))) {
        strings.push([positions[v * 3] ?? 0, positions[v * 3 + 1] ?? 0, positions[v * 3 + 2] ?? 0]);
      }
    }
    expect(strings.length).toBeGreaterThan(0);
    const widths = strings.map((p) => dot(p, across));
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(
      0.008 * INSTRUMENT_SCALE + 1e-6,
    );
    // The strings are darker than the bow hair.
    expect(Math.max(...INSTRUMENT_COLORS.strings)).toBeLessThan(
      Math.min(...INSTRUMENT_COLORS.bowHair),
    );
  });

  it('puts the bow in the right hand in the bind pose', () => {
    const grip = player.bow.grip;
    const hand = player.skeleton.positions[boneIndex('handR')] ?? [0, 0, 0];
    expect(length(sub(grip, hand))).toBeLessThan(0.1);
    expect(player.skeleton.parents[boneIndex('bow')]).toBe(boneIndex('handR'));
  });
});
