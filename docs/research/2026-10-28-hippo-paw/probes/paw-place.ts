// Prints the right wrist and the right paw middle of the hippo bassist, in model axes, at song
// times of a demo, and the place and facing of the player.
// Usage: node docs/research/2026-10-28-hippo-paw/probes/paw-place.ts <demo> <from> <to> <step>
import { Quaternion, Vector3 } from 'three';

import { roleBodies } from '../../../../tools/fold-probe.ts';
import { boneIndex } from '../../../../src/models/rig.ts';
import { countInAt } from '../../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, demoSceneOf } from '../../../../src/pose/test-scene.ts';

const [demo = 'boulanger-matin.mid', from = '20', to = '60', step = '0.5'] = process.argv.slice(2);
const scene = await demoSceneOf(demo);
const [body] = roleBodies({ kind: 'player', instrument: 'contrabass', species: ['hippo'] }, scene);
if (!body || body.index === null) throw new Error('no hippo');
const place = scene.layout.players[body.index];
console.log(JSON.stringify({ index: body.index, position: place?.position, facing: place?.facing }));
const sk = body.model.skeleton;
const n = sk.positions.length;
const rot = Array.from({ length: n }, () => new Quaternion());
const pl = Array.from({ length: n }, () => new Vector3());
const local = new Quaternion();
const off = new Vector3();
const audible = allAudible(scene.score);
const buffer = createScenePose(scene.plan);
const start = -countInAt(scene.plan.beats, 0).lengthSec;
for (let t = Number(from); t <= Number(to) + 1e-9; t += Number(step)) {
  const frame = poseAt(scene.plan, t, 10 + t - start, PLAYING, audible, buffer);
  const pose = frame.players[body.index];
  if (!pose) continue;
  for (let i = 0; i < n; i++) {
    local.fromArray(pose.rotations, i * 4);
    pl[i]?.fromArray(sk.positions[i] ?? [0, 0, 0]);
    const p = sk.parents[i] ?? -1;
    if (p < 0 || p >= i) rot[i]?.copy(local);
    else {
      pl[i]?.sub(off.fromArray(sk.positions[p] ?? [0, 0, 0])).applyQuaternion(rot[p] ?? local).add(pl[p] ?? off);
      rot[i]?.multiplyQuaternions(rot[p] ?? local, local);
    }
  }
  const w = pl[boneIndex('handR')] ?? off;
  const f = pl[boneIndex('fingersR')] ?? off;
  const root = pose.offsets?.root ?? [0, 0, 0];
  console.log(`${t.toFixed(2)} wrist ${w.toArray().map((x) => x.toFixed(3)).join(',')} fingers ${f.toArray().map((x) => x.toFixed(3)).join(',')} root ${root}`);
}
