/**
 * Measures the grip of the bow in the right paw of a posed bowed string player (design 5.3): the
 * gap from the middle of the closed right paw to the axis of the stick, and the depth of the axis
 * in the closed paw. The stick passes through the grip of the paw when the gap is at most
 * {@link GRIP_GAP} and the axis goes into the paw, as the stick goes through a fist.
 */
import { Vector3 } from 'three';

import { BOW } from '../src/models/instruments/strings.ts';
import { closeSurface, closedDepth, openLoops, posedPart } from '../src/pose/test-clearance.ts';
import type { ClosedSurface } from '../src/pose/test-clearance.ts';
import { posedPiecePoint } from '../src/pose/test-kinematics.ts';
import type { PosedSkeleton } from '../src/pose/test-kinematics.ts';

/** The largest gap from the middle of the closed paw to the axis of the stick, in meters. */
export const GRIP_GAP = 0.01;

/**
 * The part of the stick on each side of the point nearest to the middle of the paw that the depth
 * reads, in meters: longer than a paw.
 */
const GRIP_SPAN = 0.08;

/** The step of the points along the axis of the stick, in meters. */
const AXIS_STEP = 0.0025;

/** The grip of the bow in the right paw in one pose. */
export interface StickGrip {
  /** The distance from the middle of the closed right paw to the axis of the stick, in meters. */
  readonly gap: number;
  /**
   * The depth of the deepest point of the axis of the stick in the closed right paw, in meters: 0
   * when the axis does not go into the paw.
   */
  readonly depth: number;
}

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

/**
 * Gives the closed right paw of a posed player: the triangles of the bones `handR` and `fingersR`,
 * as the skin poses them, with a cap on each open loop, such as the cut to the forearm.
 *
 * @param posed The posed skeleton.
 * @returns The closed surface.
 */
export function rightPaw(posed: PosedSkeleton): ClosedSurface {
  const { triangles } = posedPart(posed, ['handR', 'fingersR']);
  return closeSurface(triangles, openLoops(triangles));
}

/**
 * Measures the grip of the bow in the right paw of a posed bowed string player ({@link StickGrip}).
 * The axis of the stick is the x axis of the bow piece, which has the grip at its origin. It runs
 * from the frog end to the tip, each 0.025 of the bow model past the ends of the hair.
 *
 * @param posed The posed skeleton of a player with a bow.
 * @returns The grip.
 * @throws Error if the instrument has no target `bow-hair`.
 */
export function stickGrip(posed: PosedSkeleton): StickGrip {
  const hair = posed.model.instrument.targets.find((t) => t.kind === 'bow-hair');
  if (!hair) {
    throw new Error(`The ${posed.model.instrument.id} has no target "bow-hair".`);
  }
  const paw = rightPaw(posed);
  const middle = volumeMiddle(paw);

  const size = (hair.to[0] - hair.from[0]) / (BOW.length - 0.05);
  const frog = hair.from[0] - 0.025 * size;
  const end = hair.to[0] + 0.025 * size;
  const grip = new Vector3(...posedPiecePoint(posed, { bone: 'bow', at: [0, 0, 0] }));
  const tip = new Vector3(...posedPiecePoint(posed, { bone: 'bow', at: [end, 0, 0] }));
  const axis = tip.clone().sub(grip).normalize();
  const along = Math.min(end, Math.max(frog, middle.clone().sub(grip).dot(axis)));
  const nearest = grip.clone().addScaledVector(axis, along);

  const points: Vector3[] = [];
  const last = Math.min(end, along + GRIP_SPAN);
  for (let s = Math.max(frog, along - GRIP_SPAN); s <= last; s += AXIS_STEP) {
    points.push(grip.clone().addScaledVector(axis, s));
  }
  return { gap: nearest.distanceTo(middle), depth: closedDepth(points, paw).depth };
}
