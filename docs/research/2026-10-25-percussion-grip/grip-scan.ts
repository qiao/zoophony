// Scans the lines of a shaft through a closed paw, in the frame of the hand of the player, with
// the fingers of the skin curled. For each curl and each angle of the shaft from the fingers
// toward the thumb, it gives the lines whose shaft goes through the closed paw with the finger
// tips on it. The frame: `s` along the fingers from the palm point (the middle of the wrist and
// the knuckle in the bind pose), `u` toward the palm, and the line passes the plane of the palm
// point at (s, u).
// Usage, from the root of the tree:
//   node docs/research/2026-10-25-percussion-grip/grip-scan.ts <sweep role> <species> <instrument>
//     <side> <set> [<curls in degrees, such as 60,90,110>] [<angles, such as 30,45,60>]
import { Triangle, Vector3 } from 'three';

import { volumeMiddle } from '../../../tools/bow-grip.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { closeSurface, closedDepth, openLoops, posedPart } from '../../../src/pose/test-clearance.ts';
import { posedPoint, poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';
import { scoreOf } from '../../../src/score/test-score.ts';

const [role, species, instrument, sideArg, setName, curlsArg, anglesArg] = process.argv.slice(2);
const side = sideArg === 'L' ? 'L' : 'R';
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
const set = sweep.sampleSets(scene).find((s) => s.name === (setName ?? 'rest'));
const sample = set ? [...set.samples][0] : undefined;
if (!sample) throw new Error('no sample');
const pose = poseAt(scene.plan, sample[0], sample[1], sample[2], allAudible(scene.score), createScenePose(scene.plan)).players[index];
if (!pose) throw new Error('no pose');
const RADIUS = 0.0055;
const bones = [`hand${side}`, `fingers${side}`] as const;

// The finger tips: the corners farthest from the wrist in the bind pose (as `pnpm wind-grip`).
const identity = new Float32Array(pose.rotations.length);
for (let i = 3; i < identity.length; i += 4) identity[i] = 1;
const bind = poseSkeleton(model, { ...pose, rotations: identity });
const bindWrist = new Vector3(...(model.skeleton.positions[boneIndex(`hand${side}`)] ?? [0, 0, 0]));
const bindCorners = posedPart(bind, [...bones]).triangles.flatMap((t: Triangle) => [t.a, t.b, t.c]);
const order = bindCorners
  .map((c, i) => [c.distanceTo(bindWrist), i] as const)
  .toSorted((x, y) => y[0] - x[0])
  .map(([, i]) => i)
  .slice(0, Math.round(bindCorners.length * 0.15));
const palmBind = side === 'L' ? model.body.palmL : model.body.palmR;
const h = model.body.headHeight;
console.log(`${demo.file} ${set?.name} ${sample[0].toFixed(2)} s, side ${side}, H ${h.toFixed(4)} m`);

const curls = (curlsArg ?? '60,90,110,130').split(',').map(Number);
const angles = (anglesArg ?? '30,45,60').split(',').map(Number);
for (const curl of curls) {
  const rotations = Float32Array.from(pose.rotations);
  const half = ((side === 'L' ? 1 : -1) * curl * Math.PI) / 360;
  rotations.set([0, 0, Math.sin(half), Math.cos(half)], boneIndex(`fingers${side}`) * 4);
  const posed = poseSkeleton(model, { ...pose, rotations });
  const part = posedPart(posed, [...bones]);
  const closed = closeSurface(part.triangles, openLoops(part.triangles));
  const corners = part.triangles.flatMap((t: Triangle) => [t.a, t.b, t.c]);
  const tips = order.flatMap((i) => (corners[i] ? [corners[i]] : []));
  const hand = posed.frames[boneIndex(`hand${side}`)];
  if (!hand) throw new Error('no hand');
  const fingers = new Vector3(0, -1, 0).applyQuaternion(hand.rotation);
  const palm = new Vector3(side === 'L' ? 1 : -1, 0, 0).applyQuaternion(hand.rotation);
  const thumb = new Vector3(0, 0, -1).applyQuaternion(hand.rotation);
  const p0 = new Vector3(...posedPoint(posed, `hand${side}`, palmBind));
  const middle = volumeMiddle(closed);
  const mid = middle.clone().sub(p0);
  console.log(
    `\ncurl ${curl}: paw middle at s ${(100 * mid.dot(fingers)).toFixed(1)}, u ${(100 * mid.dot(palm)).toFixed(1)}, v ${(100 * mid.dot(thumb)).toFixed(1)} cm`,
  );
  console.log('| angle | s cm | u cm | held cm | entry, exit cm | tips gap cm | palm side cm |');
  for (const angle of angles) {
    const a = (angle * Math.PI) / 180;
    const dir = fingers.clone().multiplyScalar(Math.cos(a)).addScaledVector(thumb, Math.sin(a));
    const rows: { s: number; u: number; held: number; entry: number; exit: number; tips: number; side: number }[] = [];
    for (let s = -0.03; s <= 0.07; s += 0.005) {
      for (let u = -0.01; u <= 0.06; u += 0.005) {
        const q = p0.clone().addScaledVector(fingers, s).addScaledVector(palm, u);
        let entry = Infinity;
        let exit = -Infinity;
        let held = 0;
        for (let t = -0.12; t <= 0.12; t += 0.0025) {
          const point = q.clone().addScaledVector(dir, t);
          if (closedDepth([point], closed).depth > RADIUS * 0.5) {
            entry = Math.min(entry, t);
            exit = Math.max(exit, t);
            held += 0.0025;
          }
        }
        if (held === 0) continue;
        let tipGap = Infinity;
        for (const tip of tips) {
          const d = tip.clone().sub(q);
          const along = d.dot(dir);
          tipGap = Math.min(tipGap, d.addScaledVector(dir, -along).length() - RADIUS);
        }
        const toLine = q.clone().sub(middle);
        rows.push({ s, u, held, entry, exit, tips: Math.max(0, tipGap), side: toLine.addScaledVector(dir, -toLine.dot(dir)).dot(palm) });
      }
    }
    const good = rows
      .filter((r) => r.tips <= 0.006)
      .toSorted((x, y) => y.held - x.held)
      .slice(0, 6);
    for (const r of good) {
      console.log(
        `| ${angle} | ${(100 * r.s).toFixed(1)} | ${(100 * r.u).toFixed(1)} | ${(100 * r.held).toFixed(1)} | ${(100 * r.entry).toFixed(1)}, ${(100 * r.exit).toFixed(1)} | ${(100 * r.tips).toFixed(1)} | ${(100 * r.side).toFixed(1)} |`,
      );
    }
    if (good.length === 0) console.log(`| ${angle} | no line with the tips on the shaft |`);
  }
}
