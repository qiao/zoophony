import { describe, expect, it } from 'vitest';
import type { WebGLRenderer } from 'three';

import { FINAL_FRAGMENT, GRADE_FUNCTION } from './post-shaders.ts';
import { GRAIN_RATE, bloomSizes, grainSeed, targetFormatOf } from './post.ts';

describe('bloomSizes', () => {
  it('halves the size for each level, from half the canvas', () => {
    expect(bloomSizes(2880, 1800, 3)).toEqual([
      [1440, 900],
      [720, 450],
      [360, 225],
    ]);
  });

  it('keeps at least one pixel, and gives no level for 0 levels', () => {
    expect(bloomSizes(3, 2, 3)).toEqual([
      [1, 1],
      [1, 1],
      [1, 1],
    ]);
    expect(bloomSizes(1440, 900, 0)).toEqual([]);
  });
});

/**
 * Makes the part of a renderer that {@link targetFormatOf} reads.
 *
 * @param extensions The extensions that the GPU has.
 * @returns The renderer.
 */
function rendererWith(extensions: readonly string[]): WebGLRenderer {
  const fake = { extensions: { has: (name: string) => extensions.includes(name) } };
  // SAFETY: targetFormatOf() reads only `extensions.has`.
  return fake as WebGLRenderer;
}

describe('targetFormatOf (design 2.6)', () => {
  it('takes the packed floats when the GPU can render to floats', () => {
    const both = ['EXT_color_buffer_float', 'EXT_color_buffer_half_float'];
    expect(targetFormatOf(rendererWith(both))).toBe('packed');
  });

  it('takes half floats, or no post effects, on a GPU with less', () => {
    expect(targetFormatOf(rendererWith(['EXT_color_buffer_half_float']))).toBe('half');
    expect(targetFormatOf(rendererWith([]))).toBe('none');
  });
});

describe('the final pass (design 4.5, post effects)', () => {
  it('tone maps with the renderer, and converts to the output color space before the grade', () => {
    const toneMap = FINAL_FRAGMENT.indexOf('toneMapping(color)');
    const output = FINAL_FRAGMENT.indexOf('#include <colorspace_fragment>');
    expect(toneMap).toBeGreaterThan(0);
    expect(output).toBeGreaterThan(toneMap);
    expect(FINAL_FRAGMENT.indexOf('grade(gl_FragColor.rgb)')).toBeGreaterThan(output);
    expect(FINAL_FRAGMENT).toContain(GRADE_FUNCTION);
    expect(GRADE_FUNCTION).toContain('texture(uGradeLut, c)');
  });
});

describe('grainSeed (design 4.5, review of step 8, L3)', () => {
  it('changes the grain 24 times each second at each frame rate', () => {
    const seeds = (fps: number): number =>
      new Set(Array.from({ length: fps }, (_, i) => grainSeed(100 + i / fps))).size;
    expect(seeds(60)).toBe(GRAIN_RATE);
    expect(seeds(120)).toBe(GRAIN_RATE);
  });

  it('keeps the grain still at a fixed time', () => {
    expect(grainSeed(0)).toBe(grainSeed(0));
    expect(grainSeed(0.01)).toBe(grainSeed(0));
  });
});
