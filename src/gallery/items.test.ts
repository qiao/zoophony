import { describe, expect, it } from 'vitest';

import { CONDUCTOR, SECTION_SPECIES } from '../models/cast.ts';
import type { SpeciesId } from '../models/species.ts';
import { INSTRUMENT_IDS } from '../models/instruments/catalog.ts';
import { MeshBuilder, transform } from '../models/mesh.ts';
import { box } from '../models/primitives.ts';
import { buildPlayer } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import {
  aroundBody,
  bodyBoundsOf,
  boundsOf,
  GALLERY_ELEVATION_DEG,
  closeView,
  galleryTransport,
  gridPlaces,
  instrumentItems,
  selectItems,
  speciesItems,
} from './items.ts';

describe('speciesItems', () => {
  it('shows each species with the instrument of its section (design 7.1)', () => {
    const items = speciesItems();
    const species = new Set(items.map((item) => item.species));
    // Each species of a seat, and the bear of the conductor. A species with no seat does not show.
    const seated = new Set<SpeciesId>([
      ...Object.values(SECTION_SPECIES).flat(),
      CONDUCTOR.species,
    ]);
    expect([...species].toSorted()).toEqual([...seated].toSorted());
    expect(items).toContainEqual({
      label: 'rabbit\nviolin',
      species: 'rabbit',
      instrument: 'violin',
    });
    expect(items).toContainEqual({
      label: 'fox-tan\nflute',
      species: 'fox-tan',
      instrument: 'flute',
    });
    expect(items.filter((item) => item.species === 'badger')).toHaveLength(5);
    expect(items.at(-1)).toEqual({
      label: 'bear\nbaton (conductor)',
      species: 'bear',
      instrument: 'baton',
    });
  });
});

describe('instrumentItems', () => {
  it('shows each instrument one time, held by the first species of its section', () => {
    const items = instrumentItems();
    expect(items.map((item) => item.instrument)).toEqual([...INSTRUMENT_IDS]);
    expect(items.find((item) => item.instrument === 'cello')?.species).toBe('dog');
    expect(items.find((item) => item.instrument === 'xylophone')?.species).toBe('badger');
    expect(items.find((item) => item.instrument === 'baton')?.species).toBe('bear');
  });
});

describe('gridPlaces', () => {
  it('puts the items in centered rows, with the first row at the back', () => {
    const places = gridPlaces(
      [
        { width: 1, depth: 1, height: 1 },
        { width: 3, depth: 2, height: 1 },
        { width: 2, depth: 1, height: 0.2 },
      ],
      2,
      0.5,
      1,
    );
    // Row 0 is 1 + 0.5 + 3 = 4.5 wide and 2 deep. Row 1 is 2 wide and 1 deep.
    expect(places).toEqual([
      [-1.75, -0.75],
      [0.75, -0.75],
      [0, 1.25],
    ]);
  });

  it('keeps the floor behind a tall row free, so that it hides no base (review of step 4, F2)', () => {
    const hide = 1 / Math.tan((35 * Math.PI) / 180);
    const places = gridPlaces(
      [
        { width: 1, depth: 1, height: 0.5 },
        { width: 1, depth: 1, height: 2 },
      ],
      1,
      0.8,
      hide,
    );
    // The model of 2 m in front hides 2 / tan 35° = 2.86 m of floor behind it.
    const free = (places[1]?.[1] ?? 0) - 0.5 - ((places[0]?.[1] ?? 0) + 0.5);
    expect(free).toBeCloseTo(2 * hide, 9);
  });

  it('keeps the floor of the labels free in front of a row (review of step 4, P4)', () => {
    const hide = 1 / Math.tan((35 * Math.PI) / 180);
    const sizes = [
      { width: 1, depth: 1, height: 0.5 },
      { width: 1, depth: 1, height: 2 },
    ];
    const places = gridPlaces(sizes, 1, 0.8, hide, 0.4);
    const free = (places[1]?.[1] ?? 0) - 0.5 - ((places[0]?.[1] ?? 0) + 0.5);
    expect(free).toBeCloseTo(2 * hide + 0.4, 9);
    // A short row in front hides less floor.
    const low = gridPlaces(sizes.toReversed(), 1, 0.8, hide, 0.4);
    expect((low[1]?.[1] ?? 0) - (low[0]?.[1] ?? 0) - 1).toBeCloseTo(0.5 * hide + 0.4, 9);
  });
});

describe('boundsOf', () => {
  it('gives the box around all vertices of all meshes', () => {
    const a = new MeshBuilder();
    a.add(box(1, 2, 1), { color: [1, 1, 1] });
    const b = new MeshBuilder();
    b.add(box(1, 1, 1), { color: [1, 1, 1], at: transform([3, 0, -2]) });
    expect(boundsOf([a.build(), b.build()])).toEqual({ min: [-0.5, -1, -2.5], max: [3.5, 1, 0.5] });
  });
});

describe('selectItems', () => {
  it('keeps the items of a species or an instrument of the list, in their order', () => {
    const items = speciesItems();
    expect(selectItems(items, null)).toEqual(items);
    expect(selectItems(items, 'piano, dog').map((item) => item.label)).toEqual([
      'dog\ncello',
      'polar-bear\npiano',
    ]);
    expect(selectItems(items, 'badger')).toHaveLength(5);
    expect(selectItems(items, 'unicorn')).toEqual([]);
  });
});

describe('closeView', () => {
  it('reads the zoom, the target, and the direction of the query, with defaults', () => {
    const defaults = {
      zoom: 1,
      target: 0.6,
      azimuth: 0,
      elevation: GALLERY_ELEVATION_DEG,
      x: 0,
      z: 0,
      body: false,
    };
    expect(closeView(new URLSearchParams(''))).toEqual(defaults);
    expect(
      closeView(new URLSearchParams('zoom=2.5&target=1.1&azimuth=-40&elevation=22&x=-1.5&z=0.2')),
    ).toEqual({
      zoom: 2.5,
      target: 1.1,
      azimuth: -40,
      elevation: 22,
      x: -1.5,
      z: 0.2,
      body: false,
    });
    expect(closeView(new URLSearchParams('only=bear&body')).body).toBe(true);
    expect(closeView(new URLSearchParams('zoom=0.5&target=x&azimuth=y'))).toEqual(defaults);
    expect(closeView(new URLSearchParams('elevation=95')).elevation).toBe(89);
    expect(closeView(new URLSearchParams('elevation=-5')).elevation).toBe(0);
  });
});

describe('bodyBoundsOf', () => {
  it('boxes the body of a player with no instrument', () => {
    const model = buildPlayer('polar-bear', 'piano');
    const body = bodyBoundsOf(model.mesh);
    const all = boundsOf([model.mesh]);
    // The piano is in front of the player, and the body is behind the front of the keys.
    expect(all.min[2]).toBeLessThan(body.min[2] - 1);
    for (const joint of [model.body.positions.head, model.body.positions.hips]) {
      for (let k = 0; k < 3; k++) {
        expect(joint[k]).toBeGreaterThan(body.min[k] ?? 0);
        expect(joint[k]).toBeLessThan(body.max[k] ?? 0);
      }
    }
  });

  it('refuses a mesh with no corner on a bone of the body', () => {
    const builder = new MeshBuilder();
    builder.add(box(1, 1, 1), { color: [0.5, 0.5, 0.5], bone: boneIndex('instrument') });
    expect(() => bodyBoundsOf(builder.build())).toThrow('no corner');
  });
});

describe('aroundBody', () => {
  const view = closeView(new URLSearchParams('body&azimuth=0&elevation=30'));
  const bodyBox = { min: [-2, 0, 1], max: [-1, 1.6, 2] } as const;

  it('turns the camera around the vertical line through the middle of the body', () => {
    const aimed = aroundBody(view, bodyBox, Math.PI);
    expect([aimed.x, aimed.target, aimed.z]).toEqual([-1.5, 0.8, 1.5]);
    expect(aimed.elevation).toBe(30);
  });

  it('starts the azimuth at the front of the animal', () => {
    // An animal that faces the camera of the gallery (+z) has its front at the azimuth 0°.
    expect(aroundBody(view, bodyBox, Math.PI).azimuth).toBeCloseTo(0, 9);
    // The pianist faces +x, so its front is at -90° and its right side at 0°.
    expect(aroundBody(view, bodyBox, -Math.PI / 2).azimuth).toBeCloseTo(-90, 9);
    const right = closeView(new URLSearchParams('body&azimuth=90'));
    expect(aroundBody(right, bodyBox, -Math.PI / 2).azimuth).toBeCloseTo(0, 9);
    const back = closeView(new URLSearchParams('body&azimuth=180'));
    expect(Math.abs(aroundBody(back, bodyBox, Math.PI).azimuth)).toBeCloseTo(180, 9);
  });
});

describe('galleryTransport', () => {
  it('plays by default, and shows the rest pose with the query rest', () => {
    expect(galleryTransport(new URLSearchParams('')).playing).toBe(true);
    const rest = galleryTransport(new URLSearchParams('only=rabbit&rest'));
    expect(rest.playing).toBe(false);
    expect(rest.changedAtWall).toBeNull();
  });
});
