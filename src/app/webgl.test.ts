import { describe, expect, it } from 'vitest';

import { supportsWebgl2 } from './webgl.ts';
import type { ProbeCanvas } from './webgl.ts';

describe('supportsWebgl2 (design 2.6)', () => {
  it('finds WebGL2, and frees the context of the probe', () => {
    let lost = 0;
    const canvas: ProbeCanvas = {
      getContext: () => ({
        getExtension: () => ({
          loseContext: () => {
            lost++;
          },
        }),
      }),
    };
    expect(supportsWebgl2(canvas)).toBe(true);
    expect(lost).toBe(1);
  });

  it('finds no WebGL2 when the canvas gives no context or throws', () => {
    expect(supportsWebgl2({ getContext: () => null })).toBe(false);
    const throws: ProbeCanvas = {
      getContext: () => {
        throw new Error('No GPU.');
      },
    };
    expect(supportsWebgl2(throws)).toBe(false);
  });
});
