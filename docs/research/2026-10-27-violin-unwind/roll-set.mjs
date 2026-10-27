// Prints the --set text that rolls the rest instrument of the rabbit, the red fox, and the cat by
// <alpha> degrees about the normal of its top plate (the scroll turns to the left of the player for
// alpha > 0), with more changes after it.
// Usage: node docs/research/2026-10-27-violin-unwind/roll-set.mjs <alpha> [<changes>]
import { Quaternion, Vector3 } from 'three';

const alpha = (Number(process.argv[2]) * Math.PI) / 180;
const extra = process.argv[3] ?? '';
const roll = (axis, top) => {
  const normal = new Vector3(...top).normalize().negate();
  const v = new Vector3(...axis).applyQuaternion(new Quaternion().setFromAxisAngle(normal, alpha));
  return `[${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}]`;
};
const parts = [
  `violin@rabbit.rest.axis=${roll([0, 1, -0.15], [0, 0, -1])}`,
  `violin@fox-red.rest.axis=${roll([0, 1, -0.15], [0, 0, -1])}`,
  `viola@cat.rest.axis=${roll([0, 1, -0.15], [-0.5, 0, -0.87])}`,
];
console.log(parts.join(';') + (extra ? `;${extra}` : ''));
