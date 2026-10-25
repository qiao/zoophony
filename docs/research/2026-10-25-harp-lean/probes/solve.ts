// Solves the place of the harp that puts the top of the soundbox axis at a contact point:
// node docs/research/2026-10-25-harp-lean/probes/solve.ts <scale> <tilt deg> <turn deg> <cx> <cy> <cz> [H]
// It prints the --set text (harpPlace.side in H, lift and front in meters at the scale 1) and the
// model points of the soundbox ends, the column top, and the base corners.
import { MathUtils, Quaternion, Vector3 } from 'three';

const [s, tiltDeg, turnDeg, cx, cy, cz] = process.argv.slice(2, 8).map(Number) as [number, number, number, number, number, number];
const H = Number(process.argv[8] ?? 0.357);
const rot = new Quaternion()
  .setFromAxisAngle(new Vector3(0, 1, 0), turnDeg * MathUtils.DEG2RAD)
  .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), tiltDeg * MathUtils.DEG2RAD));
const local = (y: number, z: number): Vector3 => new Vector3(0, y * s, z * s).applyQuaternion(rot);
const top = local(0.98, 0.3);
// origin = [side*H, lift*s, -front*s]; origin + top = C
const side = (cx - top.x) / H;
const lift = (cy - top.y) / s;
const front = -(cz - top.z) / s;
const origin = new Vector3(side * H, lift * s, -front * s);
const at = (y: number, z: number): string => {
  const p = local(y, z).add(origin);
  return `[${p.toArray().map((v) => v.toFixed(3)).join(', ')}]`;
};
console.log(
  `deer.harpScale=${s};harpPlace.tilt=${tiltDeg}deg;harpPlace.turn=${turnDeg}deg;harpPlace.side=${side.toFixed(4)};harpPlace.lift=${lift.toFixed(4)};harpPlace.front=${front.toFixed(4)}`,
);
console.log(`soundbox bottom ${at(0.08, -0.22)} top ${at(0.98, 0.3)}`);
console.log(`column top ${at(1.3, -0.38)}  base front ${at(0.04, 0.08)}  base back ${at(0.04, -0.42)}`);
console.log(`bass string middle ${at(0.55, -0.17)}  treble string middle ${at(1.0, 0.24)}`);
