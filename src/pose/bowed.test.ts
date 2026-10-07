import { describe, expect, it } from 'vitest';

import { note, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { Quaternion, Vector3 } from 'three';

import { toVec3 } from '../models/tuples.ts';
import type { Vec3 } from '../models/tuples.ts';
import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { poseBowed } from './bowed.ts';
import { SECTION_SPECIES } from '../models/cast.ts';
import { BOWED_HOLDS, bowedRig } from './bowed-rig.ts';
import type { BowedInstrument } from './bowed-rig.ts';
import { BIND_ROTATIONS } from './frames.ts';
import { demoLooks, headClearance, posedNeck, posedPart } from './test-clearance.ts';
import { bowStateAt, createBowState } from './strokes.ts';
import type { BowState } from './strokes.ts';
import {
  armLengthErrors,
  instrumentTurn,
  posedAt,
  posedPiecePoint,
  posedPoint,
  poseSkeleton,
} from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { NOT_STARTED, PLAYING, firstPlayers, sceneOf } from './test-scene.ts';
import type { ScenePlayer, TestScene } from './test-scene.ts';
import type { Transport } from './types.ts';

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

/** A bowed string player of a test scene, with its model. */
type BowedPlayer = ScenePlayer<BowedInstrument>;

/**
 * Finds the first player of each bowed instrument in a scene.
 *
 * @param scene The scene.
 * @returns The violin, the viola, the cello, and the contrabass.
 */
function bowedPlayers(scene: TestScene): BowedPlayer[] {
  return firstPlayers(scene, ['violin', 'viola', 'cello', 'contrabass'] as const);
}

function bowStateOf(scene: TestScene, player: BowedPlayer, songTime: number): BowState {
  const plan = scene.plan.players[player.index];
  const state = createBowState();
  if (plan?.note.family === 'bowed') {
    bowStateAt(plan.note.strokes, plan.note.starts, songTime - plan.timeOffset, state);
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

/**
 * Makes a vector from a point.
 *
 * @param p The point.
 * @returns A new vector.
 */
function v(p: Vec3): Vector3 {
  return new Vector3(...p);
}

/** The posed bow hair: its start at the frog and its unit direction to the tip. */
interface HairLine {
  readonly start: Vector3;
  readonly direction: Vector3;
}

function hairOf(posed: PosedSkeleton): HairLine {
  const hair = target(posed.model, 'bow-hair');
  const start = v(posedPiecePoint(posed, { bone: 'bow', at: hair.from }));
  const end = v(posedPiecePoint(posed, { bone: 'bow', at: hair.to }));
  return { start, direction: end.sub(start).normalize() };
}

function contactOf(posed: PosedSkeleton): Vector3 {
  return v(
    posedPiecePoint(posed, {
      bone: 'instrument',
      at: target(posed.model, 'bow-contact').from,
    }),
  );
}

/** A point on the strings of a posed bowed string, from the nut. */
interface StopPlace {
  /** The height above the plane of the strings, in meters. */
  readonly height: number;
  /** The distance to the side of the middle line of the strings, in meters. */
  readonly side: number;
  /** The place along the target `fingerboard`: 0 at the nut, 1 at the end. */
  readonly place: number;
  /** The length of the target `fingerboard`, in meters. */
  readonly neckLength: number;
}

/**
 * Measures a point against the posed strings of a player.
 *
 * @param posed The posed skeleton of a bowed string player.
 * @param point The posed point.
 * @returns The place of the point on the strings.
 */
function stopOf(posed: PosedSkeleton, point: Vector3): StopPlace {
  const board = target(posed.model, 'fingerboard');
  const nut = v(posedPiecePoint(posed, { bone: 'instrument', at: board.from }));
  const end = v(posedPiecePoint(posed, { bone: 'instrument', at: board.to }));
  const above = v(board.from).add(v(board.normal));
  const top = v(posedPiecePoint(posed, { bone: 'instrument', at: toVec3(above) }))
    .sub(nut)
    .normalize();
  const neck = end.sub(nut);
  const across = new Vector3().crossVectors(top, neck).normalize();
  const offset = point.clone().sub(nut);
  return {
    height: offset.dot(top),
    side: offset.dot(across),
    place: offset.dot(neck) / neck.dot(neck),
    neckLength: neck.length(),
  };
}

/**
 * Gives the posed middle of the left finger block of a player.
 *
 * @param posed The posed skeleton.
 * @returns The point.
 */
function fingersOf(posed: PosedSkeleton): Vector3 {
  return v(posedPoint(posed, 'fingersL', posed.model.body.fingerBlockL));
}

function positionOf(posed: PosedSkeleton, bone: BoneName): Vector3 {
  return posed.frames[boneIndex(bone)]?.position ?? new Vector3();
}

function boneLength(posed: PosedSkeleton, a: BoneName, b: BoneName): number {
  return positionOf(posed, a).distanceTo(positionOf(posed, b));
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
        const along = contact.clone().sub(hair.start).dot(hair.direction);
        const nearest = hair.start.clone().addScaledVector(hair.direction, along);
        expect(nearest.distanceTo(contact), `${player.instrument} at ${t}`).toBeLessThan(0.002);
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
      const nut = v(posedPiecePoint(posed, { bone: 'instrument', at: fingerboard.from }));
      const end = v(posedPiecePoint(posed, { bone: 'instrument', at: fingerboard.to }));
      const strings = nut.sub(end).normalize();
      const { slant } = BOWED_HOLDS[player.instrument];
      expect(Math.abs(hairOf(posed).direction.dot(strings))).toBeCloseTo(
        Math.abs(Math.sin(slant)),
        6,
      );
    }
  });

  it('presses the strings with the left fingers at the place of the note', () => {
    for (const player of players) {
      const [low, high] = bowedRig(player.model, player.instrument).stopRange;
      let checked = 0;
      for (const t of times) {
        const posed = posedAt(scene, player, t);
        const state = bowStateOf(scene, player, t);
        const stop = stopOf(posed, fingersOf(posed));
        const label = `${player.instrument} at ${t}`;
        // The middle of the finger block is on the strings, over the middle of the fingerboard,
        // at the place of the note. The press of a note curls the fingers up to 17° more (15°
        // times the gesture size of 1.15), so the middle moves up to 0.015 H.
        const press = 0.016 * player.model.body.headHeight;
        expect(Math.abs(stop.height), label).toBeLessThan(press);
        expect(Math.abs(stop.side), label).toBeLessThan(press);
        expect(stop.place, label).toBeGreaterThanOrEqual(0);
        expect(stop.place, label).toBeLessThanOrEqual(1);
        expect(
          Math.abs(stop.place - (low + state.fingerboard * (high - low))) * stop.neckLength,
          label,
        ).toBeLessThan(press);
        checked++;
      }
      expect(checked).toBeGreaterThan(50);
    }
  });

  it('puts the left fingers on the strings and the left palm under them', () => {
    // The first palm was 0.063 m below the strings at the violin model size (0.08 m on the
    // violin), with the fingers beside the neck, so the hand did not touch the fingerboard.
    for (const player of players) {
      for (const t of [0.3, 1.3, 2.25, 2.75]) {
        const posed = posedAt(scene, player, t);
        const label = `${player.instrument} at ${t}`;
        // The finger block reaches through the plane of the strings.
        const heights = posedPart(posed, ['fingersL']).triangles.flatMap((triangle) =>
          [triangle.a, triangle.b, triangle.c].map((corner) => stopOf(posed, corner).height),
        );
        expect(Math.max(...heights), label).toBeGreaterThan(0.01);
        expect(Math.min(...heights), label).toBeLessThan(-0.01);
        // The palm is below the strings, near the neck.
        const palm = stopOf(posed, v(posedPoint(posed, 'handL', player.model.body.palmL)));
        expect(palm.height, label).toBeLessThan(-0.005);
        expect(Math.hypot(palm.height, palm.side), label).toBeLessThan(
          0.25 * player.model.body.headHeight,
        );
      }
    }
  });

  it('moves the left fingers nearer to the end of the fingerboard for a higher note', () => {
    for (const player of players) {
      const placeAt = (t: number): number => {
        const posed = posedAt(scene, player, t);
        return stopOf(posed, fingersOf(posed)).place;
      };
      // The fifth note (2 s) is high on the top string, and the sixth (2.5 s) is low.
      expect(placeAt(2.25)).toBeGreaterThan(placeAt(2.75) + 0.2);
    }
  });

  /**
   * Poses one player with a bow state, from the bind torso with the lean of the hold, and gives
   * its posed skeleton.
   */
  function posedWith(player: BowedPlayer, string: number, fingerboard = 0): PosedSkeleton {
    const rig = bowedRig(player.model, player.instrument);
    const rotations = Float32Array.from(BIND_ROTATIONS);
    const lean = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -rig.hold.lean);
    const spine = v(rig.spineBind);
    lean.toArray(rotations, boneIndex('spine') * 4);
    poseBowed(
      rig,
      {
        root: { rotation: new Quaternion(), position: new Vector3() },
        chest: {
          rotation: lean,
          position: v(rig.chestBind).sub(spine).applyQuaternion(lean).add(spine),
        },
      },
      { ...createBowState(), string, bow: 0.2, fingerboard },
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
      const bass = new Vector3().crossVectors(v(rig.top), v(rig.axis)).normalize();
      const hair = target(player.model, 'bow-hair');
      const tip = v(hair.from).add(v(hair.normal));
      const hairNormal = (posed: PosedSkeleton): Vector3 =>
        v(posedPiecePoint(posed, { bone: 'bow', at: toVec3(tip) })).sub(
          v(posedPiecePoint(posed, { bone: 'bow', at: hair.from })),
        );
      // The hair faces the strings: its normal points away from the top plate. On the lowest
      // string, the top of the bow plane turns to the bass side, so the normal turns away.
      const low = hairNormal(posedWith(player, 0)).dot(bass);
      const high = hairNormal(posedWith(player, 3)).dot(bass);
      expect(low, player.instrument).toBeLessThan(high - 0.1);
    }
  });

  it('raises the bow hand of a violin for its lowest string', () => {
    const violin = players[0];
    if (!violin) {
      throw new Error('The test file has a violin.');
    }
    const height = (string: number): number => positionOf(posedWith(violin, string), 'handR').y;
    expect(height(0)).toBeGreaterThan(height(3) + 0.01);
  });

  it('maps the notes into the part of the fingerboard that the left arm reaches', () => {
    // The hippo reaches the neck of the contrabass from 0.13 of the fingerboard: the nut is
    // 1.09 of the arm length from its shoulder.
    const ranges = players.map(({ instrument, model }) => bowedRig(model, instrument).stopRange);
    expect(ranges.map(([low]) => low)).toEqual([0, 0, 0, expect.closeTo(0.13, 2)]);
    expect(ranges.map(([, high]) => high)).toEqual([1, 1, 1, 1]);
  });

  it('reaches the strings with the left fingers at each place of a note', () => {
    // A stop out of reach of the arm leaves the fingers above the strings.
    for (const player of players) {
      const rig = bowedRig(player.model, player.instrument);
      const [low, high] = rig.stopRange;
      for (let k = 0; k <= 10; k++) {
        const posed = posedWith(player, 3, k / 10);
        const stop = stopOf(posed, fingersOf(posed));
        const label = `${player.instrument} at ${k / 10}`;
        expect(Math.abs(stop.height), label).toBeLessThan(1e-4);
        expect(Math.abs(stop.side), label).toBeLessThan(1e-4);
        expect(
          Math.abs(stop.place - (low + (k / 10) * (high - low))) * stop.neckLength,
          label,
        ).toBeLessThan(1e-4);
        // The elbow keeps a bend: the wrist is within 97% of the arm length.
        const reach = positionOf(posed, 'handL').distanceTo(positionOf(posed, 'upperArmL'));
        expect(reach, label).toBeLessThanOrEqual(rig.armL.reach + 1e-6);
      }
    }
  });

  it('holds the frog of the bow in the right hand', () => {
    for (const player of players) {
      const posed = posedWith(player, 1);
      const hair = target(player.model, 'bow-hair');
      const palm = v(posedPoint(posed, 'handR', player.model.body.palmR));
      // The stick at the grip, 0.03 m of the bow model from the frog end, is in the palm.
      const grip = v(posedPiecePoint(posed, { bone: 'bow', at: [0, 0, 0] }));
      expect(grip.distanceTo(palm), player.instrument).toBeLessThan(
        0.08 * player.model.body.headHeight,
      );
      // The hair starts in front of the hand, near the palm.
      const frog = v(posedPiecePoint(posed, { bone: 'bow', at: hair.from }));
      expect(frog.distanceTo(palm), player.instrument).toBeLessThan(
        0.15 * player.model.body.headHeight,
      );
    }
  });

  it('plucks with the right palm above the strings in pizzicato', () => {
    for (const player of players) {
      const t = 4.3;
      expect(bowStateOf(scene, player, t).pizzicato).toBe(1);
      const posed = posedAt(scene, player, t);
      const layer = scene.plan.players[player.index]?.note;
      const rig = layer?.family === 'bowed' ? layer.rig : null;
      if (!rig) {
        throw new Error('A bowed string player has a rig.');
      }
      const pluck = posedPoint(posed, 'instrument', rig.pluck);
      const palm = posedPoint(posed, 'handR', player.model.body.palmR);
      // The palm is 0.035 m above the strings, and moves up to 0.015 m to each side.
      expect(v(palm).distanceTo(v(pluck)), player.instrument).toBeLessThan(0.04);
    }
  });

  it('holds the plucking palm 0.035 m above the strings (design 5.3)', () => {
    for (const player of players) {
      const posed = posedAt(scene, player, 4.3);
      const layer = scene.plan.players[player.index]?.note;
      if (layer?.family !== 'bowed') {
        throw new Error('A bowed string player has a rig.');
      }
      const { pluck, top } = layer.rig;
      const strings = v(posedPoint(posed, 'instrument', pluck));
      const above = v(pluck).add(v(top));
      const up = v(posedPoint(posed, 'instrument', toVec3(above))).sub(strings);
      const palm = v(posedPoint(posed, 'handR', player.model.body.palmR));
      const height = palm.sub(strings).dot(up);
      expect(Math.abs(height - 0.035), player.instrument).toBeLessThan(0.0035);
    }
  });

  it('keeps the bones of the arms at their bind lengths', () => {
    for (const player of players) {
      for (const t of [0.3, 2.1, 4.4]) {
        for (const error of armLengthErrors(posedAt(scene, player, t))) {
          expect(error, `${player.instrument} at ${t}`).toBeLessThan(5e-6);
        }
      }
    }
  });
});

describe('the rest pose of the bowed strings (design 5.2, 5.5)', () => {
  const scene = sceneOf(FILE);
  const players = bowedPlayers(scene);

  it('lowers the violin and the viola before the first play, and keeps the cello up', () => {
    const [violin, viola, cello, contrabass] = players;
    if (!violin || !viola || !cello || !contrabass) {
      throw new Error('The test file has four bowed sections.');
    }
    expect(instrumentTurn(scene, violin.index, 0, NOT_STARTED)).toBeGreaterThan(1);
    expect(instrumentTurn(scene, viola.index, 0, NOT_STARTED)).toBeGreaterThan(1);
    expect(instrumentTurn(scene, cello.index, 0, NOT_STARTED)).toBe(0);
    expect(instrumentTurn(scene, contrabass.index, 0, NOT_STARTED)).toBe(0);
    expect(instrumentTurn(scene, violin.index, 10)).toBeCloseTo(0, 6);
  });

  it('lifts the instruments with the seeded lift of the player when play starts (design 5.2)', () => {
    const violin = players[0];
    const lift = scene.plan.players[violin?.index ?? -1]?.motion.lift;
    if (!violin || !lift) {
      throw new Error('The test file has a violin.');
    }
    const down = instrumentTurn(scene, violin.index, 0, NOT_STARTED);
    const start = 5 + lift.delaySec;
    const play: Transport = {
      playing: true,
      changedAtWall: 5,
      before: null,
      startSec: 0,
      holdSec: 3,
      leadSec: Number.POSITIVE_INFINITY,
    };
    expect(instrumentTurn(scene, violin.index, start, play)).toBeCloseTo(down, 5);
    const half = instrumentTurn(scene, violin.index, start + lift.durationSec / 2, play);
    expect(half).toBeLessThan(0.8 * down);
    expect(half).toBeGreaterThan(0.2 * down);
    expect(instrumentTurn(scene, violin.index, start + lift.durationSec, play)).toBeCloseTo(0, 5);
  });

  it('keeps the left fingers on the strings at the place of the rest', () => {
    for (const player of players) {
      const posed = posedAt(scene, player, 1, 0, NOT_STARTED);
      const stop = stopOf(posed, fingersOf(posed));
      const rest = BOWED_HOLDS[player.instrument].restPlace;
      expect(Math.abs(stop.height), player.instrument).toBeLessThan(1e-4);
      expect(Math.abs(stop.side), player.instrument).toBeLessThan(1e-4);
      expect(Math.abs(stop.place - rest) * stop.neckLength, player.instrument).toBeLessThan(1e-4);
    }
  });

  it('hangs the bow arm in the rest pose', () => {
    for (const player of players) {
      const posed = posedAt(scene, player, 1, 0, NOT_STARTED);
      const chest = posed.frames[boneIndex('chest')]?.rotation ?? new Quaternion();
      const handR = posed.frames[boneIndex('handR')]?.rotation ?? new Quaternion();
      // The hand keeps the turn of the chest.
      expect(Math.abs(chest.dot(handR))).toBeCloseTo(1, 4);
      const wrist = positionOf(posed, 'handR');
      const bindWrist = player.model.skeleton.positions[boneIndex('handR')] ?? [0, 0, 0];
      expect(wrist.distanceTo(v(bindWrist))).toBeLessThan(0.03);
    }
  });

  it('lowers the instruments of a silent seat with the seeded lowering, after the change', () => {
    const violin = players[0];
    const lower = scene.plan.players[violin?.index ?? -1]?.motion.lower;
    if (!violin || !lower) {
      throw new Error('The test file has a violin.');
    }
    const rest = instrumentTurn(scene, violin.index, 0, NOT_STARTED);
    const start = 20 + lower.delaySec;
    expect(instrumentTurn(scene, violin.index, start, PLAYING, 20)).toBeCloseTo(0, 6);
    const half = instrumentTurn(scene, violin.index, start + lower.durationSec / 2, PLAYING, 20);
    expect(half).toBeGreaterThan(0.2 * rest);
    expect(half).toBeLessThan(0.8 * rest);
    const end = start + lower.durationSec;
    expect(instrumentTurn(scene, violin.index, end, PLAYING, 20)).toBeCloseTo(rest, 4);
  });

  it('keeps the wrist targets in reach of the arms', () => {
    // A target out of reach leaves a gap between the hand and the instrument.
    for (const player of players) {
      for (const t of [0.1, 1.9, 3.3, 4.7]) {
        const posed = posedAt(scene, player, t);
        const hand = positionOf(posed, 'handR');
        const shoulder = positionOf(posed, 'upperArmR');
        const reach =
          boneLength(posed, 'upperArmR', 'forearmR') + boneLength(posed, 'forearmR', 'handR');
        expect(hand.distanceTo(shoulder), `${player.instrument} at ${t}`).toBeLessThan(
          reach - 1e-4,
        );
      }
    }
  });
});

describe('the head and the neck of a floor instrument (review of step 5, F2)', () => {
  /** The smallest distance from the head to the neck of the instrument, in meters. */
  const MARGIN = 0.03;

  /** Notes on the lowest and the highest string of the cello and of the contrabass. */
  const FLOOR_FILE: TestFile = {
    tracks: [
      [tempo(0, 120), timeSignature(0, 4, 4)],
      track([programChange(0, 2, 42)], note(0, 2, 36, 900), note(960, 2, 81, 1860)),
      track([programChange(0, 3, 43)], note(0, 3, 28, 900), note(960, 3, 67, 1860)),
    ],
  };

  // The test poses each cellist and each bassist 240 times and measures the distance of two meshes
  // each time. It takes 1.9 s on an idle Mac, so a high load can pass the default limit of 5 s.
  it('keeps the head 0.03 m from the neck while the player plays, with each look', async () => {
    const scene = sceneOf(FLOOR_FILE);
    const looks = await demoLooks(['cello', 'contrabass']);
    for (const instrument of ['cello', 'contrabass'] as const) {
      const players = scene.layout.players.flatMap((place, index) =>
        place.cast.instrument === instrument ? [{ index, cast: place.cast }] : [],
      );
      // Each species of the section plays in the test file.
      expect(new Set(players.map((p) => p.cast.species))).toEqual(
        new Set(SECTION_SPECIES[instrument]),
      );
      for (const { index, cast } of players) {
        // The low string, then the high string, at the ends of the sway.
        const nearest = headClearance(
          scene,
          index,
          looks,
          [0.25, 0.75, 1.25, 1.75],
          posedNeck,
          MARGIN,
        );
        expect(nearest, `${cast.species} with the ${instrument}`).toBeGreaterThanOrEqual(MARGIN);
      }
    }
  });
});
