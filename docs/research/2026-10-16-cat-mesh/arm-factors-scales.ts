/**
 * Prints the arm factor of the cat rig config that gives each target reach at three scales: the
 * shoulder joints of the parametric cat (0.55233 m), its ear tips (1.160 m), and the ear tips of
 * the red fox of the app (1.758 m). The viola reach of each scale is the distance from the left
 * shoulder joint to the scroll in the playing pose of `pnpm hold-reach cat --instrument viola`
 * (hold-reach-cat-viola*.txt). Usage: `node docs/research/2026-10-16-cat-mesh/arm-factors-scales.ts`.
 */
import { readFileSync } from 'node:fs';
import { armReach, parseConfig, targetFactor } from '../../../tools/rig-mesh.ts';

const base = parseConfig(readFileSync('tools/mesh-rigs/cat.json', 'utf8'));
for (const [name, shoulders, viola] of [
  ['shoulder joints of the parametric cat', 0.55233, 0.617],
  ['ear tips of the parametric cat (1.160 m)', 0.73776, 0.63],
  ['ear tips of the red fox of the app (1.758 m)', 1.11811, 0.663],
] as const) {
  const config = { ...base, app: { ...base.app, shoulders } };
  const factor = (reach: number): string =>
    targetFactor({ ...config, app: { ...config.app, reach } }, 'L').toFixed(4);
  console.log(
    `${name}: shoulders ${shoulders} m, ${(shoulders / 0.636).toFixed(4)} m for each unit, reach with no factor ${armReach(config, 'L', 1).toFixed(4)} m. Factor of the viola reach ${viola} m: ${factor(viola)}, of the red fox reach 0.5452 m: ${factor(0.5452)}, of the rabbit reach 0.5056 m: ${factor(0.5056)}`,
  );
}
