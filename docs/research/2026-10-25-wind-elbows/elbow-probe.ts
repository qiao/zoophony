// Measures the place of each elbow of a wind player from its shoulder joint, in the axes of the
// chest, over the samples of each set (diagnosis only). Usage, from the root of the tree:
// node docs/research/2026-10-25-wind-elbows/elbow-probe.ts [<set changes> or ''] [<role,...>]
//
// "Drop" is the height of the shoulder joint above the elbow, in cm. "Angle" is the angle of the
// upper arm below the level, in degrees: 90 hangs straight down, 0 is level with the shoulder.
// "Out" is the side move of the elbow away from the body, and "Forward" its move to the front.
import { Quaternion, Vector3 } from 'three';

import { setHolds } from '../../../tools/hold-sets.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';

const changes = process.argv[2];
if (changes) {
  console.log(setHolds(changes).text);
}
const ROLES = [
  ['oboist', 'mouse', 'oboe'],
  ['clarinetist', 'wolf', 'clarinet'],
  ['bassoonist', 'beaver', 'bassoon'],
  ['trombonist', 'panda', 'trombone'],
] as const;
const SAMPLES = 24;
const only = process.argv[3];
const demos = await probeDemos();
const fmt = (v: number): string => v.toFixed(1);
const med = (v: number[]): number => v.toSorted((a, b) => a - b)[Math.floor(v.length / 2)] ?? NaN;
const rows: string[] = [];
for (const [role, species, instrument] of ROLES) {
  if (only && !only.split(',').includes(role)) {
    continue;
  }
  const sweep = SWEEP_ROLES[role as keyof typeof SWEEP_ROLES];
  const demo = demos.find((d) => sweep.hasRole(scoreOf(d.bytes)));
  if (!demo) {
    continue;
  }
  const scene = sceneOf(demo.bytes);
  const index = scene.layout.players.findIndex(
    (p) => p.cast.species === species && p.cast.instrument === instrument,
  );
  const place = scene.layout.players[index];
  if (!place) {
    continue;
  }
  const model = scene.models.get(
    place.cast.species,
    place.cast.instrument,
    place.cast.kettles,
    place.cast.support,
  );
  for (const set of sweep.sampleSets(scene)) {
    const all = [...set.samples];
    const step = Math.max(1, Math.floor(all.length / SAMPLES));
    const samples = all.filter((_, i) => i % step === 0).slice(0, SAMPLES);
    for (const side of ['L', 'R'] as const) {
      const s = { drop: [] as number[], angle: [] as number[], out: [] as number[], fwd: [] as number[] };
      for (const sample of samples) {
        const pose = poseAt(
          scene.plan,
          sample[0],
          sample[1],
          sample[2],
          allAudible(scene.score),
          createScenePose(scene.plan),
        ).players[index];
        if (!pose) {
          continue;
        }
        const posed = poseSkeleton(model, pose);
        const chest = posed.frames[boneIndex('chest')]?.rotation ?? new Quaternion();
        const inv = chest.clone().invert();
        const joint = posed.frames[boneIndex(`upperArm${side}`)]?.position ?? new Vector3();
        const elbow = posed.frames[boneIndex(`forearm${side}`)]?.position ?? new Vector3();
        const d = elbow.clone().sub(joint).applyQuaternion(inv);
        s.drop.push(-d.y * 100);
        s.angle.push((Math.asin(-d.y / d.length()) * 180) / Math.PI);
        s.out.push((side === 'L' ? -d.x : d.x) * 100);
        s.fwd.push(-d.z * 100);
      }
      rows.push(
        `| ${role} | ${set.name} | ${side} | ${s.drop.length} | ${fmt(med(s.drop))} | ${fmt(med(s.angle))} | ${fmt(Math.min(...s.angle))} | ${fmt(med(s.out))} | ${fmt(med(s.fwd))} |`,
      );
    }
  }
}
console.log('Medians over the samples of each set, in the axes of the chest.');
console.log(
  '| Role | Set | Arm | Samples | Drop (cm) | Angle below the level (°) | Smallest angle (°) | Out (cm) | Forward (cm) |',
);
console.log('|---|---|---|---:|---:|---:|---:|---:|---:|');
for (const r of rows) {
  console.log(r);
}
