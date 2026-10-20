/**
 * Measures the left arm and the left paw of the cat violist at some song times (research of
 * 2026-10-20, round `cat-arm`). It poses the first player of the sweep of the violist and prints,
 * in the axes of the viola (along the neck to the scroll, across the strings to the treble side, and
 * up from the strings):
 *
 * - the shoulder joint, the elbow, and the wrist of the player, in cm from the stop point;
 * - the direction of the forearm, the fingers, the palm, and the thumb of the player paw;
 * - the angle from the forearm to the fingers of the player paw (the wrist bend), and the turn of
 *   the studio paw toward the forearm in the plane of its palm (`PAW_TURN`);
 * - the angle from the palm normal to the line from the paw to the eyes of the player.
 *
 * Usage, from the root of the tree:
 *
 *     node docs/research/2026-10-20-cat-left-arm/paw-probe.ts <demo> <time>... [--set <changes>]
 */
import { Quaternion, Vector3 } from 'three';

import { patchedDemos } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { PAW_TURN } from '../../../src/models/studio-rig.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { VIOLIST_SWEEP, playSample } from '../../../src/pose/test-sweep-roles.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { bowedRig, holdOf } from '../../../src/pose/bowed-rig.ts';

const args = process.argv.slice(2);
const sets: string[] = [];
const rest: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--set') {
    sets.push(args[++i] ?? '');
  } else {
    rest.push(args[i] ?? '');
  }
}
if (sets.length > 0) {
  setHolds(sets.join(';'));
}
const [demoId, ...songs] = rest;
const demo = (await patchedDemos()).find((d) => d.file === `${demoId}.mid`);
if (!demo) {
  throw new Error('no demo');
}
const scene = sceneOf(demo.bytes);
const [player] = VIOLIST_SWEEP.players(scene);
if (!player) {
  throw new Error('no player');
}
const rig = bowedRig(player.model, 'viola', holdOf('cat', 'viola'));
const bindInst = new Vector3(...(player.model.skeleton.positions[boneIndex('instrument')] ?? [0, 0, 0]));
const DEG = 180 / Math.PI;
const f = (v: Vector3, k = 1): string =>
  `(${(v.x * k).toFixed(1)}, ${(v.y * k).toFixed(1)}, ${(v.z * k).toFixed(1)})`;

for (const s of songs) {
  const sample = playSample(scene, Number(s));
  const posed = poseSkeleton(player.model, player.poseAt(sample));
  const frame = (bone: string): { p: Vector3; q: Quaternion } => {
    const fr = posed.frames[boneIndex(bone as 'handL')];
    return { p: fr?.position.clone() ?? new Vector3(), q: fr?.rotation.clone() ?? new Quaternion() };
  };
  const inst = frame('instrument');
  // The axes of the viola in the world.
  const along = new Vector3(...rig.neck).normalize().applyQuaternion(inst.q);
  const up = new Vector3(...rig.top).normalize().applyQuaternion(inst.q);
  const across = new Vector3().crossVectors(up, along).normalize();
  const toViola = (v: Vector3): Vector3 => new Vector3(v.dot(along), v.dot(across), v.dot(up));
  if (s === songs[0]) {
    const acrossBow = new Vector3(...rig.across).applyQuaternion(inst.q);
    const fingersSide = new Vector3(...rig.fingers).applyQuaternion(inst.q);
    console.log(`  rig.across (bow tip side) ${f(toViola(acrossBow), 100)}, rig.fingers ${f(toViola(fingersSide), 100)}`);
  }
  const nut = new Vector3(...rig.nut).sub(bindInst).applyQuaternion(inst.q).add(inst.p);
  const shoulder = frame('upperArmL').p;
  const elbow = frame('forearmL').p;
  const hand = frame('handL');
  const head = frame('head').p;
  const fore = hand.p.clone().sub(elbow).normalize();
  // The bind paw of the player: the fingers -y, the palm +x, the thumb -z (forward).
  const fingers = new Vector3(0, -1, 0).applyQuaternion(hand.q);
  const palm = new Vector3(1, 0, 0).applyQuaternion(hand.q);
  const thumb = new Vector3(0, 0, -1).applyQuaternion(hand.q);
  const inHand = fore.clone().applyQuaternion(hand.q.clone().invert());
  const inPlane = Math.hypot(inHand.y, inHand.z);
  const [low, high] = PAW_TURN.fade;
  const fade = Math.min(1, Math.max(0, (inPlane - low) / (high - low)));
  const turn = Math.atan2(-inHand.z, -inHand.y) * fade * fade * (3 - 2 * fade);
  const limited = Math.min(PAW_TURN.max, Math.max(-PAW_TURN.max, turn));
  const toEyes = head.clone().sub(hand.p).normalize();
  console.log(`song ${s}:`);
  console.log(
    `  from the nut, cm (along, across to treble, up): shoulder ${f(toViola(shoulder.clone().sub(nut)), 100)} elbow ${f(toViola(elbow.clone().sub(nut)), 100)} wrist ${f(toViola(hand.p.clone().sub(nut)), 100)}`,
  );
  console.log(
    `  directions (along, across, up): forearm ${f(toViola(fore), 100)} fingers ${f(toViola(fingers), 100)} palm ${f(toViola(palm), 100)} thumb ${f(toViola(thumb), 100)} (x100)`,
  );
  console.log(
    `  wrist bend ${(fore.angleTo(fingers) * DEG).toFixed(1)}°, studio paw turn ${(limited * DEG).toFixed(1)}° (raw ${(turn * DEG).toFixed(1)}°), palm to eyes ${(palm.angleTo(toEyes) * DEG).toFixed(1)}°, forearm to neck ${(fore.angleTo(along) * DEG).toFixed(1)}°`,
  );
}
