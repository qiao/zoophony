/**
 * Measures the balance of the bear conductor that stands on its podium: the center of mass of the
 * posed body against the support area of its soles. The center of mass is the volume centroid of
 * the posed body surface (signed tetrahedra from the origin), with the baton as a point mass of
 * FOLDER_KG at the area centroid of its faces, and the body at 1000 kg for each cubic meter. The
 * support area is the convex hull of the posed sole corners on the floor (at most SOLE_MM above
 * the lowest sole corner), on the floor plane. The tail does not count as a support. The axes are
 * the axes of the player: -z forward, -x the left side of the bear, in meters. The table gives
 * the offsets forward and to the left.
 *
 * The samples are the rest pose before the first play (wall 10 s), and the play of the first demo
 * with a conductor, at steps of STEP_SEC of song time from the song start to the end.
 *
 * With --dump <file>, the probe also writes the side view (z, y) and the front view (x, y) of the
 * posed triangles of the rest and of the median note, with the center of mass and the support
 * area, as JSON for `marks.py`.
 *
 * Usage: node docs/research/2026-10-22-mesh-bear/balance.ts [--dump <file>]
 */
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { BONE_NAMES } from '../../../src/models/rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { posedPart } from '../../../src/pose/test-clearance.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { writeFileSync } from 'node:fs';

import { probeDemos } from '../../../tools/probe-demos.ts';

/** The mass of the baton, in kilograms: an assumed value for a baton of 0.51 m. */
const FOLDER_KG = 0.02;

/** The height of a sole corner above the lowest sole corner that still touches the floor, in mm. */
const SOLE_MM = 5;

/** The step of the song time of the play samples, in seconds. */
const STEP_SEC = 0.5;

/** The bones of the instrument. */
const PROPS: readonly BoneName[] = ['instrument', 'slide', 'bow', 'malletL', 'malletR', 'baton'];

/** The bones of the tail. */
const TAIL: readonly BoneName[] = ['tail1', 'tail2'];

/** The bones of the soles. */
const FEET: readonly BoneName[] = ['footL', 'footR'];

/** A point on the floor plane: x and z. */
type Flat = readonly [number, number];

/**
 * Gives the convex hull of points on the floor plane (the monotone chain).
 *
 * @param points The points.
 * @returns The corners of the hull, counterclockwise.
 */
function hull(points: readonly Flat[]): Flat[] {
  const p = [...points].toSorted((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Flat, a: Flat, b: Flat): number =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Flat[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower.at(-2) as Flat, lower.at(-1) as Flat, q) <= 0) {
      lower.pop();
    }
    lower.push(q);
  }
  const upper: Flat[] = [];
  for (const q of p.toReversed()) {
    while (upper.length >= 2 && cross(upper.at(-2) as Flat, upper.at(-1) as Flat, q) <= 0) {
      upper.pop();
    }
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * Gives the area centroid of a polygon.
 *
 * @param poly The corners, in order.
 * @returns The centroid.
 */
function polygonCentroid(poly: readonly Flat[]): Flat {
  let area = 0;
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i] as Flat;
    const b = poly[(i + 1) % poly.length] as Flat;
    const f = a[0] * b[1] - b[0] * a[1];
    area += f;
    cx += (a[0] + b[0]) * f;
    cz += (a[1] + b[1]) * f;
  }
  return [cx / (3 * area), cz / (3 * area)];
}

/**
 * Gives the signed distance from a point to the edge of a convex polygon: positive inside.
 *
 * @param poly The corners, counterclockwise.
 * @param q The point.
 * @returns The distance, in meters.
 */
function insideBy(poly: readonly Flat[], q: Flat): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i] as Flat;
    const b = poly[(i + 1) % poly.length] as Flat;
    const ex = b[0] - a[0];
    const ez = b[1] - a[1];
    const len = Math.hypot(ex, ez);
    best = Math.min(best, (ex * (q[1] - a[1]) - ez * (q[0] - a[0])) / len);
  }
  return best;
}

/** The balance of one sample. */
interface Balance {
  /** The center of mass: x, y, z. */
  readonly com: readonly [number, number, number];
  /** The middle of the support area: x, z. */
  readonly middle: Flat;
  /** The support area: depth (z) and width (x), in meters. */
  readonly size: Flat;
  /** The distance of the center of mass inside the edge of the support area. */
  readonly inside: number;
  /** The lowest sole corner above the floor. */
  readonly sole: number;
  /** The head top. */
  readonly top: number;
  /** The forward offset of the hip, knee, and ankle joints of the left leg from the middle. */
  readonly joints: readonly number[];
  /** The support area. */
  readonly area: readonly Flat[];
  /** The posed triangles of the body and the folder, rounded to 1 mm. */
  readonly triangles: readonly (readonly number[])[];
}

/**
 * Measures one posed body.
 *
 * @param posed The posed skeleton.
 * @returns The balance.
 */
function balanceOf(posed: ReturnType<typeof poseSkeleton>): Balance {
  const bodyBones = BONE_NAMES.filter((b) => !PROPS.includes(b));
  const body = posedPart(posed, bodyBones);
  let volume = 0;
  const sum = [0, 0, 0];
  let top = -Infinity;
  for (const t of body.triangles) {
    const { a, b, c } = t;
    const v = a.dot(b.clone().cross(c)) / 6;
    volume += v;
    sum[0] += ((a.x + b.x + c.x) / 4) * v;
    sum[1] += ((a.y + b.y + c.y) / 4) * v;
    sum[2] += ((a.z + b.z + c.z) / 4) * v;
    top = Math.max(top, a.y, b.y, c.y);
  }
  const kg = Math.abs(volume) * 1000;
  const bodyCom = sum.map((s) => s / volume) as [number, number, number];
  const props = posedPart(posed, PROPS);
  let area = 0;
  const psum = [0, 0, 0];
  for (const t of props.triangles) {
    const s = t.getArea();
    const m = t.getMidpoint(t.a.clone());
    area += s;
    psum[0] += m.x * s;
    psum[1] += m.y * s;
    psum[2] += m.z * s;
  }
  const com = bodyCom.map((v, k) =>
    area > 0 ? (v * kg + ((psum[k] ?? 0) / area) * FOLDER_KG) / (kg + FOLDER_KG) : v,
  ) as [number, number, number];

  const feet = posedPart(posed, FEET);
  const corners = feet.triangles.flatMap((t) => [t.a, t.b, t.c]);
  const sole = Math.min(...corners.map((p) => p.y));
  const flat = corners.filter((p) => p.y <= sole + SOLE_MM / 1000).map((p): Flat => [p.x, p.z]);
  const area2 = hull(flat);
  const xs = area2.map((p) => p[0]);
  const zs = area2.map((p) => p[1]);
  const middle = polygonCentroid(area2);
  const joints = (['thighL', 'shinL', 'footL'] as const).map(
    (b) => middle[1] - (posed.frames[boneIndex(b)]?.position.z ?? 0),
  );
  const mm = (v: number): number => Math.round(v * 1000) / 1000;
  const triangles = [...body.triangles, ...props.triangles].map((t) =>
    [t.a, t.b, t.c].flatMap((q) => [mm(q.x), mm(q.y), mm(q.z)]),
  );
  return {
    com,
    joints,
    area: area2,
    triangles,
    middle,
    size: [Math.max(...zs) - Math.min(...zs), Math.max(...xs) - Math.min(...xs)],
    inside: insideBy(area2, [com[0], com[2]]),
    sole,
    top,
  };
}

const cm = (m: number): string => (m * 100).toFixed(1);
const dumpAt = process.argv.indexOf('--dump');
const dump = dumpAt > 0 ? process.argv[dumpAt + 1] : undefined;
const role = FOLD_ROLES.get('conductor');
if (!role) {
  throw new Error('No role conductor.');
}
for (const demo of await probeDemos()) {
  const scene = sceneOf(demo.bytes);
  const [first] = roleBodies(role, scene);
  if (!first) {
    continue;
  }
  const { model } = first;
  const index = 'conductor';
  const buffer = createScenePose(scene.plan);
  const audible = allAudible(scene.score);
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const rows: [string, Balance][] = [];
  const rest = poseAt(scene.plan, start, 10, NOT_STARTED, audible, buffer).conductor;
  if (rest) {
    rows.push(['rest', balanceOf(poseSkeleton(model, rest))]);
  }
  const play: Balance[] = [];
  for (let song = 0; song <= scene.score.durationSec; song += STEP_SEC) {
    const pose = poseAt(scene.plan, song, 10 + song - start, PLAYING, audible, buffer).conductor;
    if (pose) {
      play.push(balanceOf(poseSkeleton(model, pose)));
    }
  }
  console.log(`Demo ${demo.file}, player ${index}, ${play.length} play samples.`);
  console.log(
    '| Sample | Front of the middle cm | Left of the middle cm | Inside the edge cm | Center of mass height cm | Support depth x width cm | Lowest sole cm | Head top cm |',
  );
  console.log('|---|---|---|---|---|---|---|---|');
  const line = (name: string, b: Balance): string =>
    `| ${name} | ${cm(b.middle[1] - b.com[2])} | ${cm(b.middle[0] - b.com[0])} | ${cm(b.inside)} | ${cm(b.com[1])} | ${cm(b.size[0])} x ${cm(b.size[1])} | ${cm(b.sole)} | ${cm(b.top)} |`;
  for (const [name, b] of rows) {
    console.log(line(name, b));
  }
  if (play.length) {
    const by = play.toSorted((a, b) => a.com[2] - a.middle[1] - (b.com[2] - b.middle[1]));
    const pick = (q: number): Balance => by[Math.round(q * (by.length - 1))] as Balance;
    console.log(line('play, p5 (most forward)', pick(0.05)));
    console.log(line('play, median', pick(0.5)));
    const j = (pick(0.5).joints).map(cm).join(', ');
    console.log(`Play median: the left hip, knee, and ankle joints are ${j} cm in front of the middle.`);
    console.log(line('play, p95 (most back)', pick(0.95)));
    const rested = rows[0]?.[1];
    if (dump && rested) {
      const out = (b: Balance) => ({ com: b.com, area: b.area, triangles: b.triangles });
      writeFileSync(dump, JSON.stringify({ rest: out(rested), note: out(pick(0.5)) }));
    }
  }
  break;
}
