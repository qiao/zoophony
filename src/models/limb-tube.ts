import { Vector3 } from 'three';
import { jitter } from './painted.ts';
import { ringLoft } from './primitives.ts';
import type { Ring } from './primitives.ts';
import type { Vec3 } from './tuples.ts';

/** The number of corners of each ring of a limb. */
const LIMB_SEGMENTS = 9;

/** The largest radial offset of a corner of a limb, as a part of its radius. */
const LIMB_JITTER = 0.05;

/**
 * Makes a limb tube along an axis through rings of oval sections. Every second ring turns by
 * half a step, and each corner has a small fixed offset.
 *
 * @param from The start of the axis.
 * @param to The end of the axis.
 * @param sections The rings: the place along the axis from 0 to 1, the side radius, and the
 *   radii toward `up` and away from it. A radius of 0 makes an end point.
 * @param up A direction across the axis.
 * @param seed The seed of the offsets.
 * @returns The corner list.
 */
export function limbTube(
  from: Vec3,
  to: Vec3,
  sections: readonly (readonly [t: number, side: number, up: number, down: number])[],
  up: Vec3,
  seed: number,
): number[] {
  const start = new Vector3(...from);
  const axis = new Vector3(...to).sub(start);
  const v = new Vector3(...up).projectOnPlane(axis.clone().normalize()).normalize();
  const u = new Vector3().crossVectors(v, axis).normalize();
  const rings: Ring[] = sections.map(([t, side, upRadius, downRadius], j) => {
    const middle = start.clone().addScaledVector(axis, t);
    if (side === 0) {
      return [[middle.x, middle.y, middle.z]];
    }
    const turn = j % 2 === 0 ? 0 : 0.5;
    return Array.from({ length: LIMB_SEGMENTS }, (_, i) => {
      const angle = ((i + turn) / LIMB_SEGMENTS) * 2 * Math.PI;
      const sin = Math.sin(angle);
      const scale = 1 + LIMB_JITTER * jitter(seed + j, i);
      const p = middle
        .clone()
        .addScaledVector(u, Math.cos(angle) * side * scale)
        .addScaledVector(v, sin * (sin >= 0 ? upRadius : downRadius) * scale);
      return [p.x, p.y, p.z];
    });
  });
  return ringLoft(rings);
}

/**
 * Scales the radii of limb sections from head heights to meters.
 *
 * @param h The head height `H`, in meters.
 * @param sections The sections of {@link limbTube}, with the radii in H.
 * @returns The sections with the radii in meters.
 */
export function inMeters(
  h: number,
  sections: readonly (readonly [number, number, number, number])[],
): [number, number, number, number][] {
  return sections.map(([t, s, a, b]) => [t, s * h, a * h, b * h]);
}
