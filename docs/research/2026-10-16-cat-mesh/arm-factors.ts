/**
 * Prints the arm factor of the cat rig config that gives each target reach: the viola hold of the
 * cat, the rabbit, the red fox, and the parametric cat (`targetFactor()` of `tools/rig-mesh.ts`).
 * Usage: `node docs/research/2026-10-16-cat-mesh/arm-factors.ts`.
 */
import { readFileSync } from 'node:fs';
import { armReach, parseConfig, targetFactor } from '../../../tools/rig-mesh.ts';

const config = parseConfig(readFileSync('tools/mesh-rigs/cat.json', 'utf8'));
console.log(`reach with no factor ${armReach(config, 'L', 1).toFixed(4)} m, paw ${armReach(config, 'L', 0).toFixed(4)} m`);
for (const [name, reach] of [
  ['viola hold of the cat (shoulder to scroll, hold-reach-cat-viola.txt)', 0.617],
  ['red fox (app.reach of fox.json)', 0.5452],
  ['parametric cat of main (hold-reach-main-cat.txt)', 0.516],
  ['rabbit (app.reach of rabbit.json)', 0.5056],
] as const) {
  const factor = targetFactor({ ...config, app: { ...config.app, reach } }, 'L');
  console.log(`${name}: ${reach} m, arm factor ${factor.toFixed(4)}`);
}
