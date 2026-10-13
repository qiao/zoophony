/**
 * Searches the rest hold of the pianist at random for a paw low in the lap (the report
 * `2026-10-13-pianist-lap.md`, section 4, fix round). Each try sets the place of each palm in
 * meters, the side of the palm, the fingers, and the elbow direction, mirrored for the right paw.
 * The rest lean and the head lift stay 8°. It poses the pianist of the Bach demo at rest and
 * measures, for each paw: the depth of each arm part in the closed body (cm), the gap of the paw
 * to the body (cm), the gap of the paw and the claws to the case of the piano (cm), the palm, the
 * angle of the upper arm in the back view, and the elbow from the shoulder (out, up, forward).
 *
 * The score adds 10 for each cm of depth over 3 cm, 0.5 for each cm over 1.5 cm, the paw gap to
 * the body over 1.5 cm, 2 for each cm of the case gap under 5 cm, `YW` (0.5 by default) for each cm
 * of the palm over 0.60 m, `FW` (0.3 by default) for each cm of the elbow forward of the shoulder over 10 cm, 0.1
 * for each degree of the upper arm over 35°, 1 for each cm of the palm outside 0.27 m from the
 * middle line, and 3 times the part of the palm side over -0.5 on y (a palm that faces down less). It prints the 8 tries with the lowest score. Run from the repository root:
 * `node docs/research/2026-10-13-pianist-lap/search-lap-low.ts <tries> [seed] [center JSON]`.
 * With a center, the tries are near it and come nearer with each try. `LO` and `HI` give the
 * ranges as JSON, and `PRINT` prints the `--set` text of one JSON try and its measures.
 */
import { Vector3 } from 'three';

import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { lapPoint } from '../../../src/pose/lap.ts';
import {
  closedDepth,
  closedPart,
  partDistance,
  posedPart,
  surfaceGap,
} from '../../../src/pose/test-clearance.ts';
import { posedAt, posedPoint } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED, firstPlayers, sceneOf } from '../../../src/pose/test-scene.ts';
import { pianoCase } from '../../../src/pose/test-sweep-roles.ts';

const BODY = ['hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'eyeL', 'eyeR', 'earL', 'earR', 'tail1', 'tail2', 'shoulderL', 'shoulderR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'] as const satisfies readonly BoneName[];
const evals = Number(process.argv[2] ?? 100);
let seed = Number(process.argv[3] ?? 1);
const rand = (): number => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
type V3 = [number, number, number];
interface P {
  x: number;
  y: number;
  z: number;
  pa: V3;
  fi: V3;
  po: [number, number];
}
const lo: P = JSON.parse(process.env['LO'] ?? '{"x":-0.29,"y":0.55,"z":-0.62,"pa":[0,-1,-0.2],"fi":[-0.3,-0.8,-1],"po":[-1,-0.3]}');
const hi: P = JSON.parse(process.env['HI'] ?? '{"x":-0.18,"y":0.68,"z":-0.42,"pa":[0.6,-1,0.8],"fi":[0.6,0.2,-1],"po":[0.3,1]}');
const center: P | null = process.argv[4] ? JSON.parse(process.argv[4]) : null;
const demo = (await patchedDemos()).find((d) => d.file.startsWith(process.env['DEMO'] ?? 'bach'));
if (!demo) {
  throw new Error('No demo.');
}
const scene0 = sceneOf(demo.bytes);
const model = firstPlayers(scene0, ['piano'] as const)[0]?.model;
if (!model) {
  throw new Error('No pianist.');
}
const h = model.body.headHeight;
const base = {
  L: new Vector3(...lapPoint(model, 'L', { along: 1, offset: [0, 0, 0] })),
  R: new Vector3(...lapPoint(model, 'R', { along: 1, offset: [0, 0, 0] })),
};
const v3 = (a: readonly number[]): string => a.map((v) => v.toFixed(3)).join(',');

function changes(p: P): string {
  const offL = new Vector3(p.x, p.y, p.z).sub(base.L).divideScalar(h);
  const offR = new Vector3(-p.x, p.y, p.z).sub(base.R).divideScalar(h);
  return [
    'piano.restL.lap.along=1',
    'piano.restR.lap.along=1',
    `piano.restL.lap.offset=${v3(offL.toArray())}`,
    `piano.restR.lap.offset=${v3(offR.toArray())}`,
    `piano.restL.palm=${v3(p.pa)}`,
    `piano.restR.palm=${v3([-p.pa[0], p.pa[1], p.pa[2]])}`,
    `piano.restL.fingers=${v3(p.fi)}`,
    `piano.restR.fingers=${v3([-p.fi[0], p.fi[1], p.fi[2]])}`,
    `piano.restL.pole=${v3([-1, p.po[0], p.po[1]])}`,
    `piano.restR.pole=${v3([1, p.po[0], p.po[1]])}`,
  ].join(';');
}

function evaluate(p: P): { score: number; text: string } {
  const c = setHolds(changes(p));
  try {
    const scene = sceneOf(demo?.bytes ?? new Uint8Array());
    const piano = firstPlayers(scene, ['piano'] as const)[0];
    if (!piano) {
      throw new Error('No pianist.');
    }
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    const posed = posedAt(scene, piano, start, 10, NOT_STARTED);
    const surface = closedPart(posed, BODY, 2);
    const body = posedPart(posed, BODY);
    const pianoSurface = pianoCase(posed).surface;
    const at = (b: BoneName): Vector3 => posed.frames[boneIndex(b)]?.position ?? new Vector3();
    const depth = (bones: readonly BoneName[]): number =>
      closedDepth(posedPart(posed, bones).triangles.flatMap((t) => [t.a, t.b, t.c]), surface).depth * 100;
    let worst = 0;
    let gapMax = 0;
    let caseMin = Infinity;
    let angleMax = 0;
    let forwardMax = 0;
    let palmY = 0;
    let palmX = 0;
    const parts: string[] = [];
    for (const s of ['L', 'R'] as const) {
      const d = [depth([`hand${s}`]), depth([`fingers${s}`]), depth([`forearm${s}`]), depth([`upperArm${s}`])];
      const paw = posedPart(posed, [`hand${s}`, `fingers${s}`]);
      const gap = partDistance(paw, body, 0.3) * 100;
      const caseGap = surfaceGap(paw.triangles, pianoSurface, 0.3).gap * 100;
      const palm = posedPoint(posed, `hand${s}`, posed.model.body[`palm${s}`]);
      const sign = s === 'L' ? -1 : 1;
      const arm = at(`forearm${s}`).clone().sub(at(`upperArm${s}`));
      const angle = Math.atan2(sign * arm.x, -arm.y) * (180 / Math.PI);
      worst = Math.max(worst, ...d);
      gapMax = Math.max(gapMax, gap);
      caseMin = Math.min(caseMin, caseGap);
      angleMax = Math.max(angleMax, angle);
      forwardMax = Math.max(forwardMax, -arm.z);
      palmY = Math.max(palmY, palm[1]);
      palmX = Math.max(palmX, Math.abs(palm[0]));
      parts.push(
        `${s} d ${d.map((v) => v.toFixed(1)).join('/')} g ${gap.toFixed(1)} case ${caseGap.toFixed(1)} palm ${v3(palm)} arm ${angle.toFixed(0)} elbow ${v3([sign * arm.x, arm.y, -arm.z])}`,
      );
    }
    const yw = Number(process.env['YW'] ?? 0.5);
    const score =
      Math.max(0, worst - 3) * 10 +
      Math.max(0, worst - 1.5) * 0.5 +
      Math.max(0, gapMax - 1.5) +
      Math.max(0, 5 - caseMin) * 2 +
      Math.max(0, palmY - 0.6) * 100 * yw +
      Math.max(0, forwardMax - 0.1) * 100 * Number(process.env["FW"] ?? 0.3) +
      Math.max(0, angleMax - 35) * 0.1 +
      Math.max(0, palmX - 0.27) * 100 +
      Math.max(0, new Vector3(...p.pa).normalize().y + 0.5) * 3;
    return { score, text: parts.join(' | ') };
  } finally {
    c.undo();
  }
}

const sample = (a: number, b: number, c: number | undefined, s: number): number =>
  c === undefined
    ? a + (b - a) * rand()
    : Math.min(Math.max(a, b), Math.max(Math.min(a, b), c + (b - a) * 0.15 * s * (rand() * 2 - 1)));
const results: { p: P; score: number; text: string }[] = [];
for (let i = 0; i < evals; i++) {
  const s = center ? 1 - 0.8 * (i / evals) : 1;
  const vec = (k: 'pa' | 'fi'): V3 => [0, 1, 2].map((j) => sample(lo[k][j] ?? 0, hi[k][j] ?? 0, center?.[k][j], s)) as V3;
  const p: P = {
    x: sample(lo.x, hi.x, center?.x, s),
    y: sample(lo.y, hi.y, center?.y, s),
    z: sample(lo.z, hi.z, center?.z, s),
    pa: vec('pa'),
    fi: vec('fi'),
    po: [sample(lo.po[0], hi.po[0], center?.po[0], s), sample(lo.po[1], hi.po[1], center?.po[1], s)],
  };
  results.push({ p, ...evaluate(p) });
}
for (const r of results.toSorted((a, b) => a.score - b.score).slice(0, 8)) {
  console.log(r.score.toFixed(2), r.text);
  console.log(`  ${JSON.stringify(r.p, (_, v: unknown) => (typeof v === 'number' ? Number(v.toFixed(3)) : v))}`);
}
const print = process.env['PRINT'];
if (print) {
  const p: P = JSON.parse(print);
  console.log(changes(p));
  console.log(evaluate(p).text);
}
