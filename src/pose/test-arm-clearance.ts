import { Box3, Ray, Triangle, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { BONE_NAMES, boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { HEAD_BONES } from './test-clearance.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { posedCorner } from './test-skin.ts';

/**
 * The groups of body parts that the arms keep clear of (design 5.2). The trunk is the torso, the
 * neck, and the head: one welded grid on the spine, the chest, the neck, and the head bones, with
 * the closed parts of the face.
 */
export const BODY_GROUPS = {
  trunk: ['spine', 'chest', 'neck', ...HEAD_BONES],
  legs: ['thighL', 'thighR', 'shinL', 'shinR'],
} as const satisfies Readonly<Record<string, readonly BoneName[]>>;

/** A group of body parts that the arms keep clear of. */
export type BodyGroup = keyof typeof BODY_GROUPS;

/** The bones of the instrument pieces: they are no part of the body. */
const INSTRUMENT_BONES: ReadonlySet<BoneName> = new Set([
  'instrument',
  'bow',
  'malletL',
  'malletR',
  'baton',
  'slide',
]);

/** The parts of one arm, from the shoulder to the fingers (design 4.5). */
export type ArmPart = 'upperArm' | 'forearm' | 'hand';

/** The bones of each arm part of each side. */
const ARM_BONES = {
  L: { upperArm: ['upperArmL'], forearm: ['forearmL'], hand: ['handL', 'fingersL'] },
  R: { upperArm: ['upperArmR'], forearm: ['forearmR'], hand: ['handR', 'fingersR'] },
} as const satisfies Readonly<Record<'L' | 'R', Readonly<Record<ArmPart, readonly BoneName[]>>>>;

/**
 * The share of the upper arm, from the shoulder joint, that may enter the torso. The shoulder is
 * a ball that sinks into the torso in each turn of the arm (design 4.5), and the upper arm leaves
 * the side of the torso at a slant.
 */
export const SHOULDER_SHARE = 0.5;

/**
 * One point of the surface of an arm part: a corner of the mesh, or the middle of an edge between
 * two corners.
 */
interface ArmPoint {
  /** The index of the first corner. */
  readonly from: number;
  /** The index of the second corner, equal to `from` for a corner. */
  readonly to: number;
}

/** The points of the surface of the arm parts of one side, for each part. */
export type ArmPoints = Readonly<Record<ArmPart, readonly ArmPoint[]>>;

/** One closed shell of the mesh: the triangles that share their corners, in the bind pose. */
interface Shell {
  /** The index of the first corner of each triangle. */
  readonly corners: readonly number[];
}

/**
 * The closed shell of a rigged body (design 4.4): one welded surface from the head to the feet,
 * with the arms. The shells of its body groups are open, so the clearance of its arms comes from
 * the winding number of the shell with no arm of the side.
 */
interface FusedBody {
  /** The first corner of each triangle of the shell. */
  readonly firsts: readonly number[];
  /** The body group of each triangle, or `null` for another part, such as the tail. */
  readonly groups: readonly (BodyGroup | null)[];
  /** The side of each triangle of an arm, or `null` for a triangle of no arm. */
  readonly sides: readonly ('L' | 'R' | null)[];
}

/** The closed shells of the body groups and the surface points of the arms of one model. */
export interface ClearanceRig {
  /** The player model. */
  readonly model: PlayerModel;
  /** The closed shells of each body group. */
  readonly shells: Readonly<Record<BodyGroup, readonly Shell[]>>;
  /** The surface points of the left arm. */
  readonly armL: ArmPoints;
  /** The surface points of the right arm. */
  readonly armR: ArmPoints;
  /** The shell of a rigged body, or `null` for a body of parts. */
  readonly fused: FusedBody | null;
}

/**
 * Reads a corner of the mesh.
 *
 * @param model The player model.
 * @param corner The index of the corner.
 * @returns The bind place of the corner.
 */
function cornerOf(model: PlayerModel, corner: number): Vector3 {
  const { positions } = model.mesh;
  return new Vector3(
    positions[corner * 3] ?? 0,
    positions[corner * 3 + 1] ?? 0,
    positions[corner * 3 + 2] ?? 0,
  );
}

/**
 * Splits the triangles of some bones into closed shells: the triangles that share a corner are in
 * the same shell. A bone can carry several closed parts that overlap, such as the knee ball and
 * the shin, and the parity of the crossings of a ray is correct only in one closed part.
 *
 * @param model The player model.
 * @param bones The bones.
 * @returns The shells.
 */
function shellsOf(model: PlayerModel, bones: readonly BoneName[]): Shell[] {
  const wanted = new Set(bones.map(boneIndex));
  const { bones: cornerBones } = model.mesh;
  const triangles: number[] = [];
  for (let v = 0; v < cornerBones.length; v += 3) {
    if (wanted.has(cornerBones[v] ?? -1)) {
      triangles.push(v);
    }
  }

  // Each triangle starts as its own shell. A corner place joins the shells of its triangles.
  const parent = triangles.map((_, i) => i);
  const root = (i: number): number => {
    let r = i;
    while (parent[r] !== r) {
      r = parent[r] ?? r;
    }
    parent[i] = r;
    return r;
  };
  const owner = new Map<string, number>();
  for (const [i, v] of triangles.entries()) {
    for (let k = 0; k < 3; k++) {
      const key = cornerOf(model, v + k)
        .toArray()
        .join(' ');
      const other = owner.get(key);
      if (other === undefined) {
        owner.set(key, i);
      } else {
        parent[root(i)] = root(other);
      }
    }
  }

  const shells = new Map<number, number[]>();
  for (const [i, v] of triangles.entries()) {
    const r = root(i);
    shells.set(r, [...(shells.get(r) ?? []), v]);
  }
  return [...shells.values()].map((corners) => ({ corners }));
}

/**
 * Gives the points of the surface of the arm parts of one side: the corners and the middles of
 * the edges of each triangle, each place one time. The upper arm leaves out its first
 * {@link SHOULDER_SHARE}.
 *
 * @param model The player model.
 * @param side The side of the body.
 * @returns The points of each part.
 */
function armPointsOf(model: PlayerModel, side: 'L' | 'R'): ArmPoints {
  const { positions } = model.skeleton;
  const shoulder = new Vector3(...(positions[boneIndex(`upperArm${side}`)] ?? [0, 0, 0]));
  const elbow = new Vector3(...(positions[boneIndex(`forearm${side}`)] ?? [0, 0, 0]));
  const upper = elbow.clone().sub(shoulder);
  const length = upper.length();
  upper.normalize();

  const pointsOf = (part: ArmPart): ArmPoint[] => {
    const bones = new Set<number>(ARM_BONES[side][part].map(boneIndex));
    const places = new Map<string, ArmPoint>();
    const { bones: cornerBones } = model.mesh;
    for (let v = 0; v < cornerBones.length; v += 3) {
      const bone = cornerBones[v] ?? -1;
      if (!bones.has(bone)) {
        continue;
      }
      const pairs = [
        [v, v],
        [v + 1, v + 1],
        [v + 2, v + 2],
        [v, v + 1],
        [v + 1, v + 2],
        [v + 2, v],
      ] as const;
      for (const [from, to] of pairs) {
        const bind = cornerOf(model, from).lerp(cornerOf(model, to), 0.5);
        if (
          part === 'upperArm' &&
          bind.clone().sub(shoulder).dot(upper) < SHOULDER_SHARE * length
        ) {
          continue;
        }
        places.set(bind.toArray().join(' '), { from, to });
      }
    }
    return [...places.values()];
  };

  return { upperArm: pointsOf('upperArm'), forearm: pointsOf('forearm'), hand: pointsOf('hand') };
}

/**
 * The smallest distance of a point of a forearm or a hand of a rigged body from the triangles of
 * the body in the bind pose, in meters. Nearer points lie where the arm and the body weld into
 * one surface, so they have no inside of their own.
 */
const WELD = 0.005;

/** The bones of the trunk group of a rigged body: the trunk group with the pelvis. */
const FUSED_TRUNK: ReadonlySet<number> = new Set(
  [...BODY_GROUPS.trunk, 'hips' as const].map(boneIndex),
);

/** The bones of the legs group. */
const FUSED_LEGS: ReadonlySet<number> = new Set(BODY_GROUPS.legs.map(boneIndex));

/**
 * Gives the body group of a bone of a rigged body.
 *
 * @param bone The bone index.
 * @returns The group, or `null` for a bone of no group.
 */
function fusedGroup(bone: number): BodyGroup | null {
  if (FUSED_TRUNK.has(bone)) {
    return 'trunk';
  }
  return FUSED_LEGS.has(bone) ? 'legs' : null;
}

/**
 * Finds the closed shell of a rigged body: the largest shell of its mesh.
 *
 * @param model The player model of a rigged body.
 * @returns The shell, with the group and the arm side of each triangle.
 */
function fusedBody(model: PlayerModel): FusedBody {
  const shells = shellsOf(
    model,
    BONE_NAMES.filter((name) => !INSTRUMENT_BONES.has(name)),
  );
  const firsts = shells.reduce<readonly number[]>(
    (largest, shell) => (shell.corners.length > largest.length ? shell.corners : largest),
    [],
  );
  const sideOf = new Map<number, 'L' | 'R'>();
  for (const side of ['L', 'R'] as const) {
    for (const bones of Object.values(ARM_BONES[side])) {
      for (const bone of bones) {
        sideOf.set(boneIndex(bone), side);
      }
    }
  }

  const { bones } = model.mesh;
  return {
    firsts,
    groups: firsts.map((v) => fusedGroup(bones[v] ?? -1)),
    sides: firsts.map((v) => sideOf.get(bones[v] ?? -1) ?? null),
  };
}

/**
 * Gives the points of the forearm and the hand of one side of a rigged body, each corner place
 * one time, with no point of the welds ({@link WELD}). The upper arm welds into the side of the
 * torso, so it has no points.
 *
 * @param model The player model of a rigged body.
 * @param fused The shell of the body.
 * @param side The side of the arm.
 * @returns The points of each part.
 */
function fusedArmPoints(model: PlayerModel, fused: FusedBody, side: 'L' | 'R'): ArmPoints {
  const body = fused.firsts
    .filter((_, i) => fused.sides[i] === null)
    .map((v) => new Triangle(cornerOf(model, v), cornerOf(model, v + 1), cornerOf(model, v + 2)));
  const closest = new Vector3();
  const pointsOf = (part: ArmPart): ArmPoint[] => {
    const bones = new Set<number>(ARM_BONES[side][part].map(boneIndex));
    const places = new Map<string, ArmPoint>();
    const { bones: cornerBones } = model.mesh;
    for (let c = 0; c < cornerBones.length; c++) {
      const bind = cornerOf(model, c);
      const key = bind.toArray().join(' ');
      if (!bones.has(cornerBones[c - (c % 3)] ?? -1) || places.has(key)) {
        continue;
      }
      const weld = body.some((t) => t.closestPointToPoint(bind, closest).distanceTo(bind) < WELD);
      if (!weld) {
        places.set(key, { from: c, to: c });
      }
    }
    return [...places.values()];
  };

  return { upperArm: [], forearm: pointsOf('forearm'), hand: pointsOf('hand') };
}

/**
 * Finds the closed shells of the body groups and the surface points of the arms of a model.
 *
 * @param model The player model.
 * @returns The rig of the clearance measure.
 */
export function clearanceRig(model: PlayerModel): ClearanceRig {
  const fused = model.mesh.skin ? fusedBody(model) : null;
  return {
    model,
    shells: {
      trunk: shellsOf(model, BODY_GROUPS.trunk),
      legs: shellsOf(model, BODY_GROUPS.legs),
    },
    armL: fused ? fusedArmPoints(model, fused, 'L') : armPointsOf(model, 'L'),
    armR: fused ? fusedArmPoints(model, fused, 'R') : armPointsOf(model, 'R'),
    fused,
  };
}

/** A closed shell at its posed place. */
interface PosedShell {
  /** The posed triangles. */
  readonly triangles: readonly Triangle[];
  /** The box of each triangle, in the order of {@link PosedShell.triangles}. */
  readonly boxes: readonly Box3[];
  /**
   * The boxes of the triangles as one array, six values for each triangle: the smallest x, y,
   * and z, then the largest. A loop over it is faster than a loop over the objects.
   */
  readonly bounds: Float64Array;
  /** The box of the whole shell. */
  readonly box: Box3;
}

/**
 * Moves the triangles of a shell to their posed places.
 *
 * @param posed The posed skeleton.
 * @param shell The shell.
 * @returns The posed triangles, their boxes, and the box of the shell.
 */
function posedShell(posed: PosedSkeleton, shell: Shell): PosedShell {
  // Each corner follows its own two bones, as the skin of the GPU does: the welded trunk joins
  // the spine, the chest, the neck, and the head.
  const posedAt = (corner: number): Vector3 => new Vector3(...posedCorner(posed, corner));
  const triangles = shell.corners.map((v) => {
    const [a, b, c] = [0, 1, 2].map((k) => posedAt(v + k));
    return new Triangle(a, b, c);
  });

  const box = new Box3();
  const bounds = new Float64Array(triangles.length * 6);
  const boxes = triangles.map((t, i) => {
    const b = new Box3().setFromPoints([t.a, t.b, t.c]);
    b.min.toArray(bounds, i * 6);
    b.max.toArray(bounds, i * 6 + 3);
    box.union(b);
    return b;
  });
  return { triangles, boxes, bounds, box };
}

/** The smallest gap between one arm part and one body group, in head heights. */
export interface ArmGap {
  /** The side of the arm. */
  readonly side: 'L' | 'R';
  /** The part of the arm. */
  readonly part: ArmPart;
  /** The group of body parts. */
  readonly group: BodyGroup;
  /** The gap: negative if the arm part goes into the group, by that depth. */
  readonly gap: number;
}

/**
 * The direction of the ray that counts the crossings of the surface: the direction of
 * `signedDistance()` of `test-clearance.ts`, with no simple ratio, so that a ray passes no edge
 * of the low-poly mesh.
 */
const RAY_DIRECTION = new Vector3(0.31, 0.89, 0.17).normalize();

const ray = new Ray();
const hit = new Vector3();
const nearestPoint = new Vector3();

/**
 * Gives the signed distance from a point to the surface of a closed posed shell, as
 * `signedDistance()` of `test-clearance.ts` does: negative inside the shell. A triangle whose box
 * is farther than the nearest triangle so far, or that the ray misses, needs no exact test.
 *
 * @param shell The posed shell.
 * @param point The point.
 * @param limit The largest distance of interest outside the shell, in meters.
 * @returns The distance, in meters, or `limit` for a point outside the shell and at least `limit`
 *   from it.
 */
function shellDistance(shell: PosedShell, point: Vector3, limit: number): number {
  const { triangles, boxes, bounds } = shell;
  const count = triangles.length;
  const { x, y, z } = point;
  ray.set(point, RAY_DIRECTION);
  let crossings = 0;
  for (let i = 0; i < count; i++) {
    // The ray goes up in x, y, and z, so it misses a box that ends below the point on an axis.
    const k = i * 6;
    if ((bounds[k + 3] ?? 0) < x || (bounds[k + 4] ?? 0) < y || (bounds[k + 5] ?? 0) < z) {
      continue;
    }
    const t = triangles[i];
    const b = boxes[i];
    if (t && b && ray.intersectsBox(b) && ray.intersectTriangle(t.a, t.b, t.c, false, hit)) {
      crossings++;
    }
  }
  const inside = crossings % 2 === 1;

  let nearest = inside ? Infinity : limit;
  for (let i = 0; i < count; i++) {
    const k = i * 6;
    const dx = Math.max((bounds[k] ?? 0) - x, 0, x - (bounds[k + 3] ?? 0));
    const dy = Math.max((bounds[k + 1] ?? 0) - y, 0, y - (bounds[k + 4] ?? 0));
    const dz = Math.max((bounds[k + 2] ?? 0) - z, 0, z - (bounds[k + 5] ?? 0));
    if (dx * dx + dy * dy + dz * dz >= nearest * nearest) {
      continue;
    }
    const t = triangles[i];
    if (t) {
      nearest = Math.min(nearest, t.closestPointToPoint(point, nearestPoint).distanceTo(point));
    }
  }
  return inside ? -nearest : nearest;
}

const near = new Box3();

/**
 * Measures the smallest gap between each arm part and each body group of a posed player, from the
 * signed distance of the posed parts. A gap of `limit` or more counts as `limit`.
 *
 * @param rig The rig of the clearance measure of the model.
 * @param posed The posed skeleton of the model.
 * @param limit The largest gap of interest, in head heights.
 * @returns One gap for each side, arm part, and body group.
 */
export function armGaps(rig: ClearanceRig, posed: PosedSkeleton, limit: number): ArmGap[] {
  if (rig.fused) {
    return fusedGaps(rig, rig.fused, posed, limit);
  }

  const h = rig.model.body.headHeight;
  const sides = [
    ['L', rig.armL],
    ['R', rig.armR],
  ] as const;
  const parts = ['upperArm', 'forearm', 'hand'] as const;

  // Each surface point of an arm is the middle of its two posed corners.
  const points = sides.map(([, arm]) =>
    parts.map((part) =>
      arm[part].map(({ from, to }) =>
        new Vector3(...posedCorner(posed, from)).lerp(new Vector3(...posedCorner(posed, to)), 0.5),
      ),
    ),
  );

  const gaps: ArmGap[] = [];
  const groups = Object.keys(BODY_GROUPS).filter((g): g is BodyGroup => g in rig.shells);
  for (const group of groups) {
    const shells = rig.shells[group].map((shell) => posedShell(posed, shell));
    for (const [s, [side]] of sides.entries()) {
      for (const [p, part] of parts.entries()) {
        let gap = limit;
        for (const point of points[s]?.[p] ?? []) {
          for (const shell of shells) {
            if (
              !near
                .copy(shell.box)
                .expandByScalar(gap * h)
                .containsPoint(point)
            ) {
              continue;
            }
            gap = Math.min(gap, shellDistance(shell, point, gap * h) / h);
          }
        }
        gaps.push({ side, part, group, gap });
      }
    }
  }
  return gaps;
}

/**
 * Gives the solid angle of a triangle seen from a point, divided by 4π (Van Oosterom and
 * Strackee, 1983). The sum over a closed surface whose faces turn counterclockwise from outside
 * is 1 inside the surface and 0 outside it: the winding number.
 *
 * @param p The posed corners, 9 numbers for each triangle.
 * @param t The index of the triangle.
 * @param point The point.
 * @returns The share of the sphere around the point that the triangle covers, with a sign.
 */
function windingShare(p: Float64Array, t: number, point: Vector3): number {
  const i = t * 9;
  const ax = (p[i] ?? 0) - point.x;
  const ay = (p[i + 1] ?? 0) - point.y;
  const az = (p[i + 2] ?? 0) - point.z;
  const bx = (p[i + 3] ?? 0) - point.x;
  const by = (p[i + 4] ?? 0) - point.y;
  const bz = (p[i + 5] ?? 0) - point.z;
  const cx = (p[i + 6] ?? 0) - point.x;
  const cy = (p[i + 7] ?? 0) - point.y;
  const cz = (p[i + 8] ?? 0) - point.z;
  const a = Math.hypot(ax, ay, az);
  const b = Math.hypot(bx, by, bz);
  const c = Math.hypot(cx, cy, cz);
  const det = ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  const dot = a * b * c + (ax * bx + ay * by + az * bz) * c;
  const more = (bx * cx + by * cy + bz * cz) * a + (cx * ax + cy * ay + cz * az) * b;
  return Math.atan2(det, dot + more) / (2 * Math.PI);
}

/**
 * Measures how deep the forearm and the hand of each side of a rigged body go into the trunk and
 * the legs. The winding number of the posed shell with no triangle of the arm of the side tells
 * if a point of the arm is inside the body, and the nearest triangle gives the depth and the
 * group. A point outside the body counts as `limit`: the arm and the body weld into one surface,
 * so a small gap near a weld says nothing.
 *
 * @param rig The rig of the clearance measure of the model.
 * @param fused The shell of the rigged body.
 * @param posed The posed skeleton of the model.
 * @param limit The largest gap of interest, in head heights.
 * @returns One gap for each side, arm part, and body group.
 */
function fusedGaps(
  rig: ClearanceRig,
  fused: FusedBody,
  posed: PosedSkeleton,
  limit: number,
): ArmGap[] {
  const h = rig.model.body.headHeight;
  const corners = new Float64Array(fused.firsts.length * 9);
  for (const [t, v] of fused.firsts.entries()) {
    for (let k = 0; k < 3; k++) {
      corners.set(posedCorner(posed, v + k), t * 9 + k * 3);
    }
  }
  const box = new Box3();
  for (const [t, group] of fused.groups.entries()) {
    if (group) {
      for (let k = 0; k < 3; k++) {
        box.expandByPoint(new Vector3().fromArray(corners, t * 9 + k * 3));
      }
    }
  }

  const triangle = new Triangle();
  const closest = new Vector3();
  const gaps: ArmGap[] = [];
  for (const side of ['L', 'R'] as const) {
    const arm = side === 'L' ? rig.armL : rig.armR;
    const surface = fused.sides.flatMap((s, t) => (s === side ? [] : [t]));
    for (const part of ['upperArm', 'forearm', 'hand'] as const) {
      const deepest: Record<BodyGroup, number> = { trunk: limit, legs: limit };
      for (const { from } of arm[part]) {
        const point = new Vector3(...posedCorner(posed, from));
        if (!box.containsPoint(point)) {
          continue;
        }
        const winding = surface.reduce((sum, t) => sum + windingShare(corners, t, point), 0);
        if (winding < 0.5) {
          continue;
        }

        let nearest = Infinity;
        let group: BodyGroup | null = null;
        for (const t of surface) {
          triangle.a.fromArray(corners, t * 9);
          triangle.b.fromArray(corners, t * 9 + 3);
          triangle.c.fromArray(corners, t * 9 + 6);
          const distance = triangle.closestPointToPoint(point, closest).distanceTo(point);
          if (distance < nearest) {
            nearest = distance;
            group = fused.groups[t] ?? null;
          }
        }
        if (group) {
          deepest[group] = Math.min(deepest[group], -nearest / h);
        }
      }
      gaps.push(
        { side, part, group: 'trunk', gap: deepest.trunk },
        { side, part, group: 'legs', gap: deepest.legs },
      );
    }
  }
  return gaps;
}
