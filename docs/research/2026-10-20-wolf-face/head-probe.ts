/**
 * Measures the head and the body of the standing wolf clarinetist in the app, in meters. The
 * head is each corner on the head, jaw, ear, or eye bones. Skull width: the x extent of the head
 * corners. Skull height: the skull top (the highest head corner within 5.6 cm of the middle plane, times the window factor)
 * down to the chin (the lowest head corner). Ear span and ear height: the x extent and the y extent
 * of the ear corners. Muzzle length: the front of the head corners (the nose tip) to the middle of
 * the eyes along z. Eye distance: the distance between the middles of the two pea eyes. The body:
 * the shoulder and hip widths (the x extent of the corners that do not follow an arm, in a band of
 * 2 cm around the shoulder joints and around the thigh joints), the trunk depth (the z extent of
 * the spine and chest corners), and the seat. Copy the file to the same path of another tree to
 * measure that tree.
 * Usage: node docs/research/2026-10-20-wolf-face/head-probe.ts [species] [instrument] [window factor]
 * The skull width with no ear leaves out the corners of the ear bones.
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';

const SPECIES = (process.argv[2] ?? 'wolf') as Parameters<typeof buildPlayer>[0];
const INSTRUMENT = (process.argv[3] ?? 'clarinet') as Parameters<typeof buildPlayer>[1];

const stand = buildPlayer(SPECIES, INSTRUMENT, 4, 'stand');
const chair = buildPlayer(SPECIES, INSTRUMENT, 4, 'chair');
const ids = (names: readonly BoneName[]): Set<number> => new Set(names.map((b) => boneIndex(b)));
const HEAD = ids(['head', 'jaw', 'earL', 'earR', 'eyeL', 'eyeR']);
const EARS = ids(['earL', 'earR']);
const ARMS = ids(
  (['upperArm', 'forearm', 'hand', 'fingers'] as const).flatMap(
    (b) => [`${b}L`, `${b}R`] as BoneName[],
  ),
);
const TRUNK = ids(['spine', 'chest']);
const { positions: p, bones } = stand.mesh;
const corner = (c: number): [number, number, number] => [
  p[c * 3] ?? 0,
  p[c * 3 + 1] ?? 0,
  p[c * 3 + 2] ?? 0,
];

/** The extent of the corners that pass a test, on one axis. */
function extent(test: (c: number) => boolean, axis: number): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (let c = 0; c < bones.length; c++) {
    if (test(c)) {
      lo = Math.min(lo, corner(c)[axis] ?? 0);
      hi = Math.max(hi, corner(c)[axis] ?? 0);
    }
  }
  return [lo, hi];
}

/** The middle of the corners on one bone. */
function middle(bone: BoneName): [number, number, number] {
  const sum = [0, 0, 0];
  let n = 0;
  for (let c = 0; c < bones.length; c++) {
    if (bones[c] === boneIndex(bone)) {
      corner(c).forEach((x, k) => (sum[k] = (sum[k] ?? 0) + x));
      n++;
    }
  }
  return [(sum[0] ?? 0) / n, (sum[1] ?? 0) / n, (sum[2] ?? 0) / n];
}

/** The factor of the window of the skull top: 1.2 for the head with the width factor. */
const WINDOW = Number(process.argv[4] ?? '1');
const head = (c: number): boolean => HEAD.has(bones[c] ?? -1);
const ear = (c: number): boolean => EARS.has(bones[c] ?? -1);
const skull = extent((c) => head(c) && Math.abs(corner(c)[0]) < 0.056 * WINDOW, 1)[1];
const chin = extent(head, 1)[0];
const [zlo, zhi] = extent(head, 2);
const eyeL = middle('eyeL');
const eyeR = middle('eyeR');
// The nose tip is the end of the head extent on the side of the eyes.
const eyeZ = (eyeL[2] + eyeR[2]) / 2;
const nose = eyeZ > (zlo + zhi) / 2 ? zhi : zlo;
const joint = (b: BoneName): readonly number[] => stand.skeleton.positions[boneIndex(b)] ?? [];
const band = (y0: number): number => {
  const [lo, hi] = extent(
    (c) => Math.abs(corner(c)[1] - y0) < 0.02 && !ARMS.has(bones[c] ?? -1),
    0,
  );
  return hi - lo;
};
const [tlo, thi] = extent((c) => TRUNK.has(bones[c] ?? -1), 2);
const span = (r: [number, number]): number => r[1] - r[0];
const rows: [string, number][] = [
  ['skull width', span(extent(head, 0))],
  ['skull height (skull top to chin)', skull - chin],
  ['skull width with no ear', span(extent((c) => head(c) && !ear(c), 0))],
  ['ear span', span(extent(ear, 0))],
  ['ear height', span(extent(ear, 1))],
  ['muzzle length (nose tip to the eyes)', Math.abs(nose - eyeZ)],
  ['eye distance', Math.hypot(eyeL[0] - eyeR[0], eyeL[1] - eyeR[1], eyeL[2] - eyeR[2])],
  ['head depth (z extent)', zhi - zlo],
  ['standing skull top', skull],
  ['standing chin', chin],
  ['head height H', stand.body.headHeight],
  ['shoulder joints', joint('upperArmL')[1] ?? 0],
  ['width at the shoulder joints', band(joint('upperArmL')[1] ?? 0)],
  ['width at the thigh joints', band(joint('thighL')[1] ?? 0)],
  ['trunk depth', thi - tlo],
  ['seat', chair.seat?.seatHeight ?? 0],
];
for (const [name, value] of rows) {
  console.log(`${name}: ${value.toFixed(4)} m`);
}
