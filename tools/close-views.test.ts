import { describe, expect, it } from 'vitest';

import { closeView, galleryTransport } from '../src/gallery/items.ts';
import { parseTestNotes } from '../src/gallery/notes.ts';
import { ROLE_VIEWS, closeViewPath, roleOf } from './close-views.ts';

describe('closeViewPath', () => {
  it('shows the animal of each role alone and close, at the camera of each view', () => {
    for (const role of Object.values(ROLE_VIEWS)) {
      for (const view of role.views) {
        for (const moment of role.moments) {
          const search = new URLSearchParams(closeViewPath(role, view, moment).split('?')[1]);
          expect(search.get('only')).toBe(role.species);
          const close = closeView(search);
          expect(close.zoom).toBeGreaterThanOrEqual(1);
          expect(close.azimuth).toBe(view.azimuth);
          expect(close.elevation).toBe(view.elevation ?? role.camera.elevation);
          // A camera around the body takes the line and the target from the body.
          expect(close.body).toBe(role.camera.kind === 'body');
          // The rest pose is the transport before the first play (design 5.2).
          expect(galleryTransport(search).playing).toBe(!moment.rest);
        }
      }
    }
  });

  it('shows the conductor from the front, the right side, and the back at the four beats of a bar', () => {
    const { views, moments } = ROLE_VIEWS.conductor;
    expect(views.map((view) => view.azimuth)).toEqual([0, 90, 180]);
    const beats = moments.filter((moment) => moment.name.startsWith('beat-'));
    // The test notes of the gallery are 4/4 at 120 BPM: a beat is 0.5 s.
    expect(beats.map((moment) => moment.time)).toEqual([0, 0.5, 1, 1.5]);
  });

  it('shows the pianist around its body from four sides and the paws on the keys', () => {
    const { views, moments, notes, camera } = ROLE_VIEWS.pianist;
    expect(camera.kind).toBe('body');
    const at = (name: string): number | undefined =>
      views.find((view) => view.name === name)?.azimuth;
    expect([at('front'), at('right'), at('back'), at('left')]).toEqual([0, 90, 180, -90]);
    // The view of the keys is on the left side, turned toward the front, so that the case and
    // the lid of the piano stay beside the left paw.
    const keys = views.find((view) => view.name === 'keys');
    expect(keys?.azimuth).toBeGreaterThan(-90);
    expect(keys?.azimuth).toBeLessThan(-45);
    const result = parseTestNotes(notes ?? '');
    if (!result.ok) {
      throw new Error(`The test notes of the pianist fail on line ${result.line}.`);
    }
    const parsed = result.notes;
    const chord = moments.find((moment) => moment.name === 'chord');
    const sounding = parsed.filter(
      (note) => note.start <= (chord?.time ?? -1) && (chord?.time ?? -1) < note.start + note.length,
    );
    // Three keys below middle C and three keys above it.
    expect(sounding.filter((note) => note.key < 60)).toHaveLength(3);
    expect(sounding.filter((note) => note.key > 60)).toHaveLength(3);
    expect(moments.some((moment) => moment.rest)).toBe(true);
  });

  it('reads the role of the command line', () => {
    expect(roleOf('pianist')).toBe('pianist');
    expect(roleOf('conductor')).toBe('conductor');
    expect(roleOf('drummer')).toBeNull();
  });
});
