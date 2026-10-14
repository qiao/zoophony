import { describe, expect, it } from 'vitest';

import { SPECIES_COLORS } from '../src/models/colors.ts';
import { srgb } from '../src/models/mesh.ts';
import type { Vec3 } from '../src/models/tuples.ts';
import { linearOfOklab, oklab, paletteMap } from './studio-palette.ts';

/**
 * Gives the Oklab distance of two linear colors.
 *
 * @param a The first color.
 * @param b The second color.
 * @returns The distance.
 */
function distance(a: Vec3, b: Vec3): number {
  const [p, q] = [oklab(a), oklab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

describe('the tan palette of the fox mesh (design 4.4, 4.5)', () => {
  const map = paletteMap({ from: SPECIES_COLORS['fox-red'], to: SPECIES_COLORS['fox-tan'] });
  const tanFur = srgb(SPECIES_COLORS['fox-tan'].fur);

  it('converts a linear color to Oklab and back', () => {
    const color: Vec3 = [0.6, 0.3, 0.1];
    const back = linearOfOklab(oklab(color));

    expect(back[0]).toBeCloseTo(0.6, 6);
    expect(back[1]).toBeCloseTo(0.3, 6);
    expect(back[2]).toBeCloseTo(0.1, 6);
  });

  it('moves the red fur to the tan fur, and an orange face of the mesh toward it', () => {
    expect(distance(map(srgb(SPECIES_COLORS['fox-red'].fur), 'matte'), tanFur)).toBeLessThan(0.002);

    // The largest orange of the palette of the fox mesh (`colors.txt` of the research of the mesh).
    const orange = srgb('#ef862c');
    expect(distance(map(orange, 'matte'), tanFur)).toBeLessThan(distance(orange, tanFur) / 2);
  });

  it('moves the black brown of the feet toward the tan accent', () => {
    const black = srgb('#190c05');
    const accent = srgb(SPECIES_COLORS['fox-tan'].accent);

    expect(distance(map(black, 'matte'), accent)).toBeLessThan(distance(black, accent));
  });

  it('keeps the colors of the eyes and of the nose', () => {
    const eye = srgb('#15110e');

    expect(map(eye, 'lacquer')).toEqual(eye);
  });

  it('keeps a pale face warm', () => {
    // A cream white of the chest of the fox mesh. With the full hue step of the fur, a pale face
    // turned cool (Oklab b below 0).
    const cream = srgb('#fef7de');
    const after = oklab(map(cream, 'matte'));

    expect(after[2]).toBeGreaterThan(0);
    expect(after[2]).toBeGreaterThan(oklab(cream)[2] * 0.8);
  });
});
