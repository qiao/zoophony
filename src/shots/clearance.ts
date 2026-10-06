import { CONDUCTOR_OBSTACLE, layoutObstacles } from '../models/layout-scene.ts';
import type { PlacedBox } from '../models/footprint.ts';
import type { SceneLayout } from '../models/layout.ts';
import type { ModelCache } from '../models/model-cache.ts';
import type { Vec3 } from '../models/tuples.ts';

/** The clearance rules of a camera (design 5.6). */
export const CLEARANCE = {
  /** The smallest distance from the camera to a box of a player, a stand, or the risers. */
  box: 0.6,
  /** The smallest distance from the camera to a box of the podium and the conductor. */
  conductor: 1.0,
  /** The lowest camera above the stage top. */
  height: 0.6,
  /** The boxes within this distance of the target are the body of the subject. */
  bodyReach: 0.4,
  /** The line of sight starts this far from the target, toward the camera. */
  sightStart: 0.3,
} as const;

/** The number of steps of the search for the closest point of a segment to a box. */
const SEARCH_STEPS = 24;

/** The part of the search interval that each golden section step keeps. */
const GOLDEN = (Math.sqrt(5) - 1) / 2;

/** One box of an obstacle, with its sphere for the broad phase and its clearance. */
export interface ClearBox extends PlacedBox {
  /** Half of the diagonal of the box: a sphere of this radius around its center holds it. */
  readonly reach: number;
  /** The smallest distance from the camera to the box. */
  readonly clearance: number;
}

/** One obstacle: its boxes and a circle around them in the stage plane. */
interface ClearObstacle {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly maxY: number;
  readonly clearance: number;
  readonly boxes: readonly ClearBox[];
}

/** The obstacles of a layout for the camera tests (design 5.6). */
export interface StageClearance {
  readonly obstacles: readonly ClearObstacle[];
}

/**
 * Prepares the obstacles of a layout for the camera tests: the boxes of `layoutObstacles()`,
 * with the clearance of each one.
 *
 * @param layout The layout.
 * @param models The player models of the score.
 * @returns The obstacles.
 */
export function prepareClearance(layout: SceneLayout, models: ModelCache): StageClearance {
  const obstacles = layoutObstacles(layout, models).map((obstacle): ClearObstacle => {
    const clearance = obstacle.label === CONDUCTOR_OBSTACLE ? CLEARANCE.conductor : CLEARANCE.box;
    const boxes = obstacle.boxes.map((b): ClearBox => ({
      x: b.x,
      z: b.z,
      cos: b.cos,
      sin: b.sin,
      halfX: b.halfX,
      halfZ: b.halfZ,
      minY: b.minY,
      maxY: b.maxY,
      reach: Math.hypot(b.halfX, b.halfZ, (b.maxY - b.minY) / 2),
      clearance,
    }));
    return {
      x: obstacle.x,
      z: obstacle.z,
      radius: obstacle.radius,
      maxY: Math.max(...boxes.map((b) => b.maxY)),
      clearance,
      boxes,
    };
  });
  return { obstacles };
}

/**
 * Finds the boxes of the body of a subject: each box within 0.4 m of the target. A footprint has
 * one box for the parts of each bone in each band of 0.2 m, so the body of the subject and the
 * instrument at its chest are several boxes around the target. The line of sight skips them, and
 * a far part of a large instrument, such as the piano case, still counts (design 5.6).
 *
 * @param clearance The obstacles.
 * @param point The target.
 * @returns The boxes of the body.
 */
export function bodyBoxes(clearance: StageClearance, point: Vec3): Set<ClearBox> {
  const held = new Set<ClearBox>();
  const reach = CLEARANCE.bodyReach;
  for (const obstacle of clearance.obstacles) {
    if (Math.hypot(point[0] - obstacle.x, point[2] - obstacle.z) > obstacle.radius + reach) {
      continue;
    }
    for (const box of obstacle.boxes) {
      if (pointBoxDistance(box, point[0], point[1], point[2]) <= reach) {
        held.add(box);
      }
    }
  }
  return held;
}

/**
 * Calculates the distance from a point to a box.
 *
 * @param box The box.
 * @param x The x of the point.
 * @param y The y of the point.
 * @param z The z of the point.
 * @returns The distance, 0 inside the box.
 */
export function pointBoxDistance(box: PlacedBox, x: number, y: number, z: number): number {
  const dx = x - box.x;
  const dz = z - box.z;
  const lx = Math.abs(dx * box.cos - dz * box.sin) - box.halfX;
  const lz = Math.abs(dx * box.sin + dz * box.cos) - box.halfZ;
  const ly = Math.max(box.minY - y, y - box.maxY);
  return Math.hypot(Math.max(0, lx), Math.max(0, ly), Math.max(0, lz));
}

/** A segment in the stage axes: from a to b. */
export interface Segment {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
}

/**
 * Tells if a segment crosses a box (the slab test in the axes of the box).
 *
 * @param box The box.
 * @param s The segment.
 * @returns True if a point of the segment is inside the box.
 */
export function segmentCrossesBox(box: PlacedBox, s: Segment): boolean {
  const ax = s.ax - box.x;
  const az = s.az - box.z;
  const bx = s.bx - box.x;
  const bz = s.bz - box.z;
  const a0 = ax * box.cos - az * box.sin;
  const a2 = ax * box.sin + az * box.cos;
  const b0 = bx * box.cos - bz * box.sin;
  const b2 = bx * box.sin + bz * box.cos;
  let enter = 0;
  let exit = 1;
  for (const [a, b, min, max] of [
    [a0, b0, -box.halfX, box.halfX],
    [s.ay, s.by, box.minY, box.maxY],
    [a2, b2, -box.halfZ, box.halfZ],
  ] as const) {
    const d = b - a;
    if (Math.abs(d) < 1e-12) {
      if (a < min || a > max) {
        return false;
      }
      continue;
    }
    let t0 = (min - a) / d;
    let t1 = (max - a) / d;
    if (t0 > t1) {
      [t0, t1] = [t1, t0];
    }
    enter = Math.max(enter, t0);
    exit = Math.min(exit, t1);
    if (enter > exit) {
      return false;
    }
  }
  return true;
}

/**
 * Calculates the distance from a segment to a box. The distance from a point of the segment to
 * the box is convex along the segment, so a golden section search finds its least value.
 *
 * @param box The box.
 * @param s The segment.
 * @returns The distance, 0 if the segment crosses the box.
 */
export function segmentBoxDistance(box: PlacedBox, s: Segment): number {
  if (segmentCrossesBox(box, s)) {
    return 0;
  }
  const at = (t: number): number =>
    pointBoxDistance(
      box,
      s.ax + (s.bx - s.ax) * t,
      s.ay + (s.by - s.ay) * t,
      s.az + (s.bz - s.az) * t,
    );
  let low = 0;
  let high = 1;
  for (let step = 0; step < SEARCH_STEPS; step++) {
    const m1 = high - GOLDEN * (high - low);
    const m2 = low + GOLDEN * (high - low);
    if (at(m1) <= at(m2)) {
      high = m2;
    } else {
      low = m1;
    }
  }
  return Math.min(at(0), at(1), at((low + high) / 2));
}

/**
 * Calculates the distance from a point to a segment in the stage plane.
 *
 * @param x The x of the point.
 * @param z The z of the point.
 * @param s The segment. Its y values do not count.
 * @returns The distance in the plane.
 */
function flatDistance(x: number, z: number, s: Segment): number {
  const dx = s.bx - s.ax;
  const dz = s.bz - s.az;
  const length2 = dx * dx + dz * dz;
  const t =
    length2 > 0 ? Math.min(1, Math.max(0, ((x - s.ax) * dx + (z - s.az) * dz) / length2)) : 0;
  return Math.hypot(s.ax + dx * t - x, s.az + dz * t - z);
}

/**
 * Calculates the distance from a point to a segment.
 *
 * @param x The x of the point.
 * @param y The y of the point.
 * @param z The z of the point.
 * @param s The segment.
 * @returns The distance.
 */
function pointSegmentDistance(x: number, y: number, z: number, s: Segment): number {
  const dx = s.bx - s.ax;
  const dy = s.by - s.ay;
  const dz = s.bz - s.az;
  const length2 = dx * dx + dy * dy + dz * dz;
  const t =
    length2 > 0
      ? Math.min(1, Math.max(0, ((x - s.ax) * dx + (y - s.ay) * dy + (z - s.az) * dz) / length2))
      : 0;
  return Math.hypot(s.ax + dx * t - x, s.ay + dy * t - y, s.az + dz * t - z);
}

/**
 * Tells if a segment keeps a margin from the boxes. The broad phase skips each obstacle whose
 * circle or top is far from the segment, then each box whose sphere is far from it.
 *
 * @param clearance The obstacles.
 * @param s The segment.
 * @param margin The margin for each box: its clearance (design 5.6), or 0 for a line of sight.
 * @param skip The boxes that the test skips: the body of the subject.
 * @returns True if no box comes closer than its margin.
 */
export function segmentClear(
  clearance: StageClearance,
  s: Segment,
  margin: 'clearance' | 'none',
  skip: ReadonlySet<ClearBox>,
): boolean {
  const lowY = Math.min(s.ay, s.by);
  for (const obstacle of clearance.obstacles) {
    const gap = margin === 'clearance' ? obstacle.clearance : 0;
    if (lowY >= obstacle.maxY + gap) {
      continue;
    }
    if (flatDistance(obstacle.x, obstacle.z, s) >= obstacle.radius + gap) {
      continue;
    }
    for (const box of obstacle.boxes) {
      if (skip.has(box)) {
        continue;
      }
      const centerY = (box.minY + box.maxY) / 2;
      if (pointSegmentDistance(box.x, centerY, box.z, s) >= box.reach + gap) {
        continue;
      }
      if (gap === 0 ? segmentCrossesBox(box, s) : segmentBoxDistance(box, s) < gap) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Writes a segment.
 *
 * @param out The segment to write.
 * @param a The start.
 * @param b The end.
 * @returns `out`.
 */
export function setSegment(out: Segment, a: Vec3, b: Vec3): Segment {
  out.ax = a[0];
  out.ay = a[1];
  out.az = a[2];
  out.bx = b[0];
  out.by = b[1];
  out.bz = b[2];
  return out;
}

/**
 * Tells if a camera sees its target and keeps its distances (design 5.6). The camera of a
 * narrower view stands farther out on the same ray, so one test covers a range of views.
 *
 * - The camera is at least 0.6 m above the stage top.
 * - The line of sight from 0.3 m outside the target to the farthest camera crosses no box, except
 *   the boxes of the body of the subject.
 * - Each camera from the nearest to the farthest keeps 0.6 m from each box, and 1.0 m from each
 *   box of the podium and the conductor.
 *
 * @param clearance The obstacles.
 * @param target The target.
 * @param near The camera of the widest view.
 * @param far The camera of the narrowest view, on the ray from the target through `near`.
 * @param skip The boxes of the body of the subject.
 * @returns True if the camera is clear.
 */
export function cameraClear(
  clearance: StageClearance,
  target: Vec3,
  near: Vec3,
  far: Vec3,
  skip: ReadonlySet<ClearBox>,
): boolean {
  if (Math.min(near[1], far[1]) < CLEARANCE.height) {
    return false;
  }
  const length = Math.hypot(far[0] - target[0], far[1] - target[1], far[2] - target[2]);
  const k = length > 0 ? CLEARANCE.sightStart / length : 0;
  const segment: Segment = {
    ax: target[0] + (far[0] - target[0]) * k,
    ay: target[1] + (far[1] - target[1]) * k,
    az: target[2] + (far[2] - target[2]) * k,
    bx: far[0],
    by: far[1],
    bz: far[2],
  };
  if (!segmentClear(clearance, segment, 'none', skip)) {
    return false;
  }
  return segmentClear(clearance, setSegment(segment, near, far), 'clearance', skip);
}
