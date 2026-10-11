import { describe, expect, it } from 'vitest';

import { Vector3 } from 'three';
import { seated } from '../body-frame.ts';
import type { Stance } from '../body-frame.ts';
import { srgb } from '../mesh.ts';
import type { MeshData, Rgb } from '../mesh.ts';
import { stanceOn } from '../player.ts';
import { HIGH_STOOL, chairBack } from '../props.ts';
import { boneIndex } from '../rig.ts';
import type { BoneName } from '../rig.ts';
import { SPECIES } from '../species.ts';
import type { SpeciesId, SpeciesParams } from '../species.ts';
import { builtBody } from '../test-body.ts';
import type { BuiltBody } from '../test-body.ts';
import type { Vec3 } from '../tuples.ts';

/**
 * Builds the body of a fox.
 *
 * @param id The fox.
 * @param stance The stance. Default: on the chair of the stage.
 * @returns The mesh and the bones.
 */
function fox(
  id: SpeciesId = 'fox-red',
  stance: Stance = stanceOn('chair', SPECIES[id]),
): BuiltBody {
  return builtBody(SPECIES[id], stance);
}

/** One triangle of a mesh: its bone, its color, its centroid, and its corners. */
interface MeshTriangle {
  /** The index of the bone of the triangle. */
  readonly bone: number;
  /** The linear color of the triangle. */
  readonly color: Rgb;
  /** The mean of the three corners. */
  readonly centroid: Vec3;
  /** The three corners. */
  readonly corners: readonly Vec3[];
}

/**
 * Lists the triangles of a mesh on some bones.
 *
 * @param mesh The mesh.
 * @param bones The bones.
 * @returns The triangles.
 */
function trianglesOn(mesh: MeshData, bones: readonly BoneName[]): MeshTriangle[] {
  const wanted = new Set(bones.map(boneIndex));
  const out: MeshTriangle[] = [];
  for (let t = 0; t < mesh.bones.length / 3; t++) {
    const bone = mesh.bones[t * 3] ?? -1;
    if (!wanted.has(bone)) {
      continue;
    }
    const corners = [0, 1, 2].map((k): Vec3 => {
      const i = (t * 3 + k) * 3;
      return [mesh.positions[i] ?? 0, mesh.positions[i + 1] ?? 0, mesh.positions[i + 2] ?? 0];
    });
    const centroid = corners
      .reduce((sum, p) => sum.add(new Vector3(...p)), new Vector3())
      .divideScalar(3);
    const i = t * 9;
    out.push({
      bone,
      color: [mesh.colors[i] ?? 0, mesh.colors[i + 1] ?? 0, mesh.colors[i + 2] ?? 0],
      centroid: [centroid.x, centroid.y, centroid.z],
      corners,
    });
  }
  return out;
}

/**
 * Checks that two linear colors are equal, within the error of a 32-bit float.
 *
 * @param a The first color.
 * @param b The second color.
 * @returns True if they are equal.
 */
function same(a: Rgb, b: Rgb): boolean {
  return a.every((v, i) => Math.abs(v - (b[i] ?? 0)) < 1e-6);
}

describe('the body of the fox (design 4.3, 4.4)', () => {
  const colors = SPECIES['fox-red'].colors;
  const [fur, white, dark] = [srgb(colors.fur), srgb(colors.belly), srgb(colors.accent)];

  it('gives both foxes the body of fox-views.png, and the other species the parametric biped', () => {
    // Only the fox body has an eye with more parts than the black oval and its light.
    const eyeColors = (species: SpeciesParams): number => {
      const found = trianglesOn(builtBody(species, seated(0.35)).mesh, ['eyeR']).map(
        (t) => t.color,
      );
      return found.filter((c, i) => found.findIndex((d) => same(c, d)) === i).length;
    };

    expect(eyeColors(SPECIES['fox-red'])).toBeGreaterThanOrEqual(4);
    expect(eyeColors(SPECIES['fox-tan'])).toBeGreaterThanOrEqual(4);
    expect(eyeColors(SPECIES.wolf)).toBe(2);
    // The red fox with no body of its own falls back to the parametric biped.
    const { body, ...parametric } = SPECIES['fox-red'];
    expect(body).toBe('fox');
    expect(eyeColors(parametric)).toBe(2);
  });

  it('puts the head and the shoulder joints at the places of its skeleton', () => {
    const { body } = fox('fox-red', seated(0.35));
    const p = SPECIES['fox-red'].proportions;
    const h = body.headHeight;

    expect(h).toBe(p.headHeight);
    expect((body.headCenter[1] - 0.35) / h).toBeCloseTo(p.headCenter, 9);
    expect((body.positions.upperArmR[1] - 0.35) / h).toBeCloseTo(p.shoulderHeight, 9);
    expect(body.positions.upperArmR[0] / h).toBeCloseTo(p.shoulderSpread, 9);
    // The head is forward of the torso, and the mouth is forward of the eyes.
    expect(body.headCenter[2]).toBeLessThan(body.positions.chest[2]);
    expect(body.mouth[2]).toBeLessThan(body.positions.eyeR[2]);
  });

  it('gives the eyes a white, a brown iris, and a dark pupil on the eye bones', () => {
    const { mesh } = fox();
    for (const eye of ['eyeL', 'eyeR'] as const) {
      const eyeColors = trianglesOn(mesh, [eye]).map((t) => t.color);
      const distinct = eyeColors.filter((c, i) => eyeColors.findIndex((d) => same(c, d)) === i);
      // The white and the light, the iris, the pupil, and the lid line.
      expect(distinct.length, eye).toBeGreaterThanOrEqual(4);
    }
  });

  it('gives the ears a dark tip, a white inside, and the fur color', () => {
    const { mesh } = fox();
    for (const ear of ['earL', 'earR'] as const) {
      const triangles = trianglesOn(mesh, [ear]);
      const top = triangles.reduce((a, b) => (a.centroid[1] > b.centroid[1] ? a : b));
      expect(same(top.color, dark), ear).toBe(true);
      expect(triangles.some((t) => same(t.color, white))).toBe(true);
      expect(triangles.some((t) => same(t.color, fur))).toBe(true);
    }
  });

  it('paints a white bib on the front of the torso, and keeps the back in the fur color', () => {
    const { mesh, body } = fox();
    const chest = body.positions.chest;
    const torso = trianglesOn(mesh, ['spine', 'chest']);
    const front = torso.filter((t) => Math.abs(t.centroid[0]) < 0.03 && t.centroid[2] < chest[2]);
    const back = torso.filter((t) => t.centroid[2] > chest[2] + 0.05);

    expect(front.filter((t) => Math.abs(t.centroid[1] - chest[1]) < 0.05).length).toBeGreaterThan(
      0,
    );
    for (const t of front.filter((f) => Math.abs(f.centroid[1] - chest[1]) < 0.05)) {
      expect(same(t.color, white)).toBe(true);
    }
    expect(back.length).toBeGreaterThan(0);
    expect(back.every((t) => same(t.color, fur))).toBe(true);
  });

  it('gives the hands dark gloves and the lower shins dark socks', () => {
    const { mesh, body } = fox();
    const hands = trianglesOn(mesh, ['handL', 'handR', 'fingersL', 'fingersR']);
    expect(hands.every((t) => same(t.color, dark))).toBe(true);

    const shins = trianglesOn(mesh, ['shinR']);
    const knee = body.positions.shinR[1];
    expect(shins.filter((t) => t.centroid[1] > knee - 0.05).every((t) => same(t.color, fur))).toBe(
      true,
    );
    expect(shins.filter((t) => t.centroid[1] < 0.15).every((t) => same(t.color, dark))).toBe(true);
  });

  it('gives the tail a white tip, and keeps it out of the back of the chair', () => {
    const { mesh, body } = fox();
    const tail = trianglesOn(mesh, ['tail1', 'tail2']);
    const base = new Vector3(...body.positions.tail1);
    const tip = tail.reduce((a, b) =>
      new Vector3(...a.centroid).distanceTo(base) > new Vector3(...b.centroid).distanceTo(base)
        ? a
        : b,
    );
    expect(same(tip.color, white)).toBe(true);

    for (const t of tail) {
      for (const p of t.corners) {
        for (const part of chairBack()) {
          const inside = p.every(
            (v, axis) => v > (part.min[axis] ?? Infinity) && v < (part.max[axis] ?? -Infinity),
          );
          expect(inside, `a tail corner at ${p.map((v) => v.toFixed(3)).join(', ')}`).toBe(false);
        }
      }
    }
  });

  it('puts the paws on the floor, on the foot ring of the high stool, and on the floor standing', () => {
    const lowest = (stance: Stance): number =>
      Math.min(
        ...trianglesOn(fox('fox-red', stance).mesh, ['footL', 'footR']).flatMap((t) =>
          t.corners.map((p) => p[1]),
        ),
      );

    expect(lowest(seated(0.35))).toBeCloseTo(0, 9);
    // The mesh keeps its places as 32-bit floats.
    expect(lowest(seated(HIGH_STOOL.seatHeight, HIGH_STOOL.footRing))).toBeCloseTo(
      HIGH_STOOL.footRing,
      6,
    );
    expect(lowest({ kind: 'standing' })).toBeCloseTo(0, 9);
  });

  it('lets each part of the torso reach past the chest bone into the other part', () => {
    const { mesh, body } = fox();
    const chest = body.positions.chest[1];
    const wide = (bone: BoneName, past: (y: number) => boolean): number =>
      trianglesOn(mesh, [bone])
        .flatMap((t) => t.corners)
        .filter((p) => past(p[1]) && Math.abs(p[0]) > 0.1).length;

    // A full ring of each part lies inside the other part, so that a turn of the chest shows the
    // side of the other part, and no gap.
    expect(wide('spine', (y) => y > chest + 0.02)).toBeGreaterThan(0);
    expect(wide('chest', (y) => y < chest - 0.02)).toBeGreaterThan(0);
  });
});
