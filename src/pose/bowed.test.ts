import { describe, expect, it } from 'vitest';

import { note, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { add, cross, dot, length, normalize, scale, sub } from '../models/math.ts';
import type { Vec3 } from '../models/math.ts';
import { buildPlayer } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { BOWED_HOLDS, bowedRig, poseBowed } from './bowed.ts';
import type { BowedInstrument } from './bowed.ts';
import { BIND_ROTATIONS, boneRotation } from './frames.ts';
import { poseAt } from './pose-at.ts';
import { bowStateAt, createBowState } from './strokes.ts';
import type { BowState } from './strokes.ts';
import { posedPiecePoint, posedPoint, poseSkeleton } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from './test-scene.ts';
import type { TestScene } from './test-scene.ts';

/** The notes of one bowed section: quarter notes at 120 BPM, then pizzicato from 4 s. */
function section(channel: number, program: number, keys: readonly number[]) {
  return track(
    [programChange(0, channel, program)],
    ...keys.map((key, i) => note(i * 480, channel, key)),
    [programChange(3840, channel, 45)],
    ...keys.map((key, i) => note(3840 + i * 480, channel, key)),
  );
}

/** The four bowed sections, each on its own track, with notes on each string. */
const FILE: TestFile = {
  tracks: [
    [tempo(0, 120), timeSignature(0, 4, 4)],
    section(0, 40, [55, 62, 69, 76, 88, 60, 79, 57]),
    section(1, 41, [48, 55, 62, 69, 81, 52, 72, 50]),
    section(2, 42, [36, 43, 50, 57, 69, 40, 64, 38]),
    section(3, 43, [28, 33, 38, 43, 55, 31, 50, 29]),
  ],
};

/** The first player of each bowed instrument in a scene, with its model. */
interface BowedPlayer {
  readonly index: number;
  readonly instrument: BowedInstrument;
  readonly model: PlayerModel;
}

function bowedPlayers(scene: TestScene): BowedPlayer[] {
  const out: BowedPlayer[] = [];
  for (const instrument of ['violin', 'viola', 'cello', 'contrabass'] as const) {
    const index = scene.layout.players.findIndex((p) => p.cast.instrument === instrument);
    const cast = scene.layout.players[index]?.cast;
    if (!cast) {
      throw new Error(`The test file has no ${instrument}.`);
    }
    out.push({
      index,
      instrument,
      model: buildPlayer(cast.species, cast.instrument, cast.kettles),
    });
  }
  return out;
}

function posedAt(
  scene: TestScene,
  player: BowedPlayer,
  songTime: number,
  wall = 10,
  transport = PLAYING,
): PosedSkeleton {
  const pose = poseAt(scene.plan, songTime, wall, transport, allAudible(scene.score)).players[
    player.index
  ];
  if (!pose) {
    throw new Error('The player has no pose.');
  }
  return poseSkeleton(player.model, pose);
}

function bowStateOf(scene: TestScene, player: BowedPlayer, songTime: number): BowState {
  const plan = scene.plan.players[player.index];
  const state = createBowState();
  if (plan?.bowed) {
    bowStateAt(plan.bowed.strokes, plan.bowed.starts, songTime - plan.timeOffset, state);
  }
  return state;
}

function target(model: PlayerModel, kind: 'bow-contact' | 'fingerboard' | 'bow-hair') {
  const found = model.instrument.targets.find((t) => t.kind === kind);
  if (!found) {
    throw new Error(`The ${model.instrument.id} has no target "${kind}".`);
  }
  return found;
}

/** The posed bow hair: its start at the frog and its unit direction to the tip. */
interface HairLine {
  readonly start: Vec3;
  readonly direction: Vec3;
}

function hairOf(posed: PosedSkeleton): HairLine {
  const hair = target(posed.model, 'bow-hair');
  const start = posedPiecePoint(posed, { bone: 'bow', at: hair.from });
  const end = posedPiecePoint(posed, { bone: 'bow', at: hair.to });
  return { start, direction: normalize(sub(end, start)) };
}

function contactOf(posed: PosedSkeleton): Vec3 {
  return posedPiecePoint(posed, {
    bone: 'instrument',
    at: target(posed.model, 'bow-contact').from,
  });
}

function boneLength(posed: PosedSkeleton, a: BoneName, b: BoneName): number {
  return length(
    sub(
      posed.frames[boneIndex(a)]?.position ?? [0, 0, 0],
      posed.frames[boneIndex(b)]?.position ?? [0, 0, 0],
    ),
  );
}

describe('bowedRig (design 5.3, 4.5)', () => {
  it('reaches the full bow hair on all four strings with the arms of design 4.5', () => {
    // With the first arms (0.6 H and 0.55 H), the viola reached 92% of the hair, the cello 87%,
    // and the contrabass 89% (review of step 4, the reach of the arms).
    const scene = sceneOf(FILE);
    for (const { instrument, model } of bowedPlayers(scene)) {
      const rig = bowedRig(model, instrument);
      const [from, to] = rig.bowRange;
      expect(from, instrument).toBeCloseTo(0.03, 9);
      expect(to, instrument).toBeGreaterThan(rig.hairLength - 0.03 - 0.005);
    }
  });
});

describe('poseBowed (design 5.3, 4.7)', () => {
  const scene = sceneOf(FILE);
  const players = bowedPlayers(scene);
  const times = Array.from({ length: 100 }, (_, i) => 0.02 + i * 0.039);

  it('keeps the bow hair on the strings at the place of the bow, while the bow plays', () => {
    for (const player of players) {
      let checked = 0;
      for (const t of times) {
        const state = bowStateOf(scene, player, t);
        if (state.lift > 0 || state.pizzicato > 0) {
          continue;
        }
        const posed = posedAt(scene, player, t);
        const hair = hairOf(posed);
        const contact = contactOf(posed);
        const along = dot(sub(contact, hair.start), hair.direction);
        const nearest = add(hair.start, scale(hair.direction, along));
        expect(length(sub(nearest, contact)), `${player.instrument} at ${t}`).toBeLessThan(0.002);
        expect(along, `${player.instrument} at ${t}`).toBeCloseTo(state.bow, 3);
        checked++;
      }
      expect(checked).toBeGreaterThan(50);
    }
  });

  it('keeps the bow across the strings, slanted by the hold', () => {
    for (const player of players) {
      const posed = posedAt(scene, player, 1.3);
      const fingerboard = target(player.model, 'fingerboard');
      const nut = posedPiecePoint(posed, { bone: 'instrument', at: fingerboard.from });
      const end = posedPiecePoint(posed, { bone: 'instrument', at: fingerboard.to });
      const strings = normalize(sub(nut, end));
      const { slant } = BOWED_HOLDS[player.instrument];
      expect(Math.abs(dot(hairOf(posed).direction, strings))).toBeCloseTo(
        Math.abs(Math.sin(slant)),
        6,
      );
    }
  });

  it('puts the left palm on the neck, nearer to the end of the fingerboard for a higher note', () => {
    for (const player of players) {
      const fingerboard = target(player.model, 'fingerboard');
      const grip = player.model.instrument.grips.palmL;
      if (!grip) {
        throw new Error('A bowed string has a grip of the left palm.');
      }
      /** The distance of a point from the line of the fingerboard, and its place along it. */
      const onNeck = (posed: PosedSkeleton, point: Vec3): [number, number] => {
        const nut = posedPiecePoint(posed, { bone: 'instrument', at: fingerboard.from });
        const end = posedPiecePoint(posed, { bone: 'instrument', at: fingerboard.to });
        const neck = sub(end, nut);
        const along = dot(sub(point, nut), neck) / dot(neck, neck);
        return [length(sub(point, add(nut, scale(neck, along)))), along];
      };
      const placeAt = (t: number): number => {
        const posed = posedAt(scene, player, t);
        const [distance, along] = onNeck(
          posed,
          posedPoint(posed, 'handL', player.model.body.palmL),
        );
        // The palm keeps the distance of its grip under the neck.
        const [gripDistance] = onNeck(posed, posedPiecePoint(posed, grip));
        expect(distance).toBeCloseTo(gripDistance, 3);
        return along;
      };
      // The fifth note (2 s) is high on the top string, and the sixth (2.5 s) is low.
      expect(placeAt(2.25)).toBeGreaterThan(placeAt(2.75) + 0.2);
    }
  });

  /** Poses one player with a bow state, from the bind torso, and gives its posed skeleton. */
  function posedWith(player: BowedPlayer, string: number): PosedSkeleton {
    const rig = bowedRig(player.model, player.instrument);
    const rotations = Float32Array.from(BIND_ROTATIONS);
    const chestBind = player.model.skeleton.positions[boneIndex('chest')] ?? [0, 0, 0];
    poseBowed(
      rig,
      {
        root: { rotation: [0, 0, 0, 1], position: [0, 0, 0] },
        chest: { rotation: [0, 0, 0, 1], position: chestBind },
      },
      { ...createBowState(), string, bow: 0.2 },
      1,
      rotations,
    );
    return poseSkeleton(player.model, {
      rotations,
      rootOffset: [0, 0, 0],
      slideOffset: [0, 0, 0],
      blink: 0,
    });
  }

  it('turns the bow to the bass side of the strings for a low string', () => {
    for (const player of players) {
      const rig = bowedRig(player.model, player.instrument);
      const bass = normalize(cross(rig.top, rig.axis));
      const hair = target(player.model, 'bow-hair');
      const hairNormal = (posed: PosedSkeleton): Vec3 =>
        sub(
          posedPiecePoint(posed, { bone: 'bow', at: add(hair.from, hair.normal) }),
          posedPiecePoint(posed, { bone: 'bow', at: hair.from }),
        );
      // The hair faces the strings: its normal points away from the top plate. On the lowest
      // string, the top of the bow plane turns to the bass side, so the normal turns away.
      const low = dot(hairNormal(posedWith(player, 0)), bass);
      const high = dot(hairNormal(posedWith(player, 3)), bass);
      expect(low, player.instrument).toBeLessThan(high - 0.1);
    }
  });

  it('raises the bow hand of a violin for its lowest string', () => {
    const violin = players[0];
    if (!violin) {
      throw new Error('The test file has a violin.');
    }
    const height = (string: number): number =>
      posedWith(violin, string).frames[boneIndex('handR')]?.position[1] ?? 0;
    expect(height(0)).toBeGreaterThan(height(3) + 0.01);
  });

  it('plucks with the right palm above the strings in pizzicato', () => {
    for (const player of players) {
      const t = 4.3;
      expect(bowStateOf(scene, player, t).pizzicato).toBe(1);
      const posed = posedAt(scene, player, t);
      const rig = scene.plan.players[player.index]?.bowed?.rig;
      if (!rig) {
        throw new Error('A bowed string player has a rig.');
      }
      const pluck = posedPoint(posed, 'instrument', rig.pluck);
      const palm = posedPoint(posed, 'handR', player.model.body.palmR);
      // The palm is 0.035 m above the strings, and moves up to 0.015 m to each side.
      expect(length(sub(palm, pluck)), player.instrument).toBeLessThan(0.04);
    }
  });

  it('keeps the bones of the arms at their bind lengths', () => {
    for (const player of players) {
      const bind = player.model.skeleton.positions;
      const bindLength = (a: BoneName, b: BoneName): number =>
        length(sub(bind[boneIndex(a)] ?? [0, 0, 0], bind[boneIndex(b)] ?? [0, 0, 0]));
      for (const t of [0.3, 2.1, 4.4]) {
        const posed = posedAt(scene, player, t);
        for (const [a, b] of [
          ['upperArmL', 'forearmL'],
          ['forearmL', 'handL'],
          ['upperArmR', 'forearmR'],
          ['forearmR', 'handR'],
        ] as const) {
          expect(boneLength(posed, a, b)).toBeCloseTo(bindLength(a, b), 5);
        }
      }
    }
  });
});

describe('the rest pose of the bowed strings (design 5.2, 5.5)', () => {
  const scene = sceneOf(FILE);
  const players = bowedPlayers(scene);
  const instrumentBone = boneIndex('instrument');

  function instrumentTurn(
    player: BowedPlayer,
    wall: number,
    transport = PLAYING,
    muted = false,
  ): number {
    const audibility = allAudible(scene.score).map((a, seat) =>
      muted && seat === scene.plan.players[player.index]?.seatIndex
        ? { audible: false, changedAtWall: 20, previousChangeAtWall: null }
        : a,
    );
    const pose = poseAt(scene.plan, 1, wall, transport, audibility).players[player.index];
    const w = boneRotation(pose?.rotations ?? new Float32Array(0), instrumentBone)[3];
    return 2 * Math.acos(Math.min(1, Math.abs(w)));
  }

  it('lowers the violin and the viola before the first play, and keeps the cello up', () => {
    const [violin, viola, cello, contrabass] = players;
    if (!violin || !viola || !cello || !contrabass) {
      throw new Error('The test file has four bowed sections.');
    }
    expect(instrumentTurn(violin, 0, NOT_STARTED)).toBeGreaterThan(1);
    expect(instrumentTurn(viola, 0, NOT_STARTED)).toBeGreaterThan(1);
    expect(instrumentTurn(cello, 0, NOT_STARTED)).toBe(0);
    expect(instrumentTurn(contrabass, 0, NOT_STARTED)).toBe(0);
    expect(instrumentTurn(violin, 10)).toBeCloseTo(0, 6);
  });

  it('hangs the bow arm in the rest pose', () => {
    for (const player of players) {
      const posed = posedAt(scene, player, 1, 0, NOT_STARTED);
      const chest = posed.frames[boneIndex('chest')]?.rotation ?? [0, 0, 0, 1];
      const handR = posed.frames[boneIndex('handR')]?.rotation ?? [0, 0, 0, 1];
      // The hand keeps the turn of the chest.
      const relative = Math.abs(
        dot([chest[0], chest[1], chest[2]], [handR[0], handR[1], handR[2]]) + chest[3] * handR[3],
      );
      expect(relative).toBeCloseTo(1, 4);
      const wrist = posed.frames[boneIndex('handR')]?.position ?? [0, 0, 0];
      const bindWrist = player.model.skeleton.positions[boneIndex('handR')] ?? [0, 0, 0];
      expect(length(sub(wrist, bindWrist))).toBeLessThan(0.03);
    }
  });

  it('lowers the instruments of a silent seat in 0.6 s, after the change', () => {
    const violin = players[0];
    if (!violin) {
      throw new Error('The test file has a violin.');
    }
    const rest = instrumentTurn(violin, 0, NOT_STARTED);
    expect(instrumentTurn(violin, 20, PLAYING, true)).toBeCloseTo(0, 6);
    const half = instrumentTurn(violin, 20.3, PLAYING, true);
    expect(half).toBeGreaterThan(0.2 * rest);
    expect(half).toBeLessThan(0.8 * rest);
    expect(instrumentTurn(violin, 20.6, PLAYING, true)).toBeCloseTo(rest, 4);
  });

  it('keeps the wrist targets in reach of the arms', () => {
    // A target out of reach leaves a gap between the hand and the instrument.
    for (const player of players) {
      for (const t of [0.1, 1.9, 3.3, 4.7]) {
        const posed = posedAt(scene, player, t);
        const hand = posed.frames[boneIndex('handR')]?.position ?? [0, 0, 0];
        const shoulder = posed.frames[boneIndex('upperArmR')]?.position ?? [0, 0, 0];
        const reach =
          boneLength(posed, 'upperArmR', 'forearmR') + boneLength(posed, 'forearmR', 'handR');
        expect(length(sub(hand, shoulder)), `${player.instrument} at ${t}`).toBeLessThan(
          reach - 1e-4,
        );
      }
    }
  });
});
