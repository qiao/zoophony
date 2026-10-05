import { describe, expect, it } from 'vitest';

import { MathUtils } from 'three';
import { REFERENCE_STAGE_SIDE, STAND_DISTANCE, seatAt } from './layout.ts';
import type { MeshData } from './mesh.ts';
import { buildChair, buildMusicStand } from './props.ts';

/** The distance from one row to the next (design 4.5, seat geometry). */
const ROW_STEP = 1.2;

function depths(mesh: MeshData): number[] {
  return [...mesh.positions].filter((_, i) => i % 3 === 2);
}

describe('seatAt', () => {
  it('puts a seat at 0° behind the podium, facing the podium (design 4.5)', () => {
    const seat = seatAt([0, 0, 2], 0, 2.4);
    expect(seat.position[0]).toBeCloseTo(0, 9);
    expect(seat.position[2]).toBeCloseTo(-0.4, 9);
    // Facing π turns the front (-z) to +z, toward the podium.
    expect(seat.facing).toBeCloseTo(Math.PI, 9);
  });

  it('puts a negative angle on the left, and faces the podium', () => {
    const podium = [0, 0, 2] as const;
    const seat = seatAt(podium, -30 * MathUtils.DEG2RAD, 2);
    expect(seat.position[0]).toBeCloseTo(-1, 9);
    const forward = [-Math.sin(seat.facing), -Math.cos(seat.facing)];
    const toPodium = [podium[0] - seat.position[0], podium[2] - seat.position[2]];
    const norm = Math.hypot(toPodium[0] ?? 0, toPodium[1] ?? 0);
    expect(forward[0]).toBeCloseTo((toPodium[0] ?? 0) / norm, 9);
    expect(forward[1]).toBeCloseTo((toPodium[1] ?? 0) / norm, 9);
  });
});

describe('REFERENCE_STAGE_SIDE', () => {
  it('follows the stage rule of design 4.5 for the reference composition', () => {
    // Row 2 holds five seats at the radius 4.8. Its outer seat is two seats from 0°.
    const outerX = 4.8 * Math.sin((2 * 0.95) / 4.8);
    const halfWidth = outerX + 0.5 + 0.3;
    const depth = 1.0 + 4.8 + 0.5 + 0.3;
    expect(REFERENCE_STAGE_SIDE).toBeCloseTo(Math.max(5, 2 * halfWidth, depth), 9);
  });
});

describe('STAND_DISTANCE', () => {
  it('keeps 0.1 m between a stand and the chair back of the row in front (review of step 3)', () => {
    // Both face the podium (-z). The stand reaches toward the podium with its back leg, and the
    // chair of the row in front reaches away from it with its back.
    const standReach = -Math.min(...depths(buildMusicStand()));
    const chairBack = Math.max(...depths(buildChair()));
    const gap = ROW_STEP - STAND_DISTANCE - standReach - chairBack;
    expect(gap).toBeGreaterThanOrEqual(0.1);
  });
});
