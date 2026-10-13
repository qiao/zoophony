import type { Bounds } from '../models/bounds.ts';
import { CONDUCTOR, SECTION_INSTRUMENTS, SECTION_SPECIES } from '../models/cast.ts';
import type { MeshData } from '../models/mesh.ts';
import type { PlayingSection } from '../models/cast.ts';
import type { SpeciesId } from '../models/species.ts';
import { INSTRUMENT_IDS } from '../models/instruments/catalog.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import type { Transport } from '../pose/types.ts';

/** One model of the gallery: a species with an instrument, or an instrument alone. */
export interface GalleryItem {
  /** The text under the model. A species item has two lines: the species and the instrument. */
  readonly label: string;
  readonly species: SpeciesId;
  readonly instrument: InstrumentId;
}

/** The size of an item on the floor, and its height, in meters. */
export interface ItemSize {
  readonly width: number;
  readonly depth: number;
  readonly height: number;
}

/** The sections in the order of design 4.3. */
const SECTIONS = Object.keys(SECTION_SPECIES).filter(
  (key): key is PlayingSection => key in SECTION_INSTRUMENTS,
);

/**
 * Lists each species with each instrument of its section (design 4.3, 4.6, 7.1), then the bear
 * with the baton. The two fox colors and the five instruments of the percussion each get a model.
 *
 * @returns The items, in the order of the sections.
 */
export function speciesItems(): GalleryItem[] {
  const items = SECTIONS.flatMap((section) =>
    SECTION_SPECIES[section].flatMap((species) =>
      SECTION_INSTRUMENTS[section].map((instrument): GalleryItem => ({
        label: `${species}\n${instrument}`,
        species,
        instrument,
      })),
    ),
  );
  items.push({ label: 'bear\nbaton (conductor)', ...CONDUCTOR });
  return items;
}

/**
 * Lists each instrument alone (design 4.6, 7.1). The instrument keeps the place that it has in the
 * hands of the first species of its section, so a held instrument floats at the height of the
 * hands.
 *
 * @returns One item for each instrument, in the order of the inventory.
 */
export function instrumentItems(): GalleryItem[] {
  return INSTRUMENT_IDS.map((instrument): GalleryItem => {
    const section = SECTIONS.find((s) =>
      SECTION_INSTRUMENTS[s].some((id: InstrumentId) => id === instrument),
    );
    const species = section ? SECTION_SPECIES[section][0] : CONDUCTOR.species;
    return { label: instrument, species, instrument };
  });
}

/**
 * Selects the items of a list of names, so that a close view of the gallery shows only some
 * models (design 7.1). For example, `?only=dog,piano` shows the dog with the cello and the
 * polar bear with the piano.
 *
 * @param items The items of a page.
 * @param only The names, separated by commas: a species or an instrument. `null` selects all
 *   items.
 * @returns The items whose species or instrument has one of the names, in their order.
 */
export function selectItems(items: readonly GalleryItem[], only: string | null): GalleryItem[] {
  if (only === null) {
    return [...items];
  }
  const names = new Set(only.split(',').map((name) => name.trim()));
  return items.filter((item) => names.has(item.species) || names.has(item.instrument));
}

/** The angle of the camera of the gallery above the floor, in degrees, with no query. */
export const GALLERY_ELEVATION_DEG = 35;

/**
 * A close view of the gallery: a zoom of the camera, the height that it looks at, and the
 * direction of the camera.
 */
export interface CloseView {
  /** The camera distance is the distance that shows all models, divided by the zoom. */
  readonly zoom: number;
  /** The height of the point that the camera looks at, in meters. */
  readonly target: number;
  /**
   * The turn of the camera around the vertical line through the target, in degrees. A positive
   * turn moves the camera to the right side of the animals, which face it.
   */
  readonly azimuth: number;
  /** The angle of the camera above the floor, in degrees, from 0 to 89. */
  readonly elevation: number;
  /**
   * The x and the z of the vertical line through the camera target, in meters: the middle of the
   * gallery by default. The pianist sits at one end of its piano, so its close view moves the
   * line to the pianist.
   */
  readonly x: number;
  readonly z: number;
}

/**
 * Reads a close view from the query of the gallery (design 7.1): `zoom` (1 or more, default 1),
 * `target` (default 0.6 m), `azimuth` (default 0°), `elevation` (default
 * {@link GALLERY_ELEVATION_DEG}), and `x` and `z` (default 0 m). For example, `?only=dog&zoom=2.5&target=1.1` shows the head of
 * the dog, and `&azimuth=45&elevation=20` shows it from its right side and lower. A value that is
 * not a number keeps its default.
 *
 * @param search The query of the page.
 * @returns The close view.
 */
export function closeView(search: URLSearchParams): CloseView {
  const read = (name: string, fallback: number): number => {
    const value = Number(search.get(name) ?? Number.NaN);
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    zoom: Math.max(1, read('zoom', 1)),
    target: read('target', 0.6),
    azimuth: read('azimuth', 0),
    elevation: Math.min(89, Math.max(0, read('elevation', GALLERY_ELEVATION_DEG))),
    x: read('x', 0),
    z: read('z', 0),
  };
}

/** A transport that plays since long before the first frame, so the instruments stay up. */
const PLAYING: Transport = {
  playing: true,
  changedAtWall: -100,
  before: null,
  startSec: 0,
  holdSec: 3,
  leadSec: Number.POSITIVE_INFINITY,
};

/** The transport before the first play: the players keep the rest pose (design 5.2). */
const REST: Transport = {
  playing: false,
  changedAtWall: null,
  before: null,
  startSec: 0,
  holdSec: 3,
  leadSec: 0,
};

/**
 * Reads the transport of the players from the query of the gallery (design 7.1). The query
 * `rest` shows the rest pose of design 5.2. With no `rest`, the players play.
 *
 * @param search The query of the page.
 * @returns The transport.
 */
export function galleryTransport(search: URLSearchParams): Transport {
  return search.has('rest') ? REST : PLAYING;
}

/**
 * Places items in rows on the floor. Each row holds `columns` items with a gap between them, and
 * is centered on x = 0. Row 0 is at the back (-z), so the first items are at the top of the view.
 * A camera that looks down at the rows sees the floor behind an item only beyond a distance of
 * its height times `hide`. Thus the gap in front of a row is at least the height of the tallest
 * item of the next row times `hide`, so that no item hides the base of an item behind it. The
 * labels of a row lie on the floor in front of it, so the gap also holds `label` in front of that
 * floor.
 *
 * @param sizes The size of each item.
 * @param columns The number of items in a row.
 * @param gap The smallest free space between two items, in meters.
 * @param hide The floor that an item hides behind it for each meter of its height: 1 / tan of
 *   the elevation of the camera.
 * @param label The depth of floor that the labels of a row cover in front of it, in meters.
 * @returns The center of each item on the floor, as (x, z).
 */
export function gridPlaces(
  sizes: readonly ItemSize[],
  columns: number,
  gap: number,
  hide: number,
  label = 0,
): [number, number][] {
  const rows: ItemSize[][] = [];
  for (let i = 0; i < sizes.length; i += columns) {
    rows.push(sizes.slice(i, i + columns));
  }
  const depths = rows.map((row) => Math.max(...row.map((size) => size.depth)));
  const heights = rows.map((row) => Math.max(...row.map((size) => size.height)));
  const gaps = rows.slice(1).map((_, r) => Math.max(gap, (heights[r + 1] ?? 0) * hide + label));
  const total =
    depths.reduce((sum, depth) => sum + depth, 0) + gaps.reduce((sum, next) => sum + next, 0);
  const places: [number, number][] = [];
  let z = -total / 2;
  rows.forEach((row, r) => {
    const depth = depths[r] ?? 0;
    const width = row.reduce((sum, size) => sum + size.width, 0) + gap * (row.length - 1);
    let x = -width / 2;
    for (const size of row) {
      places.push([x + size.width / 2, z + depth / 2]);
      x += size.width + gap;
    }
    z += depth + (gaps[r] ?? 0);
  });
  return places;
}

/**
 * Calculates the box around the vertices of meshes in the same axes.
 *
 * @param meshes The meshes, for example a player and its seat. There is at least one vertex.
 * @returns The box.
 */
export function boundsOf(meshes: readonly MeshData[]): Bounds {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const { positions } of meshes) {
    for (let i = 0; i < positions.length; i++) {
      const axis = i % 3;
      const value = positions[i] ?? 0;
      min[axis] = Math.min(min[axis] ?? Infinity, value);
      max[axis] = Math.max(max[axis] ?? -Infinity, value);
    }
  }
  return {
    min: [min[0] ?? 0, min[1] ?? 0, min[2] ?? 0],
    max: [max[0] ?? 0, max[1] ?? 0, max[2] ?? 0],
  };
}
