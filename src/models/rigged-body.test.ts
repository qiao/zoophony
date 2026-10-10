import { describe, expect, it } from 'vitest';

import { buildBiped } from './biped.ts';
import { seated } from './body-frame.ts';
import type { Stance } from './body-frame.ts';
import { MeshBuilder } from './mesh.ts';
import { HIGH_STOOL, CHAIR, seatHeights } from './props.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import { RABBIT_RIGGED } from './rigged/rabbit.ts';
import { SPECIES } from './species.ts';
import type { SpeciesParams } from './species.ts';
import type { Vec3 } from './tuples.ts';

/** The rabbit with its rigged body. */
const RABBIT: SpeciesParams = { ...SPECIES.rabbit, rigged: RABBIT_RIGGED };

/** Builds the rabbit in a stance. */
function build(stance: Stance) {
  const builder = new MeshBuilder();
  const body = buildBiped(builder, RABBIT, stance);
  return { body, mesh: builder.build() };
}

/** Gives the lowest height of the corners whose main bone is one of some bones. */
function lowest(mesh: ReturnType<typeof build>['mesh'], bones: readonly BoneName[]): number {
  const wanted = new Set(bones.map((bone) => boneIndex(bone)));
  let low = Infinity;
  for (let c = 0; c < mesh.bones.length; c++) {
    if (wanted.has(mesh.bones[c] ?? -1)) {
      low = Math.min(low, mesh.positions[c * 3 + 1] ?? Infinity);
    }
  }
  return low;
}

/** Gives the distance between two points. */
function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

describe('the rigged body (design 4.4)', () => {
  it('stands on its soles, and sits on its fitted seat with the feet on their rest', () => {
    const standing = build({ kind: 'standing' });
    expect(lowest(standing.mesh, ['footL', 'footR'])).toBeCloseTo(0, 3);

    for (const support of ['chair', 'high-stool'] as const) {
      const seat = seatHeights(support, RABBIT);
      if (!seat) {
        throw new Error(`The ${support} has no seat.`);
      }
      const { mesh } = build(seated(seat.seatHeight, seat.footHeight, 0.05));
      expect(lowest(mesh, ['hips']), support).toBeCloseTo(seat.seatHeight, 3);
      expect(lowest(mesh, ['shinL', 'shinR', 'footL', 'footR']), support).toBeCloseTo(
        seat.footHeight,
        3,
      );
    }
    expect(seatHeights('chair', RABBIT)?.seatHeight).toBeLessThan(CHAIR.seatHeight);
    expect(seatHeights('high-stool', RABBIT)?.footHeight).toBe(HIGH_STOOL.footRing);
  });

  it('hangs the arms down beside the body, with the arm lengths of the mesh', () => {
    const { body } = build(seated(CHAIR.seatHeight));
    const rest = RABBIT_RIGGED.joints;
    const h = body.headHeight;
    for (const side of ['L', 'R'] as const) {
      const shoulder = body.positions[`upperArm${side}`];
      const elbow = body.positions[`forearm${side}`];
      const wrist = body.positions[`hand${side}`];
      expect(Math.hypot(elbow[0] - shoulder[0], elbow[2] - shoulder[2]) / h).toBeLessThan(0.01);
      expect(Math.hypot(wrist[0] - elbow[0], wrist[2] - elbow[2]) / h).toBeLessThan(0.01);
      expect(distance(shoulder, elbow)).toBeCloseTo(
        distance(rest[`upperArm${side}`], rest[`forearm${side}`]),
        6,
      );
      expect(distance(elbow, wrist)).toBeCloseTo(
        distance(rest[`forearm${side}`], rest[`hand${side}`]),
        6,
      );
    }
    expect(body.positions.handL[0]).toBeLessThan(0);
    expect(body.positions.handR[0]).toBeGreaterThan(0);
  });

  it('stays within the body budget, with two bones at most at each corner', () => {
    const { mesh } = build(seated(CHAIR.seatHeight));
    expect(mesh.finishes.length).toBeLessThanOrEqual(2600);
    expect(Math.max(...mesh.blendWeights)).toBeLessThanOrEqual(0.5);
    expect(mesh.blendWeights.some((w) => w > 0)).toBe(true);
  });

  it('puts an eye plate on each eye bone, at the eye of the head', () => {
    const { body, mesh } = build({ kind: 'standing' });
    for (const eye of ['eyeL', 'eyeR'] as const) {
      const corners = [...mesh.bones.keys()].filter((c) => mesh.bones[c] === boneIndex(eye));
      expect(corners.length).toBeGreaterThan(0);
      for (const c of corners) {
        const p: Vec3 = [
          mesh.positions[c * 3] ?? 0,
          mesh.positions[c * 3 + 1] ?? 0,
          mesh.positions[c * 3 + 2] ?? 0,
        ];
        expect(distance(p, body.positions[eye]) / body.headHeight).toBeLessThan(0.15);
      }
    }
    expect(body.positions.eyeL[0]).toBeLessThan(0);
  });
});
