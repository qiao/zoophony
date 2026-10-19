/**
 * Prints the twist of the paw on the forearm of one side of the first player of a fold role in
 * one demo, at each step of the play, as `arm-twist.ts` measures it, with the turn of the hand of
 * the player from its forearm. A line shows each sample with a twist outside a range.
 *
 * Usage, from the root of the tree:
 *
 *     node docs/research/2026-10-18-hippo-arm/paw-twist.ts <demo file> [--role <role>] \
 *       [--side L|R] [--step <s>] [--from <s>] [--to <s>] [--range <low>,<high>] [--set <changes>] \
 *       [--detail] [--frames] [--chest] [--aims] [--state]
 *
 * `--detail` adds the elbow angle, the elbow axis, and the forearm direction in the world, the
 * twist of the hand of the player on its forearm, the turn of the paw in the plane of its palm
 * (`PAW_TURN`), the angle of the forearm in that plane before the limit, and the part of the
 * forearm in that plane, and the roll of the hand around the stick less the tilt of the bow, with
 * the sign of the axis of the first sample, and the angle of the elbow around the stick before the
 * limits of the roll (`rollToward()` of `pose/bowed.ts`). The last line counts the samples with
 * the elbow beyond 130 degrees around the stick, and the jumps of the roll above 90 degrees from
 * one sample to the next. `--frames` adds the places of the elbow and the grip, the stick, and the
 * up direction of the hand on the bow, in the world. `--chest` adds the stick, the up direction of
 * the hand, the direction from the grip to the elbow, and from the shoulder to the grip, in the
 * axes of the chest of the player: +x out to the left side, +y up, and +z back.
 */
import { Matrix4, Quaternion, Vector3 } from 'three';
import { BONE_NAMES } from '../../../src/models/rig.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import {
  createStudioPose,
  poseStudioBones,
  studioOffsets,
  twistAngle,
} from '../../../src/models/studio-rig.ts';
import { bowedRig, holdOf, type BowedInstrument } from '../../../src/pose/bowed-rig.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { bowStateAt, createBowState } from '../../../src/pose/strokes.ts';
import { allAudible, PLAYING, sceneOf } from '../../../src/pose/test-scene.ts';
import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: string): string =>
  args.includes(name) ? (args[args.indexOf(name) + 1] ?? fallback) : fallback;
const role = FOLD_ROLES.get(option('--role', 'bassist'));
if (!role) {
  throw new Error('No role.');
}
if (args.includes('--set')) {
  setHolds(option('--set', ''));
}
const side = option('--side', 'R');
const step = Number(option('--step', '0.25'));
const [low, high] = option('--range', '-30,60').split(',').map(Number);
const demo = (await patchedDemos()).find((d) => d.file === args[0]);
if (!demo) {
  throw new Error(`No demo ${args[0] ?? ''}.`);
}
const scene = sceneOf(demo.bytes);
const body = roleBodies(role, scene)[0];
if (!body || body.index === null || !body.model.studio) {
  throw new Error('No studio body of the role.');
}
const rig = body.model.studio;
const arm = rig.arms[side as 'L' | 'R'];
const index = (name: string): number => STUDIO_BONES.indexOf(name as never);
const m = new Matrix4();
const turnOf = (matrices: ArrayLike<number>, b: number): Quaternion =>
  new Quaternion().setFromRotationMatrix(
    m.fromArray(Array.from(matrices).slice(b * 16, b * 16 + 16)),
  );
if (role.kind !== 'player') {
  throw new Error('The role has no bowed string.');
}
const instrument = role.instrument as BowedInstrument;
const bowed = bowedRig(body.model, instrument, holdOf(role.species[0] ?? 'hippo', instrument));
const placeOf = (matrices: ArrayLike<number>, bone: number): Vector3 =>
  new Vector3(...(body.model.skeleton.positions[bone] ?? [0, 0, 0])).applyMatrix4(
    m.fromArray(
      Array.from(matrices).slice(
        (STUDIO_BONES.length + bone) * 16,
        (STUDIO_BONES.length + bone) * 16 + 16,
      ),
    ),
  );
const state = createBowState();
const note = scene.plan.players[body.index]?.note;
const audible = allAudible(scene.score);
const buffer = createScenePose(scene.plan);
const from = Number(option('--from', '0'));
const to = Number(option('--to', String(scene.score.durationSec)));
let outside = 0;
let firstAxis: Vector3 | undefined;
let far = 0;
let jumps = 0;
let lastRoll: number | null = null;
const aims = Array.from({ length: 36 }, () => 0);
let count = 0;
for (let song = from; song <= to; song += step) {
  const frame = poseAt(scene.plan, song, 10 + song, PLAYING, audible, buffer);
  const pose = frame.players[body.index];
  if (!pose) {
    continue;
  }
  const studio = poseStudioBones(
    rig,
    body.model.skeleton,
    pose.rotations,
    studioOffsets(pose),
    1,
    createStudioPose(),
  );
  const fore = turnOf(studio.matrices, index(`forearm_${side}`));
  const hand = turnOf(studio.matrices, index(`hand_${side}`));
  const twist =
    (twistAngle(fore.clone().invert().multiply(hand), new Vector3(...arm.fore)) * 180) / Math.PI;
  // The elbow axis in the world: the bind axis of the elbow after the turn of the forearm.
  const hinge = new Vector3(...arm.hinge).applyQuaternion(fore);
  const upperDir = new Vector3(...arm.upper).applyQuaternion(turnOf(studio.matrices, index(`upper_arm_${side}`)));
  const foreDir = new Vector3(...arm.fore).applyQuaternion(fore);
  const elbow = 180 - (upperDir.angleTo(foreDir) * 180) / Math.PI;
  // The hand of the player and its turn from the forearm of the player, whose bones point down in
  // the bind pose. The matrices of the bones of the player follow the studio bones.
  const playerHand = turnOf(studio.matrices, STUDIO_BONES.length + arm.drivers.hand);
  const playerFore = turnOf(studio.matrices, STUDIO_BONES.length + arm.drivers.fore);
  const playerTwist =
    (twistAngle(playerFore.clone().invert().multiply(playerHand), new Vector3(0, -1, 0)) * 180) /
    Math.PI;
  // The turn of the paw in the plane of its palm (PAW_TURN), around the x axis of the hand.
  const palm = playerHand
    .clone()
    .invert()
    .multiply(hand)
    .multiply(new Quaternion(...arm.paw).invert());
  const palmAngle = (2 * Math.atan2(palm.x, palm.w) * 180) / Math.PI;
  const inHand = foreDir.clone().applyQuaternion(playerHand.clone().invert());
  // The roll of the right hand around the stick (rollToward() of pose/bowed.ts) less the tilt of
  // the bow: the hand is R(stick, roll) × bow, and the bow bone is R(stick, tilt) × bow. The sign
  // follows the axis of the first sample.
  const bowBone = turnOf(studio.matrices, STUDIO_BONES.length + BONE_NAMES.indexOf('bow'));
  const rollTurn = playerHand.clone().multiply(bowBone.clone().invert());
  const rollAxis = new Vector3(rollTurn.x, rollTurn.y, rollTurn.z);
  firstAxis ??= rollAxis.clone().normalize();
  const rollSign = rollAxis.dot(firstAxis) < 0 ? -1 : 1;
  const rollAngle =
    (2 * Math.atan2(rollAxis.length(), Math.abs(rollTurn.w)) * Math.sign(rollTurn.w || 1) * rollSign * 180) /
    Math.PI;
  const raw = (Math.atan2(-inHand.z, -inHand.y) * 180) / Math.PI;
  // The angle of rollToward() of pose/bowed.ts before its limits, from the bow bone (with the
  // tilt) to the elbow of the player.
  const bowIndex = BONE_NAMES.indexOf('bow');
  const stick = new Vector3(...bowed.stick).applyQuaternion(bowBone);
  const handUp = new Vector3(0, 1, 0).applyQuaternion(bowBone);
  handUp.addScaledVector(stick, -handUp.dot(stick)).normalize();
  const aimUp = placeOf(studio.matrices, arm.drivers.fore).sub(placeOf(studio.matrices, bowIndex));
  aimUp.addScaledVector(stick, -aimUp.dot(stick));
  const aimAngle =
    (Math.atan2(stick.dot(new Vector3().crossVectors(handUp, aimUp)), handUp.dot(aimUp)) * 180) /
    Math.PI;
  const chestTurn = turnOf(studio.matrices, STUDIO_BONES.length + BONE_NAMES.indexOf('chest'));
  const chestText = (v: Vector3): string =>
    v
      .clone()
      .applyQuaternion(chestTurn.clone().invert())
      .toArray()
      .map((c) => c.toFixed(2))
      .join(',');
  // The bow state at the song time, with no seeded offset of the note layer.
  let stateText = '';
  if (args.includes('--state') && note?.family === 'bowed') {
    bowStateAt(note.strokes, note.starts, song, state);
    stateText = ` string ${state.string.toFixed(2)} bow ${state.bow.toFixed(2)} lift ${state.lift.toFixed(3)} pizzicato ${state.pizzicato.toFixed(2)} cross ${state.crossMean.toFixed(2)}`;
  }
  const detail = args.includes('--detail')
    ? ` elbow ${elbow.toFixed(0)} hinge ${hinge.toArray().map((v) => v.toFixed(2)).join(',')} fore ${foreDir.toArray().map((v) => v.toFixed(2)).join(',')} player twist ${playerTwist.toFixed(0)} palm turn ${palmAngle.toFixed(0)} raw ${raw.toFixed(0)} in plane ${Math.hypot(inHand.y, inHand.z).toFixed(2)} roll ${rollAngle.toFixed(0)} aim ${aimAngle.toFixed(0)}${stateText}${args.includes('--chest') ? ` in the chest axes: stick ${chestText(stick)} hand up ${chestText(handUp)} grip to elbow ${chestText(placeOf(studio.matrices, arm.drivers.fore).sub(placeOf(studio.matrices, bowIndex)).normalize())} shoulder to grip ${chestText(placeOf(studio.matrices, bowIndex).sub(placeOf(studio.matrices, arm.drivers.upper)).normalize())}` : ''}${args.includes('--frames') ? ` elbow at ${placeOf(studio.matrices, arm.drivers.fore).toArray().map((v) => v.toFixed(3)).join(',')} grip at ${placeOf(studio.matrices, bowIndex).toArray().map((v) => v.toFixed(3)).join(',')} stick ${stick.toArray().map((v) => v.toFixed(2)).join(',')} hand up ${handUp.toArray().map((v) => v.toFixed(2)).join(',')}` : ''}`
    : '';
  count += 1;
  if (Math.abs(aimAngle) > 130) {
    far += 1;
  }
  if (lastRoll !== null && Math.abs(rollAngle - lastRoll) > 90) {
    jumps += 1;
  }
  lastRoll = rollAngle;
  aims[Math.min(35, Math.floor((aimAngle + 180) / 10))]! += 1;
  if (twist < (low ?? -30) || twist > (high ?? 60)) {
    outside += 1;
    console.log(`${song.toFixed(2)} s: twist ${twist.toFixed(0)} deg${detail}`);
  }
}
if (args.includes('--aims')) {
  console.log(`aims from -180 deg by 10: ${aims.join(' ')}`);
}
console.log(
  `${outside} of ${count} samples outside ${low},${high} deg; ${far} with the elbow beyond 130 deg around the stick; ${jumps} jumps of the roll above 90 deg`,
);
