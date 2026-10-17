// Probe of the gallery moves (round review-views): the pose at lift=0 against the rest pose, at
// lift=1 against the play pose, at lower=0 against the play pose, and at lower=1 against the rest
// pose, for each species item of the gallery, seated and standing. It also checks that the plan
// of one animal alone gives the pose of the full plan with the same transport, and prints the
// weight of the playing pose at the shares 0.33, 0.5, and 0.66, also for a share of the whole time
// of the lift with its delay. The angle of two float32 quaternions
// comes from the normalized quaternions, because an unnormalized float32 quaternion gave 0.04 deg
// for two equal poses.
// Run from the root of the repository: node docs/research/2026-10-16-review-views/transition-probe.ts
import { Quaternion } from 'three';

import { CONDUCTOR } from '../../../src/models/cast.ts';
import { buildPlayer, INSTRUMENT_SUPPORTS } from '../../../src/models/player.ts';
import { BONE_NAMES } from '../../../src/models/rig.ts';
import { galleryMove, galleryTransport, moveTransport, speciesItems } from '../../../src/gallery/items.ts';
import type { GalleryMove } from '../../../src/gallery/items.ts';
import { DEFAULT_TEST_NOTES, parseTestNotes } from '../../../src/gallery/notes.ts';
import { galleryPlan } from '../../../src/gallery/plan.ts';
import type { GalleryAnimal } from '../../../src/gallery/plan.ts';
import { playerWeight, poseAt } from '../../../src/pose/pose-at.ts';
import { transportHeight } from '../../../src/pose/rest.ts';
import type { AnimalPose, Transport } from '../../../src/pose/types.ts';
import type { PosePlan } from '../../../src/pose/plan.ts';

const parsed = parseTestNotes(DEFAULT_TEST_NOTES);
if (!parsed.ok) {
  throw new Error('The default test notes do not parse.');
}
const notes = parsed.notes;
const WALL = 37.25;
const a = new Quaternion();
const b = new Quaternion();

function angleDeg(p: AnimalPose, q: AnimalPose): { deg: number; bone: string; offset: number } {
  let deg = 0;
  let bone = '';
  for (let i = 0; i < p.rotations.length / 4; i++) {
    a.fromArray(p.rotations, i * 4).normalize();
    b.fromArray(q.rotations, i * 4).normalize();
    const dot = Math.min(1, Math.abs(a.dot(b)));
    const d = (2 * Math.acos(dot) * 180) / Math.PI;
    if (d > deg) {
      deg = d;
      bone = BONE_NAMES[i] ?? String(i);
    }
  }
  let offset = 0;
  for (const key of ['rootOffset', 'slideOffset', 'instrumentOffset'] as const) {
    const u = p[key] ?? [0, 0, 0];
    const v = q[key] ?? [0, 0, 0];
    offset = Math.max(offset, ...u.map((x, k) => Math.abs(x - (v[k] ?? 0))));
  }
  return { deg, bone, offset };
}

function solo(plan: PosePlan, i: number): PosePlan {
  const player = plan.players[i];
  if (!player) {
    throw new Error('no player');
  }
  return { ...plan, players: [player], conductor: null };
}

function clone(pose: AnimalPose): AnimalPose {
  return {
    rotations: Float32Array.from(pose.rotations),
    rootOffset: [...pose.rootOffset],
    slideOffset: [...pose.slideOffset],
    instrumentOffset: [...(pose.instrumentOffset ?? [0, 0, 0])],
    blink: pose.blink,
  };
}

const rest = galleryTransport(new URLSearchParams('rest'));
const play = galleryTransport(new URLSearchParams(''));
const lift = (share: number): GalleryMove => ({ kind: 'lift', share });
const lower = (share: number): GalleryMove => ({ kind: 'lower', share });

// The query reader.
console.log(
  'query',
  JSON.stringify([
    galleryMove(new URLSearchParams('lift=0.33')),
    galleryMove(new URLSearchParams('lower=0.66&rest')),
    galleryMove(new URLSearchParams('lift=2')),
    galleryMove(new URLSearchParams('lift')),
    galleryMove(new URLSearchParams('rest')),
  ]),
);

let worst = { name: '', deg: 0, bone: '', offset: 0 };
let worstSplit = 0;
const rows: string[] = [];
for (const standing of [false, true]) {
  for (const time of [0, 0.55]) {
    const items = speciesItems().filter((item) => item.instrument !== CONDUCTOR.instrument);
    const animals: GalleryAnimal[] = items.map((item, seatIndex) => {
      const support = standing ? 'stand' : INSTRUMENT_SUPPORTS[item.instrument];
      const model = buildPlayer(item.species, item.instrument, 4, support);
      return {
        model,
        place: {
          position: [seatIndex * 3, 0, 0],
          facing: Math.PI,
          cast: {
            seatIndex,
            player: 0,
            species: item.species,
            instrument: item.instrument,
            kettles: 4,
            support: model.support,
          },
        },
      };
    });
    const plan = galleryPlan(animals, null, notes);
    const restPose = poseAt(plan, time, WALL, rest, []).players.map(clone);
    const playPose = poseAt(plan, time, WALL, play, []).players.map(clone);
    for (const [i, player] of plan.players.entries()) {
      const name = `${items[i]?.species}/${items[i]?.instrument}${standing ? '/stand' : ''}@${time}`;
      const at = (move: GalleryMove): AnimalPose => {
        const transport: Transport = moveTransport(move, player.motion, WALL);
        const alone = clone(poseAt(solo(plan, i), time, WALL, transport, []).players[0]!);
        const full = poseAt(plan, time, WALL, transport, []).players[i]!;
        worstSplit = Math.max(worstSplit, angleDeg(alone, full).deg, angleDeg(alone, full).offset);
        return alone;
      };
      const checks = [
        ['lift0~rest', at(lift(0)), restPose[i]!],
        ['lift1~play', at(lift(1)), playPose[i]!],
        ['lower0~play', at(lower(0)), playPose[i]!],
        ['lower1~rest', at(lower(1)), restPose[i]!],
      ] as const;
      for (const [check, p, q] of checks) {
        const d = angleDeg(p, q);
        if (d.deg > worst.deg || d.offset > worst.offset) {
          worst = { name: `${name} ${check}`, ...d };
        }
      }
      if (!standing && time === 0 && ['fox-red', 'fox-tan', 'rabbit', 'cat'].includes(items[i]?.species ?? '')) {
        const w = (move: GalleryMove): string =>
          playerWeight(player, moveTransport(move, player.motion, WALL), undefined, WALL).toFixed(3);
        // The share of the whole time of the lift with its delay, for the choice of the share.
        const { delaySec, durationSec } = player.motion.lift;
        const whole = (share: number): string =>
          w(lift(Math.max(0, (share * (delaySec + durationSec) - delaySec) / durationSec)));
        rows.push(
          `${name}: weight with the delay in the share: lift33 ${whole(0.33)} lift50 ${whole(0.5)} lift66 ${whole(0.66)}`,
        );
        rows.push(
          `${name}: lift ${player.motion.lift.delaySec.toFixed(3)}+${player.motion.lift.durationSec.toFixed(3)} s skew ${player.motion.lift.skew.toFixed(3)}, lower ${player.motion.lower.delaySec.toFixed(3)}+${player.motion.lower.durationSec.toFixed(3)} s skew ${player.motion.lower.skew.toFixed(3)}; weight lift33 ${w(lift(0.33))} lift50 ${w(lift(0.5))} lift66 ${w(lift(0.66))} lower33 ${w(lower(0.33))} lower50 ${w(lower(0.5))} lower66 ${w(lower(0.66))}`,
        );
      }
    }
  }
}

// The conductor alone: lift 0 and 1 against rest and play.
{
  const model = buildPlayer(CONDUCTOR.species, CONDUCTOR.instrument);
  const animal: GalleryAnimal = {
    model,
    place: {
      position: [0, 0, 0],
      facing: Math.PI,
      cast: { seatIndex: 0, player: 0, ...CONDUCTOR, kettles: 4, support: model.support },
    },
  };
  const plan = galleryPlan([], animal, notes);
  const motion = plan.conductor!.motion;
  const pose = (t: Transport): AnimalPose => clone(poseAt(plan, 0, WALL, t, []).conductor!);
  const r = pose(rest);
  const p = pose(play);
  for (const [check, x, y] of [
    ['conductor lift0~rest', pose(moveTransport(lift(0), motion, WALL)), r],
    ['conductor lift1~play', pose(moveTransport(lift(1), motion, WALL)), p],
    ['conductor lower0~play', pose(moveTransport(lower(0), motion, WALL)), p],
    ['conductor lower1~rest', pose(moveTransport(lower(1), motion, WALL)), r],
  ] as const) {
    const d = angleDeg(x, y);
    console.log(check, d.deg.toExponential(3), 'deg', d.bone, 'offset', d.offset.toExponential(3), 'm');
  }
  console.log(
    'conductor height lift50',
    transportHeight(motion, moveTransport(lift(0.5), motion, WALL), WALL).toFixed(3),
  );
}

console.log(rows.join('\n'));
console.log(
  `largest difference: ${worst.deg.toExponential(3)} deg (${worst.bone}), offset ${worst.offset.toExponential(3)} m at ${worst.name}`,
);
console.log(`largest difference of the plan alone against the full plan: ${worstSplit.toExponential(3)}`);
