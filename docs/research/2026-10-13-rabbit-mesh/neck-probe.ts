/**
 * Measures the faces of the dark band under the head of the rabbit in the side and the back
 * close views: the faces of the seated bind mesh of the studio body between the neck joint and
 * the head joint. It prints their colors and the direction of their normals, so that the cause of
 * the band shows: a dark face color, or faces that face down to the weak ground fill of the stage
 * light. `pnpm fold-probe violinist` counts the folded faces. Usage:
 *
 *     node docs/research/2026-10-13-rabbit-mesh/neck-probe.ts
 */
import { Vector3 } from 'three';

import { STUDIO_RABBIT } from '../../../src/models/studio/rabbit.ts';
import { unpackStudioMesh } from '../../../src/models/studio-format.ts';

const mesh = unpackStudioMesh(STUDIO_RABBIT.mesh);
const low = STUDIO_RABBIT.heads.neck[1];
const high = STUDIO_RABBIT.heads.head[1];
const at = (v: number): Vector3 => new Vector3().fromArray(mesh.positions, v * 3);
const rows = { down: 0, side: 0, up: 0 };
let luminance = 0;
let lowest = Infinity;
let count = 0;
for (let t = 0; t < mesh.corners.length / 3; t++) {
  const [a, b, c] = [0, 1, 2].map((k) => at(mesh.corners[t * 3 + k] ?? 0));
  if (!a || !b || !c) {
    continue;
  }
  const middle = a.clone().add(b).add(c).divideScalar(3);
  if (middle.y < low || middle.y > high) {
    continue;
  }
  const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
  rows[normal.y < -0.3 ? 'down' : normal.y > 0.3 ? 'up' : 'side'] += 1;
  const [r = 0, g = 0, bl = 0] = mesh.colors.subarray(t * 3, t * 3 + 3);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  luminance += lum;
  lowest = Math.min(lowest, lum);
  count += 1;
}
console.log(
  `faces between the neck joint (${low.toFixed(3)} m) and the head joint (${high.toFixed(3)} m): ${count}`,
);
console.log(`normals: ${rows.down} face down (y < -0.3), ${rows.side} to the side, ${rows.up} up`);
console.log(
  `linear luminance of their colors: mean ${(luminance / count).toFixed(3)}, lowest ${lowest.toFixed(3)}`,
);
