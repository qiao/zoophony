import { describe, expect, it } from 'vitest';

import type { Vec3 } from './tuples.ts';
import { srgb } from './mesh.ts';
import { SPECIES } from './species.ts';
import { H, boundsOf, variant, verticesWithColor } from './test-body.ts';

/** The face patterns that the tests build (design 4.3). */

describe('addFacePattern', () => {
  it('makes the eye patches larger than the eyes, so that they show around them', () => {
    const { mesh } = variant({ facePattern: 'eye-patches', accentParts: ['face-pattern'] });
    const patch = verticesWithColor(mesh, srgb(SPECIES.rabbit.colors.accent), ['head']).filter(
      (p) => p[0] > 0,
    );
    const eye = boundsOf(mesh, 'eyeR');
    const tall = (points: readonly Vec3[]): number =>
      Math.max(...points.map((p) => p[1])) - Math.min(...points.map((p) => p[1]));
    expect(tall(patch)).toBeGreaterThan(eye.max[1] - eye.min[1] + 0.12 * H);
  });
});
