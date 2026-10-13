import { Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { BONE_NAMES, boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import type { Vec3 } from '../models/tuples.ts';
import type { Score } from '../score/types.ts';
import { closedDepth } from './test-clearance.ts';
import type { ClosedSurface } from './test-clearance.ts';
import { poseSkeleton, posedPoint } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import type { TestScene } from './test-scene.ts';
import { posedCorner } from './test-skin.ts';
import type { AnimalPose, Transport } from './types.ts';

/** One sample of a sweep: a song time, a wall time, and a transport. */
export type SweepSample = readonly [song: number, wall: number, transport: Transport];

/** A named set of samples, such as a full play or the lift of the arms. */
export interface SampleSet {
  /** The name, such as `play`. An accepted depth names it. */
  readonly name: string;
  /** The samples, in the order of the sweep. */
  readonly samples: Iterable<SweepSample>;
}

/** A moving part of a player: the triangles of some bones. */
export interface SweepPart {
  /** The name in the reports, such as `forearms`. */
  readonly name: string;
  /** The bones. Each point belongs to the main bone of its corner (design 4.4). */
  readonly bones: readonly BoneName[];
}

/** A part that the moving parts must not enter: a closed surface of the body or the instrument. */
export interface SweepObstacle {
  /** The name in the reports, such as `body`. */
  readonly name: string;
  /** Gives the closed surface in a pose. */
  readonly surface: (posed: PosedSkeleton) => ClosedSurface;
}

/**
 * A depth that a decision accepts for one pair of parts in one set of samples. It is a contract
 * of contact: a depth that the look accepts, with a margin over the measure.
 */
export interface AcceptedDepth {
  /** The moving part. */
  readonly part: string;
  /** The part that it enters. */
  readonly into: string;
  /** The set of samples. */
  readonly samples: string;
  /** The largest depth, in meters. */
  readonly depth: number;
  /** Why the depth is accepted. */
  readonly reason: string;
  /** The decision file and its row. */
  readonly decision: string;
}

/** A place where a palm must be at a time: the palm on the keys of a note. */
export interface NoteTarget {
  /** The hand of the palm. */
  readonly side: 'L' | 'R';
  /** The sample where the palm is on its keys. */
  readonly sample: SweepSample;
  /** The place of the palm, in the model axes. */
  readonly point: Vec3;
}

/** One player of a role in a scene. */
export interface SweepPlayer {
  /** The name in the reports, such as `pianist 3`. */
  readonly name: string;
  /** The player model, with its mesh. */
  readonly model: PlayerModel;
  /** Gives the pose of the player at a sample. */
  readonly poseAt: (sample: SweepSample) => AnimalPose;
  /** Gives the note targets of the palms. A role with no note targets gives none. */
  readonly targets: () => readonly NoteTarget[];
}

/**
 * A role of a player for the sweep, such as the conductor or the pianist. A new role gives its
 * parts, its obstacles with the shells of its instrument, and its limits.
 */
export interface RoleSweep {
  /** The name of the role, such as `pianist`. */
  readonly role: string;
  /** The moving parts: the paws, the claws, the forearms, the upper arms, and a baton. */
  readonly parts: readonly SweepPart[];
  /** The parts that the moving parts must not enter. */
  readonly obstacles: readonly SweepObstacle[];
  /** The largest depth of a moving part in an obstacle, in meters: a paw presses the fur. */
  readonly contact: number;
  /** The depths that a decision accepts past {@link contact}. */
  readonly accepted: readonly AcceptedDepth[];
  /** The largest distance from a palm to its note target, in meters. */
  readonly targetError: number;
  /** Tells if a score has the role. */
  readonly hasRole: (score: Score) => boolean;
  /** Finds the players of the role in a scene. */
  readonly players: (scene: TestScene) => readonly SweepPlayer[];
  /** Gives the sets of samples of a scene. */
  readonly sampleSets: (scene: TestScene) => readonly SampleSet[];
}

/** The deepest point of a moving part in an obstacle over a set of samples. */
export interface PairDepth {
  /** The name of the moving part. */
  readonly part: string;
  /** The name of the obstacle. */
  readonly into: string;
  /** The depth, in meters: 0 when no point entered. */
  readonly depth: number;
  /** The song time of the sample of the deepest point, in seconds. */
  readonly song: number;
  /** The wall time of the sample of the deepest point, in seconds. */
  readonly wall: number;
  /** The bone of the deepest point, or `null` when no point entered. */
  readonly bone: BoneName | null;
  /**
   * The place of the deepest point along its bone: 0 at the joint of the bone, 1 at the joint of
   * its first child. `NaN` for a bone with no child.
   */
  readonly along: number;
}

/** The largest distance from a palm to its note target. */
export interface TargetError {
  /** The hand. */
  readonly side: 'L' | 'R';
  /** The distance, in meters. */
  readonly error: number;
  /** The song time of the sample, in seconds. */
  readonly song: number;
}

/** The points of a moving part: one corner for each place in the bind pose. */
interface PartPoints {
  /** The corners in the mesh data. */
  readonly corners: readonly number[];
}

/** The points of the parts of each mesh, by the list of their bones. */
const PART_POINTS = new WeakMap<PlayerModel['mesh'], Map<string, PartPoints>>();

/**
 * Gives the corners whose main bone is one of some bones, with one corner for each place in the
 * bind pose: the corners of a vertex share a place.
 *
 * @param mesh The mesh.
 * @param bones The bones.
 * @returns The points.
 */
function partPoints(mesh: PlayerModel['mesh'], bones: readonly BoneName[]): PartPoints {
  let parts = PART_POINTS.get(mesh);
  if (!parts) {
    parts = new Map();
    PART_POINTS.set(mesh, parts);
  }
  const key = bones.join(' ');
  const known = parts.get(key);
  if (known) {
    return known;
  }

  const wanted = new Set(bones.map(boneIndex));
  const places = new Map<string, number>();
  const p = mesh.positions;
  for (let c = 0; c < mesh.bones.length; c++) {
    const place = `${p[c * 3]} ${p[c * 3 + 1]} ${p[c * 3 + 2]}`;
    if (wanted.has(mesh.bones[c] ?? -1) && !places.has(place)) {
      places.set(place, c);
    }
  }
  const found = { corners: [...places.values()] };
  parts.set(key, found);
  return found;
}

/**
 * Gives the place of a posed point along the main bone of its corner.
 *
 * @param posed The posed skeleton.
 * @param bone The index of the bone.
 * @param point The posed point.
 * @returns 0 at the joint of the bone, 1 at the joint of its first child, `NaN` with no child.
 */
function alongBone(posed: PosedSkeleton, bone: number, point: Vector3): number {
  const child = posed.model.skeleton.parents.indexOf(bone);
  const from = posed.frames[bone]?.position;
  const to = posed.frames[child]?.position;
  if (child < 0 || !from || !to) {
    return Number.NaN;
  }
  const axis = new Vector3().subVectors(to, from);
  return new Vector3().subVectors(point, from).dot(axis) / axis.lengthSq();
}

/**
 * Sweeps one player of a role over a set of samples: in each sample, it poses the skin of the GPU
 * (`posedCorner()`), and measures the depth of each point of each moving part in each obstacle
 * (`closedDepth()`). It gives the deepest point of each pair.
 *
 * @param role The role.
 * @param player The player.
 * @param samples The samples.
 * @param visit Gets each posed sample, for the other checks of a role.
 * @returns The deepest point of each pair of a moving part and an obstacle.
 */
export function sweepDepths(
  role: RoleSweep,
  player: SweepPlayer,
  samples: Iterable<SweepSample>,
  visit?: (posed: PosedSkeleton, sample: SweepSample) => void,
): PairDepth[] {
  const { mesh } = player.model;
  const parts = role.parts.map((part) => ({ part, points: partPoints(mesh, part.bones) }));
  const deepest = new Map<string, PairDepth>();
  for (const { part } of parts) {
    for (const { name } of role.obstacles) {
      deepest.set(`${part.name} ${name}`, {
        part: part.name,
        into: name,
        depth: 0,
        song: 0,
        wall: 0,
        bone: null,
        along: Number.NaN,
      });
    }
  }

  for (const sample of samples) {
    const posed = poseSkeleton(player.model, player.poseAt(sample));
    visit?.(posed, sample);
    const surfaces = role.obstacles.map((obstacle) => ({
      name: obstacle.name,
      surface: obstacle.surface(posed),
    }));
    for (const { part, points } of parts) {
      const placed = points.corners.map((c) => new Vector3(...posedCorner(posed, c)));
      for (const { name, surface } of surfaces) {
        const key = `${part.name} ${name}`;
        const { depth, index } = closedDepth(placed, surface);
        const best = deepest.get(key);
        const corner = points.corners[index];
        const point = placed[index];
        if (!best || depth <= best.depth || corner === undefined || !point) {
          continue;
        }
        const bone = mesh.bones[corner] ?? 0;
        deepest.set(key, {
          ...best,
          depth,
          song: sample[0],
          wall: sample[1],
          bone: BONE_NAMES[bone] ?? null,
          along: alongBone(posed, bone, point),
        });
      }
    }
  }
  return [...deepest.values()];
}

/**
 * Measures the distance from each palm of a player to its note targets, with the pose of the
 * skeleton.
 *
 * @param player The player.
 * @returns The largest error of each hand with a note target.
 */
export function targetErrors(player: SweepPlayer): TargetError[] {
  const { body } = player.model;
  const worst = new Map<'L' | 'R', TargetError>();
  for (const { side, sample, point } of player.targets()) {
    const posed = poseSkeleton(player.model, player.poseAt(sample));
    const palm = posedPoint(posed, `hand${side}`, side === 'L' ? body.palmL : body.palmR);
    const error = new Vector3(...palm).distanceTo(new Vector3(...point));
    if (error >= (worst.get(side)?.error ?? -1)) {
      worst.set(side, { side, error, song: sample[0] });
    }
  }
  return [...worst.values()];
}

/**
 * Gives the largest depth of a pair of parts in a set of samples: the accepted depth of the pair,
 * or the contact depth of the role.
 *
 * @param role The role.
 * @param pair The pair.
 * @param samples The name of the set of samples.
 * @returns The limit, with the accepted depth that sets it, if any.
 */
export function depthLimit(
  role: RoleSweep,
  pair: Pick<PairDepth, 'part' | 'into'>,
  samples: string,
): { readonly depth: number; readonly accepted: AcceptedDepth | null } {
  const accepted = role.accepted.find(
    (a) => a.part === pair.part && a.into === pair.into && a.samples === samples,
  );
  return accepted ? { depth: accepted.depth, accepted } : { depth: role.contact, accepted: null };
}

/**
 * Writes a pair depth as one line of text.
 *
 * @param pair The pair.
 * @returns The text, such as `forearms in body: 5.9 cm at song 12.25 s (forearmL 0.62)`.
 */
export function pairText(pair: PairDepth): string {
  const along = Number.isNaN(pair.along) ? '' : ` ${pair.along.toFixed(2)}`;
  const place = pair.bone ? ` (${pair.bone}${along})` : '';
  return `${pair.part} in ${pair.into}: ${(pair.depth * 100).toFixed(1)} cm at song ${pair.song.toFixed(2)} s, wall ${pair.wall.toFixed(2)} s${place}`;
}
