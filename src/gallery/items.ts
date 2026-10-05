import type { Bounds } from '../models/bounds.ts';
import { CONDUCTOR, SECTION_INSTRUMENTS, SECTION_SPECIES } from '../models/cast.ts';
import type { MeshData } from '../models/mesh.ts';
import type { PlayingSection } from '../models/cast.ts';
import type { SpeciesId } from '../models/species.ts';
import { INSTRUMENT_IDS } from '../models/instruments/catalog.ts';
import type { InstrumentId } from '../models/instruments/types.ts';

/** One model of the gallery: a species with an instrument, or an instrument alone. */
export interface GalleryItem {
  /** The text under the model. */
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
        label: `${species}, ${instrument}`,
        species,
        instrument,
      })),
    ),
  );
  items.push({ label: 'bear, baton (conductor)', ...CONDUCTOR });
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
 * Places items in rows on the floor. Each row holds `columns` items with a gap between them, and
 * is centered on x = 0. Row 0 is at the back (-z), so the first items are at the top of the view.
 * A camera that looks down at the rows sees the floor behind an item only beyond a distance of
 * its height times `hide`. Thus the gap in front of a row is at least the height of the tallest
 * item of the next row times `hide`, so that no item hides the base of an item behind it.
 *
 * @param sizes The size of each item.
 * @param columns The number of items in a row.
 * @param gap The smallest free space between two items, in meters.
 * @param hide The floor that an item hides behind it for each meter of its height: 1 / tan of
 *   the elevation of the camera.
 * @returns The center of each item on the floor, as (x, z).
 */
export function gridPlaces(
  sizes: readonly ItemSize[],
  columns: number,
  gap: number,
  hide: number,
): [number, number][] {
  const rows: ItemSize[][] = [];
  for (let i = 0; i < sizes.length; i += columns) {
    rows.push(sizes.slice(i, i + columns));
  }
  const depths = rows.map((row) => Math.max(...row.map((size) => size.depth)));
  const heights = rows.map((row) => Math.max(...row.map((size) => size.height)));
  const gaps = rows.slice(1).map((_, r) => Math.max(gap, (heights[r + 1] ?? 0) * hide));
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
