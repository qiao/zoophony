import { describe, expect, it } from 'vitest';
import type { WebGLRenderer } from 'three';

import { FINAL_FRAGMENT } from './post-shaders.ts';
import { bloomSizes, targetFormatOf } from './post.ts';

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
    const grade = FINAL_FRAGMENT.indexOf('uGain');
    expect(toneMap).toBeGreaterThan(0);
    expect(output).toBeGreaterThan(toneMap);
    expect(FINAL_FRAGMENT.indexOf('c * uGain')).toBeGreaterThan(output);
    expect(grade).toBeGreaterThan(0);
  });
});
