/**
 * Measures the seat and the legs of the seated rabbit, red fox, and tan fox in the app, in the
 * model axes (the player faces -z, the chair back at +z, the floor at y 0):
 *
 * - the seat height, the seat depth, the front edge, and the back posts of the chair;
 * - the back of the haunch (the largest z of the body corners up to 0.12 m over the seat, with no
 *   tail and no arm) and its gap to the back posts, and the backmost corner of the trunk below the
 *   top of the chair back and its gap to the posts;
 * - the back of the knees (the largest z of the corners of the shins and the feet) and its gap to
 *   the front edge of the seat (positive when the edge is behind the knees);
 * - the knee angle from the side: the angle at the knee joint between the hip joint and the ankle
 *   joint, seen along x (180° is a straight leg), and the slant of the shin forward of vertical;
 * - the lowest point of each leg above the floor (the corners of the thigh, the shin, and the
 *   foot), the lowest point of the heel half and of the toe half of each foot, and the eye height
 *   and the head top;
 * - the backmost body corner (no tail) in the x and y range of each box of the chair back (the two
 *   posts and the top rail, `chairBack()`), and its gap to the box, as `chairForward()` of
 *   `models/player.ts` measures the parametric bodies;
 * - the tail where it passes the back posts: its height above the seat and its width, against the
 *   bottom of the top rail and the posts;
 * - the underside of the body over the seat top, in bands of 2 cm along z.
 *
 * The legs keep the bind pose in each pose (`writeBody()` of `pose/pose-at.ts`), and the root
 * offset is 0, so the bind values hold in each pose set.
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-16-hip-open/seat-probe.ts
 */
import { CHAIR, CHAIR_LEG, MUSIC_STAND, chairBack } from '../../../src/models/props.ts';
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
const legOf = { L: ids(['thighL', 'shinL', 'footL']), R: ids(['thighR', 'shinR', 'footR']) };
const footOf = { L: ids(['footL']), R: ids(['footR']) };
const head = ids(['head', 'jaw', 'earL', 'earR', 'eyeL', 'eyeR']);
const eyes = ids(['eyeL', 'eyeR']);

const cm = (v: number): string => (v * 100).toFixed(1);
const deg = (v: number): string => ((v * 180) / Math.PI).toFixed(1);

const players: readonly [SpeciesId, InstrumentId][] = [
  ['cat', 'viola'],
  ['rabbit', 'violin'],
  ['fox-red', 'violin'],
  ['fox-tan', 'flute'],
];
for (const [species, instrument] of players) {
  const model = buildPlayer(species, instrument, 4, 'chair');
  const seat = model.seat;
  if (!seat) {
    throw new Error(`${species} has no seat`);
  }
  const depth = seat.seatDepth ?? CHAIR.seatDepth;
  const back = CHAIR.seatDepth / 2;
  const slope = Math.tan(seat.seatTilt ?? 0);
  // The seat top at a z: it falls from the back edge toward the front edge (-z).
  const plane = (z: number): number => seat.seatHeight - (back - z) * slope;
  let into = Infinity;
  let intoZ = 0;
  // The underside of the thighs over the front 10 cm of the seat, over the seat top.
  let thighFront = Infinity;
  const thighs = ids(['thighL', 'thighR']);
  const front = back - depth;
  const posts = back - CHAIR_LEG;
  const top = seat.seatHeight + CHAIR.back;
  const { positions, bones } = model.mesh;
  const corners = bones.length;
  const at = (c: number, k: number): number => positions[c * 3 + k] ?? 0;

  let haunch = -Infinity;
  let trunk = -Infinity;
  let trunkY = 0;
  let knees = -Infinity;
  let headTop = -Infinity;
  let eyeLow = Infinity;
  let eyeHigh = -Infinity;
  const legLow = { L: Infinity, R: Infinity };
  const heel = { L: Infinity, R: Infinity };
  const toe = { L: Infinity, R: Infinity };
  const footZ = { L: [Infinity, -Infinity], R: [Infinity, -Infinity] };
  for (let c = 0; c < corners; c++) {
    const bone = bones[c] ?? 0;
    for (const side of ['L', 'R'] as const) {
      if (footOf[side].has(bone)) {
        const z = footZ[side];
        z[0] = Math.min(z[0] ?? Infinity, at(c, 2));
        z[1] = Math.max(z[1] ?? -Infinity, at(c, 2));
      }
    }
  }
  for (let c = 0; c < corners; c++) {
    const bone = bones[c] ?? 0;
    const [x, y, z] = [at(c, 0), at(c, 1), at(c, 2)];
    if (head.has(bone)) {
      headTop = Math.max(headTop, y);
    }
    if (eyes.has(bone)) {
      eyeLow = Math.min(eyeLow, y);
      eyeHigh = Math.max(eyeHigh, y);
    }
    for (const side of ['L', 'R'] as const) {
      if (legOf[side].has(bone)) {
        legLow[side] = Math.min(legLow[side], y);
      }
      if (footOf[side].has(bone)) {
        const [lo, hi] = footZ[side];
        // The player faces -z: the toes have the smaller z, the heel the larger z.
        if (z > ((lo ?? 0) + (hi ?? 0)) / 2) {
          heel[side] = Math.min(heel[side], y);
        } else {
          toe[side] = Math.min(toe[side], y);
        }
      }
    }
    if (lower.has(bone)) {
      knees = Math.max(knees, z);
    }
    if (tail.has(bone) || arms.has(bone) || lower.has(bone)) {
      continue;
    }
    if (Math.abs(x) > CHAIR.seatWidth / 2) {
      continue;
    }
    if (y < plane(z) + 0.12 && y > plane(z) - 0.02) {
      haunch = Math.max(haunch, z);
    }
    if (thighs.has(bone) && z >= front && z <= front + 0.1) {
      thighFront = Math.min(thighFront, y - plane(z));
    }
    if (z >= front && z <= back && y - plane(z) < into) {
      into = y - plane(z);
      intoZ = z;
    }
    if (y <= top && z > trunk) {
      trunk = z;
      trunkY = y;
    }
  }

  const joint = (name: BoneName): readonly number[] =>
    model.skeleton.positions[boneIndex(name)] ?? [0, 0, 0];
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
    // The player faces -z, so a shin that slants forward has the ankle at a smaller z.
    const slant = Math.atan2(-sz, -sy);
    return `${side} ${deg(angle)}° (thigh ${deg(-thigh)}° from level toward the hip, shin ${deg(slant)}° forward of vertical, ankle ${cm(-sz)} cm in front of the knee)`;
  };

  console.log(
    `${species} ${instrument}: tilt ${deg(seat.seatTilt ?? 0)}°, front edge ${cm(plane(front))} cm high, lowest body point over the seat ${cm(into)} cm over the seat top at z ${cm(intoZ)}, thighs over the front 10 cm of the seat ${cm(thighFront)} cm over the seat top; seat ${cm(seat.seatHeight)} cm high at the back, ${cm(depth)} cm deep, front edge z ${cm(front)}, back z ${cm(back)}, posts from z ${cm(posts)}, chair back top ${cm(top)} cm (${cm(CHAIR.back)} cm above the seat)`,
  );
  console.log(
    `  back of the haunch z ${cm(haunch)}: ${cm(posts - haunch)} cm in front of the posts. Backmost trunk corner below the back top z ${cm(trunk)} at y ${cm(trunkY)}: ${cm(posts - trunk)} cm in front of the posts`,
  );
  console.log(
    `  back of the knees z ${cm(knees)}: the front edge of the seat is ${cm(front - knees)} cm behind it`,
  );
  console.log(`  knee angle from the side: ${knee('L')}; ${knee('R')}`);
  console.log(
    `  lowest point above the floor: leg L ${cm(legLow.L)}, leg R ${cm(legLow.R)} cm; heel L ${cm(heel.L)}, toes L ${cm(toe.L)}, heel R ${cm(heel.R)}, toes R ${cm(toe.R)} cm`,
  );
  console.log(
    `  head top ${cm(headTop)} cm, eyes ${cm(eyeLow)} to ${cm(eyeHigh)} cm. The music stand desk: middle ${cm(MUSIC_STAND.deskHeight)} cm, top edge ${cm(MUSIC_STAND.deskHeight + (MUSIC_STAND.deskDepth / 2) * Math.cos(MUSIC_STAND.tilt))} cm`,
  );

  const boxes = chairBack(seat.seatHeight);
  const names = ['post R', 'post L', 'rail'];
  const gaps = boxes.map((box, i) => {
    let most = -Infinity;
    for (let c = 0; c < corners; c++) {
      const bone = bones[c] ?? 0;
      if (tail.has(bone)) {
        continue;
      }
      const [x, y, z] = [at(c, 0), at(c, 1), at(c, 2)];
      if (x >= box.min[0] && x <= box.max[0] && y >= box.min[1] && y <= box.max[1]) {
        most = Math.max(most, z);
      }
    }
    return `${names[i] ?? i} ${most === -Infinity ? 'none' : cm(box.min[2] - most)}`;
  });
  console.log(`  gap of the body (no tail) to each box of the chair back (cm): ${gaps.join(', ')}`);
  let tailLow = Infinity;
  let tailHigh = -Infinity;
  let tailWide = 0;
  for (let c = 0; c < corners; c++) {
    if (!tail.has(bones[c] ?? 0)) {
      continue;
    }
    const [x, y, z] = [at(c, 0), at(c, 1), at(c, 2)];
    if (z >= posts - 0.01 && z <= back + 0.01) {
      tailLow = Math.min(tailLow, y - plane(z) + seat.seatHeight);
      tailHigh = Math.max(tailHigh, y);
      tailWide = Math.max(tailWide, Math.abs(x));
    }
  }
  const rail = boxes[2];
  console.log(
    tailHigh === -Infinity
      ? '  no tail at the back posts'
      : `  tail at the back posts: ${cm(tailLow - seat.seatHeight)} to ${cm(tailHigh - seat.seatHeight)} cm above the seat, |x| up to ${cm(tailWide)} cm; the rail from ${cm((rail?.min[1] ?? 0) - seat.seatHeight)} cm above the seat, the posts from |x| ${cm(CHAIR.seatWidth / 2 - CHAIR_LEG)} cm`,
  );

  const rows: string[] = [];
  for (let z0 = -0.5; z0 < back; z0 += 0.02) {
    let low = Infinity;
    for (let c = 0; c < corners; c++) {
      const bone = bones[c] ?? 0;
      if (tail.has(bone) || arms.has(bone)) {
        continue;
      }
      const [x, y, z] = [at(c, 0), at(c, 1), at(c, 2)];
      if (Math.abs(x) <= CHAIR.seatWidth / 2 && z >= z0 && z < z0 + 0.02 && y > plane(z) - 0.3) {
        low = Math.min(low, y - plane(z));
      }
    }
    if (low < Infinity) {
      rows.push(`${(z0 * 100).toFixed(0)}: ${cm(low)}`);
    }
  }
  console.log(`  underside over the seat top by z band (cm): ${rows.join('; ')}`);
}
