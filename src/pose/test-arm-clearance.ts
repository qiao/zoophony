import { Box3, Triangle, Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { HEAD_BONES, signedDistance } from './test-clearance.ts';
import type { PosedPart } from './test-clearance.ts';
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
 * Finds the closed shells of the body groups and the surface points of the arms of a model.
 *
 * @param model The player model.
 * @returns The rig of the clearance measure.
 */
export function clearanceRig(model: PlayerModel): ClearanceRig {
  return {
    model,
    shells: {
      trunk: shellsOf(model, BODY_GROUPS.trunk),
      legs: shellsOf(model, BODY_GROUPS.legs),
    },
    armL: armPointsOf(model, 'L'),
    armR: armPointsOf(model, 'R'),
  };
}

/**
 * Moves the triangles of a shell to their posed places.
 *
 * @param posed The posed skeleton.
 * @param shell The shell.
 * @returns The posed triangles and their box.
 */
function posedShell(posed: PosedSkeleton, shell: Shell): PosedPart {
  // Each corner follows its own two bones, as the skin of the GPU does: the welded trunk joins
  // the spine, the chest, the neck, and the head.
  const posedAt = (corner: number): Vector3 => new Vector3(...posedCorner(posed, corner));
  const box = new Box3();
  const triangles = shell.corners.map((v) => {
    const [a, b, c] = [0, 1, 2].map((k) => posedAt(v + k));
    const triangle = new Triangle(a, b, c);
    box.expandByPoint(triangle.a).expandByPoint(triangle.b).expandByPoint(triangle.c);
    return triangle;
  });
  return { triangles, box };
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

const near = new Box3();
const point = new Vector3();
const other = new Vector3();

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
  const h = rig.model.body.headHeight;
  const gaps: ArmGap[] = [];
  const groups = Object.keys(BODY_GROUPS).filter((g): g is BodyGroup => g in rig.shells);
  for (const group of groups) {
    const shells = rig.shells[group].map((shell) => posedShell(posed, shell));
    for (const [side, arm] of [
      ['L', rig.armL],
      ['R', rig.armR],
    ] as const) {
      for (const part of ['upperArm', 'forearm', 'hand'] as const) {
        let gap = limit;
        for (const { from, to } of arm[part]) {
          point
            .fromArray(posedCorner(posed, from))
            .lerp(other.fromArray(posedCorner(posed, to)), 0.5);
          for (const shell of shells) {
            if (
              !near
                .copy(shell.box)
                .expandByScalar(gap * h)
                .containsPoint(point)
            ) {
              continue;
            }
            gap = Math.min(gap, signedDistance(shell, point) / h);
          }
        }
        gaps.push({ side, part, group, gap });
      }
    }
  }
  return gaps;
}
