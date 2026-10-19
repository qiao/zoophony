/**
 * Measures the rest place of the horn of the seated pig for variants of the hold: the spare reach
 * of each palm to its grip, and the places of the coil center, the valves, the bell mouth, and the
 * mouthpiece in the model axes (-z forward, -x left), with the chest in its bind pose. Each
 * argument is one variant of --set changes, as `pnpm hold-fit --set` takes them.
 *
 * Usage: node docs/research/2026-10-19-pig-mesh/rest-probe.ts '<changes>' ...
 */
import { Vector3 } from 'three';

import { placePoint } from '../../../src/models/instruments/hold.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import type { Vec3 } from '../../../src/models/tuples.ts';
import { windGrips, windHoldOf, windRig } from '../../../src/pose/winds.ts';
import { armLength } from '../../../tools/hold-reach.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const cm = (v: number): string => (v * 100).toFixed(1);
const at = (v: Vec3): string => v.map((x) => x.toFixed(3)).join(' ');

for (const changes of process.argv.slice(2)) {
  const { undo } = setHolds(changes);
  try {
    const model = buildPlayer('pig', 'horn', 4, 'chair');
    const rig = windRig(model, 'horn', windHoldOf('pig', 'horn'));
    const point = (p: Vec3, weight: number): Vec3 =>
      windGrips({ ...rig, left: { ...rig.left, grip: p } }, weight).L.grip;
    const bell = model.instrument.targets.find((t) => t.kind === 'bell');
    const coil = placePoint(model.pieces, { bone: 'instrument', at: [0.08, -0.3, -0.1] });
    const lines = [`${changes || 'base'}:`];
    for (const [name, w] of [
      ['play', 1],
      ['rest', 0],
    ] as const) {
      const g = windGrips(rig, w);
      const spare = (s: 'L' | 'R'): string =>
        cm(
          armLength(model, s) - new Vector3(...g[s].joint).distanceTo(new Vector3(...g[s].grip)),
        );
      lines.push(
        `  ${name}: spare L ${spare('L')} cm, R ${spare('R')} cm; grip L ${at(g.L.grip)}, grip R ${at(g.R.grip)}`,
        `    coil center ${at(point(coil, w))}, bell mouth ${bell ? at(point(placePoint(model.pieces, { bone: 'instrument', at: bell.from }), w)) : '-'}, mouthpiece ${at(point(rig.pivot, w))}`,
      );
    }
    console.log(lines.join('\n'));
  } finally {
    undo();
  }
}
