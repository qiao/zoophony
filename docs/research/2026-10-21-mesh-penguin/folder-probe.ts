/**
 * Measures the reach of the flippers of the penguin to the grips of the choir folder for places of
 * the folder: the drop below the head center and the distance in front of it, in meters, with the
 * sizes and the tilt of `CHOIR_FOLDER` of `models/instruments/folder.ts`. The first scan had
 * covers of 0.2 m: run it on the tree of that time for its numbers. For each place, it prints the
 * distance from each shoulder joint to its grip against the reach of the arm, and the gap from the
 * lowest edge of the folder to the front of the body at that height. It also prints the place of
 * the folder of the tree. Usage:
 * node docs/research/2026-10-21-mesh-penguin/folder-probe.ts [armFactor] [drops] [forwards]
 */
import { Quaternion, Vector3 } from 'three';
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { placePoint } from '../../../src/models/instruments/hold.ts';
import { CHOIR_FOLDER } from '../../../src/models/instruments/folder.ts';

const factor = Number(process.argv[2] ?? 1);
const m = buildPlayer('penguin', 'choir-folder', 4, 'riser');
const at = (b: BoneName): Vector3 => new Vector3(...(m.skeleton.positions[boneIndex(b)] ?? []));
const shoulder = at('upperArmL');
const elbow = at('forearmL');
const wrist = at('handL');
const palm = new Vector3(...m.body.palmL);
const arm = shoulder.distanceTo(elbow) + elbow.distanceTo(wrist);
const reach = arm * factor + wrist.distanceTo(palm);
const head = new Vector3(...m.body.headCenter);
const f = (v: Vector3): string => [v.x, v.y, v.z].map((x) => x.toFixed(3)).join(', ');
console.log(`H ${m.body.headHeight.toFixed(4)} m, head center (${f(head)}), shoulder L (${f(shoulder)})`);
console.log(`reach L at the arm factor ${factor}: ${reach.toFixed(3)} m`);
const grip = m.instrument.grips.palmL;
if (grip) {
  const g = new Vector3(...placePoint(m.pieces, grip));
  console.log(`tree: grip L (${f(g)}), ${g.distanceTo(shoulder).toFixed(3)} m from the shoulder`);
}

/** The front of the body (the smallest z) at each height, from the body vertices with |x| < 0.12. */
function frontAt(y: number): number {
  let front = Infinity;
  const p = m.mesh.positions;
  for (let i = 0; i < p.length / 3; i++) {
    const [x = 0, yy = 0, z = 0] = [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
    if (Math.abs(x) < 0.12 && Math.abs(yy - y) < 0.02 && m.mesh.bones[i] !== boneIndex('instrument')) {
      front = Math.min(front, z);
    }
  }
  return front;
}

const F = CHOIR_FOLDER;
const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -F.tilt);
const open = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), F.open);
// The grip of the left side in the folder axes (`buildChoirFolder()`), and the middle of the lower
// edge of the folder.
const gripLocal = new Vector3(-(F.width - 0.03), -F.height / 4, -0.02).applyQuaternion(open);
const lowLocal = new Vector3(0, -F.height / 2, 0);
console.log('| drop m | forward m | grip y m | grip L to shoulder m | spare m | low edge y m | gap to the body m |');
console.log('|---|---|---|---|---|---|---|');
const drops = (process.argv[3] ?? "0.2,0.25,0.3,0.35,0.4").split(",").map(Number);
const forwards = (process.argv[4] ?? "0.2,0.25,0.3,0.35").split(",").map(Number);
for (const drop of drops) {
  for (const forward of forwards) {
    const origin = head.clone().add(new Vector3(0, -drop, -forward));
    const g = gripLocal.clone().applyQuaternion(tilt).add(origin);
    const low = lowLocal.clone().applyQuaternion(tilt).add(origin);
    const d = g.distanceTo(shoulder);
    const gap = frontAt(low.y) - low.z;
    console.log(`| ${drop} | ${forward} | ${g.y.toFixed(3)} | ${d.toFixed(3)} | ${(reach - d).toFixed(3)} | ${low.y.toFixed(3)} | ${gap.toFixed(3)} |`);
  }
}
