/**
 * Dumps the middle of the closed right paw in the axes of the right hand (y, z), its radius and
 * angle around the wrist, the paw turn of the retarget, and the finger curl, for one species of
 * the violinist sweep, by scene and set.
 *
 * Usage: node docs/research/2026-10-17-grip-all/paw-polar.ts <species> [--step <n>] [--turn <deg>] [--set <changes>]
 */
import { Quaternion, Vector3 } from 'three';
import { boneIndex } from '../../../src/models/rig.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import type { TestScene } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES, soloistScene } from '../../../src/pose/test-sweep-roles.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { rightPaw, volumeMiddle } from '../../../tools/bow-grip.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { applyGrips } from './grip-set.ts';

const args = process.argv.slice(2);
console.log('grips', applyGrips(process.argv.slice(2)).join(' ') || 'tree');
const species = args[0] as SpeciesId;
const pick = (flag: string): string[] =>
  args.flatMap((arg, i) => (args[i - 1] === flag ? [arg] : []));
const step = Number(pick('--step')[0] ?? 6);
const turnDeg = Number(pick('--turn')[0] ?? 50);
const changes = pick('--set');
if (changes.length > 0) {
  setHolds(changes.join(';'));
}
const scenes: { id: string; scene: TestScene }[] = [
  { id: 'solo', scene: soloistScene('violinist', species) },
];
for (const d of ['mozart-k525', 'bach-bwv1050', 'beethoven-8', 'boulanger-matin']) {
  scenes.push({ id: d, scene: sceneOf((await patchedDemo(`${d}.mid`)).bytes) });
}
const rows: string[] = [];
for (const { id, scene } of scenes) {
  for (const player of SWEEP_ROLES.violinist.players(scene)) {
    const index = Number(/(\d+)/.exec(player.name)?.[1] ?? -1);
    if (scene.layout.players[index]?.cast.species !== species) {
      continue;
    }
    for (const set of SWEEP_ROLES.violinist.sampleSets(scene)) {
      let k = 0;
      const ys: number[] = [];
      const zs: number[] = [];
      const rs: number[] = [];
      const as: number[] = [];
      const curls: number[] = [];
      const ns: number[] = [];
      const a = (turnDeg * Math.PI) / 180;
      for (const sample of set.samples) {
        if (set.name === 'play' && k++ % step !== 0) {
          continue;
        }
        const pose = player.poseAt(sample);
        const posed = poseSkeleton(player.model, pose);
        const hand = posed.frames[boneIndex('handR')]!;
        const m = volumeMiddle(rightPaw(posed))
          .sub(hand.position)
          .applyQuaternion(new Quaternion().copy(hand.rotation).invert());
        ys.push(m.y);
        zs.push(m.z);
        rs.push(Math.hypot(m.y, m.z));
        as.push((Math.atan2(-m.z, -m.y) * 180) / Math.PI);
        ns.push(m.y * Math.cos(a) + m.z * Math.sin(a));
        const f = boneIndex('fingersR');
        const cz = pose.rotations[f * 4 + 2] ?? 0;
        const cw = pose.rotations[f * 4 + 3] ?? 1;
        curls.push((2 * Math.atan2(cz, cw) * 180) / Math.PI);
      }
      const r = (v: number[], s = 100, d = 1): string =>
        `${(Math.min(...v) * s).toFixed(d)}..${(Math.max(...v) * s).toFixed(d)}`;
      rows.push(
        `${id.padEnd(16)} ${set.name.padEnd(5)} n=${String(ys.length).padStart(3)} y ${r(ys)} z ${r(zs)} R ${r(rs)} ang ${r(as, 1, 0)} curl ${r(curls, 1, 0)} n${turnDeg} ${r(ns)}`,
      );
    }
  }
}
console.log(rows.join('\n'));
