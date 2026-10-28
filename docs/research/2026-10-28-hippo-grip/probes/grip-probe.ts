// Measures the bow paw of the hippo bassist in each sample of the bassist sweep of four demos:
// the gap from the middle of the closed right paw to the axis of the stick and the depth of the
// axis in the paw (stickGrip() of tools/bow-grip.ts), the angle of the forearm in the plane of the
// palm of the player hand, the turn of the retarget (PAW_TURN), the paw swing of the arm gate, and
// the place of the hand on the bow (0 at the frog, 1 at the tip of the hair), and the angle of the
// stick in the plane of the palm of the paw that the viewer sees, from the side of the thumb
// toward the wrist.
// Usage: node docs/research/2026-10-28-hippo-grip/probes/grip-probe.ts [--step <n>] [--set <changes>]
//   [--grip hippo:x,y,z,deg] [--json <file>] [--worst <n>]
import { writeFileSync } from 'node:fs';

import { Matrix4, Quaternion, Vector3 } from 'three';

import { boneIndex } from '../../../../src/models/rig.ts';
import {
  createStudioPose,
  palmTurnAngle,
  poseStudioBones,
  studioOffsets,
  twistAngle,
} from '../../../../src/models/studio-rig.ts';
import { posedPiecePoint, poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../../src/pose/test-sweep-roles.ts';
import { stickGrip } from '../../../../tools/bow-grip.ts';
import { setHolds } from '../../../../tools/hold-sets.ts';
import { patchedDemo } from '../../../../tools/patch-demos.ts';
import { applyGrips } from '../../2026-10-17-grip-all/grip-set.ts';

const args = process.argv.slice(2);
const pick = (flag: string): string[] => args.flatMap((a, i) => (args[i - 1] === flag ? [a] : []));
const step = Number(pick('--step')[0] ?? 3);
const worstCount = Number(pick('--worst')[0] ?? 6);
const jsonOut = pick('--json')[0];
const sets = pick('--set');
console.log('grips', applyGrips(args).join(' ') || 'tree', 'sets', sets.join(';') || 'none');
if (sets.length > 0) setHolds(sets.join(';'));

const DEG = 180 / Math.PI;
interface Row {
  demo: string;
  set: string;
  song: number;
  wall: number;
  gap: number;
  depth: number;
  plane: number;
  turn: number;
  swing: number;
  along: number;
  stick: number;
}
const rows: Row[] = [];

const turnOf = (m: ArrayLike<number>, b: number, out: Quaternion): Quaternion => {
  const x = new Vector3(m[b * 16] ?? 0, m[b * 16 + 1] ?? 0, m[b * 16 + 2] ?? 0).normalize();
  const y = new Vector3(m[b * 16 + 4] ?? 0, m[b * 16 + 5] ?? 0, m[b * 16 + 6] ?? 0).normalize();
  const z = new Vector3(m[b * 16 + 8] ?? 0, m[b * 16 + 9] ?? 0, m[b * 16 + 10] ?? 0).normalize();
  return out.setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
};

const studio = createStudioPose();
for (const d of ['mozart-k525', 'bach-bwv1050', 'beethoven-8', 'boulanger-matin']) {
  const scene = sceneOf((await patchedDemo(`${d}.mid`)).bytes);
  if (!SWEEP_ROLES.bassist.hasRole(scene.score)) continue;
  for (const player of SWEEP_ROLES.bassist.players(scene)) {
    const index = Number(/(\d+)/.exec(player.name)?.[1] ?? -1);
    if (scene.layout.players[index]?.cast.species !== 'hippo') continue;
    const rig = player.model.studio;
    if (!rig) continue;
    const arm = rig.arms.R;
    const foreBind = new Vector3().fromArray(arm.fore);
    const hair = player.model.instrument.targets.find((t) => t.kind === 'bow-hair');
    const contact = player.model.instrument.targets.find((t) => t.kind === 'bow-contact');
    for (const set of SWEEP_ROLES.bassist.sampleSets(scene)) {
      let k = 0;
      for (const sample of set.samples) {
        if (set.name === 'play' && k++ % step !== 0) continue;
        const pose = player.poseAt(sample);
        const posed = poseSkeleton(player.model, pose);
        const g = stickGrip(posed);
        const frames = posed.frames;
        const elbow = frames[boneIndex('forearmR')]?.position ?? new Vector3();
        const wrist = frames[boneIndex('handR')]?.position ?? new Vector3();
        const hand = frames[boneIndex('handR')]?.rotation ?? new Quaternion();
        const fore = new Vector3().subVectors(wrist, elbow).normalize();
        const inHand = fore.clone().applyQuaternion(hand.clone().invert());
        const plane = Math.atan2(-inHand.z, -inHand.y) * DEG;
        const turn = palmTurnAngle('R', hand, fore) * DEG;
        poseStudioBones(rig, player.model.skeleton, pose.rotations, studioOffsets(pose), 1, studio);
        const foreTurn = turnOf(studio.matrices, arm.bones.fore, new Quaternion());
        const handTurn = turnOf(studio.matrices, arm.bones.hand, new Quaternion());
        const paw = foreTurn.clone().invert().multiply(handTurn);
        const twist = twistAngle(paw, foreBind);
        const swingTurn = paw.clone().multiply(new Quaternion().setFromAxisAngle(foreBind, -twist));
        const swing = 2 * Math.acos(Math.min(1, Math.abs(swingTurn.w))) * DEG;
        // The paw that the viewer sees, in the axes of the hand of the player: the studio paw
        // turned back by the rotation from the bind paw of the player to the studio paw.
        const seen = handTurn.clone().multiply(new Quaternion(...arm.paw).invert());
        const tipWorld = new Vector3(...posedPiecePoint(posed, { bone: "bow", at: [1, 0, 0] })).sub(
          new Vector3(...posedPiecePoint(posed, { bone: "bow", at: [0, 0, 0] })),
        );
        const inPaw = tipWorld.applyQuaternion(seen.invert());
        const stick = Math.atan2(inPaw.y, -inPaw.z) * DEG;
        let along = Number.NaN;
        if (hair && contact) {
          const from = new Vector3(...posedPiecePoint(posed, { bone: 'bow', at: hair.from }));
          const to = new Vector3(...posedPiecePoint(posed, { bone: 'bow', at: hair.to }));
          const c = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: contact.from }));
          const axis = to.clone().sub(from);
          along = c.sub(from).dot(axis) / axis.lengthSq();
        }
        rows.push({
          demo: d,
          set: set.name,
          song: sample[0],
          wall: sample[1],
          gap: g.gap * 100,
          depth: g.depth * 100,
          plane,
          turn,
          swing,
          along,
          stick,
        });
      }
    }
  }
}

const pct = (v: number[], q: number): number =>
  v.toSorted((a, b) => a - b)[Math.round(q * (v.length - 1))] ?? 0;
const f = (n: number): string => n.toFixed(2);
for (const name of ['all', 'play', 'bowing', 'pizzicato', 'lift', 'rest', 'lower']) {
  // In the play, a hand at less than 0.3 of the hair from the frog plucks: the hippo bows no
  // hair within 0.25 m of the frog (BowedHold.frogHair).
  const r = rows.filter((x) =>
    name === 'all' ? true
    : name === 'bowing' ? x.set === 'play' && x.along >= 0.3
    : name === 'pizzicato' ? x.set === 'play' && !(x.along >= 0.3)
    : x.set === name);
  if (r.length === 0) continue;
  const line = (key: "gap" | "depth" | "plane" | "turn" | "swing" | "stick"): string => {
    const v = r.map((x) => x[key]);
    return `${key} p5 ${f(pct(v, 0.05))} p50 ${f(pct(v, 0.5))} p95 ${f(pct(v, 0.95))} min ${f(Math.min(...v))} max ${f(Math.max(...v))}`;
  };
  const past = r.filter((x) => x.plane > 70).length;
  const far = r.filter((x) => x.gap > 1).length;
  console.log(`${name} n=${r.length}: plane past 70° ${((100 * past) / r.length).toFixed(1)}%, gap over 1 cm ${((100 * far) / r.length).toFixed(1)}%`);
  for (const key of ["gap", "depth", "plane", "turn", "swing", "stick"] as const) console.log(`  ${line(key)}`);
}
console.log('worst gaps:');
for (const r of rows.toSorted((a, b) => b.gap - a.gap).slice(0, worstCount)) {
  console.log(`  ${r.demo} ${r.set} song ${f(r.song)} wall ${f(r.wall)}: gap ${f(r.gap)} depth ${f(r.depth)} plane ${f(r.plane)} turn ${f(r.turn)} swing ${f(r.swing)} along ${f(r.along)}`);
}
console.log('worst swings:');
for (const r of rows.toSorted((a, b) => b.swing - a.swing).slice(0, worstCount)) {
  console.log(`  ${r.demo} ${r.set} song ${f(r.song)} wall ${f(r.wall)}: gap ${f(r.gap)} depth ${f(r.depth)} plane ${f(r.plane)} turn ${f(r.turn)} swing ${f(r.swing)} along ${f(r.along)}`);
}
const play = rows.filter((x) => x.set === 'play' && Number.isFinite(x.along));
console.log('play by the place on the bow (along):');
for (let b = 0; b < 1; b += 0.1) {
  const r = play.filter((x) => x.along >= b && x.along < b + 0.1);
  if (r.length === 0) continue;
  const planes = r.map((x) => x.plane);
  const gaps = r.map((x) => x.gap);
  console.log(`  ${b.toFixed(1)}-${(b + 0.1).toFixed(1)} n=${r.length}: plane p5 ${f(pct(planes, 0.05))} p50 ${f(pct(planes, 0.5))} p95 ${f(pct(planes, 0.95))}; gap p50 ${f(pct(gaps, 0.5))} max ${f(Math.max(...gaps))}`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(rows));
