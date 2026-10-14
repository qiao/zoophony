// Prints --set values of the rest of the flute of the tan fox: the lip plate at a place (m) and
// the tube toward the foot along a direction, the keys to the front.
import { Vector3 } from 'three';
import { buildPlayer } from '../../../src/models/player.ts';
import { fluteTurn, SPECIES_WIND_HOLDS } from '../../../src/pose/winds.ts';
const [lx, ly, lz, ax, ay, az, kx = 0, ky = 0, kz = -1] = process.argv.slice(2).map(Number);
const m = buildPlayer('fox-tan', 'flute');
const H = m.body.headHeight;
const hold = SPECIES_WIND_HOLDS['fox-tan']!.flute!;
const lip = new Vector3(...hold.lipShift);
const shift = new Vector3(lx!, ly!, lz!).sub(new Vector3(...m.body.mouth)).divideScalar(H).sub(lip);
const a = new Vector3(ax!, ay!, az!).normalize();
const down = Math.asin(-a.y) * 180 / Math.PI;
const forward = Math.atan2(-a.z, a.x) * 180 / Math.PI;
const q = fluteTurn(forward, down, [kx, ky, kz]).map((v) => v.toFixed(6)).join(',');
console.log(`flute@fox-tan.rest=${q};flute@fox-tan.restShift=${shift.toArray().map((v) => v.toFixed(3)).join(',')}`);
console.error(`forward ${forward.toFixed(1)} down ${down.toFixed(1)}`);
