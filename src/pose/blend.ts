import type { Quaternion } from 'three';

/**
 * Mixes two rotations along the shorter path, with a normalized linear mix. For the small
 * changes of a pose, it is near a spherical mix (`Quaternion.slerp()`) and costs less.
 *
 * @param a The rotation at the weight 0.
 * @param b The rotation at the weight 1.
 * @param t The weight.
 * @param out The quaternion to write. It can be `a` or `b`.
 * @returns `out`, a unit quaternion.
 */
export function mixRotation(a: Quaternion, b: Quaternion, t: number, out: Quaternion): Quaternion {
  const sign = a.dot(b) < 0 ? -1 : 1;
  return out
    .set(
      a.x + (sign * b.x - a.x) * t,
      a.y + (sign * b.y - a.y) * t,
      a.z + (sign * b.z - a.z) * t,
      a.w + (sign * b.w - a.w) * t,
    )
    .normalize();
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
