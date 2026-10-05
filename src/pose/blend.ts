import type { Quat, Vec3 } from '../models/tuples.ts';

/**
 * Mixes two points.
 *
 * @param a The point at the weight 0.
 * @param b The point at the weight 1.
 * @param t The weight.
 * @returns The point a + (b - a) × t.
 */
export function mix(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * Mixes two rotations along the shorter path, with a normalized linear mix. For the small
 * changes of a pose, it is near a spherical mix and costs less.
 *
 * @param a The rotation at the weight 0.
 * @param b The rotation at the weight 1.
 * @param t The weight.
 * @returns A unit quaternion.
 */
export function mixRotation(a: Quat, b: Quat, t: number): Quat {
  const sign = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] < 0 ? -1 : 1;
  const x = a[0] + (sign * b[0] - a[0]) * t;
  const y = a[1] + (sign * b[1] - a[1]) * t;
  const z = a[2] + (sign * b[2] - a[2]) * t;
  const w = a[3] + (sign * b[3] - a[3]) * t;
  const n = Math.hypot(x, y, z, w);
  return [x / n, y / n, z / n, w / n];
}

/**
 * Finds the last time of a sorted list at or before a time.
 *
 * @param times The times, sorted.
 * @param time The time.
 * @returns The index, or -1 before the first time.
 */
export function lastAtOrBefore(times: Float64Array, time: number): number {
  let low = 0;
  let high = times.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if ((times[mid] ?? 0) <= time) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low - 1;
}
