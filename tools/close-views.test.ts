import { describe, expect, it } from 'vitest';

import { closeView, galleryTransport } from '../src/gallery/items.ts';
import { parseTestNotes } from '../src/gallery/notes.ts';
import {
  ROLE_VIEWS,
  SERVER_PORT,
  baseGridLabels,
  closeViewPath,
  closeViewsArgs,
  roleOf,
} from './close-views.ts';

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
    // The view of the keys is on the left side, turned toward the front. The case and the lid
    // of the piano then stay beside the left paw.
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

  it('shows the violinist at the frog and the tip of a whole bow, at a crossing, at rest, and standing', () => {
    const { moments, notes } = ROLE_VIEWS.violinist;
    const result = parseTestNotes(notes ?? '');
    if (!result.ok) {
      throw new Error(`The test notes of the violinist fail on line ${result.line}.`);
    }
    const whole = result.notes[0];
    const timeOf = (name: string): number => moments.find((m) => m.name === name)?.time ?? NaN;
    // The frog is near the start of the long note, and the tip near its end.
    expect(timeOf('frog') - (whole?.start ?? NaN)).toBeLessThan(0.25 * (whole?.length ?? 0));
    expect((whole?.start ?? NaN) + (whole?.length ?? 0) - timeOf('tip')).toBeLessThan(
      0.25 * (whole?.length ?? 0),
    );
    // The crossing is at the start of a note on another string, after a note on the G string.
    const crossing = result.notes.find((note) => Math.abs(note.start - timeOf('crossing')) < 1e-9);
    const before = result.notes.find((note) => note.start + note.length === crossing?.start);
    expect(crossing && before && Math.abs(crossing.key - before.key)).toBeGreaterThan(12);
    expect(moments.some((moment) => moment.rest)).toBe(true);
    expect(moments.some((moment) => moment.stand)).toBe(true);
    const stand = moments.find((moment) => moment.stand);
    const search = new URLSearchParams(
      closeViewPath(
        ROLE_VIEWS.violinist,
        { name: 'front', azimuth: 0 },
        stand ?? moments[0]!,
      ).split('?')[1],
    );
    expect(search.has('stand')).toBe(true);
  });

  it('reads the role of the command line', () => {
    expect(roleOf('violinist')).toBe('violinist');
    expect(roleOf('pianist')).toBe('pianist');
    expect(roleOf('conductor')).toBe('conductor');
    expect(roleOf('drummer')).toBeNull();
  });
});

describe('closeViewsArgs', () => {
  it('reads the role, the folder, the URL of a running site, and the commit to compare', () => {
    expect(closeViewsArgs(['violinist', 'out'])).toEqual({
      role: 'violinist',
      out: 'out',
      url: null,
      base: null,
    });
    expect(
      closeViewsArgs(['pianist', 'out', '--base', 'main', '--url', 'http://localhost:5199/']),
    ).toEqual({ role: 'pianist', out: 'out', url: 'http://localhost:5199/', base: 'main' });
  });

  it('refuses a wrong role, no folder, and an option with no value', () => {
    expect(closeViewsArgs(['drummer', 'out'])).toBeNull();
    expect(closeViewsArgs(['violinist', '--base', 'main'])).toBeNull();
    expect(closeViewsArgs(['violinist', 'out', '--base'])).toBeNull();
    expect(closeViewsArgs(['violinist', 'out', '--url', '--base', 'main'])).toBeNull();
  });
});

describe('baseGridLabels', () => {
  it('names the commit in each cell of the upper grid and the working tree in the lower grid', () => {
    expect(baseGridLabels(['frog, front', 'frog, left'], 'main (cc83899c)')).toEqual([
      'main (cc83899c): frog, front',
      'main (cc83899c): frog, left',
      'working tree: frog, front',
      'working tree: frog, left',
    ]);
  });
});

describe('SERVER_PORT', () => {
  it('starts each server above 4290, so that Vite never moves up to 4182, the port of the merge', () => {
    expect(SERVER_PORT).toBeGreaterThan(4290);
  });
});
