import { describe, expect, it } from 'vitest';

import { closeView } from '../src/gallery/items.ts';
import { CHOIR_VIEWS, choirPath } from './choir-check.ts';

describe('choirPath', () => {
  it('shows the penguin alone at the camera of each view', () => {
    for (const view of CHOIR_VIEWS) {
      const search = new URLSearchParams(choirPath(view).split('?')[1]);
      expect(search.get('only')).toBe('penguin');
      const close = closeView(search);
      expect(close.zoom).toBeGreaterThan(1);
      expect(close.azimuth).toBe(view.azimuth);
      expect(close.elevation).toBe(view.elevation);
    }
  });

  it('looks at the front for orchestra-latest.png and at the right side for orchestra-side.png', () => {
    const [front, side] = CHOIR_VIEWS;
    expect(front?.reference).toBe('orchestra-latest.png');
    expect(front?.azimuth).toBe(0);
    expect(side?.reference).toBe('orchestra-side.png');
    expect(side?.azimuth).toBeGreaterThan(0);
  });
});
