// Gives the restShift (in H) of the flute of the tan fox that puts its foot at a point.
// Usage: node docs/research/2026-10-24-wind-holds/fox-solve.ts <forward> <down> <fx> <fy> <fz>
import { Vector3 } from 'three';

import { buildPlayer } from '../../../src/models/player.ts';
import { fluteTurn, windGrips, windHoldOf, windRig } from '../../../src/pose/winds.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const [f, d, fx, fy, fz] = process.argv.slice(2).map(Number);
const q = fluteTurn(f, d, [0.7, 0, 0.7]).join(',');
setHolds(`flute@fox-tan.rest=${q};flute@fox-tan.restShift=0,0,0`);
const model = buildPlayer('fox-tan', 'flute');
const h = model.body.headHeight;
const g = windGrips(windRig(model, 'flute', windHoldOf('fox-tan', 'flute')), 0);
const l = new Vector3(...g.L.grip);
const r = new Vector3(...g.R.grip);
const dir = r.clone().sub(l).normalize();
// The foot is 0.57 m - 0.16 m past the left grip along the tube.
const foot = l.clone().addScaledVector(dir, 0.57 - 0.16);
const shift = new Vector3(fx, fy, fz).sub(foot).divideScalar(h);
const grip = r.clone().add(shift.clone().multiplyScalar(h));
console.log(
  `${shift.toArray().map((x) => x.toFixed(3)).join(',')} grip R ${grip.toArray().map((x) => x.toFixed(3)).join(',')}`,
);
