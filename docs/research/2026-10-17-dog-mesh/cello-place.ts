/**
 * Gives the play shift and the play turn of a cello hold of the dog from a wanted place: the end
 * pin tip on the floor (x, z), the axis back `back` degrees from the vertical and then left `left`
 * degrees, and the top plate turned `yaw` degrees to the right of the front. It prints the points
 * of the placed cello along its axis. Usage:
 *
 *     node docs/research/2026-10-17-dog-mesh/cello-place.ts <x> <z> <back> <left> <yaw>
 */
import { MathUtils, Matrix4, Quaternion, Vector3 } from 'three';

import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';

const [x, z, back, left, yaw] = process.argv.slice(2).map(Number) as [number, number, number, number, number];
const m = buildPlayer('dog', 'cello', 4, 'chair');
const H = m.body.headHeight;
const piece = m.pieces.find((p) => p.piece.bone === 'instrument');
if (!piece) throw new Error('no cello');
const pin0 = new Vector3(...piece.at.position);
const r0 = new Quaternion(...piece.at.rotation);
const d = MathUtils.DEG2RAD;
const axis = new Vector3(-Math.cos(back * d) * Math.sin(left * d), Math.cos(back * d) * Math.cos(left * d), Math.sin(back * d)).normalize();
const front = new Vector3(Math.sin(yaw * d), 0, -Math.cos(yaw * d));
const top = front.clone().projectOnPlane(axis).normalize();
const side = new Vector3().crossVectors(axis, top.clone().negate());
const r1 = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(side, axis, new Vector3().crossVectors(side, axis)));
const turn = r1.clone().multiply(r0.clone().invert());
const pin1 = new Vector3(x, 0, z);
const shift = pin1.clone().sub(pin0).divideScalar(H);
console.log(`H ${H.toFixed(4)}, bind pin ${pin0.toArray().map((v) => v.toFixed(3))}`);
console.log(`playShift: [${shift.toArray().map((v) => v.toFixed(3)).join(', ')}]`);
console.log(`playTurn: [${turn.toArray().map((v) => v.toFixed(4)).join(', ')}]`);
// Points along the axis from the pin tip, in meters, with the back of the body 0.06 m behind the axis.
const backDir = top.clone().negate();
const p = (along: number, off = 0) => pin1.clone().addScaledVector(axis, along).addScaledVector(backDir, off);
const f = (v: Vector3) => `(${v.toArray().map((c) => c.toFixed(3)).join(', ')})`;
for (const [name, along] of [['tail end', 0.2], ['lower bout', 0.29], ['contact', 0.53], ['waist', 0.56], ['upper bout', 0.815], ['body top', 0.92], ['nut', 1.205], ['scroll top', 1.4]] as const) {
  console.log(`${name.padEnd(10)} axis ${f(p(along))} back ${f(p(along, 0.06))}`);
}
console.log(`the side across the strings (to the right of the player): ${f(side)}`);
const at = (b: string) => new Vector3(...(m.skeleton.positions[boneIndex(b as never)] ?? []));
console.log(`knee L ${f(at('shinL'))} knee R ${f(at('shinR'))} shoulder L ${f(at('upperArmL'))} shoulder R ${f(at('upperArmR'))} head center ${f(new Vector3(...m.body.headCenter))}`);
console.log(`set: cello@dog.playShift=${shift.toArray().map((v) => v.toFixed(3)).join(',')};cello@dog.playTurn=${turn.toArray().map((v) => v.toFixed(4)).join(',')}`);
