import { describe, expect, it } from 'vitest';

import { seated } from './body-frame.ts';
import type { Stance } from './body-frame.ts';
import { CHAIR } from './props.ts';
import { boneIndex } from './rig.ts';
import { RABBIT_RIGGED } from './rigged/rabbit.ts';
import { SPECIES } from './species.ts';
import { builtBody } from './test-body.ts';
import type { BuiltBody } from './test-body.ts';
import type { Vec3 } from './tuples.ts';

/**
 * The rabbit with its rigged body. Since 2026-10-11, `SPECIES` gives the rabbit the parametric
 * body, so the tests add the rigged body here.
 */
const RABBIT = { ...SPECIES.rabbit, rigged: RABBIT_RIGGED };

/** Builds the rabbit in a stance. */
function build(stance: Stance): BuiltBody {
  return builtBody(RABBIT, stance);
}

/** Gives the distance between two points. */
function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

describe('the rigged body (design 4.4)', () => {
  it('seats the knees apart, wider than the hips, and keeps the legs of a standing body', () => {
    const sitting = build(seated(CHAIR.seatHeight)).body.positions;
    expect(sitting.shinL[0]).toBeLessThan(sitting.thighL[0]);
    expect(sitting.shinR[0]).toBeGreaterThan(sitting.thighR[0]);

    const standing = build({ kind: 'standing' }).body.positions;
    const rest = RABBIT_RIGGED.joints;
    for (const bone of ['thighL', 'shinL', 'thighR', 'shinR'] as const) {
      expect(standing[bone][0]).toBeCloseTo(rest[bone][0], 6);
    }
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

  it('puts an eye plate on each eye bone, at the eye of the head, as mirror images', () => {
    const { body, mesh } = build({ kind: 'standing' });
    const { eyeL, eyeR } = RABBIT_RIGGED.eyes;
    expect(eyeL.middle[0]).toBeCloseTo(-eyeR.middle[0], 6);
    expect(eyeL.middle.slice(1)).toEqual(eyeR.middle.slice(1));
    expect(eyeL.radius).toBe(eyeR.radius);
    for (const eye of ['eyeL', 'eyeR'] as const) {
      const corners = [...mesh.bones.keys()].filter((c) => mesh.bones[c] === boneIndex(eye));
      expect(corners.length).toBeGreaterThan(0);
      for (const c of corners) {
        const p: Vec3 = [
          mesh.positions[c * 3] ?? 0,
          mesh.positions[c * 3 + 1] ?? 0,
          mesh.positions[c * 3 + 2] ?? 0,
        ];
        expect(distance(p, body.positions[eye])).toBeLessThan(1.5 * RABBIT_RIGGED.eyes[eye].radius);
      }
    }
    expect(body.positions.eyeL[0]).toBeLessThan(0);
  });
});
