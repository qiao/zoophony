import { describe, expect, it } from 'vitest';

import { buildPlayer } from '../src/models/player.ts';
import { BONE_NAMES } from '../src/models/rig.ts';
import type { AnimalPose } from '../src/pose/types.ts';
import { armProbes } from './pose-probe.ts';

describe('armProbes', () => {
  it('gives the wrists of the bind pose straight below the shoulder joints by the arm length', () => {
    const model = buildPlayer('bear', 'baton');
    const rotations = new Float32Array(BONE_NAMES.length * 4);
    for (let i = 0; i < BONE_NAMES.length; i++) {
      rotations[i * 4 + 3] = 1;
    }
    const pose: AnimalPose = {
      rotations,
      rootOffset: [0, 0, 0],
      slideOffset: [0, 0, 0],
      instrumentOffset: [0, 0, 0],
      blink: 0,
    };
    const h = model.body.headHeight;
    const { upperArmR, forearmR, handR } = model.body.positions;
    const upperArm = Math.hypot(...upperArmR.map((v, k) => v - (forearmR[k] ?? 0))) / h;
    const forearm = Math.hypot(...forearmR.map((v, k) => v - (handR[k] ?? 0))) / h;
    // The posed skeleton rounds to float32, about 1e-5 H on these lengths.
    for (const side of ['L', 'R'] as const) {
      const { elbow, wrist } = armProbes(model, pose)[side];
      expect(elbow[1]).toBeCloseTo(-upperArm, 4);
      expect(wrist[0]).toBeCloseTo(0, 4);
      expect(wrist[1]).toBeCloseTo(-(upperArm + forearm), 4);
      expect(wrist[2]).toBeCloseTo(0, 4);
    }
  });
});
