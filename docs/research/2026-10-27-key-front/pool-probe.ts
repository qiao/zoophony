// Probe: the light of the key light at the stage points, as a part of the stage center.
// Usage: node scratch/pool-probe.ts <angle deg> <aim> <azimuth deg> <elevation deg>
import { SpotLight, Vector3 } from 'three';

import { KEY_PLACE } from '../src/models/beam.ts';
import { conductorOn } from '../src/models/layout-scene.ts';
import { KEY_LIGHT, createLights } from '../src/scene/lights.ts';

const [deg, aim, az, el] = process.argv.slice(2).map(Number);
const writable = (o: object, k: string, v: number): void => {
  Reflect.set(o, k, v);
};
writable(KEY_LIGHT, 'angle', ((deg ?? 19) * Math.PI) / 180);
writable(KEY_LIGHT, 'aimToPodium', aim ?? 0);
writable(KEY_PLACE, 'azimuth', ((az ?? 35) * Math.PI) / 180);
writable(KEY_PLACE, 'elevation', ((el ?? 60) * Math.PI) / 180);
const side = 11.19;
const conductor = conductorOn([0, 0, side / 2 - 1]);
const g = createLights(side, 'high', conductor, { beam: false });
const spot = g.children.find((c) => c instanceof SpotLight && c.name === 'key');
if (!(spot instanceof SpotLight)) {
  throw new Error('no key light');
}
const axis = spot.target.position.clone().sub(spot.position);
const cone = (a: number): number => {
  const outer = spot.angle;
  const inner = outer * (1 - spot.penumbra);
  if (a >= outer) {
    return 0;
  }
  if (a <= inner) {
    return 1;
  }
  const t = (Math.cos(a) - Math.cos(outer)) / (Math.cos(inner) - Math.cos(outer));
  return t * t * (3 - 2 * t);
};
const light = (x: number, z: number): number => {
  const to = new Vector3(x, 0, z).sub(spot.position);
  return (cone(to.angleTo(axis)) * -to.y) / to.length() ** 3;
};
const c = light(0, 0);
const h = side / 2;
const points = [
  ['left mid', -h, 0],
  ['right mid', h, 0],
  ['front left', -h, h],
  ['front mid', 0, h],
  ['front right', h, h],
  ['back right', h, -h],
  ['back left', -h, -h],
  ['back mid', 0, -h],
] as const;
for (const [n, x, z] of points) {
  process.stdout.write(`${n} ${(light(x, z) / c).toFixed(2)}  `);
}
console.log(`(angle ${deg}, aim ${aim}, azimuth ${az}, elevation ${el})`);
