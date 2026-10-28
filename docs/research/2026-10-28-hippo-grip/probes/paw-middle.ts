// Gives the middle of the closed right paw of the hippo bassist in the axes of the hand of the
// player, from the wrist, over the samples of the bassist sweep of four demos, and the bow grip
// (`SpeciesParams.bowGrip.at`, in head heights) that puts the grip on the stick at that middle.
// Run it with the hold of the round: the hand turns on the stick, so the paw keeps one turn on
// the hand, and the middle stays near one point.
// Usage: node docs/research/2026-10-28-hippo-grip/probes/paw-middle.ts [--step <n>] [--set <changes>]
//   [--grip hippo:x,y,z,deg]
import { Quaternion, Vector3 } from 'three';

import { boneIndex } from '../../../../src/models/rig.ts';
import { SPECIES } from '../../../../src/models/species.ts';
import { posedPiecePoint, poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../../src/pose/test-sweep-roles.ts';
import { rightPaw, volumeMiddle } from '../../../../tools/bow-grip.ts';
import { setHolds } from '../../../../tools/hold-sets.ts';
import { patchedDemo } from '../../../../tools/patch-demos.ts';
import { applyGrips } from '../../2026-10-17-grip-all/grip-set.ts';

const args = process.argv.slice(2);
const pick = (flag: string): string[] => args.flatMap((a, i) => (args[i - 1] === flag ? [a] : []));
const step = Number(pick('--step')[0] ?? 3);
const sets = pick('--set');
console.log('grips', applyGrips(args).join(' ') || 'tree', 'sets', sets.join(';') || 'none');
if (sets.length > 0) setHolds(sets.join(';'));

const middles: Vector3[] = [];
const grips: Vector3[] = [];
let headHeight = 0;
for (const d of ['mozart-k525', 'bach-bwv1050', 'beethoven-8', 'boulanger-matin']) {
  const scene = sceneOf((await patchedDemo(`${d}.mid`)).bytes);
  if (!SWEEP_ROLES.bassist.hasRole(scene.score)) continue;
  for (const player of SWEEP_ROLES.bassist.players(scene)) {
    const index = Number(/(\d+)/.exec(player.name)?.[1] ?? -1);
    if (scene.layout.players[index]?.cast.species !== 'hippo') continue;
    headHeight = player.model.body.headHeight;
    for (const set of SWEEP_ROLES.bassist.sampleSets(scene)) {
      let k = 0;
      for (const sample of set.samples) {
        if (set.name === 'play' && k++ % step !== 0) continue;
        const posed = poseSkeleton(player.model, player.poseAt(sample));
        const frame = posed.frames[boneIndex('handR')];
        if (!frame) continue;
        const back = frame.rotation.clone().invert();
        const middle = volumeMiddle(rightPaw(posed)).sub(frame.position).applyQuaternion(back);
        const grip = new Vector3(...posedPiecePoint(posed, { bone: 'bow', at: [0, 0, 0] }))
          .sub(frame.position)
          .applyQuaternion(back);
        middles.push(middle);
        grips.push(grip);
      }
    }
  }
}

const mean = (v: Vector3[]): Vector3 =>
  v.reduce((a, b) => a.add(b), new Vector3()).divideScalar(Math.max(1, v.length));
const m = mean(middles);
const g = mean(grips);
const spread = middles.map((p) => p.distanceTo(m) * 100).toSorted((a, b) => a - b);
const pct = (q: number): number => spread[Math.round(q * (spread.length - 1))] ?? 0;
const cm = (v: Vector3): string => v.toArray().map((x) => (x * 100).toFixed(2)).join(', ');
console.log(`samples ${middles.length}, head height ${headHeight.toFixed(4)} m`);
console.log(`paw middle from the wrist, hand axes: ${cm(m)} cm`);
console.log(`spread of the middle: p50 ${pct(0.5).toFixed(2)} p95 ${pct(0.95).toFixed(2)} max ${pct(1).toFixed(2)} cm`);
console.log(`grip on the stick from the wrist: ${cm(g)} cm`);
const at = SPECIES.hippo.bowGrip?.at ?? [0, 0, 0];
const shift = m.clone().sub(g).divideScalar(headHeight);
const next = new Vector3(...at).add(shift);
console.log(`bowGrip.at ${at.map((x) => x.toFixed(4)).join(', ')} -> ${next.toArray().map((x) => x.toFixed(4)).join(', ')}`);
void Quaternion;
