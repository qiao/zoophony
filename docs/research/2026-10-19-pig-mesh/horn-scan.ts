/**
 * Measures the reach of the horn grips of the pig for hold variants and horn scales, in a copy of
 * the tree with the pig body of a GLB file (run by horn-scan-run.ts, which places this file in
 * tools/ of the copy). A scale moves each grip toward the mouthpiece, as a smaller horn does.
 * Each variant turns the horn around the mouthpiece in the playing pose: x moves the lower end
 * forward (negative: back toward the body), z moves it to the right, and y turns it to the left
 * around the vertical (degrees, in this order: y, then x, then z, after HORN_TURN of the model).
 *
 * Usage: node tools/horn-scan.ts '<y>,<x>,<z>' ... with the scales in SCALES.
 */
import { MathUtils, Quaternion, Vector3 } from 'three';

import { buildPlayer } from '../src/models/player.ts';
import { toQuat, toVec3 } from '../src/models/tuples.ts';
import type { Vec3 } from '../src/models/tuples.ts';
import { WIND_HOLDS, windGrips, windRig } from '../src/pose/winds.ts';
import type { WindHold, WindRig } from '../src/pose/winds.ts';
import { armLength } from './hold-reach.ts';

const SCALES = [1, 0.8, 0.6];
const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);
const deg = MathUtils.DEG2RAD;

const model = buildPlayer('pig', 'horn', 4, 'chair');
const armL = armLength(model, 'L');
const armR = armLength(model, 'R');
const cm = (v: number): string => (v * 100).toFixed(1);
console.log(`arm L ${cm(armL)} cm, arm R ${cm(armR)} cm`);

const scaled = (rig: WindRig, s: number): WindRig => {
  const at = (grip: Vec3): Vec3 =>
    toVec3(
      new Vector3(...grip)
        .sub(new Vector3(...rig.pivot))
        .multiplyScalar(s)
        .add(new Vector3(...rig.pivot)),
    );
  return {
    ...rig,
    left: { ...rig.left, grip: at(rig.left.grip) },
    right: { ...rig.right, grip: at(rig.right.grip) },
  };
};

for (const arg of process.argv.slice(2)) {
  const [y = 0, x = 0, z = 0] = arg.split(',').map(Number);
  const play = toQuat(
    new Quaternion()
      .setFromAxisAngle(Y, y * deg)
      .multiply(new Quaternion().setFromAxisAngle(X, x * deg))
      .multiply(new Quaternion().setFromAxisAngle(Z, z * deg)),
  );
  const hold: WindHold = { ...WIND_HOLDS.horn, play };
  const base = windRig(model, 'horn', hold);
  const cells: string[] = [];
  for (const s of SCALES) {
    const g = windGrips(scaled(base, s), 1);
    const d = (side: 'L' | 'R'): number =>
      new Vector3(...g[side].joint).distanceTo(new Vector3(...g[side].grip));
    const rel = (side: 'L' | 'R'): string =>
      new Vector3(...g[side].grip)
        .sub(new Vector3(...g[side].joint))
        .toArray()
        .map((v) => cm(v))
        .join(' ');
    cells.push(
      `s ${s}: L ${cm(armL - d('L'))} (${rel('L')}) R ${cm(armR - d('R'))} (${rel('R')})`,
    );
  }
  console.log(`turn y ${y} x ${x} z ${z}, spare cm (grip from the shoulder joint, cm):`);
  for (const c of cells) {
    console.log(`  ${c}`);
  }
}
const pivot = windRig(model, 'horn').pivot;
console.log(`mouthpiece (pivot) ${pivot.map((v) => cm(v)).join(' ')} cm`);

// The seated joints of the right side, for the rest place of the horn on the lap.
import { boneIndex } from '../src/models/rig.ts';
for (const b of ['upperArmR', 'upperArmL', 'thighR', 'shinR', 'footR', 'hips', 'chest'] as const) {
  console.log(b, (model.skeleton.positions[boneIndex(b)] ?? []).map((v) => cm(v)).join(' '));
}
