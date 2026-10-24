// Prints the geometry of each paw against the tube in chest axes for one sample of a role.
// Usage: node scratch/geom.ts <species> <instrument> <demo prefix> <play|rest> [<set changes>]
import { Vector3 } from 'three';
import { probeDemos } from '../tools/probe-demos.ts';
import { setHolds } from '../tools/hold-sets.ts';
import { volumeMiddle } from '../tools/bow-grip.ts';
import { boneIndex } from '../src/models/rig.ts';
import { WOODWINDS } from '../src/models/instruments/woodwinds.ts';
import { closeSurface, openLoops, posedPart } from '../src/pose/test-clearance.ts';
import { posedPiecePoint, posedPoint, poseSkeleton } from '../src/pose/test-kinematics.ts';
import { createScenePose, poseAt } from '../src/pose/pose-at.ts';
import { allAudible, sceneOf, PLAYING, NOT_STARTED } from '../src/pose/test-scene.ts';
import { countInAt } from '../src/pose/count-in.ts';

const [species, instrument, demoName, mode, sets] = process.argv.slice(2);
if (sets) console.log(setHolds(sets).text);
const demos = await probeDemos();
const demo = demos.find((d) => d.file.startsWith(demoName));
const scene = sceneOf(demo.bytes);
const index = scene.layout.players.findIndex(
  (p) => p.cast.species === species && p.cast.instrument === instrument,
);
const place = scene.layout.players[index];
const model = scene.models.get(
  place.cast.species,
  place.cast.instrument,
  place.cast.kettles,
  place.cast.support,
);
const start = -countInAt(scene.plan.beats, 0).lengthSec;
const sample = mode === 'rest' ? [start, 10, NOT_STARTED] : [30, 10 + 30 - start, PLAYING];
const pose = poseAt(
  scene.plan,
  sample[0],
  sample[1],
  sample[2],
  allAudible(scene.score),
  createScenePose(scene.plan),
).players[index];
const posed = poseSkeleton(model, pose);
const chestQ = posed.frames[boneIndex('chest')].rotation.clone().invert();
const c = (v) => {
  const w = v.clone().applyQuaternion(chestQ);
  return `(${(w.x * 100).toFixed(1)}, ${(w.y * 100).toFixed(1)}, ${(-w.z * 100).toFixed(1)})`;
};
const grip = model.instrument.grips.palmR;
const len = (grip.at[0] / WOODWINDS[instrument].palmR) * WOODWINDS[instrument].length;
const t0 = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: [0, 0, 0] }));
const t1 = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: [len, 0, 0] }));
const ax = t1.clone().sub(t0).normalize();
const keysUp = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: [0, 1, 0] }))
  .sub(t0)
  .normalize();
console.log('chest axes: right, up, forward (cm or x100 for directions)');
console.log('tube dir', c(ax.clone().multiplyScalar(1)), 'keys dir', c(keysUp));
for (const side of ['L', 'R']) {
  const part = posedPart(posed, [`hand${side}`, `fingers${side}`]);
  const closed = closeSurface(part.triangles, openLoops(part.triangles));
  const mid = volumeMiddle(closed);
  const wrist = posed.frames[boneIndex(`hand${side}`)].position.clone();
  const corners = part.triangles.flatMap((t) => [t.a, t.b, t.c]);
  const sorted = corners.toSorted((a, b) => b.distanceTo(wrist) - a.distanceTo(wrist));
  const tips = sorted.slice(0, Math.round(sorted.length * 0.15));
  const tip = tips.reduce((a, b) => a.add(b), new Vector3()).divideScalar(tips.length);
  const handQ = posed.frames[boneIndex(`hand${side}`)].rotation;
  const palmN = new Vector3(side === 'L' ? -1 : 1, 0, 0).applyQuaternion(handQ);
  const pawDir = new Vector3(0, -1, 0).applyQuaternion(handQ);
  const palmPt = new Vector3(
    ...posedPoint(posed, `hand${side}`, side === 'L' ? model.body.palmL : model.body.palmR),
  );
  const g = side === 'L' ? model.instrument.grips.palmL : model.instrument.grips.palmR;
  const gripPt = new Vector3(...posedPiecePoint(posed, g));
  const near = (p) => t0.clone().addScaledVector(ax, p.clone().sub(t0).dot(ax));
  console.log(`--- ${side}: paw length ${(sorted[0].distanceTo(wrist) * 100).toFixed(1)} cm`);
  console.log(
    ' rel axis: wrist',
    c(wrist.clone().sub(near(wrist))),
    'mid',
    c(mid.clone().sub(near(mid))),
    'tip',
    c(tip.clone().sub(near(tip))),
  );
  console.log(
    ' rel axis: player palm pt',
    c(palmPt.clone().sub(near(palmPt))),
    'grip',
    c(gripPt.clone().sub(near(gripPt))),
  );
  console.log(' player fingers dir', c(pawDir.multiplyScalar(1)), 'player palm normal', c(palmN));
  console.log(' studio wrist->tip dir', c(tip.clone().sub(wrist).normalize()));
}
console.log('H', model.body.headHeight.toFixed(3));
for (const side of ['L', 'R']) {
  const part = posedPart(posed, [`hand${side}`, `fingers${side}`]);
  const handQ = posed.frames[boneIndex(`hand${side}`)].rotation;
  const n = new Vector3(1, 0, 0).applyQuaternion(handQ);
  const w = new Vector3(0, 0, 1).applyQuaternion(handQ);
  const ds = part.triangles.flatMap((t) => [t.a, t.b, t.c]).map((p) => p.dot(n));
  const ws = part.triangles.flatMap((t) => [t.a, t.b, t.c]).map((p) => p.dot(w));
  console.log(side, 'thickness along hand x', ((Math.max(...ds) - Math.min(...ds)) * 100).toFixed(1), 'width along hand z', ((Math.max(...ws) - Math.min(...ws)) * 100).toFixed(1));
}
for (const side of ['L', 'R']) {
  const elbow = posed.frames[boneIndex(`forearm${side}`)].position;
  const wrist = posed.frames[boneIndex(`hand${side}`)].position;
  const shoulderJ = posed.frames[boneIndex(`upperArm${side}`)].position;
  const fore = wrist.clone().sub(elbow).normalize();
  const handQ = posed.frames[boneIndex(`hand${side}`)].rotation;
  const inHand = fore.clone().applyQuaternion(handQ.clone().invert());
  const inPlane = Math.hypot(inHand.y, inHand.z);
  const fade = Math.min(1, Math.max(0, (inPlane - 0.2) / 0.3));
  const angle = Math.atan2(-inHand.z, -inHand.y) * fade * fade * (3 - 2 * fade);
  const lim = Math.min(70, Math.max(-70, (angle * 180) / Math.PI));
  console.log(side, 'forearm dir', c(fore), 'forearm-tube angle', ((Math.acos(Math.abs(fore.dot(ax))) * 180) / Math.PI).toFixed(0),
    'paw turn deg', lim.toFixed(0), side === 'R' ? `(applied ${Math.max(0, lim).toFixed(0)})` : '',
    'wrist from shoulder', c(wrist.clone().sub(shoulderJ)), 'elbow from shoulder', c(elbow.clone().sub(shoulderJ)));
}
{
  const P = (b) => posed.frames[boneIndex(b)].position;
  const ref = P('hips').clone();
  const r = (v) => c(v.clone().sub(ref));
  console.log('from hips joint: thighL', r(P('thighL')), 'kneeL', r(P('shinL')), 'kneeR', r(P('shinR')), 'footL', r(P('footL')));
  console.log(' mouthpiece', r(t0), 'bell end', r(t1), 'chest', r(P('chest')), 'shoulderL', r(P('upperArmL')));
  const thigh = posedPart(posed, ['thighL', 'thighR', 'hips']);
  let top = -1;
  let low = 9;
  for (const t of thigh.triangles) for (const p of [t.a, t.b, t.c]) { top = Math.max(top, p.y); low = Math.min(low, p.y); }
  const knee = posedPart(posed, ['thighR', 'shinR']);
  const chestInv = chestQ;
  for (const z of [6, 10, 14, 18, 22]) {
    let best = -99;
    let bx = 0;
    for (const t of knee.triangles) for (const p of [t.a, t.b, t.c]) {
      const q = p.clone().sub(ref).applyQuaternion(chestInv);
      if (Math.abs(-q.z * 100 - z) < 2 && q.y * 100 > best) { best = q.y * 100; bx = q.x * 100; }
    }
    console.log(` right leg top at fwd ${z}: y ${best.toFixed(1)} x ${bx.toFixed(1)}`);
  }
  console.log(' thigh skin low y from hips', ((low - ref.y) * 100).toFixed(1), 'seat', model.seat ?? '', JSON.stringify(place.seat ?? place.chair ?? {}).slice(0, 200));
  console.log(' thigh skin top y from hips', ((top - ref.y) * 100).toFixed(1), 'floor y from hips', ((0 - ref.y) * 100).toFixed(1));
}
