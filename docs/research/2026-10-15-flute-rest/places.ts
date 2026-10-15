// The places of the paws and of the flute in the rest pose of the first seated tan fox of
// beethoven-8, for the hold of main and of the working tree: each palm from the knee of its side
// (out, up, forward, in cm), the foot joint of the flute from the right knee, and the tilt of the
// flute from vertical.
import { Vector3 } from 'three';
import { demoSceneOf } from '../../../src/pose/test-scene.ts';
import { FLUTIST_SWEEP } from '../../../src/pose/test-sweep-roles.ts';
import { poseSkeleton, posedPiecePoint, posedPoint } from '../../../src/pose/test-kinematics.ts';
import { SPECIES_WIND_HOLDS, fluteTurn } from '../../../src/pose/winds.ts';
import type { WindHold } from '../../../src/pose/winds.ts';
import { boneIndex } from '../../../src/models/rig.ts';
const tree = SPECIES_WIND_HOLDS['fox-tan']!.flute!;
const main: WindHold = { ...tree, rest: fluteTurn(-22, 59, [0, 0, -1]), restShift: [0, -0.5, -0.19], restPoleL: [-1, -0.5, -0.5], restPoleR: [1, -0.5, 0.5], restFreeL: null };
const cm = (v: Vector3, side: number) => `${(side * v.x * 100).toFixed(1)}, ${(v.y * 100).toFixed(1)}, ${(-v.z * 100).toFixed(1)}`;
for (const [name, hold] of [['main', main], ['tree', tree]] as const) {
  SPECIES_WIND_HOLDS['fox-tan'] = { flute: hold };
  const scene = await demoSceneOf('beethoven-8.mid');
  const [player] = FLUTIST_SWEEP.players(scene);
  const rest = FLUTIST_SWEEP.sampleSets(scene).find((s) => s.name === 'rest');
  const posed = poseSkeleton(player!.model, player!.poseAt([...rest!.samples][0]!));
  const at = (b: 'shinL' | 'shinR') => posed.frames[boneIndex(b)]!.position;
  const palmL = new Vector3(...posedPoint(posed, 'handL', player!.model.body.palmL)).sub(at('shinL'));
  const palmR = new Vector3(...posedPoint(posed, 'handR', player!.model.body.palmR)).sub(at('shinR'));
  const foot = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: [0.52, 0, 0] }));
  const top = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: [0, 0, 0] }));
  const tilt = (Math.acos((top.y - foot.y) / top.distanceTo(foot)) * 180) / Math.PI;
  console.log(`${name}: palmL from the left knee ${cm(palmL, -1)}; palmR from the right knee ${cm(palmR, 1)}; foot joint from the right knee ${cm(foot.clone().sub(at('shinR')), 1)}; tilt ${tilt.toFixed(1)} deg`);
}
