/**
 * Measures the form of the standing and the seated cat (and the red fox) of the app, with the
 * rules of scratch/sheet_ratios.py: a raster of the standing body with no arms, no instrument, and
 * no tail at 2 mm, the head width at the eyes, the head height from the crown to the narrowest
 * neck row, the belly (the widest middle run 45% to 60% of the way from the crown to the soles),
 * the hips (60% to 75%), and the deepest side run (45% to 75%). It also gives the neck (the neck
 * joint to the head joint), the chin over the shoulder joints, the ear tips, and the seated head
 * top. Usage, from the root of a tree: node <path>/form-probe.ts
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';

const STEP = 0.002;
const skip = new Set(
  (
    [
      'upperArmL',
      'forearmL',
      'handL',
      'fingersL',
      'upperArmR',
      'forearmR',
      'handR',
      'fingersR',
      'instrument',
      'bow',
      'tail1',
      'tail2',
    ] as BoneName[]
  ).map(boneIndex),
);

function raster(
  pos: Float32Array,
  bones: Uint8Array,
  axis: 0 | 2,
): { grid: Uint8Array; w: number; h: number; x0: number } {
  const x0 = -0.6;
  const w = Math.round(1.2 / STEP);
  const h = Math.round(2.0 / STEP);
  const grid = new Uint8Array(w * h);
  for (let t = 0; t < bones.length; t += 3) {
    if ([0, 1, 2].some((k) => skip.has(bones[t + k] ?? 0))) {
      continue;
    }
    const p = [0, 1, 2].map((k) => [
      ((pos[(t + k) * 3 + axis] ?? 0) - x0) / STEP,
      (pos[(t + k) * 3 + 1] ?? 0) / STEP,
    ]) as [number, number][];
    const [a, b, c] = p as [[number, number], [number, number], [number, number]];
    const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
    const maxX = Math.min(w - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
    const maxY = Math.min(h - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(d) < 1e-9) {
      continue;
    }
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const l1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / d;
        const l2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / d;
        if (l1 >= -0.01 && l2 >= -0.01 && 1 - l1 - l2 >= -0.01) {
          grid[y * w + x] = 1;
        }
      }
    }
  }
  return { grid, w, h, x0 };
}

function centerWidth(r: ReturnType<typeof raster>, y: number): number {
  const c = Math.round(-r.x0 / STEP);
  if (!r.grid[y * r.w + c]) {
    return 0;
  }
  let l = c;
  while (l > 0 && r.grid[y * r.w + l - 1]) {
    l--;
  }
  let rr = c;
  while (rr < r.w - 1 && r.grid[y * r.w + rr + 1]) {
    rr++;
  }
  return (rr - l + 1) * STEP;
}

function largestRun(r: ReturnType<typeof raster>, y: number): number {
  let best = 0;
  let run = 0;
  for (let x = 0; x < r.w; x++) {
    run = r.grid[y * r.w + x] ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best * STEP;
}

const cm = (v: number): string => (v * 100).toFixed(1);
for (const [species, instrument] of [
  ['cat', 'viola'],
  ['fox-red', 'violin'],
] as const) {
  const m = buildPlayer(species, instrument, 4, 'stand');
  const chair = buildPlayer(species, instrument, 4, 'chair');
  const joint = (b: BoneName): readonly number[] =>
    m.skeleton.positions[boneIndex(b)] ?? [0, 0, 0];
  const front = raster(m.mesh.positions, m.mesh.bones, 0);
  const side = raster(m.mesh.positions, m.mesh.bones, 2);
  const c = Math.round(-front.x0 / STEP);
  let crown = 0;
  for (let y = front.h - 1; y >= 0; y--) {
    if (front.grid[y * front.w + c]) {
      crown = y;
      break;
    }
  }
  const eye = Math.round((joint('eyeL')[1] ?? 0) / STEP);
  const shoulder = Math.round((joint('upperArmL')[1] ?? 0) / STEP);
  let neckRow = eye;
  for (let y = eye; y >= shoulder; y--) {
    if (centerWidth(front, y) < centerWidth(front, neckRow)) {
      neckRow = y;
    }
  }
  const hw = centerWidth(front, eye);
  const hh = (crown - neckRow) * STEP;
  const height = crown;
  let crotch = neckRow;
  while (crotch > 0 && front.grid[(crotch - 1) * front.w + c]) {
    crotch--;
  }
  const trunk = neckRow - crotch;
  const band = (a: number, b: number): number[] => {
    const out: number[] = [];
    for (let y = Math.round(neckRow - b * trunk); y <= Math.round(neckRow - a * trunk); y++) {
      out.push(y);
    }
    return out;
  };
  const most = (rows: number[], f: (y: number) => number): [number, number] =>
    rows.reduce<[number, number]>((best, y) => (f(y) > best[0] ? [f(y), y] : best), [0, 0]);
  const [belly, bellyY] = most(band(0.4, 0.75), (y) => centerWidth(front, y));
  const [hips, hipsY] = most(band(0.75, 1), (y) => centerWidth(front, y));
  const [depth, depthY] = most(band(0.4, 1), (y) => largestRun(side, y));
  const ears = new Set([boneIndex('earL'), boneIndex('earR')]);
  const headBones = new Set([boneIndex('head'), boneIndex('jaw')]);
  let earTop = -Infinity;
  let chin = Infinity;
  for (let k = 0; k < m.mesh.bones.length; k++) {
    const y = m.mesh.positions[k * 3 + 1] ?? 0;
    const z = m.mesh.positions[k * 3 + 2] ?? 0;
    if (ears.has(m.mesh.bones[k] ?? -1)) {
      earTop = Math.max(earTop, y);
    }
    // The chin: the lowest head corner in front of the head joint (the player faces -z).
    if (headBones.has(m.mesh.bones[k] ?? -1) && z < (joint('head')[2] ?? 0)) {
      chin = Math.min(chin, y);
    }
  }
  let seatedTop = -Infinity;
  for (let k = 0; k < chair.mesh.bones.length; k++) {
    if (headBones.has(chair.mesh.bones[k] ?? -1)) {
      seatedTop = Math.max(seatedTop, chair.mesh.positions[k * 3 + 1] ?? 0);
    }
  }
  const H = m.body.headHeight;
  const neck = Math.hypot(
    ...[0, 1, 2].map((i) => (joint('head')[i] ?? 0) - (joint('neck')[i] ?? 0)),
  );
  const chinUp = chin - (joint('upperArmL')[1] ?? 0);
  console.log(
    `${species}: H ${cm(H)} cm; neck joint to head joint ${cm(neck)} cm = ${(neck / H).toFixed(3)} H; chin ${cm(chinUp)} cm = ${(chinUp / H).toFixed(3)} H above the shoulder joints; standing ear tips ${cm(earTop)} cm, crown ${cm(crown * STEP)} cm; seated head top ${cm(seatedTop)} cm, seat ${cm(chair.seat?.seatHeight ?? 0)} cm; trunk (hips joint to shoulder joints) ${cm((joint('upperArmL')[1] ?? 0) - (joint('hips')[1] ?? 0))} cm`,
  );
  console.log(
    `${species}: head width at the eyes ${cm(hw)} cm, head height (crown to the narrowest neck row) ${cm(hh)} cm; belly ${cm(belly)} cm (y ${cm(bellyY * STEP)}) = ${(belly / hw).toFixed(3)} HW = ${(belly / hh).toFixed(3)} HH; hips ${cm(hips)} cm (y ${cm(hipsY * STEP)}) = ${(hips / hw).toFixed(3)} HW = ${(hips / hh).toFixed(3)} HH; depth ${cm(depth)} cm (y ${cm(depthY * STEP)}) = ${(depth / hw).toFixed(3)} HW = ${(depth / hh).toFixed(3)} HH; height ${((height * STEP) / hh).toFixed(2)} HH, neck to crotch ${cm(trunk * STEP)} cm = ${((trunk * STEP) / hh).toFixed(2)} HH`,
  );
}
