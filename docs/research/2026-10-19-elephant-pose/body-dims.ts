/**
 * Prints the measures of the standing elephant timpanist in the bind pose, in meters and in H:
 * the skull top, the ear span, the eyes, the shoulder joints, the belly front at each height, and
 * the kettles of TIMPANI. Usage: node docs/research/2026-10-19-elephant-pose/body-dims.ts
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { BONE_NAMES } from '../../../src/models/rig.ts';
import { TIMPANI, kettleHeadRadius } from '../../../src/models/instruments/percussion.ts';

const model = buildPlayer('elephant', 'timpani', 3);
const h = model.body.headHeight;
const p = model.mesh.positions;
const bones = model.mesh.bones;
const name = (i: number) => BONE_NAMES[bones[i] ?? 0];
const instrumentBones = new Set(['instrument', 'malletL', 'malletR']);
let top = -1;
let earX = 0;
const pos = model.skeleton.positions;
const at = (n: (typeof BONE_NAMES)[number]) => pos[BONE_NAMES.indexOf(n)]!;
const sh = at('upperArmL');
const eyeL = at('eyeL');
const fmt = (v: readonly number[]) => v.map((x) => x.toFixed(3)).join(', ');
const front = new Map<number, number>();
const width = new Map<number, number>();
for (let i = 0; i < p.length / 3; i++) {
  if (instrumentBones.has(name(i))) continue;
  const x = p[3 * i]!, y = p[3 * i + 1]!, z = p[3 * i + 2]!;
  top = Math.max(top, y);
  const n = name(i);
  if (n === 'earL' || n === 'earR' || n === 'head') earX = Math.max(earX, Math.abs(x));
  const band = Math.round(y * 10) / 10;
  if (!n.startsWith('trunk') && !n.includes('Arm') && !n.includes('hand') && !n.includes('fingers') && !n.includes('forearm') && n !== 'head' && !n.startsWith('ear')) {
    front.set(band, Math.min(front.get(band) ?? 9, z));
    width.set(band, Math.max(width.get(band) ?? 0, Math.abs(x)));
  }
}
console.log(`H ${h.toFixed(3)} m, skull top ${top.toFixed(3)} m (${(top / h).toFixed(2)} H)`);
console.log(`ear span ${(2 * earX).toFixed(3)} m (${((2 * earX) / h).toFixed(2)} H)`);
console.log(`eyes ${fmt(eyeL)}, spacing ${(2 * Math.abs(eyeL[0])).toFixed(3)} m`);
for (const b of ['upperArmL', 'forearmL', 'handL', 'fingersL', 'chest', 'neck', 'head', 'trunk1', 'trunk3'] as const) {
  console.log(`${b} ${fmt(at(b))}  (${(at(b)[1] / h).toFixed(2)} H high)`);
}
console.log(`palmL ${fmt(model.body.palmL)}, mouth ${fmt(model.body.mouth)}, headCenter ${fmt(model.body.headCenter)}`);
const upper = Math.hypot(...at('forearmL').map((v, i) => v - sh[i]!));
const fore = Math.hypot(...at('handL').map((v, i) => v - at('forearmL')[i]!));
console.log(`upper arm ${upper.toFixed(3)} m, forearm ${fore.toFixed(3)} m, shoulder to palm ${Math.hypot(...model.body.palmL.map((v, i) => v - sh[i]!)).toFixed(3)} m`);
console.log('trunk of the body (no arms, head, trunk): front z and half width at each height');
for (const [band, z] of [...front.entries()].toSorted((a, b) => a[0] - b[0])) {
  console.log(`  y ${band.toFixed(1)} (${(band / h).toFixed(2)} H): front z ${z.toFixed(3)}, half width ${width.get(band)!.toFixed(3)}`);
}
console.log(`TIMPANI headHeight ${TIMPANI.headHeight} (${(TIMPANI.headHeight / h).toFixed(2)} H), arc ${TIMPANI.arc}, front ${TIMPANI.front}`);
for (let i = 0; i < 4; i++) {
  const r = kettleHeadRadius(i);
  console.log(`  kettle ${i}: head radius ${r.toFixed(3)} m, diameter ${(2 * r).toFixed(3)} m (${((2 * r) / h).toFixed(2)} H)`);
}
const heads = model.instrument.targets.filter((t) => t.kind === 'head');
for (const t of heads) {
  const [x, y, z] = t.from;
  console.log(`  head target ${fmt(t.from)}, distance ${Math.hypot(x, z).toFixed(3)} m`);
}
