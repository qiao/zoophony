import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { oval, plate, skullSurface } from './face-plates.ts';
import { ringLoft, signedVolume } from './primitives.ts';
import type { Ring } from './primitives.ts';
import type { Vec3 } from './tuples.ts';

/**
 * Makes a closed ball of rings around the origin.
 *
 * @param radius The radius of the ball.
 * @returns The corner list.
 */
function ball(radius: number): number[] {
  const rings: Ring[] = [[[0, -radius, 0]]];
  for (let j = 1; j < 8; j++) {
    const polar = (j / 8) * Math.PI;
    const r = Math.sin(polar) * radius;
    const y = -Math.cos(polar) * radius;
    rings.push(
      Array.from({ length: 12 }, (_, i): Vec3 => {
        const angle = (i / 12) * 2 * Math.PI;
        return [Math.cos(angle) * r, y, Math.sin(angle) * r];
      }),
    );
  }
  rings.push([[0, radius, 0]]);
  return ringLoft(rings);
}

describe('skullSurface', () => {
  it('finds the point where a ray from the center leaves a closed shell, with an outward normal', () => {
    const shell = ball(1);
    for (const direction of [new Vector3(0, 0, -1), new Vector3(0.4, 0.2, -0.6)]) {
      const { point, normal } = skullSurface(shell, [0, 0, 0], direction);
      // The faces of the ball are inside its sphere, at most 1 - cos(15°) from it.
      expect(point.length()).toBeGreaterThan(0.95);
      expect(point.length()).toBeLessThanOrEqual(1 + 1e-9);
      expect(point.clone().normalize().dot(direction.clone().normalize())).toBeCloseTo(1, 9);
      expect(normal.dot(direction.clone().normalize())).toBeGreaterThan(0.8);
    }
  });
});

describe('plate', () => {
  it('makes a closed plate of the outline between its back and its front', () => {
    const corners = plate(oval([0, 0], 0.1, 0.05, 0.05, 8), 0, 0.02, (a, b, o) => [a, b, o]);
    expect(Math.abs(signedVolume(corners))).toBeGreaterThan(0);
    for (let i = 2; i < corners.length; i += 3) {
      expect(corners[i]).toBeGreaterThanOrEqual(0);
      expect(corners[i]).toBeLessThanOrEqual(0.02);
    }
  });
});
