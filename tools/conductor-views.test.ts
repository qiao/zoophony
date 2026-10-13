import { describe, expect, it } from 'vitest';

import { closeView, galleryTransport } from '../src/gallery/items.ts';
import { CONDUCTOR_MOMENTS, CONDUCTOR_VIEWS, conductorPath } from './conductor-views.ts';

describe('conductorPath', () => {
  it('shows the bear alone and close, at the camera of each view', () => {
    for (const view of CONDUCTOR_VIEWS) {
      for (const moment of CONDUCTOR_MOMENTS) {
        const search = new URLSearchParams(conductorPath(view, moment).split('?')[1]);
        expect(search.get('only')).toBe('bear');
        const close = closeView(search);
        expect(close.zoom).toBeGreaterThan(1);
        expect(close.azimuth).toBe(view.azimuth);
        // The rest pose is the transport before the first play (design 5.2).
        expect(galleryTransport(search).playing).toBe(!moment.rest);
      }
    }
  });

  it('shows the front, the right side, and the back, and the four beats of a bar', () => {
    expect(CONDUCTOR_VIEWS.map((view) => view.azimuth)).toEqual([0, 90, 180]);
    const beats = CONDUCTOR_MOMENTS.filter((moment) => moment.name.startsWith('beat-'));
    // The test notes of the gallery are 4/4 at 120 BPM: a beat is 0.5 s.
    expect(beats.map((moment) => moment.time)).toEqual([0, 0.5, 1, 1.5]);
  });
});
