// Measures the paws of the polar bear pianist in the lift from the rest to the keys: the deepest
// point of each paw in the closed trunk and legs, at steps of 0.05 s of wall time from the press
// of play. Usage: [SET=<changes>] node docs/research/2026-10-25-timpani-piano-rest/pian-lift.ts [demo prefix]
import { Vector3 } from 'three';
import { setHolds } from '../../../tools/hold-sets.ts';
if (process.env.SET) setHolds(process.env.SET);
import { patchedDemos } from '../../../tools/patch-demos.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { closedDepth, closedPart, posedPart } from '../../../src/pose/test-clearance.ts';
import { posedAt, posedPoint } from '../../../src/pose/test-kinematics.ts';
import { PLAYING, firstPlayers, sceneOf } from '../../../src/pose/test-scene.ts';

const LAP = ['hips', 'spine', 'chest', 'thighL', 'thighR', 'shinL', 'shinR'] as const satisfies readonly BoneName[];
const prefix = process.argv[2] ?? 'bach-bwv1047';
for (const demo of await patchedDemos()) {
  if (!demo.file.startsWith(prefix)) continue;
  const scene = sceneOf(demo.bytes);
  if (!scene.score.seats.some((seat) => seat.section === 'piano')) continue;
  const [piano] = firstPlayers(scene, ['piano'] as const);
  if (!piano) continue;
  const length = countInAt(scene.plan.beats, 0).lengthSec;
  const worst = { L: [0, 0], R: [0, 0] };
  for (let w = 0; w <= length + 0.5; w += 0.05) {
    const posed = posedAt(scene, piano, -length + w, w, PLAYING);
    const body = closedPart(posed, LAP, 4);
    for (const s of ['L', 'R'] as const) {
      const paw = posedPart(posed, [`hand${s}`, `fingers${s}`]);
      const depth = closedDepth(paw.triangles.flatMap((t) => [t.a, t.b, t.c]), body).depth;
      const palm = new Vector3(...posedPoint(posed, `hand${s}`, posed.model.body[`palm${s}`]));
      if (depth > (worst[s][0] ?? 0)) worst[s] = [depth, w];
      if (process.env.ROWS) console.log(`${w.toFixed(2)} ${s} depth ${(depth * 100).toFixed(1)} cm palm y ${palm.y.toFixed(3)} z ${palm.z.toFixed(3)}`);
    }
  }
  console.log(`${demo.file}: count-in ${length.toFixed(2)} s; deepest paw L ${((worst.L[0] ?? 0) * 100).toFixed(1)} cm at wall ${(worst.L[1] ?? 0).toFixed(2)} s, R ${((worst.R[0] ?? 0) * 100).toFixed(1)} cm at ${(worst.R[1] ?? 0).toFixed(2)} s`);
}
