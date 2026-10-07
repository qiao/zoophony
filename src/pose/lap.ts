import { Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { toVec3 } from '../models/tuples.ts';
import type { Vec3 } from '../models/tuples.ts';

/** A place on the top of a thigh of a seated player. */
export interface LapPlace {
  /** The part of the way from the hip to the knee. */
  readonly along: number;
  /** The move from the top of the thigh, in head heights. */
  readonly offset: Vec3;
}

/**
 * Finds the height of the top of a leg above a point: the highest crossing of the vertical line
 * through the point with a triangle of the thigh or the knee.
 *
 * @param model The player model.
 * @param side The side of the leg.
 * @param point The point. Its height does not count.
 * @returns The height, or the height of the point if the line misses the leg.
 */
function legTop(model: PlayerModel, side: 'L' | 'R', point: Vector3): number {
  // The leg is one tube: the round knee and the part below it follow the shin bone.
  const leg = new Set([boneIndex(`thigh${side}`), boneIndex(`shin${side}`)]);
  const { positions, bones } = model.mesh;
  const corner = (v: number, k: number): number => positions[v * 3 + k] ?? 0;
  let top = point.y;
  for (let v = 0; v + 2 < bones.length; v += 3) {
    if (!leg.has(bones[v] ?? -1)) {
      continue;
    }
    // The barycentric weights of the point in the triangle, seen from above.
    const [ax, az, bx, bz, cx, cz] = [
      corner(v, 0),
      corner(v, 2),
      corner(v + 1, 0),
      corner(v + 1, 2),
      corner(v + 2, 0),
      corner(v + 2, 2),
    ];
    const area = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
    if (Math.abs(area) < 1e-12) {
      continue;
    }
    const wb = ((point.x - ax) * (cz - az) - (cx - ax) * (point.z - az)) / area;
    const wc = ((bx - ax) * (point.z - az) - (point.x - ax) * (bz - az)) / area;
    const wa = 1 - wb - wc;
    if (wa >= 0 && wb >= 0 && wc >= 0) {
      top = Math.max(top, wa * corner(v, 1) + wb * corner(v + 1, 1) + wc * corner(v + 2, 1));
    }
  }
  return top;
}

/**
 * Finds a place on the top of a thigh of a seated player: a point of the way from the hip to the
 * knee, on the top of the leg, then a move in head heights.
 *
 * @param model The player model.
 * @param side The side of the thigh.
 * @param lap The place.
 * @returns The point, in the model axes.
 */
export function lapPoint(model: PlayerModel, side: 'L' | 'R', lap: LapPlace): Vec3 {
  const h = model.body.headHeight;
  const hip = new Vector3(...(model.skeleton.positions[boneIndex(`thigh${side}`)] ?? [0, 0, 0]));
  const knee = new Vector3(...(model.skeleton.positions[boneIndex(`shin${side}`)] ?? [0, 0, 0]));
  const point = hip.lerp(knee, lap.along);
  point.y = legTop(model, side, point);
  return toVec3(point.addScaledVector(new Vector3(...lap.offset), h));
}
