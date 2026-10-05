import { describe, expect, it } from 'vitest';

import { SPECIES } from '../models/species.ts';
import { INSTRUMENT_IDS } from '../models/instruments/catalog.ts';
import { transform } from '../models/math.ts';
import { MeshBuilder } from '../models/mesh.ts';
import { box } from '../models/primitives.ts';
import { boundsOf, gridPlaces, instrumentItems, speciesItems } from './items.ts';

describe('speciesItems', () => {
  it('shows each species with the instrument of its section (design 7.1)', () => {
    const items = speciesItems();
    const species = new Set(items.map((item) => item.species));
    expect([...species].toSorted()).toEqual(Object.keys(SPECIES).toSorted());
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
    expect(items.find((item) => item.instrument === 'cello')?.species).toBe('panda');
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
