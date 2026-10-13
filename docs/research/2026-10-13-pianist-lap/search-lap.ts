/**
 * Searches the rest hold of the pianist at random (the report `2026-10-13-pianist-lap.md`,
 * section 4). Each try sets the rest lean and the head lift, the place of each palm in meters,
 * the side of the palm, the fingers, and the elbow direction, mirrored for the right paw. It poses
 * the pianist of the Bach demo at rest and measures the depth of each arm part in the closed body
 * (cm), the gap of each paw to the body (cm), the palm, the angle of the upper arm in the back
 * view, and the elbow. The score adds the depth over 0.5 cm, the gap over 0.8 cm, 0.1 for each
 * degree of the upper arm over 30°, and `YW` (10 by default) times the height of the palm over
 * 0.55 m. It prints the 8 tries with the lowest score. Run from the repository root:
 * `node docs/research/2026-10-13-pianist-lap/search-lap.ts <tries> [seed] [center JSON]`.
 * With a center, the tries are near it and come nearer with each try. `LO` and `HI` give the
 * ranges as JSON, and `PRINT` prints the `--set` text of one JSON try and its measures.
 */
import { Vector3 } from 'three';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { lapPoint } from '../../../src/pose/lap.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { closedDepth, closedPart, partDistance, posedPart } from '../../../src/pose/test-clearance.ts';
import { posedAt, posedPoint } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED, firstPlayers, sceneOf } from '../../../src/pose/test-scene.ts';
const BODY = ['hips','spine','chest','neck','head','jaw','eyeL','eyeR','earL','earR','tail1','tail2','shoulderL','shoulderR','thighL','thighR','shinL','shinR','footL','footR'] as const;
const evals = Number(process.argv[2] ?? 100);
let seed = Number(process.argv[3] ?? 1);
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
type P = { lean: number; x: number; y: number; z: number; pa: [number, number]; fi: [number, number]; po: [number, number] };
const lo: P = JSON.parse(process.env["LO"] ?? "{\"lean\":6,\"x\":-0.27,\"y\":0.5,\"z\":-0.66,\"pa\":[0.2,-0.6],\"fi\":[0.2,-0.3],\"po\":[-0.6,-0.6]}");
const hi: P = JSON.parse(process.env["HI"] ?? "{\"lean\":9,\"x\":-0.15,\"y\":0.72,\"z\":-0.5,\"pa\":[1,0.1],\"fi\":[1.2,0.4],\"po\":[0.6,0.6]}");
const center: P | null = process.argv[4] ? JSON.parse(process.argv[4]) : null;
const demo = (await patchedDemos()).find((d) => d.file.startsWith(process.env['DEMO'] ?? 'bach'))!;
const scene0 = sceneOf(demo.bytes);
const [p0] = firstPlayers(scene0, ['piano'] as const);
const model = p0!.model;
const h = model.body.headHeight;
const baseL = new Vector3(...lapPoint(model, 'L', { along: 1, offset: [0, 0, 0] }));
const baseR = new Vector3(...lapPoint(model, 'R', { along: 1, offset: [0, 0, 0] }));
const v3 = (a: number[]) => a.map((v) => v.toFixed(3)).join(',');
function changes(p: P): string {
  const offL = new Vector3(p.x, p.y, p.z).sub(baseL).divideScalar(h);
  const offR = new Vector3(-p.x, p.y, p.z).sub(baseR).divideScalar(h);
  return [
    `piano.restLean=${p.lean.toFixed(2)}deg`, `piano.restHeadLift=${p.lean.toFixed(2)}deg`,
    'piano.restL.lap.along=1', 'piano.restR.lap.along=1',
    `piano.restL.lap.offset=${v3(offL.toArray())}`, `piano.restR.lap.offset=${v3(offR.toArray())}`,
    `piano.restL.palm=${v3([p.pa[0], p.pa[1], 1])}`, `piano.restR.palm=${v3([-p.pa[0], p.pa[1], 1])}`,
    `piano.restL.fingers=${v3([p.fi[0], -1, p.fi[1]])}`, `piano.restR.fingers=${v3([-p.fi[0], -1, p.fi[1]])}`,
    `piano.restL.pole=${v3([-1, p.po[0], p.po[1]])}`, `piano.restR.pole=${v3([1, p.po[0], p.po[1]])}`,
  ].join(';');
}
function evaluate(p: P) {
  const c = setHolds(changes(p));
  try {
    const scene = sceneOf(demo.bytes);
    const [piano] = firstPlayers(scene, ['piano'] as const);
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    const posed = posedAt(scene, piano!, start, 10, NOT_STARTED);
    const surface = closedPart(posed, BODY, 2);
    const body = posedPart(posed, BODY);
    const depth = (bones: readonly BoneName[]) => closedDepth(posedPart(posed, bones).triangles.flatMap((t) => [t.a, t.b, t.c]), surface).depth * 100;
    let worst = 0, gapMax = 0, angleMax = 0;
    const parts: string[] = [];
    for (const s of ['L', 'R'] as const) {
      const d = [depth([`hand${s}`]), depth([`fingers${s}`]), depth([`forearm${s}`]), depth([`upperArm${s}`])];
      const gap = partDistance(posedPart(posed, [`hand${s}`, `fingers${s}`]), body, 0.3) * 100;
      const palm = posedPoint(posed, `hand${s}`, posed.model.body[`palm${s}`]);
      worst = Math.max(worst, ...d); gapMax = Math.max(gapMax, gap);
      const at = (b: BoneName) => posed.frames[boneIndex(b)]!.position;
      const arm = at(`forearm${s}`).clone().sub(at(`upperArm${s}`));
      const sign = s === 'L' ? -1 : 1;
      const angle = Math.atan2(sign * arm.x, -arm.y) * 57.3;
      angleMax = Math.max(angleMax, angle);
      parts.push(`${s} d ${d.map((v) => v.toFixed(1)).join('/')} g ${gap.toFixed(1)} x ${palm[0].toFixed(2)} y ${palm[1].toFixed(2)} arm ${angle.toFixed(0)} elbow ${v3(at(`forearm${s}`).toArray())}`);
    }
    const score = Math.max(0, worst - 0.5) + Math.max(0, gapMax - 0.8) + Math.max(0, angleMax - 30) * 0.1 + Math.max(0, p.y - 0.55) * Number(process.env["YW"] ?? 10);
    return { score, text: parts.join(' | ') };
  } finally {
    c.undo();
  }
}
const sample = (a: number, b: number, c?: number, s = 1) =>
  c === undefined ? a + (b - a) * rand() : Math.min(b, Math.max(a, c + (b - a) * 0.15 * s * (rand() * 2 - 1)));
const results: { p: P; score: number; text: string }[] = [];
for (let i = 0; i < evals; i++) {
  const s = center ? 1 - 0.8 * (i / evals) : 1;
  const p: P = {
    lean: sample(lo.lean, hi.lean, center?.lean, s),
    x: sample(lo.x, hi.x, center?.x, s), y: sample(lo.y, hi.y, center?.y, s), z: sample(lo.z, hi.z, center?.z, s),
    pa: [sample(lo.pa[0], hi.pa[0], center?.pa[0], s), sample(lo.pa[1], hi.pa[1], center?.pa[1], s)],
    fi: [sample(lo.fi[0], hi.fi[0], center?.fi[0], s), sample(lo.fi[1], hi.fi[1], center?.fi[1], s)],
    po: [sample(lo.po[0], hi.po[0], center?.po[0], s), sample(lo.po[1], hi.po[1], center?.po[1], s)],
  };
  results.push({ p, ...evaluate(p) });
}
for (const r of results.toSorted((a, b) => a.score - b.score).slice(0, 8)) {
  console.log(r.score.toFixed(2), r.text);
  console.log('  ' + JSON.stringify(r.p, (_, v) => (typeof v === 'number' ? Number(v.toFixed(3)) : v)));
}
if (process.env['PRINT']) {
  const p: P = JSON.parse(process.env['PRINT']);
  console.log(changes(p));
  console.log(evaluate(p).text);
}
