import { describe, expect, it } from 'vitest';

import {
  LOGO_BACKDROP_LIMIT,
  SHADE_FALL_SEC,
  TEXT_BACKDROP_LIMIT,
  lightestBlock,
  nextShadeLevel,
  relativeLuminance,
  shadeLevel,
} from './title-shade.ts';

/**
 * Makes an RGBA image of one gray value, with a list of pixels in white.
 *
 * @param width The width, in pixels.
 * @param height The height, in pixels.
 * @param gray The gray byte of the image.
 * @param white The white pixels, as [x, y].
 * @returns The RGBA bytes, row by row.
 */
function image(
  width: number,
  height: number,
  gray: number,
  white: readonly (readonly [number, number])[] = [],
): Uint8Array {
  const pixels = new Uint8Array(4 * width * height).fill(gray);

  for (const [x, y] of white) {
    pixels.fill(255, 4 * (y * width + x), 4 * (y * width + x) + 4);
  }

  return pixels;
}

describe('relativeLuminance', () => {
  it('gives the luminance of WCAG 2.2', () => {
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1, 6);
    expect(relativeLuminance(0, 0, 0)).toBe(0);
    expect(relativeLuminance(255, 0, 0)).toBeCloseTo(0.2126, 6);
    expect(relativeLuminance(128, 128, 128)).toBeCloseTo(0.2159, 3);
  });
});

describe('lightestBlock', () => {
  it('gives the mean of the lightest block', () => {
    const white = [];
    for (let y = 6; y < 12; y++) {
      for (let x = 6; x < 12; x++) {
        white.push([x, y] as const);
      }
    }
    const pixels = image(24, 24, 0, white);

    expect(lightestBlock(pixels, 24, { x: 0, y: 0, width: 24, height: 24 }, 6)).toBeCloseTo(1, 6);
  });

  it('gives a thin light line in a dark block a low value', () => {
    const pixels = image(
      12,
      12,
      0,
      [0, 1, 2, 3, 4, 5].map((y) => [2, y] as const),
    );

    expect(lightestBlock(pixels, 12, { x: 0, y: 0, width: 12, height: 12 }, 6)).toBeCloseTo(
      1 / 6,
      6,
    );
  });

  it('reads only the rectangle', () => {
    const pixels = image(12, 12, 0, [[0, 0]]);

    expect(lightestBlock(pixels, 12, { x: 1, y: 1, width: 11, height: 11 }, 2)).toBe(0);
    expect(lightestBlock(pixels, 12, { x: 0, y: 0, width: 4, height: 4 }, 2)).toBeCloseTo(0.25, 6);
  });

  it('takes the mean of a part block at the edge of the rectangle', () => {
    const pixels = image(5, 5, 0, [[4, 4]]);

    expect(lightestBlock(pixels, 5, { x: 0, y: 0, width: 5, height: 5 }, 4)).toBeCloseTo(1, 6);
  });

  it('gives 0 for an empty rectangle', () => {
    expect(lightestBlock(image(4, 4, 255), 4, { x: 0, y: 0, width: 0, height: 4 }, 2)).toBe(0);
  });
});

describe('shadeLevel', () => {
  it('shows no shade over the dark hall of the default view', () => {
    // The lightest block behind the title in the default view at 1440 × 900 is about 0.06.
    expect(shadeLevel(0.06, TEXT_BACKDROP_LIMIT)).toBe(0);
    expect(shadeLevel(0.06, LOGO_BACKDROP_LIMIT)).toBe(0);
  });

  it('starts at the limit of the line', () => {
    expect(shadeLevel(TEXT_BACKDROP_LIMIT, TEXT_BACKDROP_LIMIT)).toBe(0);
    expect(shadeLevel(TEXT_BACKDROP_LIMIT + 0.01, TEXT_BACKDROP_LIMIT)).toBeGreaterThan(0);
  });

  it('increases with the backdrop, and stays at most 1', () => {
    let last = 0;
    for (let backdrop = 0; backdrop <= 1; backdrop += 0.01) {
      const level = shadeLevel(backdrop, LOGO_BACKDROP_LIMIT);
      expect(level).toBeGreaterThanOrEqual(last);
      expect(level).toBeLessThanOrEqual(1);
      last = level;
    }
  });
});

describe('nextShadeLevel', () => {
  it('rises at once', () => {
    expect(nextShadeLevel(0, 0.7, 0.016)).toBe(0.7);
  });

  it('falls by 1 in the fall time', () => {
    expect(nextShadeLevel(1, 0, SHADE_FALL_SEC / 2)).toBeCloseTo(0.5, 6);
    expect(nextShadeLevel(1, 0, 2 * SHADE_FALL_SEC)).toBe(0);
  });

  it('falls to the level that the text needs, and no lower', () => {
    expect(nextShadeLevel(0.8, 0.6, SHADE_FALL_SEC)).toBe(0.6);
  });

  it('ignores a negative time', () => {
    expect(nextShadeLevel(0.5, 0, -1)).toBe(0.5);
  });
});
