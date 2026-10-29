import { describe, expect, it } from 'vitest';

import { probeWebgl2 } from './webgl.ts';
import type { ProbeCanvas } from './webgl.ts';

describe('probeWebgl2 (design 2.6)', () => {
  it('finds WebGL2 and its target format, and frees the context of the probe', () => {
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
    expect(probeWebgl2(canvas)).toBe('packed');
    expect(lost).toBe(1);
  });

  it('finds no WebGL2 when the canvas gives no context or throws', () => {
    expect(probeWebgl2({ getContext: () => null })).toBe(null);
    const throws: ProbeCanvas = {
      getContext: () => {
        throw new Error('No GPU.');
      },
    };
    expect(probeWebgl2(throws)).toBe(null);
  });
});
