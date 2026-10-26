// Prints the shaft of each mallet in the frame of its posed paw: s along the line from the wrist
// to the finger tips, u toward the palm, v toward the thumb, with the origin at the middle of
// the closed paw. Also prints the extent of the paw skin in that frame.
// Usage, from the root of the tree: node docs/research/2026-10-25-percussion-grip/shaft-frame.ts <sweep role> <species> <instrument> [sets] [every] [set changes]
import { Vector3 } from 'three';
import { volumeMiddle } from '../../../tools/bow-grip.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { MALLET_BUTT } from '../../../src/models/instruments/percussion.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { closeSurface, openLoops, posedPart } from '../../../src/pose/test-clearance.ts';
import { posedPiecePoint, poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';
import { scoreOf } from '../../../src/score/test-score.ts';

const [role, species, instrument, setsArg, everyArg, changes] = process.argv.slice(2);
if (changes) console.log(setHolds(changes).text);
const sweep = SWEEP_ROLES[role as keyof typeof SWEEP_ROLES];
const demos = await probeDemos();
const demo = demos.find((d) => sweep.hasRole(scoreOf(d.bytes)));
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
const wanted = (setsArg ?? 'play,rest').split(',');
const every = Number(everyArg ?? 40);
const cm = (v: number): string => (100 * v).toFixed(1);
for (const set of sweep.sampleSets(scene)) {
  if (!wanted.includes(set.name)) continue;
  const samples = [...set.samples].filter((_, i) => i % every === 0).slice(0, Number(process.env.N ?? 3));
  for (const [song, wall, transport] of samples) {
    const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index];
    if (!pose) continue;
    const posed = poseSkeleton(model, pose);
    for (const side of ['L', 'R'] as const) {
      const bone = side === 'L' ? 'malletL' : 'malletR';
      const head = model.instrument.targets.find((t) => t.kind === 'mallet-head' && t.bone === bone);
      if (!head) continue;
      const part = posedPart(posed, [`hand${side}`, `fingers${side}`]);
      const closed = closeSurface(part.triangles, openLoops(part.triangles));
      const middle = volumeMiddle(closed);
      const hand = posed.frames[boneIndex(`hand${side}`)];
      if (!hand) continue;
      const corners = part.triangles.flatMap((t) => [t.a, t.b, t.c]);
      const sorted = corners.toSorted((a, b) => b.distanceTo(hand.position) - a.distanceTo(hand.position));
      const tips = sorted.slice(0, Math.round(sorted.length * 0.15));
      const tip = tips.reduce((a, b) => a.add(b), new Vector3()).divideScalar(tips.length);
      const u = new Vector3(side === 'L' ? 1 : -1, 0, 0).applyQuaternion(hand.rotation);
      const s = tip.clone().sub(hand.position).projectOnPlane(u).normalize();
      const v = side === 'L' ? new Vector3().crossVectors(u, s) : new Vector3().crossVectors(s, u);
      const frame = (p: Vector3): string => {
        const d = p.clone().sub(middle);
        return `${cm(d.dot(s))}, ${cm(d.dot(u))}, ${cm(d.dot(v))}`;
      };
      const dir = (p: Vector3): string => `${p.dot(s).toFixed(2)}, ${p.dot(u).toFixed(2)}, ${p.dot(v).toFixed(2)}`;
      const butt = new Vector3(...posedPiecePoint(posed, { bone, at: [-MALLET_BUTT, 0, 0] }));
      const grip = new Vector3(...posedPiecePoint(posed, { bone, at: [0, 0, 0] }));
      const end = new Vector3(...posedPiecePoint(posed, { bone, at: head.from }));
      const axis = end.clone().sub(butt).normalize();
      const k = middle.clone().sub(butt).dot(axis);
      const near = butt.clone().addScaledVector(axis, k);
      const ext = (w: Vector3): string => {
        const vals = corners.map((c) => c.clone().sub(middle).dot(w));
        return `${cm(Math.min(...vals))}..${cm(Math.max(...vals))}`;
      };
      const elbow = posed.frames[boneIndex(`forearm${side}`)]?.position ?? new Vector3();
      const fore = hand.position.clone().sub(elbow).normalize();
      const inHand = fore.clone().applyQuaternion(hand.rotation.clone().invert());
      const dev = (Math.atan2(-inHand.z, -inHand.y) * 180) / Math.PI;
      const beta = (fore.angleTo(axis) * 180) / Math.PI;
      console.log(
        `${set.name} ${song.toFixed(2)} ${side}: forearm to shaft ${beta.toFixed(0)}, side bend ${dev.toFixed(0)}, palm part of the forearm ${inHand.x.toFixed(2)}, shaft dir (s,u,v) (${dir(axis)})`,
      );
      if (process.env.FULL) console.log(
        `${set.name} ${song.toFixed(2)} ${side}: wrist (${frame(hand.position)}) tip (${frame(tip)}) | butt (${frame(butt)}) grip (${frame(grip)}) nearest (${frame(near)}) at ${cm(k)} from the butt, dir (${dir(axis)}) | skin s ${ext(s)} u ${ext(u)} v ${ext(v)}`,
      );
    }
  }
}
