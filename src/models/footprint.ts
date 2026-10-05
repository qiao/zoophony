import type { Bounds } from './bounds.ts';
import type { Vec3 } from './tuples.ts';
import type { MeshData } from './mesh.ts';
import { buildPlayer } from './player.ts';
import { buildMusicStand, buildSupport } from './props.ts';
import type { SpeciesId } from './species.ts';
import type { KettleCount } from './instruments/percussion.ts';
import type { InstrumentId } from './instruments/types.ts';

/**
 * The space that one item takes on the stage: a list of boxes in the axes of the item. For a
 * player, the item faces -z, and the origin is the floor under the center of its seat.
 */
export interface Footprint {
  readonly boxes: readonly Bounds[];
  /** The box around all boxes. */
  readonly bounds: Bounds;
}

/** A box of a footprint at its place on the stage: turned around y and moved. */
export interface PlacedBox {
  /** The center of the box on the stage top, as x and z. */
  readonly x: number;
  readonly z: number;
  /** The unit axes of the box in the plane of the stage top: its x axis, then its z axis. */
  readonly cos: number;
  readonly sin: number;
  /** Half the size of the box along its x axis and along its z axis. */
  readonly halfX: number;
  readonly halfZ: number;
  readonly minY: number;
  readonly maxY: number;
}

/**
 * Calculates the box around a list of boxes.
 *
 * @param boxes The boxes. There is at least one.
 * @returns The box around them.
 */
function around(boxes: readonly Bounds[]): Bounds {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const box of boxes) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k] ?? Infinity, box.min[k] ?? 0);
      max[k] = Math.max(max[k] ?? -Infinity, box.max[k] ?? 0);
    }
  }
  return {
    min: [min[0] ?? 0, min[1] ?? 0, min[2] ?? 0],
    max: [max[0] ?? 0, max[1] ?? 0, max[2] ?? 0],
  };
}

/**
 * Calculates one box for each group of the triangles of a mesh.
 *
 * @param mesh The mesh.
 * @param groupOf Gives the group of a triangle.
 * @returns One box for each group that has triangles.
 */
function groupBoxes(mesh: MeshData, groupOf: (triangle: number) => number): Bounds[] {
  const boxes = new Map<number, { min: number[]; max: number[] }>();
  const p = mesh.positions;
  for (let t = 0; t < p.length / 9; t++) {
    const group = groupOf(t);
    const box = boxes.get(group) ?? {
      min: [Infinity, Infinity, Infinity],
      max: [-Infinity, -Infinity, -Infinity],
    };
    for (let i = t * 9; i < t * 9 + 9; i++) {
      const k = i % 3;
      box.min[k] = Math.min(box.min[k] ?? Infinity, p[i] ?? 0);
      box.max[k] = Math.max(box.max[k] ?? -Infinity, p[i] ?? 0);
    }
    boxes.set(group, box);
  }
  return [...boxes.values()].map((box): Bounds => ({
    min: [box.min[0] ?? 0, box.min[1] ?? 0, box.min[2] ?? 0],
    max: [box.max[0] ?? 0, box.max[1] ?? 0, box.max[2] ?? 0],
  }));
}

/**
 * Makes a footprint from its boxes.
 *
 * @param boxes The boxes. There is at least one.
 * @returns The footprint.
 */
export function footprintOf(boxes: readonly Bounds[]): Footprint {
  return { boxes, bounds: around(boxes) };
}

/** The height of one band of the boxes of a player footprint, in meters. */
const BAND_HEIGHT = 0.2;

const playerFootprints = new Map<string, Footprint>();

/**
 * Calculates the footprint of a player in its bind pose: one box for the parts of each bone in
 * each band of 0.2 m of height, and one box for its seat. The function keeps each result, so
 * each kind of player builds its mesh one time.
 *
 * @param species The species.
 * @param instrument The instrument.
 * @param kettles The number of kettles of the timpani.
 * @returns The footprint in the axes of the player model.
 */
export function playerFootprint(
  species: SpeciesId,
  instrument: InstrumentId,
  kettles: KettleCount,
): Footprint {
  const key = `${species} ${instrument} ${kettles}`;
  const known = playerFootprints.get(key);
  if (known) {
    return known;
  }
  const player = buildPlayer(species, instrument, kettles);
  const { bones, positions } = player.mesh;
  // One box for the parts of each bone in each band of heights, so that a tilted instrument,
  // such as the cello, gets a tight footprint.
  const boxes = groupBoxes(player.mesh, (t) => {
    const y =
      ((positions[t * 9 + 1] ?? 0) + (positions[t * 9 + 4] ?? 0) + (positions[t * 9 + 7] ?? 0)) / 3;
    return (bones[t * 3] ?? 0) * 100 + Math.floor(y / BAND_HEIGHT);
  });
  const seat = buildSupport(player.support);
  if (seat) {
    boxes.push(...groupBoxes(seat, () => 0));
  }
  const footprint = footprintOf(boxes);
  playerFootprints.set(key, footprint);
  return footprint;
}

/**
 * The footprint of a music stand: one box for each leg of the tripod, the post, and the desk with
 * its sheet. The reader is at +z.
 */
export const STAND_FOOTPRINT: Footprint = (() => {
  // `buildMusicStand()` adds three legs, the post, and the desk as boxes of 12 triangles, then
  // the sheet.
  const parts = 4;
  return footprintOf(groupBoxes(buildMusicStand(), (t) => Math.min(Math.floor(t / 12), parts)));
})();

/**
 * Places the boxes of a footprint on the stage.
 *
 * @param footprint The footprint.
 * @param position The place of the origin of the item.
 * @param facing The turn of the item around y, in radians. 0 faces -z.
 * @returns The boxes on the stage.
 */
export function placeFootprint(footprint: Footprint, position: Vec3, facing: number): PlacedBox[] {
  const cos = Math.cos(facing);
  const sin = Math.sin(facing);
  return footprint.boxes.map((box) => {
    const cx = (box.min[0] + box.max[0]) / 2;
    const cz = (box.min[2] + box.max[2]) / 2;
    return {
      // A turn of `facing` around y moves (x, z) to (x cos + z sin, -x sin + z cos).
      x: position[0] + cx * cos + cz * sin,
      z: position[2] - cx * sin + cz * cos,
      cos,
      sin,
      halfX: (box.max[0] - box.min[0]) / 2,
      halfZ: (box.max[2] - box.min[2]) / 2,
      minY: position[1] + box.min[1],
      maxY: position[1] + box.max[1],
    };
  });
}

/**
 * Finds if two placed boxes come closer than a gap in the plane of the stage, and share heights.
 *
 * @param a A box.
 * @param b Another box.
 * @param gap The smallest free distance in the plane, in meters.
 * @returns True if the boxes overlap, or if they are closer than the gap.
 */
export function boxesTouch(a: PlacedBox, b: PlacedBox, gap: number): boolean {
  if (a.minY >= b.maxY - 1e-9 || b.minY >= a.maxY - 1e-9) {
    return false;
  }
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  // The axes of a box: (cos, -sin) and (sin, cos). Two rectangles are apart when one of the four
  // axes separates them (the separating axis theorem).
  for (const [nx, nz] of [
    [a.cos, -a.sin],
    [a.sin, a.cos],
    [b.cos, -b.sin],
    [b.sin, b.cos],
  ] as const) {
    const reachA =
      a.halfX * Math.abs(a.cos * nx - a.sin * nz) + a.halfZ * Math.abs(a.sin * nx + a.cos * nz);
    const reachB =
      b.halfX * Math.abs(b.cos * nx - b.sin * nz) + b.halfZ * Math.abs(b.sin * nx + b.cos * nz);
    if (Math.abs(dx * nx + dz * nz) >= reachA + reachB + gap) {
      return false;
    }
  }
  return true;
}

/** An item on the stage for the overlap check: its placed boxes, and a circle around them. */
export interface Obstacle {
  /** What the item is, for the messages of the tests. */
  readonly label: string;
  readonly boxes: readonly PlacedBox[];
  readonly x: number;
  readonly z: number;
  readonly radius: number;
}

/**
 * Makes an obstacle from placed boxes.
 *
 * @param label What the item is.
 * @param boxes The boxes. There is at least one.
 * @returns The obstacle.
 */
export function obstacleOf(label: string, boxes: readonly PlacedBox[]): Obstacle {
  const xs = boxes.flatMap((b) => [b.x - b.halfX - b.halfZ, b.x + b.halfX + b.halfZ]);
  const zs = boxes.flatMap((b) => [b.z - b.halfX - b.halfZ, b.z + b.halfX + b.halfZ]);
  const x = (Math.min(...xs) + Math.max(...xs)) / 2;
  const z = (Math.min(...zs) + Math.max(...zs)) / 2;
  const radius = Math.hypot(Math.max(...xs) - x, Math.max(...zs) - z);
  return { label, boxes, x, z, radius };
}

/**
 * Finds if two obstacles come closer than a gap.
 *
 * @param a An obstacle.
 * @param b Another obstacle.
 * @param gap The smallest free distance, in meters.
 * @returns True if a box of one comes closer than the gap to a box of the other.
 */
export function obstaclesTouch(a: Obstacle, b: Obstacle, gap: number): boolean {
  if (Math.hypot(a.x - b.x, a.z - b.z) >= a.radius + b.radius + gap) {
    return false;
  }
  return a.boxes.some((p) => b.boxes.some((q) => boxesTouch(p, q, gap)));
}
