import { describe, expect, it } from 'vitest';

import { cross, dot, length, normalize, sub } from '../models/math.ts';
import type { Vec3 } from '../models/math.ts';
import { solveTwoBone } from './ik.ts';

const SHOULDER: Vec3 = [0.1, 1.0, -0.05];

describe('solveTwoBone', () => {
  it('reaches a target in range and keeps the bone lengths', () => {
    const target: Vec3 = [0.3, 0.9, -0.3];
    const { elbow, wrist } = solveTwoBone(SHOULDER, target, 0.25, 0.22, [1, -1, 0]);
    expect(length(sub(wrist, target))).toBeLessThan(1e-9);
    expect(length(sub(elbow, SHOULDER))).toBeCloseTo(0.25, 9);
    expect(length(sub(wrist, elbow))).toBeCloseTo(0.22, 9);
  });

  it('bends the elbow to the side of the pole, in the plane of the pole', () => {
    const target: Vec3 = [0.1, 0.7, -0.2];
    const pole: Vec3 = [1, 0, 0];
    const { elbow } = solveTwoBone(SHOULDER, target, 0.25, 0.22, pole);
    const direction = normalize(sub(target, SHOULDER));
    const offset = sub(elbow, SHOULDER);
    const sideOf = offset[0] - dot(offset, direction) * direction[0];
    expect(sideOf).toBeGreaterThan(0.05);
    // The elbow lies in the plane of the shoulder, the target, and the pole.
    const normal = normalize(cross(direction, pole));
    expect(Math.abs(dot(offset, normal))).toBeLessThan(1e-9);
  });

  it('points the arm straight to a target out of reach', () => {
    const target: Vec3 = [0.1, 1.0, -1.0];
    const { elbow, wrist } = solveTwoBone(SHOULDER, target, 0.25, 0.22, [0, -1, 0]);
    expect(length(sub(wrist, SHOULDER))).toBeCloseTo(0.47, 5);
    expect(wrist[2]).toBeCloseTo(-0.05 - 0.47, 5);
    expect(elbow[2]).toBeCloseTo(-0.05 - 0.25, 3);
  });

  it('stops the wrist at the nearest reach for a target at the shoulder', () => {
    const target: Vec3 = [0.1, 0.99, -0.05];
    const { wrist } = solveTwoBone(SHOULDER, target, 0.25, 0.22, [0, 0, -1]);
    expect(length(sub(wrist, SHOULDER))).toBeCloseTo(0.03, 5);
  });
});
