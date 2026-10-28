// Prints the right arm joints of the hippo bassist at song times of a demo, in the axes of the
// root of the player, and the place of the hand on the bow (0 at the frog, 1 at the tip of the
// hair), to compare two trees at a deep sample of `pnpm pose-depth`.
// Usage: node docs/research/2026-10-28-hippo-grip/probes/arm-at.ts <demo> <song s>... [--set <changes>]
import { Quaternion, Vector3 } from 'three';

import { boneIndex } from '../../../../src/models/rig.ts';
import { posedPiecePoint, poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { PLAYING, sceneOf } from '../../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../../src/pose/test-sweep-roles.ts';
import { countInAt } from '../../../../src/pose/count-in.ts';
import { setHolds } from '../../../../tools/hold-sets.ts';
import { patchedDemo } from '../../../../tools/patch-demos.ts';

const args = process.argv.slice(2);
const sets = args.flatMap((a, i) => (args[i - 1] === '--set' ? [a] : []));
if (sets.length > 0) setHolds(sets.join(';'));
const plain = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--set');
const [demo, ...times] = plain;
const scene = sceneOf((await patchedDemo(`${demo}.mid`)).bytes);
const start = -countInAt(scene.plan.beats, 0).lengthSec;
const cm = (v: Vector3): string => v.toArray().map((x) => (x * 100).toFixed(1)).join(', ');
for (const player of SWEEP_ROLES.bassist.players(scene)) {
  const hair = player.model.instrument.targets.find((t) => t.kind === 'bow-hair');
  const contact = player.model.instrument.targets.find((t) => t.kind === 'bow-contact');
  for (const text of times) {
    const song = Number(text);
    const pose = player.poseAt([song, 10 + song - start, { ...PLAYING, changedAtWall: 10 }]);
    const posed = poseSkeleton(player.model, pose);
    const root = posed.frames[boneIndex('root')];
    const back = (root?.rotation ?? new Quaternion()).clone().invert();
    const local = (p: Vector3): Vector3 => p.clone().sub(root?.position ?? new Vector3()).applyQuaternion(back);
    const at = (bone: string): Vector3 => local(posed.frames[boneIndex(bone as 'handR')]?.position ?? new Vector3());
    let along = Number.NaN;
    if (hair && contact) {
      const from = new Vector3(...posedPiecePoint(posed, { bone: 'bow', at: hair.from }));
      const to = new Vector3(...posedPiecePoint(posed, { bone: 'bow', at: hair.to }));
      const c = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: contact.from }));
      const axis = to.clone().sub(from);
      along = c.sub(from).dot(axis) / axis.lengthSq();
    }
    console.log(`${player.name} ${demo} ${song} s: along ${along.toFixed(3)}`);
    console.log(`  shoulder ${cm(at('upperArmR'))} elbow ${cm(at('forearmR'))} wrist ${cm(at('handR'))} cm`);
  }
  break;
}
