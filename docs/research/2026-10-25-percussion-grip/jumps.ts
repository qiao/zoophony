// Prints the hand of a mallet paw at song times: the forearm to the shaft, the side bend, and the
// palm part, and counts the turns of the paw over 30 degrees in one step.
// Usage, from the root of the tree: [QUIET=1] [SET=<changes>] node docs/research/2026-10-25-percussion-grip/jumps.ts <demo prefix> <species> <instrument> <side> <from> <to> <step>
import { Vector3 } from 'three';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
if (process.env.SET) setHolds(process.env.SET);
import { boneIndex } from '../../../src/models/rig.ts';
import { posedPiecePoint, poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { allAudible, sceneOf } from '../../../src/pose/test-scene.ts';

const [demoName, species, instrument, side, from, to, step] = process.argv.slice(2);
const demo = (await probeDemos()).find((d) => d.file.startsWith(demoName ?? ''));
if (!demo) throw new Error('no demo');
const scene = sceneOf(demo.bytes);
const index = scene.layout.players.findIndex(
  (p) => p.cast.species === species && p.cast.instrument === instrument,
);
const place = scene.layout.players[index];
if (!place) throw new Error('no player');
const model = scene.models.get(place.cast.species, place.cast.instrument, place.cast.kettles, place.cast.support);
const buffer = createScenePose(scene.plan);
const audible = allAudible(scene.score);
const bone = side === 'L' ? 'malletL' : 'malletR';
let last: import('three').Quaternion | null = null;
let jumps = 0;
let steps = 0;
let worst = 0;
let minBeta = 180;
let minBend = 180;
const betas: number[] = [];
const quiet = process.env.QUIET === '1';
for (let t = Number(from); t <= Number(to) + 1e-9; t += Number(step)) {
  const pose = poseAt(scene.plan, t, t + 100, { playing: true, changedAtWall: 0, previous: null }, audible, buffer).players[index];
  if (!pose) continue;
  const posed = poseSkeleton(model, pose);
  const hand = posed.frames[boneIndex(`hand${side}`)];
  const elbow = posed.frames[boneIndex(`forearm${side}`)];
  if (!hand || !elbow) continue;
  if (last) {
    const angle = (hand.rotation.angleTo(last) * 180) / Math.PI;
    worst = Math.max(worst, angle);
    if (angle > 30) jumps++;
  }
  steps++;
  last = hand.rotation.clone();
  const fore = hand.position.clone().sub(elbow.position).normalize();
  const shoulderFrame = posed.frames[boneIndex(`upperArm${side}`)];
  const upperDir = elbow.position.clone().sub(shoulderFrame?.position ?? elbow.position).normalize();
  const bend = (upperDir.angleTo(fore) * 180) / Math.PI;
  minBend = Math.min(minBend, bend);
  const a = new Vector3(...posedPiecePoint(posed, { bone, at: [0, 0, 0] }));
  const b = new Vector3(...posedPiecePoint(posed, { bone, at: [0.1, 0, 0] }));
  const axis = b.sub(a).normalize();
  const beta0 = (fore.angleTo(axis) * 180) / Math.PI;
  minBeta = Math.min(minBeta, beta0);
  betas.push(beta0);
  if (quiet) continue;
  const inHand = fore.clone().applyQuaternion(hand.rotation.clone().invert());
  const dev = (Math.atan2(-inHand.z, -inHand.y) * 180) / Math.PI;
  console.log(
    `${t.toFixed(2)} beta ${((fore.angleTo(axis) * 180) / Math.PI).toFixed(1)} side ${dev.toFixed(0)} palm ${(inHand.x * (side === 'L' ? 1 : -1)).toFixed(2)} axis ${axis.toArray().map((v) => v.toFixed(2)).join(',')} fore ${fore.toArray().map((v) => v.toFixed(2)).join(',')}`,
  );
}

const under = betas.filter((x) => x < 30).length;
console.log(`steps ${steps}, turns over 30 deg in one step ${jumps}, largest step ${worst.toFixed(0)} deg, forearm to shaft min ${minBeta.toFixed(0)}, under 30 deg ${under}, elbow bend min ${minBend.toFixed(0)}`);
