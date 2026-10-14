/**
 * Prints the scale and the arm factors of the fox rig for three landmarks of the scale: the
 * standing shoulder joints of the parametric fox (0.581 m, the landmark of the first config), its
 * standing head top (1.083 m), and its standing ear tips (1.221 m), from `landmark-probe.txt`.
 * The head top of the mesh between the ears is 0.908 units (`sections-x.txt`, the cut at x 0.001),
 * and its ear tips are at 1 unit. For each landmark, it gives the meters of one unit, the
 * standing shoulder joints, head top, and ear tips, the reach with no factor, and the arm factor
 * of the reach of the parametric fox (0.543 m) and of the rabbit (0.377 m). Usage:
 *
 *     node docs/research/2026-10-14-fox-mesh/scale-variants.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { armReach, jointHead, parseConfig } from '../../../tools/rig-mesh.ts';

const root = join(import.meta.dirname, '..', '..', '..');
const base = parseConfig(readFileSync(join(root, 'tools/mesh-rigs/fox.json'), 'utf8'));
const shoulder = jointHead(base, 'upper_arm_L')[1];
const headTop = 0.908;
for (const [name, meters] of [
  ['shoulder joints 0.581 m', 0.581 / shoulder],
  ['head top 1.083 m', 1.083 / headTop],
  ['ear tips 1.221 m', 1.221],
] as const) {
  const factors = [0.543, 0.377].map((reach) => {
    const config = { ...base, app: { shoulders: shoulder * meters, reach } };
    const short = armReach(config, 'L', 1);
    const paw = armReach(config, 'L', 0);
    return `${reach} m: ${((reach - paw) / (short - paw)).toFixed(3)}`;
  });
  const config = { ...base, app: { shoulders: shoulder * meters, reach: 0.543 } };
  console.log(
    `${name}: ${meters.toFixed(4)} m for each unit, shoulders ${(shoulder * meters).toFixed(3)} m, ` +
      `head top ${(headTop * meters).toFixed(3)} m, ear tips ${meters.toFixed(3)} m, reach ` +
      `${armReach(config, 'L', 1).toFixed(4)} m with no factor, factor for ${factors.join(', ')}`,
  );
}
