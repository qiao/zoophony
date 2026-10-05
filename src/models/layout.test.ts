import { describe, expect, it } from 'vitest';

import { REFERENCE_STAGE_SIDE, seatAt, singleViolinLayout } from './layout.ts';
import { DEG } from './math.ts';

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
    const seat = seatAt(podium, -30 * DEG, 2);
    expect(seat.position[0]).toBeCloseTo(-1, 9);
    const forward = [-Math.sin(seat.facing), -Math.cos(seat.facing)];
    const toPodium = [podium[0] - seat.position[0], podium[2] - seat.position[2]];
    const norm = Math.hypot(toPodium[0] ?? 0, toPodium[1] ?? 0);
    expect(forward[0]).toBeCloseTo((toPodium[0] ?? 0) / norm, 9);
    expect(forward[1]).toBeCloseTo((toPodium[1] ?? 0) / norm, 9);
  });
});

describe('singleViolinLayout', () => {
  it('puts one first violin at the left seat of row 0 of the reference', () => {
    const layout = singleViolinLayout(REFERENCE_STAGE_SIDE);
    expect(layout.podium).toEqual([0, 0, REFERENCE_STAGE_SIDE / 2 - 1.6]);
    expect(layout.players).toHaveLength(1);
    const [player] = layout.players;
    const dx = (player?.position[0] ?? 0) - layout.podium[0];
    const dz = (player?.position[2] ?? 0) - layout.podium[2];
    expect(Math.hypot(dx, dz)).toBeCloseTo(2.4, 9);
    // One seat of 0.95 m to the left of 0° on the arc.
    expect(Math.atan2(dx, -dz) * 2.4).toBeCloseTo(-0.95, 9);
    expect(player?.support).toBe('chair');
    expect(layout.stands).toHaveLength(1);
  });
});
