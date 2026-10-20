/**
 * Measures the size of the wolf and of the red fox in the app, in meters. Standing: the skull
 * top (the highest corner within 5.6 cm of the middle plane), the width across the
 * shoulders and across the haunch (the x extent of the corners that do not follow an arm, in a
 * band of 2 cm around the shoulder joints and around the thigh joints), the depth of the trunk
 * (the z extent of the corners of the spine and the chest), and the ratios of the widths and of
 * the depth to the skull top. Seated: the head top (the highest corner of the head).
 * A width factor scales the window of the skull top, so that it holds the same vertices of the
 * mesh at the proportions of the wolf.
 * Usage: node docs/research/2026-10-20-wolf-shape/size-probe.ts [width factor]
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';

const ARMS = new Set(
  (['upperArm', 'forearm', 'hand', 'fingers'] as const).flatMap((b) => [
    boneIndex(`${b}L` as BoneName),
    boneIndex(`${b}R` as BoneName),
  ]),
);
const TRUNK = new Set([boneIndex('spine'), boneIndex('chest')]);
/** The width factor of the proportions of the wolf, for the window of the skull top. */
const WIDTH = Number(process.argv[2] ?? '1');

for (const [species, instrument] of [
  ['wolf', 'clarinet'],
  ['fox-red', 'violin'],
] as const) {
  const stand = buildPlayer(species, instrument, 4, 'stand');
  const chair = buildPlayer(species, instrument, 4, 'chair');
  const head = boneIndex('head');
  const at = (b: BoneName): readonly number[] => stand.skeleton.positions[boneIndex(b)] ?? [];
  const shoulder = at('upperArmL')[1] ?? 0;
  const hip = at('thighL')[1] ?? 0;
  let skull = -Infinity;
  let wide = -Infinity;
  const band = (y0: number, arms = false): number => {
    let lo = Infinity;
    let hi = -Infinity;
    const p = stand.mesh.positions;
    for (let c = 0; c < stand.mesh.bones.length; c++) {
      const y = p[c * 3 + 1] ?? 0;
      if (Math.abs(y - y0) < 0.02 && (arms || !ARMS.has(stand.mesh.bones[c] ?? -1))) {
        lo = Math.min(lo, p[c * 3] ?? 0);
        hi = Math.max(hi, p[c * 3] ?? 0);
      }
    }
    return hi - lo;
  };
  let zlo = Infinity;
  let zhi = -Infinity;
  for (let c = 0; c < stand.mesh.bones.length; c++) {
    const [x, y, z] = [0, 1, 2].map((k) => stand.mesh.positions[c * 3 + k] ?? 0);
    const bone = stand.mesh.bones[c] ?? -1;
    if (Math.abs(x ?? 0) < 0.056) {
      skull = Math.max(skull, y ?? 0);
    }
    if (Math.abs(x ?? 0) < 0.056 * WIDTH) {
      wide = Math.max(wide, y ?? 0);
    }
    if (TRUNK.has(bone)) {
      zlo = Math.min(zlo, z ?? 0);
      zhi = Math.max(zhi, z ?? 0);
    }
  }
  let seated = -Infinity;
  for (let c = 0; c < chair.mesh.bones.length; c++) {
    if (chair.mesh.bones[c] === head) {
      seated = Math.max(seated, chair.mesh.positions[c * 3 + 1] ?? 0);
    }
  }
  const shoulders = band(shoulder);
  const haunch = band(hip);
  const depth = zhi - zlo;
  console.log(
    `${species}: H ${stand.body.headHeight.toFixed(4)} m, seat ${(chair.seat?.seatHeight ?? 0).toFixed(4)} m, ` +
      `standing skull top ${skull.toFixed(4)} m (${wide.toFixed(4)} m within ${(5.6 * WIDTH).toFixed(2)} cm), seated head top ${seated.toFixed(4)} m, ` +
      `shoulder joints ${shoulder.toFixed(4)} m, width at the shoulders ${shoulders.toFixed(4)} m, ` +
      `width at the haunch ${haunch.toFixed(4)} m, with the arms at the shoulders ${band(shoulder, true).toFixed(4)} m, trunk depth ${depth.toFixed(4)} m, ` +
      `ratios to the skull top: shoulders ${(shoulders / skull).toFixed(3)}, haunch ${(haunch / skull).toFixed(3)}, depth ${(depth / skull).toFixed(3)}`,
  );
}
