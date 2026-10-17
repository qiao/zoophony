/**
 * Measures the seated form of the rabbit, the red fox, and the tan fox in the app, in the model
 * axes (the player faces -z, the chair back at +z, the floor at y 0), for the round fox-form:
 *
 * - the seat height, the seat depth, the knee angle, the slope of the thigh, the slant of the
 *   shin, and the lowest point of the heel half and the toe half of each foot;
 * - the underside of the body over the seat: a point at each 2 mm on each triangle with no corner
 *   on the tail, the arms, the shins, or the feet, and the lowest point over the seat in each band
 *   of 1 cm along z, less the seat top. A negative value goes into the seat. The haunch is the
 *   part behind the hip joints, and the thighs the part in front of them;
 * - the deepest point of the triangles of the thighs and of the tail in the seat box;
 * - the tail where it passes the back posts;
 * - the neck (the neck joint to the head joint), the chin over the shoulder joints, the head top
 *   of the seated player, and the eyes against the desk of the music stand.
 *
 * The legs keep the bind pose in each pose, so the bind values hold in each pose set.
 *
 * Usage, from the root of the worktree: node docs/research/2026-10-17-fox-form/form-probe.ts. The
 * files form-main.txt (7d7fca49) and form-branch.txt hold its output.
 */
import { CHAIR, CHAIR_LEG, MUSIC_STAND } from '../../../src/models/props.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import type { InstrumentId } from '../../../src/models/instruments/types.ts';

const ids = (names: readonly BoneName[]): Set<number> => new Set(names.map(boneIndex));
const tail = ids(['tail1', 'tail2']);
const arms = ids([
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
]);
const lower = ids(['shinL', 'shinR', 'footL', 'footR']);
const thighs = ids(['thighL', 'thighR']);
const footOf = { L: ids(['footL']), R: ids(['footR']) };
const headBones = ids(['head', 'jaw']);
const eyes = ids(['eyeL', 'eyeR']);
const STEP = 0.002;

const cm = (v: number): string => (v * 100).toFixed(1);
const deg = (v: number): string => ((v * 180) / Math.PI).toFixed(1);

const players: readonly [SpeciesId, InstrumentId][] = [
  ['rabbit', 'violin'],
  ['fox-red', 'violin'],
  ['fox-tan', 'flute'],
];
for (const [species, instrument] of players) {
  const model = buildPlayer(species, instrument, 4, 'chair');
  const standing = buildPlayer(species, instrument, 4, 'stand');
  const seat = model.seat;
  if (!seat) {
    throw new Error(`${species} has no seat`);
  }
  const depth = seat.seatDepth ?? CHAIR.seatDepth;
  const back = CHAIR.seatDepth / 2;
  const front = back - depth;
  const posts = back - CHAIR_LEG;
  const top = seat.seatHeight;
  const half = CHAIR.seatWidth / 2;
  const { positions, bones } = model.mesh;
  const at = (c: number, k: number): number => positions[c * 3 + k] ?? 0;
  const joint = (name: BoneName): readonly number[] =>
    model.skeleton.positions[boneIndex(name)] ?? [0, 0, 0];
  const hipZ = joint('thighL')[2] ?? 0;

  // The main bone of a triangle: the bone of the most corners, else the first corner.
  const bands = new Map<number, number>();
  let thighInto = Infinity;
  let thighIntoZ = 0;
  let tailInto = Infinity;
  for (let t = 0; t < bones.length; t += 3) {
    const tb = [bones[t] ?? 0, bones[t + 1] ?? 0, bones[t + 2] ?? 0];
    const isTail = tb.some((b) => tail.has(b));
    if (!isTail && tb.some((b) => arms.has(b) || lower.has(b))) {
      continue;
    }
    const isThigh = tb.every((b) => thighs.has(b));
    const p = [0, 1, 2].map((k) => [at(t + k, 0), at(t + k, 1), at(t + k, 2)]);
    const [a, b, c] = p as [number[], number[], number[]];
    const len = Math.max(
      Math.hypot(...[0, 1, 2].map((i) => (b[i] ?? 0) - (a[i] ?? 0))),
      Math.hypot(...[0, 1, 2].map((i) => (c[i] ?? 0) - (a[i] ?? 0))),
      Math.hypot(...[0, 1, 2].map((i) => (c[i] ?? 0) - (b[i] ?? 0))),
    );
    const n = Math.max(1, Math.ceil(len / STEP));
    for (let i = 0; i <= n; i++) {
      for (let j = 0; i + j <= n; j++) {
        const u = i / n;
        const v = j / n;
        const w = 1 - u - v;
        const x = w * (a[0] ?? 0) + u * (b[0] ?? 0) + v * (c[0] ?? 0);
        const y = w * (a[1] ?? 0) + u * (b[1] ?? 0) + v * (c[1] ?? 0);
        const z = w * (a[2] ?? 0) + u * (b[2] ?? 0) + v * (c[2] ?? 0);
        if (Math.abs(x) > half || z < front || z > back || y < top - 0.2) {
          continue;
        }
        const gap = y - top;
        if (isTail) {
          tailInto = Math.min(tailInto, gap);
          continue;
        }
        const band = Math.floor(z * 100);
        bands.set(band, Math.min(bands.get(band) ?? Infinity, gap));
        if (isThigh && gap < thighInto) {
          thighInto = gap;
          thighIntoZ = z;
        }
      }
    }
  }
  const keys = [...bands.keys()].toSorted((p, q) => p - q);
  const haunch = keys.filter((k) => k / 100 >= hipZ);
  const thighPart = keys.filter((k) => k / 100 < hipZ);
  const most = (list: number[]): number => Math.max(...list.map((k) => bands.get(k) ?? 0));
  const least = (list: number[]): number => Math.min(...list.map((k) => bands.get(k) ?? 0));

  const knee = (side: 'L' | 'R'): string => {
    const hip = joint(`thigh${side}`);
    const k = joint(`shin${side}`);
    const ankle = joint(`foot${side}`);
    const ty = (hip[1] ?? 0) - (k[1] ?? 0);
    const tz = (hip[2] ?? 0) - (k[2] ?? 0);
    const sy = (ankle[1] ?? 0) - (k[1] ?? 0);
    const sz = (ankle[2] ?? 0) - (k[2] ?? 0);
    const angle = Math.acos((ty * sy + tz * sz) / Math.hypot(ty, tz) / Math.hypot(sy, sz));
    const thigh = Math.atan2(ty, tz);
    const slant = Math.atan2(-sz, -sy);
    return `${side} ${deg(angle)}° (thigh ${deg(-thigh)}° from level, shin ${deg(slant)}° forward of vertical, ankle ${cm(-sz)} cm in front of the knee)`;
  };

  const heel = { L: Infinity, R: Infinity };
  const toe = { L: Infinity, R: Infinity };
  const footZ = { L: [Infinity, -Infinity], R: [Infinity, -Infinity] };
  let headTop = -Infinity;
  let eyeLow = Infinity;
  let haunchBack = -Infinity;
  let tailLow = Infinity;
  let tailHigh = -Infinity;
  for (let c = 0; c < bones.length; c++) {
    const bone = bones[c] ?? 0;
    for (const side of ['L', 'R'] as const) {
      if (footOf[side].has(bone)) {
        const z = footZ[side];
        z[0] = Math.min(z[0] ?? Infinity, at(c, 2));
        z[1] = Math.max(z[1] ?? -Infinity, at(c, 2));
      }
    }
  }
  for (let c = 0; c < bones.length; c++) {
    const bone = bones[c] ?? 0;
    const [x, y, z] = [at(c, 0), at(c, 1), at(c, 2)];
    if (headBones.has(bone)) {
      headTop = Math.max(headTop, y);
    }
    if (eyes.has(bone)) {
      eyeLow = Math.min(eyeLow, y);
    }
    for (const side of ['L', 'R'] as const) {
      if (footOf[side].has(bone)) {
        const [lo, hi] = footZ[side];
        if (z > ((lo ?? 0) + (hi ?? 0)) / 2) {
          heel[side] = Math.min(heel[side], y);
        } else {
          toe[side] = Math.min(toe[side], y);
        }
      }
    }
    if (tail.has(bone)) {
      if (z >= posts - 0.01 && z <= back + 0.01) {
        tailLow = Math.min(tailLow, y - top);
        tailHigh = Math.max(tailHigh, y - top);
      }
      continue;
    }
    if (arms.has(bone) || lower.has(bone) || Math.abs(x) > half) {
      continue;
    }
    if (y < top + 0.12 && y > top - 0.02) {
      haunchBack = Math.max(haunchBack, z);
    }
  }

  const sj = (name: BoneName): readonly number[] =>
    standing.skeleton.positions[boneIndex(name)] ?? [0, 0, 0];
  let chin = Infinity;
  for (let c = 0; c < standing.mesh.bones.length; c++) {
    const y = standing.mesh.positions[c * 3 + 1] ?? 0;
    const z = standing.mesh.positions[c * 3 + 2] ?? 0;
    if (headBones.has(standing.mesh.bones[c] ?? -1) && z < (sj('head')[2] ?? 0)) {
      chin = Math.min(chin, y);
    }
  }
  const H = standing.body.headHeight;
  const neck = Math.hypot(...[0, 1, 2].map((i) => (sj('head')[i] ?? 0) - (sj('neck')[i] ?? 0)));
  const chinUp = chin - (sj('upperArmL')[1] ?? 0);

  console.log(
    `${species} ${instrument}: seat ${cm(top)} cm high, ${cm(depth)} cm deep, front edge z ${cm(front)}, hip joints z ${cm(hipZ)}; knee ${knee('L')}; ${knee('R')}`,
  );
  console.log(
    `  soles above the floor: heel L ${cm(heel.L)}, toes L ${cm(toe.L)}, heel R ${cm(heel.R)}, toes R ${cm(toe.R)} cm; back of the haunch ${cm(posts - haunchBack)} cm in front of the posts`,
  );
  console.log(
    `  underside over the seat top (sampled faces, cm): haunch behind the hip joints up to ${cm(most(haunch))} and down to ${cm(least(haunch))}; thighs in front of them up to ${cm(most(thighPart))} and down to ${cm(least(thighPart))}; thigh triangles at most ${cm(-Math.min(0, thighInto))} cm into the seat (z ${cm(thighIntoZ)}); tail at most ${cm(-Math.min(0, tailInto))} cm into the seat`,
  );
  console.log(
    `  bands (z cm: gap cm): ${keys.map((k) => `${k}: ${cm(bands.get(k) ?? 0)}`).join(', ')}`,
  );
  console.log(
    tailHigh === -Infinity
      ? '  no tail at the back posts'
      : `  tail at the back posts: ${cm(tailLow)} to ${cm(tailHigh)} cm above the seat`,
  );
  console.log(
    `  H ${cm(H)} cm; neck joint to head joint ${cm(neck)} cm = ${(neck / H).toFixed(3)} H; chin ${cm(chinUp)} cm = ${(chinUp / H).toFixed(3)} H above the shoulder joints; seated head top ${cm(headTop)} cm, lowest eye ${cm(eyeLow)} cm (desk top edge ${cm(MUSIC_STAND.deskHeight + (MUSIC_STAND.deskDepth / 2) * Math.cos(MUSIC_STAND.tilt))} cm)`,
  );
}
