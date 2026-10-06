import { Box3, Ray, Triangle, Vector3 } from 'three';

import { patchedDemos } from '../../tools/patch-demos.ts';
import { CONDUCTOR } from '../models/cast.ts';
import { layoutScene } from '../models/layout-scene.ts';
import { ModelCache } from '../models/model-cache.ts';
import { placePoint } from '../models/instruments/hold.ts';
import { VIOLIN } from '../models/instruments/strings.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { toVec3 } from '../models/tuples.ts';
import { scoreOf } from '../score/test-score.ts';
import { posePoint } from './frames.ts';
import { conductorHead, lookAngles } from './plan.ts';
import type { PosePlan } from './plan.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { poseSkeleton } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { PLAYING } from './test-scene.ts';
import type { TestScene } from './test-scene.ts';

/** The bones of the head and the face of an animal. */
export const HEAD_BONES = [
  'head',
  'jaw',
  'eyeL',
  'eyeR',
  'earL',
  'earR',
  'trunk1',
  'trunk2',
  'trunk3',
] as const satisfies readonly BoneName[];

/** The posed triangles of some bones, with their bounding box. */
export interface PosedPart {
  readonly triangles: readonly Triangle[];
  readonly box: Box3;
}

/**
 * Gives the posed triangles of the parts that follow some bones. Each part follows one bone
 * (design 4.4), so the three corners of a triangle follow the bone of the first corner.
 *
 * @param posed The posed skeleton.
 * @param bones The bones.
 * @param keep Tells if a triangle belongs to the part, from its three corners in the bind pose.
 *   All triangles by default.
 * @returns The triangles and their bounding box.
 */
export function posedPart(
  posed: PosedSkeleton,
  bones: readonly BoneName[],
  keep: (corners: readonly Vector3[]) => boolean = () => true,
): PosedPart {
  const wanted = new Set(bones.map(boneIndex));
  const { positions, bones: vertexBones } = posed.model.mesh;
  const binds = posed.model.skeleton.positions;
  const triangles: Triangle[] = [];
  const box = new Box3();
  for (let v = 0; v < vertexBones.length; v += 3) {
    const bone = vertexBones[v] ?? 0;
    const frame = posed.frames[bone];
    if (!wanted.has(bone) || !frame) {
      continue;
    }
    const corners = [0, 1, 2].map(
      (k) =>
        new Vector3(
          positions[(v + k) * 3] ?? 0,
          positions[(v + k) * 3 + 1] ?? 0,
          positions[(v + k) * 3 + 2] ?? 0,
        ),
    );
    if (!keep(corners)) {
      continue;
    }
    const bind = binds[bone] ?? [0, 0, 0];
    const [a, b, c] = corners.map((p) => posePoint(frame, bind, toVec3(p)));
    if (!a || !b || !c) {
      continue;
    }
    const triangle = new Triangle(a, b, c);
    box.expandByPoint(triangle.a).expandByPoint(triangle.b).expandByPoint(triangle.c);
    triangles.push(triangle);
  }
  return { triangles, box };
}

/**
 * Gives the posed neck of a bowed string: the triangles of the instrument with a corner past the
 * upper end of the body, toward the scroll. These are the neck, the fingerboard over it, the
 * pegbox, and the scroll (design 4.6).
 *
 * @param posed The posed skeleton of a bowed string player.
 * @returns The neck.
 * @throws Error if the instrument has no target `fingerboard`, or no triangles past its body.
 */
export function posedNeck(posed: PosedSkeleton): PosedPart {
  const board = posed.model.instrument.targets.find((t) => t.kind === 'fingerboard');
  if (!board) {
    throw new Error(`The ${posed.model.instrument.id} has no target "fingerboard".`);
  }
  const nut = new Vector3(...placePoint(posed.model.pieces, { bone: board.bone, at: board.from }));
  const end = new Vector3(...placePoint(posed.model.pieces, { bone: board.bone, at: board.to }));
  // The target runs from the nut to the end of the fingerboard. The body ends between them.
  const v = VIOLIN;
  const share = (v.bodyLength - v.fingerboardEnd) / (v.nut - v.fingerboardEnd);
  const along = nut.clone().sub(end);
  const bodyEnd = end.clone().addScaledVector(along, share);
  const past = (p: Vector3): boolean => p.clone().sub(bodyEnd).dot(along) > 0;
  const neck = posedPart(posed, ['instrument'], (corners) => corners.some(past));
  if (neck.triangles.length === 0) {
    throw new Error(`The ${posed.model.instrument.id} has no triangles past its body.`);
  }
  return neck;
}

const ray = new Ray();
const hit = new Vector3();

/**
 * Tells if a segment crosses a triangle.
 *
 * @param p The start of the segment.
 * @param q The end of the segment.
 * @param triangle The triangle.
 * @returns True if the segment and the triangle have a common point.
 */
function crosses(p: Vector3, q: Vector3, triangle: Triangle): boolean {
  const length = p.distanceTo(q);
  ray.origin.copy(p);
  ray.direction.subVectors(q, p).normalize();
  const point = ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, hit);
  return point !== null && point.distanceTo(p) <= length;
}

const d1 = new Vector3();
const d2 = new Vector3();
const r = new Vector3();
const c1 = new Vector3();
const c2 = new Vector3();

/**
 * Gives the smallest distance between two segments (Ericson, "Real-Time Collision Detection",
 * 5.1.9).
 *
 * @param p1 The start of the first segment.
 * @param q1 The end of the first segment.
 * @param p2 The start of the second segment.
 * @param q2 The end of the second segment.
 * @returns The distance.
 */
function segmentDistance(p1: Vector3, q1: Vector3, p2: Vector3, q2: Vector3): number {
  d1.subVectors(q1, p1);
  d2.subVectors(q2, p2);
  r.subVectors(p1, p2);
  const a = d1.dot(d1);
  const e = d2.dot(d2);
  const f = d2.dot(r);
  const clamp = (x: number): number => Math.max(0, Math.min(1, x));
  let s = 0;
  let t = 0;
  if (a <= 1e-12 && e <= 1e-12) {
    return p1.distanceTo(p2);
  }
  if (a <= 1e-12) {
    t = clamp(f / e);
  } else {
    const c = d1.dot(r);
    if (e <= 1e-12) {
      s = clamp(-c / a);
    } else {
      const b = d1.dot(d2);
      const denominator = a * e - b * b;
      s = denominator > 1e-12 ? clamp((b * f - c * e) / denominator) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp((b - c) / a);
      }
    }
  }
  c1.copy(p1).addScaledVector(d1, s);
  c2.copy(p2).addScaledVector(d2, t);
  return c1.distanceTo(c2);
}

const closest = new Vector3();

/**
 * Gives the smallest distance between two triangles: 0 if they cross, else the smallest of the
 * distances from a corner to the other triangle and between two edges.
 *
 * @param a The first triangle.
 * @param b The second triangle.
 * @returns The distance.
 */
function triangleDistance(a: Triangle, b: Triangle): number {
  const cornersA = [a.a, a.b, a.c] as const;
  const cornersB = [b.a, b.b, b.c] as const;
  for (let i = 0; i < 3; i++) {
    const pa = cornersA[i] ?? a.a;
    const qa = cornersA[(i + 1) % 3] ?? a.a;
    const pb = cornersB[i] ?? b.a;
    const qb = cornersB[(i + 1) % 3] ?? b.a;
    if (crosses(pa, qa, b) || crosses(pb, qb, a)) {
      return 0;
    }
  }
  let best = Infinity;
  for (const p of cornersA) {
    best = Math.min(best, b.closestPointToPoint(p, closest).distanceTo(p));
  }
  for (const p of cornersB) {
    best = Math.min(best, a.closestPointToPoint(p, closest).distanceTo(p));
  }
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      best = Math.min(
        best,
        segmentDistance(
          cornersA[i] ?? a.a,
          cornersA[(i + 1) % 3] ?? a.a,
          cornersB[j] ?? b.a,
          cornersB[(j + 1) % 3] ?? b.a,
        ),
      );
    }
  }
  return best;
}

const boxA = new Box3();
const boxB = new Box3();

/**
 * Sets a box to the bounding box of a triangle.
 *
 * @param triangle The triangle.
 * @param out The box to write.
 * @returns `out`.
 */
function boxOf(triangle: Triangle, out: Box3): Box3 {
  return out
    .makeEmpty()
    .expandByPoint(triangle.a)
    .expandByPoint(triangle.b)
    .expandByPoint(triangle.c);
}

/**
 * Gives the smallest distance between two posed parts, up to a limit. Only tests use it.
 *
 * @param a The first part.
 * @param b The second part.
 * @param limit The largest distance of interest, in meters. A pair of triangles farther apart
 *   than this is not measured.
 * @returns The distance, 0 if the parts cross, or `limit` if they are at least that far apart.
 */
export function partDistance(a: PosedPart, b: PosedPart, limit: number): number {
  let best = limit;
  if (!a.box.clone().expandByScalar(limit).intersectsBox(b.box)) {
    return best;
  }
  for (const ta of a.triangles) {
    boxOf(ta, boxA).expandByScalar(best);
    if (!boxA.intersectsBox(b.box)) {
      continue;
    }
    for (const tb of b.triangles) {
      if (!boxA.intersectsBox(boxOf(tb, boxB))) {
        continue;
      }
      best = Math.min(best, triangleDistance(ta, tb));
      if (best === 0) {
        return 0;
      }
      boxOf(ta, boxA).expandByScalar(best);
    }
  }
  return best;
}

/** A look at the conductor: the yaw and the pitch of the head, in radians. */
export type Look = readonly [yaw: number, pitch: number];

/**
 * Finds the largest looks at the conductor of the players of some instruments in the demo
 * layouts. All players face the podium, so the yaw is near 0, and the pitch follows the heights.
 *
 * @param instruments The instruments.
 * @returns The corners of the range of the yaws and the pitches, with no two the same to 0.001.
 */
export async function demoLooks(instruments: readonly InstrumentId[]): Promise<Look[]> {
  const looks: Look[] = [];
  for (const demo of await patchedDemos()) {
    const score = scoreOf(demo.bytes);
    const models = new ModelCache();
    const layout = layoutScene(score, models);
    const bear = models.get(CONDUCTOR.species, CONDUCTOR.instrument, 4);
    const head = conductorHead(bear, layout.conductor);
    for (const { cast, position, facing } of layout.players) {
      if (instruments.includes(cast.instrument)) {
        const model = models.get(cast.species, cast.instrument, cast.kettles, cast.support);
        looks.push(lookAngles(model.skeleton, position, facing, head));
      }
    }
  }
  const yaws = looks.map(([yaw]) => yaw);
  const pitches = looks.map(([, pitch]) => pitch);
  const corners = [Math.min(...yaws), Math.max(...yaws)].flatMap((yaw) =>
    [Math.min(...pitches), Math.max(...pitches)].map((pitch): Look => [yaw, pitch]),
  );
  const key = ([yaw, pitch]: Look): string => `${yaw.toFixed(3)} ${pitch.toFixed(3)}`;
  return [...new Map(corners.map((look) => [key(look), look])).values()];
}

/**
 * Gives the smallest distance from the head of a player to a part of its instrument while it
 * plays, with each look, at some song times, and over the looks and the breaths of 30 s of the
 * wall clock.
 *
 * @param scene The scene.
 * @param index The index of the player.
 * @param looks The looks at the conductor.
 * @param songTimes The song times.
 * @param part Gives the part of the instrument of a posed skeleton.
 * @param limit The largest distance of interest, in meters.
 * @returns The distance, up to `limit`.
 * @throws Error if the scene has no player at the index.
 */
export function headClearance(
  scene: TestScene,
  index: number,
  looks: readonly Look[],
  songTimes: readonly number[],
  part: (posed: PosedSkeleton) => PosedPart,
  limit: number,
): number {
  const plan = scene.plan.players[index];
  const place = scene.layout.players[index];
  if (!plan || !place) {
    throw new Error(`The scene has no player ${index}.`);
  }
  const { species, instrument, kettles, support } = place.cast;
  const model = scene.models.get(species, instrument, kettles, support);
  let nearest = limit;
  for (const [lookYaw, lookPitch] of looks) {
    const one: PosePlan = { ...scene.plan, players: [{ ...plan, lookYaw, lookPitch }] };
    const buffer = createScenePose(one);
    for (const songTime of songTimes) {
      for (let wall = 10; wall < 40; wall += 2) {
        const pose = poseAt(one, songTime, wall, PLAYING, [], buffer).players[0];
        if (!pose) {
          throw new Error('The player has no pose.');
        }
        const posed = poseSkeleton(model, pose);
        nearest = Math.min(nearest, partDistance(posedPart(posed, HEAD_BONES), part(posed), limit));
      }
    }
  }
  return nearest;
}
