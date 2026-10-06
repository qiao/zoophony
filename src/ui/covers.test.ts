import { describe, expect, it } from 'vitest';

import { DEMO_IDS } from '../app/demos.ts';
import { COVERS } from './covers.ts';

describe('the demo covers (design 2.8)', () => {
  it.each(DEMO_IDS)('gives the demo %s a cover with a gradient of its own', (id) => {
    const ids = [...COVERS[id].matchAll(/\bid="([^"]+)"/gu)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(0);
    for (const svgId of ids) {
      expect(svgId?.startsWith(`cover-${id}-`)).toBe(true);
    }
  });

  it('uses each id in one cover only', () => {
    const ids = Object.values(COVERS).flatMap((markup) =>
      [...markup.matchAll(/\bid="([^"]+)"/gu)].map((match) => match[1]),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('refers to no file and runs no script', () => {
    for (const markup of Object.values(COVERS)) {
      expect(markup).not.toMatch(/href|<script|<image|url\((?!#)/u);
    }
  });

  it('keeps the six covers small', () => {
    const bytes = Object.values(COVERS).reduce((sum, markup) => sum + markup.length, 0);
    expect(bytes).toBeLessThan(6000);
  });
});
