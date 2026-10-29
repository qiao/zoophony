/**
 * The grip measures of a closed paw (design 5.3): the largest gap from the middle of a closed paw
 * to the axis of what it holds ({@link GRIP_GAP}), and the middle of a closed surface
 * ({@link volumeMiddle}). `tools/wind-grip.ts` reads both.
 */
import { Vector3 } from 'three';

import type { ClosedSurface } from '../src/pose/test-clearance.ts';

/** The largest gap from the middle of the closed paw to the axis of the stick, in meters. */
export const GRIP_GAP = 0.01;

/**
 * Gives the middle of a closed surface: the middle of its volume. Each triangle and a point near
 * the surface make a tetrahedron, and the middles of the tetrahedra add up with their signed
 * volumes.
 *
 * @param surface The closed surface, with its faces turned out.
 * @returns The middle, in the axes of the surface.
 */
export function volumeMiddle(surface: ClosedSurface): Vector3 {
  const origin = surface.box.getCenter(new Vector3());
  const middle = new Vector3();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const across = new Vector3();
  let volume = 0;
  for (const t of surface.triangles) {
    a.subVectors(t.a, origin);
    b.subVectors(t.b, origin);
    c.subVectors(t.c, origin);
    const v = a.dot(across.crossVectors(b, c)) / 6;
    volume += v;
    middle.addScaledVector(a.add(b).add(c), v / 4);
  }
  return middle.divideScalar(volume).add(origin);
}
