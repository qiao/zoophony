/**
 * Prints the quaternion [x, y, z, w] of a turn y (around the vertical), then x (around the left to
 * right axis, positive moves the lower end forward), then z (positive moves the lower end to the
 * right), in degrees, in the axes of the chest. Usage: node docs/research/2026-10-19-pig-mesh/q.ts <y> <x> <z>
 */
import { MathUtils, Quaternion, Vector3 } from 'three';

const [y = 0, x = 0, z = 0] = process.argv.slice(2).map(Number);
const d = MathUtils.DEG2RAD;
const q = new Quaternion()
  .setFromAxisAngle(new Vector3(0, 1, 0), y * d)
  .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), x * d))
  .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), z * d));
console.log(q.toArray().map((v) => Number(v.toFixed(6))).join(','));
