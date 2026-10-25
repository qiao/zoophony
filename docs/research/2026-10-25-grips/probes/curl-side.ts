// Prints where the finger tips of the studio skin move in the hand frame of the player when the
// fingers curl, so that the side of the palm is a measure.
// Usage: node scratch/curl-side.ts <sweep role> <species> <instrument> <demo prefix>
import { Quaternion, Vector3 } from 'three';
import { probeDemos } from '../tools/probe-demos.ts';
import { boneIndex } from '../src/models/rig.ts';
import { posedPart } from '../src/pose/test-clearance.ts';
import { poseSkeleton } from '../src/pose/test-kinematics.ts';
import { createScenePose, poseAt } from '../src/pose/pose-at.ts';
import { allAudible, sceneOf } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
import { scoreOf } from '../src/score/test-score.ts';

const [role, species, instrument, demoName] = process.argv.slice(2);
const sweep = SWEEP_ROLES[role as keyof typeof SWEEP_ROLES];
const demos = await probeDemos();
const demo = demos.find((d) => d.file.startsWith(demoName ?? '') && sweep.hasRole(scoreOf(d.bytes)));
if (!demo) throw new Error('no demo');
const scene = sceneOf(demo.bytes);
const index = scene.layout.players.findIndex(
  (p) => p.cast.species === species && p.cast.instrument === instrument,
);
const place = scene.layout.players[index];
if (!place) throw new Error('no player');
const model = scene.models.get(place.cast.species, place.cast.instrument, place.cast.kettles, place.cast.support);
const set = sweep.sampleSets(scene).find((s) => s.name === 'play');
const sample = set ? [...set.samples][0] : undefined;
if (!sample) throw new Error('no sample');
const pose = poseAt(scene.plan, sample[0], sample[1], sample[2], allAudible(scene.score), createScenePose(scene.plan)).players[index];
if (!pose) throw new Error('no pose');
for (const side of ['L', 'R'] as const) {
  const fingers = boneIndex(`fingers${side}`);
  const tipsAt = (curl: number): Vector3 => {
    const rotations = Float32Array.from(pose.rotations);
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), side === 'L' ? curl : -curl);
    rotations.set([q.x, q.y, q.z, q.w], fingers * 4);
    const posed = poseSkeleton(model, { ...pose, rotations });
    const hand = posed.frames[boneIndex(`hand${side}`)];
    if (!hand) throw new Error('no hand');
    const inv = hand.rotation.clone().invert();
    const part = posedPart(posed, [`hand${side}`, `fingers${side}`]);
    const corners = part.triangles.flatMap((t) => [t.a, t.b, t.c]);
    const sorted = corners.toSorted((a, b) => b.distanceTo(hand.position) - a.distanceTo(hand.position));
    const tips = sorted.slice(0, Math.round(sorted.length * 0.15));
    return tips
      .reduce((a, b) => a.add(b), new Vector3())
      .divideScalar(tips.length)
      .sub(hand.position)
      .applyQuaternion(inv);
  };
  const open = tipsAt(0);
  const closed = tipsAt(1.2);
  const move = closed.clone().sub(open);
  console.log(
    `${side}: tips at curl 0 (${open.toArray().map((v) => (v * 100).toFixed(1)).join(', ')}) cm, move at curl 1.2 rad (${move.toArray().map((v) => (v * 100).toFixed(1)).join(', ')}) cm in the hand frame`,
  );
}
