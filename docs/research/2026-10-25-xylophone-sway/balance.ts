// Balance of the xylophone badger over the play: node docs/research/2026-10-25-xylophone-sway/balance.ts <midi|percussion-test> [step]
// The center of mass is the volume centroid of the posed body (signed tetrahedra), with no props.
// The support area is the convex hull of the posed sole corners at most 5 mm above the lowest
// sole corner. "Inside" is the distance of the center of mass inside the edge of that area. The
// foot move is the largest move of an ankle joint from its bind place.
import { readFile } from 'node:fs/promises';
import { setHolds } from '../../../tools/hold-sets.ts';
if (process.env['SET']) setHolds(process.env['SET']);
import { probeDemos } from '../../../tools/probe-demos.ts';
import { sceneOf, PLAYING, allAudible } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { posedPart } from '../../../src/pose/test-clearance.ts';
import { BONE_NAMES, boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';

type Flat = readonly [number, number];
const PROPS: readonly BoneName[] = ['instrument', 'slide', 'bow', 'malletL', 'malletR', 'baton'];

function hull(points: readonly Flat[]): Flat[] {
  const p = [...points].toSorted((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Flat, a: Flat, b: Flat): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Flat[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Flat[] = [];
  for (const q of p.toReversed()) {
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function insideBy(poly: readonly Flat[], q: Flat): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const ex = b[0] - a[0];
    const ez = b[1] - a[1];
    best = Math.min(best, (ex * (q[1] - a[1]) - ez * (q[0] - a[0])) / Math.hypot(ex, ez));
  }
  return best;
}

const f = process.argv[2] ?? 'percussion-test';
const step = Number(process.argv[3] ?? 0.25);
const bytes = f.includes('/') ? new Uint8Array(await readFile(f)) : (await probeDemos()).find((d) => d.file === `${f}.mid`)!.bytes;
const s = sceneOf(bytes);
const audible = allAudible(s.score);
const buffer = createScenePose(s.plan);
const bodyBones = BONE_NAMES.filter((b) => !PROPS.includes(b));
for (const [index, pl] of s.layout.players.entries()) {
  if (pl.cast.instrument !== 'xylophone') continue;
  const model = s.models.get(pl.cast.species, 'xylophone', pl.cast.kettles, pl.cast.support);
  const plan = s.plan.players[index]!;
  const layer = plan.note as unknown as Record<'left' | 'right', { starts: Float64Array }>;
  const first = Math.min(layer.left.starts[0]!, layer.right.starts[0]!) + plan.timeOffset;
  const last = Math.max(layer.left.starts.at(-1)!, layer.right.starts.at(-1)!) + plan.timeOffset;
  const ankles = (['footL', 'footR'] as const).map((b) => model.skeleton.positions[boneIndex(b)]!);
  const side: number[] = [];
  const front: number[] = [];
  const inside: number[] = [];
  const soles: number[] = [];
  let slide = 0;
  // The support area of the bind soles: the feet stay in place.
  const bindPosed = poseSkeleton(model, poseAt(s.plan, -100, 0, PLAYING, audible, createScenePose(s.plan)).players[index]!);
  const bindFlat: Flat[] = [];
  for (const foot of ['footL', 'footR'] as const) {
    const corners = posedPart(bindPosed, [foot]).triangles.flatMap((tr) => [tr.a, tr.b, tr.c]);
    const low = Math.min(...corners.map((p) => p.y));
    bindFlat.push(...corners.filter((p) => p.y <= low + 0.005).map((p): Flat => [p.x, p.z]));
  }
  const bindArea = hull(bindFlat);
  const bindInside: number[] = [];
  for (let t = first; t <= last; t += step) {
    const posed = poseSkeleton(model, poseAt(s.plan, t, 10 + t, PLAYING, audible, buffer).players[index]!);
    let volume = 0;
    const sum = [0, 0, 0];
    for (const { a, b, c } of posedPart(posed, bodyBones).triangles) {
      const v = a.dot(b.clone().cross(c)) / 6;
      volume += v;
      sum[0]! += ((a.x + b.x + c.x) / 4) * v;
      sum[1]! += ((a.y + b.y + c.y) / 4) * v;
      sum[2]! += ((a.z + b.z + c.z) / 4) * v;
    }
    const com = sum.map((x) => x / volume);
    const flat: Flat[] = [];
    let sole = Infinity;
    for (const foot of ['footL', 'footR'] as const) {
      const corners = posedPart(posed, [foot]).triangles.flatMap((tr) => [tr.a, tr.b, tr.c]);
      const low = Math.min(...corners.map((p) => p.y));
      sole = Math.min(sole, low);
      flat.push(...corners.filter((p) => p.y <= low + 0.005).map((p): Flat => [p.x, p.z]));
    }
    const area = hull(flat);
    side.push(com[0]!);
    front.push(-com[2]!);
    inside.push(insideBy(area, [com[0]!, com[2]!]));
    bindInside.push(insideBy(bindArea, [com[0]!, com[2]!]));
    soles.push(sole);
    for (const [k, b] of (['footL', 'footR'] as const).entries()) {
      const p = posed.frames[boneIndex(b)]!.position;
      const a = ankles[k]!;
      slide = Math.max(slide, Math.hypot(p.x - a[0]!, p.y - a[1]!, p.z - a[2]!));
    }
  }
  const q = (v: number[], p: number): string => ((v.toSorted((a, b) => a - b)[Math.floor(p * (v.length - 1))] ?? 0) * 100).toFixed(1);
  console.log(`${f.split('/').at(-1)} player ${index}: ${side.length} samples. COM side cm min ${q(side, 0)} max ${q(side, 1)}; COM front cm p50 ${q(front, 0.5)} max ${q(front, 1)}; inside the posed sole edge cm min ${q(inside, 0)} p50 ${q(inside, 0.5)}; inside the bind sole edge cm min ${q(bindInside, 0)} p50 ${q(bindInside, 0.5)}; lowest sole cm ${q(soles, 0)} to ${q(soles, 1)}; ankle move max ${(slide * 1000).toFixed(1)} mm`);
  break;
}
