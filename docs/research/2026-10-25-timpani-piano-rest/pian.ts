// Measures the rest pose of the polar bear pianist: for each paw, the palm point, the top of the
// thigh skin under it, the gap of the paw to the lap, the depth of the paw in the legs, the elbow
// bend, and the place of the palm against the hip and the knee.
// Usage: [SET=<changes>] node docs/research/2026-10-25-timpani-piano-rest/pian.ts [demo prefix]
import { Ray, Vector3 } from 'three';
import { setHolds } from '../../../tools/hold-sets.ts';
if (process.env.SET) setHolds(process.env.SET);
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { closedDepth, closedPart, partDistance, posedPart } from '../../../src/pose/test-clearance.ts';
import { posedAt, posedPoint } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED, firstPlayers, sceneOf } from '../../../src/pose/test-scene.ts';

const LAP = ['hips', 'spine', 'chest', 'thighL', 'thighR', 'shinL', 'shinR'] as const satisfies readonly BoneName[];
const f = (v: number, n = 1): string => v.toFixed(n);
const prefix = process.argv[2] ?? '';
for (const demo of await patchedDemos()) {
  if (!demo.file.startsWith(prefix)) continue;
  const scene = sceneOf(demo.bytes);
  if (!scene.score.seats.some((seat) => seat.section === 'piano')) continue;
  const [piano] = firstPlayers(scene, ['piano'] as const);
  if (!piano) continue;
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const posed = posedAt(scene, piano, start, 10, NOT_STARTED);
  const at = (bone: BoneName): Vector3 => posed.frames[boneIndex(bone)]?.position.clone() ?? new Vector3();
  const lap = posedPart(posed, LAP);
  const legs = closedPart(posed, LAP, 4);
  const rows: string[] = [];
  for (const s of ['L', 'R'] as const) {
    const palm = new Vector3(...posedPoint(posed, `hand${s}`, posed.model.body[`palm${s}`]));
    const ray = new Ray(new Vector3(palm.x, palm.y + 1, palm.z), new Vector3(0, -1, 0));
    let top = -Infinity;
    const hit = new Vector3();
    for (const t of lap.triangles) {
      if (ray.intersectTriangle(t.a, t.b, t.c, false, hit)) top = Math.max(top, hit.y);
    }
    const paw = posedPart(posed, [`hand${s}`, `fingers${s}`]);
    const gap = partDistance(paw, lap, 0.5);
    const depth = closedDepth(paw.triangles.flatMap((t) => [t.a, t.b, t.c]), legs).depth;
    const hip = at(`thigh${s}`);
    const knee = at(`shin${s}`);
    const along = palm.clone().sub(hip).dot(knee.clone().sub(hip)) / knee.clone().sub(hip).lengthSq();
    const shoulder = at(`upperArm${s}`);
    const elbow = at(`forearm${s}`);
    const wrist = at(`hand${s}`);
    const bend = (elbow.clone().sub(shoulder).angleTo(wrist.clone().sub(elbow)) * 180) / Math.PI;
    rows.push(
      `${s}: palm ${palm.toArray().map((v) => f(v, 3)).join(',')} above thigh top ${f((palm.y - top) * 100)} cm, paw gap to lap ${f(gap * 100)} cm, paw depth in lap ${f(depth * 100)} cm, along hip-knee ${f(along, 2)}, elbow bend ${f(bend)}°`,
    );
  }
  console.log(`${demo.file}: H ${f(posed.model.body.headHeight, 3)}, hips y ${f(at('hips').y, 3)}, knee L ${at('shinL').toArray().map((v) => f(v, 3)).join(',')}`);
  for (const r of rows) console.log(`  ${r}`);
}
