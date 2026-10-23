/**
 * Prints the signed twist of each paw on its forearm over one lift or lowering of a role, as
 * `probeMoves()` of `tools/arm-check.ts` samples it, at steps of 0.02 s of the wall time. The twist
 * is the angle of the paw around the bind axis of the forearm, from the bind, in degrees. Usage:
 *
 *     node docs/research/2026-10-23-night-fixes/move-trace.ts <role> <demo> <lift|lower> <song s> \
 *       [<changes of pnpm hold-fit --set>]
 */
import { armBinds } from '../../../tools/arm-shape.ts';
import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import {
  createStudioPose,
  poseStudioBones,
  studioOffsets,
  twistAngle,
} from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { LIFT_FIT_SEC, LOWER_MAX_SEC } from '../../../src/pose/rest.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import type { Transport } from '../../../src/pose/types.ts';
import { Matrix4, Quaternion } from 'three';

const [roleName = '', demo = '', kind = 'lower', atText = '0', changes = ''] = process.argv.slice(2);
if (changes) {
  setHolds(changes);
}
const role = FOLD_ROLES.get(roleName);
if (!role) {
  throw new Error(`No role ${roleName}.`);
}
const at = Number(atText);
const file = (await probeDemos()).find((d) => d.file === `${demo}.mid`);
if (!file) {
  throw new Error(`No demo ${demo}.`);
}
const scene = sceneOf(file.bytes);
const bodies = roleBodies(role, scene);
const audible = allAudible(scene.score);
const buffer = createScenePose(scene.plan);
const studio = createStudioPose();
const lead = countInAt(scene.plan.beats, at).lengthSec;
const transport: Transport =
  kind === 'lift'
    ? { ...PLAYING, changedAtWall: 10, startSec: at }
    : { ...PLAYING, playing: false, changedAtWall: 10, before: PLAYING };
const span = kind === 'lift' ? LIFT_FIT_SEC : transport.holdSec + LOWER_MAX_SEC;
const from = kind === 'lift' ? 0 : transport.holdSec;
const turnOf = (matrices: Float32Array, bone: number): Quaternion =>
  new Quaternion().setFromRotationMatrix(new Matrix4().fromArray(matrices, bone * 16));
console.log(`${roleName} ${demo} ${kind} at ${at} s: wall s, then the twist L and R in degrees`);
for (let wall = from; wall <= span + 1e-9; wall += 0.02) {
  const song = kind === 'lift' ? Math.min(at, at - lead + wall) : at;
  const frame = poseAt(scene.plan, song, 10 + wall, transport, audible, buffer);
  const first = bodies[0];
  if (!first) {
    break;
  }
  const pose = first.index === null ? frame.conductor : frame.players[first.index];
  const rig = first.model.studio;
  if (!pose || !rig) {
    break;
  }
  poseStudioBones(rig, first.model.skeleton, pose.rotations, studioOffsets(pose), 1, studio);
  const arms = armBinds(rig);
  const cells = (['L', 'R'] as const).map((side) => {
    const arm = arms[side];
    const fore = turnOf(studio.matrices, arm.bones.fore);
    const hand = turnOf(studio.matrices, arm.bones.hand);
    const axis = arm.joints.wrist.clone().sub(arm.joints.elbow).normalize();
    const twist = turnOf(studio.matrices, STUDIO_BONES.indexOf(`forearm_twist_${side}`));
    const bone = (twistAngle(fore.clone().invert().multiply(twist), axis) * 180) / Math.PI;
    return `${((twistAngle(fore.clone().invert().multiply(hand), axis) * 180) / Math.PI).toFixed(0)} (bone ${bone.toFixed(0)})`;
  });
  console.log(`${(wall - from).toFixed(2)}  L ${cells[0]}  R ${cells[1]}`);
}
