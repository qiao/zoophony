import { describe, expect, it } from 'vitest';

import { Quaternion, Vector3 } from 'three';

import { buildPlayer } from '../models/player.ts';
import { ARM_REACH, armRig, limitReach, solveArm, solveTwoBone } from './ik.ts';
import type { ArmBind } from './ik.ts';

const SHOULDER = new Vector3(0.1, 1.0, -0.05);

describe('solveTwoBone', () => {
  it('reaches a target in range and keeps the bone lengths', () => {
    const target = new Vector3(0.3, 0.9, -0.3);
    const { elbow, wrist } = solveTwoBone(SHOULDER, target, 0.25, 0.22, new Vector3(1, -1, 0));
    expect(wrist.distanceTo(target)).toBeLessThan(1e-9);
    expect(elbow.distanceTo(SHOULDER)).toBeCloseTo(0.25, 9);
    expect(wrist.distanceTo(elbow)).toBeCloseTo(0.22, 9);
  });

  it('bends the elbow to the side of the pole, in the plane of the pole', () => {
    const target = new Vector3(0.1, 0.7, -0.2);
    const pole = new Vector3(1, 0, 0);
    const { elbow } = solveTwoBone(SHOULDER, target, 0.25, 0.22, pole);
    const direction = target.clone().sub(SHOULDER).normalize();
    const offset = elbow.clone().sub(SHOULDER);
    const sideOf = offset.x - offset.dot(direction) * direction.x;
    expect(sideOf).toBeGreaterThan(0.05);
    // The elbow lies in the plane of the shoulder, the target, and the pole.
    const normal = new Vector3().crossVectors(direction, pole).normalize();
    expect(Math.abs(offset.dot(normal))).toBeLessThan(1e-9);
  });

  it('points the arm straight to a target out of reach', () => {
    const target = new Vector3(0.1, 1.0, -1.0);
    const { elbow, wrist } = solveTwoBone(SHOULDER, target, 0.25, 0.22, new Vector3(0, -1, 0));
    expect(wrist.distanceTo(SHOULDER)).toBeCloseTo(0.47, 5);
    expect(wrist.z).toBeCloseTo(-0.05 - 0.47, 5);
    expect(elbow.z).toBeCloseTo(-0.05 - 0.25, 3);
  });

  it('stops the wrist at the nearest reach for a target at the shoulder', () => {
    const target = new Vector3(0.1, 0.99, -0.05);
    const { wrist } = solveTwoBone(SHOULDER, target, 0.25, 0.22, new Vector3(0, 0, -1));
    expect(wrist.distanceTo(SHOULDER)).toBeCloseTo(0.03, 5);
  });
});

describe('solveArm', () => {
  // The bind elbow bends a little to +z.
  const bind: ArmBind = {
    shoulder: [0.1, 1.0, -0.05],
    elbow: [0.1, 0.75, -0.02],
    wrist: [0.1, 0.53, -0.05],
  };
  const bindOf = (point: readonly [number, number, number]): Vector3 => new Vector3(...point);

  it('turns the bones so that the posed joints follow the bind arm', () => {
    const chest = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.1);
    const shoulder = new Vector3(0.1, 1.01, -0.06);
    const target = new Vector3(0.25, 0.85, -0.35);
    const arm = solveArm(bind, shoulder, chest, target, new Vector3(1, -1, 0));
    expect(arm.wrist.distanceTo(target)).toBeLessThan(1e-9);
    const elbow = bindOf(bind.elbow)
      .sub(bindOf(bind.shoulder))
      .applyQuaternion(arm.upper)
      .add(shoulder);
    expect(elbow.distanceTo(arm.elbow)).toBeLessThan(1e-9);
    const wrist = bindOf(bind.wrist).sub(bindOf(bind.elbow)).applyQuaternion(arm.lower).add(elbow);
    expect(wrist.distanceTo(target)).toBeLessThan(1e-9);
  });

  it('keeps the parent rotation for an arm that hangs as in the bind pose', () => {
    const chest = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.3);
    const target = bindOf(bind.wrist).sub(SHOULDER).applyQuaternion(chest).add(SHOULDER);
    const pole = new Vector3(0, 0, 1).applyQuaternion(chest);
    const arm = solveArm(bind, SHOULDER, chest, target, pole);
    for (const [i, value] of chest.toArray().entries()) {
      expect(arm.upper.toArray()[i]).toBeCloseTo(value, 6);
      expect(arm.lower.toArray()[i]).toBeCloseTo(value, 6);
    }
  });
});

describe('limitReach', () => {
  const arm = armRig(buildPlayer('polar-bear', 'piano'), 'L');
  const shoulder = new Vector3(...arm.bind.shoulder);

  it('keeps a wrist target in reach', () => {
    const wrist = shoulder.clone().add(new Vector3(0, -0.1, -0.2));
    const before = wrist.clone();
    expect(limitReach(arm, shoulder, wrist)).toBe(wrist);
    expect(wrist).toEqual(before);
  });

  it('moves a far wrist target to 97% of the arm length, on the line to the shoulder', () => {
    const limited = limitReach(arm, shoulder, shoulder.clone().add(new Vector3(-1, 0, -1)));
    const upper = new Vector3(...arm.bind.elbow).distanceTo(new Vector3(...arm.bind.shoulder));
    const lower = new Vector3(...arm.bind.wrist).distanceTo(new Vector3(...arm.bind.elbow));
    expect(limited.distanceTo(shoulder)).toBeCloseTo(ARM_REACH * (upper + lower), 9);
    expect(limited.x - shoulder.x).toBeCloseTo(limited.z - shoulder.z, 9);
    expect(limited.y).toBeCloseTo(shoulder.y, 9);
  });
});
