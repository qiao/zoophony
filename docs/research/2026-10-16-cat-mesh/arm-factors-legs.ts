/**
 * Prints the scale and the arm factor of the reach of the red fox (0.5452 m) of the cat rig config
 * with the leg factor 1 and 1.5, when the standing ear tips are 1.758 m above the floor, the ear
 * tips of the red fox of the app. The ear tips of the source are 1 unit above the soles, and the
 * leg factor raises them by `legRise()`. Usage:
 *
 *     node docs/research/2026-10-16-cat-mesh/arm-factors-legs.ts
 */
import { readFileSync } from 'node:fs';
import {
  armReach,
  legRise,
  parseConfig,
  shoulderHeight,
  targetFactor,
} from '../../../tools/rig-mesh.ts';

const base = parseConfig(readFileSync('tools/mesh-rigs/cat.json', 'utf8'));
for (const legFactor of [1, 1.5]) {
  const legs = { ...base, legFactor };
  const ears = 1 + legRise(legs);
  const shoulders = (1.758 * shoulderHeight(legs)) / ears;
  const config = { ...legs, app: { ...legs.app, shoulders, reach: 0.5452 } };
  console.log(
    `legs ${legFactor}: rise ${legRise(legs).toFixed(5)} u, ear tips ${ears.toFixed(5)} u, ` +
      `scale ${(1.758 / ears).toFixed(6)} m/u, shoulder joints ${shoulderHeight(legs).toFixed(5)} u = ` +
      `${shoulders.toFixed(6)} m, reach with no factor ${armReach(config, 'L', 1).toFixed(4)} m, ` +
      `factor of 0.5452 m: L ${targetFactor(config, 'L').toFixed(4)}, R ${targetFactor(config, 'R').toFixed(4)}`,
  );
}
