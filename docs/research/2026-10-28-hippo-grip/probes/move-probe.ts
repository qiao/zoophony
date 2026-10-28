// Follows the bow paw of the hippo bassist through a lowering after a stop, at steps of 0.05 s of
// the wall time: the angle of the forearm in the plane of the palm of the player hand, the turn of
// the retarget, the paw swing, the gap of the stick to the middle of the paw, the angle of the
// stick in the plane of the palm of the paw that the viewer sees, and the distance of the frog
// part of the stick (from the frog end to the grip) to the line of the forearm, from the elbow to
// the wrist. The hippo wrist is about 8 cm thick in radius, so a smaller distance puts the frog
// into the forearm, and the twist of the paw on its forearm from the bind (the arm gate). A stop in pizzicato (boulanger-
// matin 52.13 s, or the end of the piece) lowers the paw from the pluck to the rest.
// Usage: node docs/research/2026-10-28-hippo-grip/probes/move-probe.ts [--demo <id>] [--song <s>]
//   [--set <changes>] [--grip hippo:x,y,z,deg] [--lift]
import { Line3, Matrix4, Quaternion, Vector3 } from 'three';

import { BOW } from '../../../../src/models/instruments/strings.ts';

import { boneIndex } from '../../../../src/models/rig.ts';
import {
  createStudioPose,
  palmTurnAngle,
  poseStudioBones,
  studioOffsets,
  twistAngle,
} from '../../../../src/models/studio-rig.ts';
import type { Transport } from '../../../../src/pose/pose-at.ts';
import { posedPiecePoint, poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { PLAYING, sceneOf } from '../../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../../src/pose/test-sweep-roles.ts';
import { stickGrip } from '../../../../tools/bow-grip.ts';
import { setHolds } from '../../../../tools/hold-sets.ts';
import { patchedDemo } from '../../../../tools/patch-demos.ts';
import { applyGrips } from '../../2026-10-17-grip-all/grip-set.ts';

const args = process.argv.slice(2);
const pick = (flag: string): string[] => args.flatMap((a, i) => (args[i - 1] === flag ? [a] : []));
const demo = pick('--demo')[0] ?? 'boulanger-matin';
const songText = pick('--song')[0];
const lift = args.includes('--lift');
const sets = pick('--set');
console.log('grips', applyGrips(args).join(' ') || 'tree', 'sets', sets.join(';') || 'none');
if (sets.length > 0) setHolds(sets.join(';'));

const DEG = 180 / Math.PI;
const turnOf = (m: ArrayLike<number>, b: number): Quaternion => {
  const x = new Vector3(m[b * 16] ?? 0, m[b * 16 + 1] ?? 0, m[b * 16 + 2] ?? 0).normalize();
  const y = new Vector3(m[b * 16 + 4] ?? 0, m[b * 16 + 5] ?? 0, m[b * 16 + 6] ?? 0).normalize();
  const z = new Vector3(m[b * 16 + 8] ?? 0, m[b * 16 + 9] ?? 0, m[b * 16 + 10] ?? 0).normalize();
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
};

/** The smallest distance between two segments, from samples along the first. */
function segmentGap(a0: Vector3, a1: Vector3, b0: Vector3, b1: Vector3): number {
  const line = new Line3(b0, b1);
  const p = new Vector3();
  const q = new Vector3();
  let best = Infinity;
  for (let k = 0; k <= 50; k++) {
    p.lerpVectors(a0, a1, k / 50);
    line.closestPointToPoint(p, true, q);
    best = Math.min(best, p.distanceTo(q));
  }
  return best;
}

const scene = sceneOf((await patchedDemo(`${demo}.mid`)).bytes);
const song = songText === undefined ? scene.score.durationSec : Number(songText);
const studio = createStudioPose();
for (const player of SWEEP_ROLES.bassist.players(scene)) {
  const rig = player.model.studio;
  if (!rig) continue;
  const arm = rig.arms.R;
  const foreBind = new Vector3().fromArray(arm.fore);
  console.log(`${player.name}, ${demo}, song ${song.toFixed(2)} s, ${lift ? 'start' : 'stop'} at wall 10 s`);
  console.log('| wall s | plane | turn | swing | gap cm | stick | frog to forearm cm | twist |');
  console.log('|---:|---:|---:|---:|---:|---:|---:|---:|');
  const hair = player.model.instrument.targets.find((t) => t.kind === 'bow-hair');
  const size = hair ? (hair.to[0] - hair.from[0]) / (BOW.length - 0.05) : 1;
  const frogAt = (hair?.from[0] ?? 0) - 0.025 * size;
  const transport: Transport = lift
    ? { ...PLAYING, changedAtWall: 10 }
    : { ...PLAYING, playing: false, changedAtWall: 10, before: PLAYING };
  for (let wall = 10; wall <= 16.001; wall += 0.05) {
    const at = lift ? song + wall - 10 : song;
    const pose = player.poseAt([at, wall, transport]);
    const posed = poseSkeleton(player.model, pose);
    const elbow = posed.frames[boneIndex('forearmR')]?.position ?? new Vector3();
    const wrist = posed.frames[boneIndex('handR')]?.position ?? new Vector3();
    const hand = posed.frames[boneIndex('handR')]?.rotation ?? new Quaternion();
    const fore = new Vector3().subVectors(wrist, elbow).normalize();
    const inHand = fore.clone().applyQuaternion(hand.clone().invert());
    const plane = Math.atan2(-inHand.z, -inHand.y) * DEG;
    const turn = palmTurnAngle('R', hand, fore) * DEG;
    poseStudioBones(rig, player.model.skeleton, pose.rotations, studioOffsets(pose), 1, studio);
    const foreTurn = turnOf(studio.matrices, arm.bones.fore);
    const handTurn = turnOf(studio.matrices, arm.bones.hand);
    const paw = foreTurn.clone().invert().multiply(handTurn);
    const twist = twistAngle(paw, foreBind);
    const swingTurn = paw.clone().multiply(new Quaternion().setFromAxisAngle(foreBind, -twist));
    const swing = 2 * Math.acos(Math.min(1, Math.abs(swingTurn.w))) * DEG;
    const seen = handTurn.clone().multiply(new Quaternion(...arm.paw).invert());
    const tip = new Vector3(...posedPiecePoint(posed, { bone: 'bow', at: [1, 0, 0] })).sub(
      new Vector3(...posedPiecePoint(posed, { bone: 'bow', at: [0, 0, 0] })),
    );
    const inPaw = tip.applyQuaternion(seen.invert());
    const stick = Math.atan2(inPaw.y, -inPaw.z) * DEG;
    const gap = stickGrip(posed).gap * 100;
    const frog = new Vector3(...posedPiecePoint(posed, { bone: 'bow', at: [frogAt, 0, 0] }));
    const grip = new Vector3(...posedPiecePoint(posed, { bone: 'bow', at: [0, 0, 0] }));
    const near = segmentGap(frog, grip, elbow, wrist) * 100;
    console.log(
      `| ${wall.toFixed(2)} | ${plane.toFixed(1)} | ${turn.toFixed(1)} | ${swing.toFixed(1)} | ${gap.toFixed(2)} | ${stick.toFixed(1)} | ${near.toFixed(1)} | ${(twist * DEG).toFixed(1)} |`,
    );
  }
  break;
}
