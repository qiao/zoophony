// The distance from the left shoulder joint to the rest wrist of the free paw, as a share of the
// arm length, in the rest pose of the first seated flutist of each fit demo.
import { Vector3 } from 'three';
import { demoSceneOf } from '../../../src/pose/test-scene.ts';
import { FLUTIST_SWEEP } from '../../../src/pose/test-sweep-roles.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { windHoldOf, windRig } from '../../../src/pose/winds.ts';
import { boneIndex } from '../../../src/models/rig.ts';
for (const demo of ['bach-bwv1050', 'boulanger-matin', 'beethoven-8']) {
  const scene = await demoSceneOf(`${demo}.mid`);
  const [player] = FLUTIST_SWEEP.players(scene);
  if (!player) continue;
  const rest = FLUTIST_SWEEP.sampleSets(scene).find((s) => s.name === 'rest');
  const posed = poseSkeleton(player.model, player.poseAt([...rest!.samples][0]!));
  const rig = windRig(player.model, 'flute', windHoldOf('fox-tan', 'flute'));
  const arm = rig.left.arm;
  const length = new Vector3(...arm.bind.elbow).distanceTo(new Vector3(...arm.bind.shoulder)) + new Vector3(...arm.bind.wrist).distanceTo(new Vector3(...arm.bind.elbow));
  const free = rig.freeL;
  if (free?.kind !== 'lap') continue;
  const root = posed.frames[boneIndex('root')]!;
  const target = new Vector3(...free.wrist).applyQuaternion(root.rotation).add(root.position);
  const shoulder = posed.frames[boneIndex('upperArmL')]!.position;
  const wrist = posed.frames[boneIndex('handL')]!.position;
  console.log(demo, 'target/length', (target.distanceTo(shoulder) / length).toFixed(4), 'posed/length', (wrist.distanceTo(shoulder) / length).toFixed(4), 'miss cm', (target.distanceTo(wrist) * 100).toFixed(2));
}
