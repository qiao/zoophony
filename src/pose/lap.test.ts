import { describe, expect, it } from 'vitest';

import { Quaternion, Vector3 } from 'three';

import { buildPlayer } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { BIND_ROTATIONS } from './frames.ts';
import { armRig } from './ik.ts';
import { lapHand, lapPoint } from './lap.ts';
import { posedPart, signedDistance } from './test-clearance.ts';
import { poseSkeleton } from './test-kinematics.ts';

describe('lapPoint', () => {
  const model = buildPlayer('rabbit', 'violin');
  const posed = poseSkeleton(model, {
    rotations: BIND_ROTATIONS,
    rootOffset: [0, 0, 0],
    slideOffset: [0, 0, 0],
    blink: 0,
  });
  const h = model.body.headHeight;

  it('finds the top of the thigh at a part of the way from the hip to the knee', () => {
    for (const side of ['L', 'R'] as const) {
      const point = new Vector3(...lapPoint(model, side, { along: 0.5, offset: [0, 0, 0] }));
      const hip = new Vector3(...(model.skeleton.positions[boneIndex(`thigh${side}`)] ?? []));
      const knee = new Vector3(...(model.skeleton.positions[boneIndex(`shin${side}`)] ?? []));
      const middle = hip.clone().lerp(knee, 0.5);

      expect(point.x).toBeCloseTo(middle.x, 9);
      expect(point.z).toBeCloseTo(middle.z, 9);
      expect(point.y).toBeGreaterThan(middle.y + 0.2 * h);
      // The point is on the surface of the thigh.
      const gap = signedDistance(posedPart(posed, [`thigh${side}`]), point);
      expect(Math.abs(gap) / h, side).toBeLessThan(1e-6);
    }
  });

  it('moves the place by the offset in head heights', () => {
    const top = new Vector3(...lapPoint(model, 'L', { along: 0.3, offset: [0, 0, 0] }));
    const moved = new Vector3(...lapPoint(model, 'L', { along: 0.3, offset: [0.1, 0.2, 0] }));

    expect(moved.sub(top).divideScalar(h).toArray()).toEqual([
      expect.closeTo(0.1, 9),
      expect.closeTo(0.2, 9),
      expect.closeTo(0, 9),
    ]);
  });
});

describe('lapHand', () => {
  const model = buildPlayer('wolf', 'harp');
  const rest = {
    lap: { along: 0.6, offset: [-0.1, 0.05, 0] },
    palm: [0.2, -1, 0.1],
    fingers: [0.3, 0.4, -1],
  } as const;

  it('puts the middle of the palm at the lap place', () => {
    for (const side of ['L', 'R'] as const) {
      const arm = armRig(model, side);
      const hand = lapHand(model, arm, rest);
      const palm = new Vector3(...arm.palm)
        .applyQuaternion(new Quaternion(...hand.rotation))
        .add(new Vector3(...hand.wrist));

      expect(palm.distanceTo(new Vector3(...lapPoint(model, side, rest.lap))), side).toBeLessThan(
        1e-9,
      );
    }
  });

  it('turns the palm to its side and the fingers in the plane of the palm', () => {
    const palm = new Vector3(...rest.palm).normalize();
    const fingers = new Vector3(...rest.fingers);
    fingers.addScaledVector(palm, -fingers.dot(palm)).normalize();
    for (const side of ['L', 'R'] as const) {
      const turn = new Quaternion(...lapHand(model, armRig(model, side), rest).rotation);
      // The bind palm faces the body, +x on the left and -x on the right, and the fingers point
      // down.
      const face = new Vector3(side === 'L' ? 1 : -1, 0, 0).applyQuaternion(turn);
      const down = new Vector3(0, -1, 0).applyQuaternion(turn);

      expect(face.distanceTo(palm), side).toBeLessThan(1e-6);
      expect(down.distanceTo(fingers), side).toBeLessThan(1e-6);
    }
  });
});
