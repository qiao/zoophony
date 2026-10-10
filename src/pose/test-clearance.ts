import { Box3, Ray, Triangle, Vector3 } from 'three';

import { patchedDemos } from '../../tools/patch-demos.ts';
import { CONDUCTOR } from '../models/cast.ts';
import { layoutScene } from '../models/layout-scene.ts';
import { ModelCache } from '../models/model-cache.ts';
import { placePoint } from '../models/instruments/hold.ts';
import { VIOLIN } from '../models/instruments/strings.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { scoreOf } from '../score/test-score.ts';
import { headOf, lookAngles } from './plan.ts';
import type { PosePlan } from './plan.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { poseSkeleton } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { posedCorner } from './test-skin.ts';
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
  /** The posed triangles. */
  readonly triangles: readonly Triangle[];
  /** The box around the triangles. */
  readonly box: Box3;
  /**
   * Gives the closed shells that hold the triangles, posed: a welded part on two bones is one
   * closed shell, and the triangles of one of its bones are an open surface. {@link signedDistance}
   * measures the shells. With no value, the triangles are one closed shell.
   */
  readonly closed?: () => readonly PosedPart[];
}

/** The closed shells of a mesh, found one time for each mesh. */
interface MeshShells {
  /** The shell of each triangle. */
  readonly shellOf: Int32Array;
  /** The first corner of each triangle of each shell. */
  readonly shells: readonly (readonly number[])[];
}

/** The shells of each mesh, by the mesh data. */
const SHELLS = new WeakMap<PlayerModel['mesh'], MeshShells>();

/**
 * Finds the closed shells of a mesh: the triangles that share an edge in the bind pose are in the
 * same shell. A welded part on two bones is one shell, and each rigid part is its own shell.
 *
 * @param mesh The mesh.
 * @returns The shells.
 */
function meshShells(mesh: PlayerModel['mesh']): MeshShells {
  const known = SHELLS.get(mesh);
  if (known) {
    return known;
  }

  // Each triangle starts as its own shell. An edge joins the shells of its two triangles. Two
  // closed parts that only touch at a corner, such as a cap point on a joint, stay apart.
  const count = mesh.bones.length / 3;
  const parent = Int32Array.from({ length: count }, (_, i) => i);
  const rootOf = (i: number): number => {
    let r = i;
    while (parent[r] !== r) {
      r = parent[r] ?? r;
    }
    parent[i] = r;
    return r;
  };
  const owner = new Map<string, number>();
  const p = mesh.positions;
  const placeOf = (corner: number): string =>
    `${p[corner * 3]} ${p[corner * 3 + 1]} ${p[corner * 3 + 2]}`;
  for (let t = 0; t < count; t++) {
    for (let k = 0; k < 3; k++) {
      const a = placeOf(t * 3 + k);
      const b = placeOf(t * 3 + ((k + 1) % 3));
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      const other = owner.get(key);
      if (other === undefined) {
        owner.set(key, t);
      } else {
        parent[rootOf(t)] = rootOf(other);
      }
    }
  }

  const index = new Map<number, number>();
  const shells: number[][] = [];
  const shellOf = new Int32Array(count);
  for (let t = 0; t < count; t++) {
    const r = rootOf(t);
    let shell = index.get(r);
    if (shell === undefined) {
      shell = shells.length;
      index.set(r, shell);
      shells.push([]);
    }
    shells[shell]?.push(t * 3);
    shellOf[t] = shell;
  }
  const found = { shellOf, shells };
  SHELLS.set(mesh, found);
  return found;
}

/**
 * Poses the triangles that start at some corners: each corner follows its own two bones, as the
 * skin of the GPU does ({@link posedCorner}).
 *
 * @param posed The posed skeleton.
 * @param firsts The first corner of each triangle.
 * @returns The posed triangles and their box.
 */
function posedTriangles(posed: PosedSkeleton, firsts: readonly number[]): PosedPart {
  const triangles: Triangle[] = [];
  const box = new Box3();
  for (const v of firsts) {
    const [a, b, c] = [0, 1, 2].map((k) => new Vector3(...posedCorner(posed, v + k)));
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
 * Gives the posed triangles of the parts that follow some bones. A triangle belongs to the bone
 * of its first corner, its main bone. Each corner follows its own two bones, as the skin of the
 * GPU does (design 4.4, 4.7), so a triangle of a welded part keeps its place in the skin.
 *
 * @param posed The posed skeleton.
 * @param bones The bones.
 * @param keep Tells if a triangle belongs to the part, from its three corners in the bind pose.
 *   All triangles by default.
 * @returns The triangles, their bounding box, and their closed shells.
 */
export function posedPart(
  posed: PosedSkeleton,
  bones: readonly BoneName[],
  keep: (corners: readonly Vector3[]) => boolean = () => true,
): PosedPart {
  const wanted = new Set(bones.map(boneIndex));
  const { mesh } = posed.model;
  const { positions, bones: vertexBones } = mesh;
  const firsts: number[] = [];
  for (let v = 0; v < vertexBones.length; v += 3) {
    if (!wanted.has(vertexBones[v] ?? 0)) {
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
    if (keep(corners)) {
      firsts.push(v);
    }
  }
  const part = posedTriangles(posed, firsts);

  // The shells of the triangles, posed only when a signed distance needs them.
  let shells: readonly PosedPart[] | null = null;
  const closed = (): readonly PosedPart[] => {
    if (!shells) {
      const { shellOf, shells: all } = meshShells(mesh);
      const ids = new Set(firsts.map((v) => shellOf[v / 3] ?? 0));
      shells = [...ids].map((id) => posedTriangles(posed, all[id] ?? []));
    }
    return shells;
  };
  return { ...part, closed };
}

const inside = new Ray();
const insideHit = new Vector3();
const nearestPoint = new Vector3();
/** A direction with no simple ratio, so that a ray passes no edge of the low-poly mesh. */
const RAY_DIRECTION = new Vector3(0.31, 0.89, 0.17).normalize();

/**
 * Gives the signed distance from a point to the surface of one closed shell: negative inside it.
 * A ray from the point crosses the surface an odd number of times if the point is in the shell.
 *
 * @param shell The closed shell.
 * @param point The point.
 * @returns The distance, in meters.
 */
function shellDistance(shell: PosedPart, point: Vector3): number {
  let nearest = Infinity;
  let crossings = 0;
  inside.set(point, RAY_DIRECTION);
  for (const t of shell.triangles) {
    nearest = Math.min(nearest, t.closestPointToPoint(point, nearestPoint).distanceTo(point));
    if (inside.intersectTriangle(t.a, t.b, t.c, false, insideHit)) {
      crossings++;
    }
  }
  return crossings % 2 === 1 ? -nearest : nearest;
}

/**
 * Gives the signed distance from a point to a posed part: negative inside it. The function
 * measures the closed shells of the part ({@link PosedPart.closed}), so a welded part on two
 * bones counts as its whole closed surface, and the point is inside when it is inside one of the
 * shells. Only tests use it.
 *
 * @param part The part.
 * @param point The point.
 * @returns The distance, in meters.
 */
export function signedDistance(part: PosedPart, point: Vector3): number {
  const shells = part.closed?.() ?? [part];
  const distances = shells.map((shell) => shellDistance(shell, point));
  const inner = distances.filter((d) => d < 0);

  // Inside one shell: the depth in the deepest shell. Outside all: the nearest surface.
  return inner.length > 0 ? Math.min(...inner) : Math.min(Infinity, ...distances);
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
    if (!layout.conductor) {
      continue;
    }
    const head = headOf(bear, layout.conductor);
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
