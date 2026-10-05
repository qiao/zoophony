import { describe, expect, it } from 'vitest';

import { chord, note, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { DEG, dot, length, sub } from '../models/math.ts';
import type { Vec3 } from '../models/math.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { poseAt } from './pose-at.ts';
import {
  armLengthErrors,
  instrumentTurn,
  posedAt,
  posedPiecePoint,
  posedPoint,
  turnOf,
} from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { NOT_STARTED, PLAYING, allAudible, firstPlayers, sceneOf } from './test-scene.ts';
import type { ScenePlayer } from './test-scene.ts';
import type { Transport } from './types.ts';
import { WIND_BODY } from './winds.ts';
import type { WindInstrument } from './winds.ts';

/** The GM program of each wind instrument. */
const PROGRAMS = {
  flute: 73,
  oboe: 68,
  clarinet: 71,
  bassoon: 70,
  horn: 60,
  trumpet: 56,
  trombone: 57,
  tuba: 58,
} as const satisfies Readonly<Record<WindInstrument, number>>;

/** The keys of each section: a scale in its range, with leaps, then a chord. */
const KEYS = {
  flute: [72, 74, 76, 79, 84, 88, 91, 77],
  oboe: [62, 64, 67, 69, 72, 76, 79, 65],
  clarinet: [52, 55, 60, 64, 67, 72, 76, 58],
  bassoon: [36, 41, 43, 48, 53, 55, 60, 46],
  horn: [43, 48, 53, 55, 60, 65, 67, 50],
  trumpet: [55, 58, 60, 62, 65, 70, 72, 63],
  trombone: [40, 46, 52, 53, 57, 58, 62, 45],
  tuba: [29, 34, 36, 41, 43, 46, 48, 31],
} as const satisfies Readonly<Record<WindInstrument, readonly number[]>>;

const INSTRUMENTS = Object.keys(PROGRAMS).filter((id): id is WindInstrument => id in PROGRAMS);

/**
 * Each wind section on its own channel: eighth notes at 120 BPM, a rest, then a chord of two
 * notes. The tuba has one player (3.8), so that player gets both notes of the chord.
 */
const FILE: TestFile = {
  tracks: [
    [tempo(0, 120), timeSignature(0, 4, 4)],
    ...INSTRUMENTS.map((id, channel) =>
      track(
        [programChange(0, channel, PROGRAMS[id])],
        ...KEYS[id].map((key, i) => note(i * 240, channel, key, i * 240 + 220)),
        chord(2880, channel, [KEYS[id][0], KEYS[id][1]], 3840),
      ),
    ),
  ],
};

/** A wind player of a test scene, with its model. */
type WindPlayer = ScenePlayer<WindInstrument>;

/** The distances of the two palms from their grips, and of the mouth from the mouthpiece. */
interface GripGaps {
  readonly palmL: number;
  readonly palmR: number;
  readonly mouth: number;
}

function gaps(posed: PosedSkeleton): GripGaps {
  const { grips } = posed.model.instrument;
  const { body } = posed.model;
  if (!grips.palmL || !grips.palmR || !grips.mouth) {
    throw new Error('A wind instrument has grips of the palms and the mouth.');
  }
  return {
    palmL: length(sub(posedPoint(posed, 'handL', body.palmL), posedPiecePoint(posed, grips.palmL))),
    palmR: length(sub(posedPoint(posed, 'handR', body.palmR), posedPiecePoint(posed, grips.palmR))),
    mouth: length(sub(posedPoint(posed, 'head', body.mouth), posedPiecePoint(posed, grips.mouth))),
  };
}

describe('poseWind (design 5.3, 4.7)', () => {
  const scene = sceneOf(FILE);
  const players = firstPlayers(scene, INSTRUMENTS);
  const times = Array.from({ length: 80 }, (_, i) => 0.02 + i * 0.05);

  it('keeps the mouth on the mouthpiece while the player plays, also during a look', () => {
    for (const player of players) {
      for (const wall of [10, 23.7, 41.3, 77.9]) {
        for (const t of times) {
          const { mouth } = gaps(posedAt(scene, player, t, wall));
          expect(mouth, `${player.instrument} at ${t}`).toBeLessThan(1e-6);
        }
      }
    }
  });

  it('puts the palms on their grips while the player plays and in the rest pose', () => {
    for (const player of players) {
      for (const [t, transport] of [
        ...times.map((time) => [time, PLAYING] as const),
        [1, NOT_STARTED] as const,
      ]) {
        const g = gaps(posedAt(scene, player, t, 10, transport));
        expect(g.palmL, `${player.instrument} at ${t}`).toBeLessThan(1e-4);
        expect(g.palmR, `${player.instrument} at ${t}`).toBeLessThan(1e-4);
      }
    }
  });

  it('keeps the bones of the arms at their bind lengths', () => {
    for (const player of players) {
      for (const error of armLengthErrors(posedAt(scene, player, 1.3))) {
        expect(error, player.instrument).toBeLessThan(5e-7);
      }
    }
  });

  it('lifts the head off the mouthpiece and lowers the trumpet in the rest pose', () => {
    for (const player of players) {
      const { mouth } = gaps(posedAt(scene, player, 1, 0, NOT_STARTED));
      expect(mouth, player.instrument).toBeGreaterThan(0.03);
    }
    const trumpet = players.find((p) => p.instrument === 'trumpet');
    const turn = (transport: Transport, wall: number): number =>
      instrumentTurn(scene, trumpet?.index ?? -1, wall, transport);
    expect(turn(NOT_STARTED, 0)).toBeCloseTo(50 * DEG, 5);
    expect(turn(PLAYING, 10)).toBeCloseTo(0, 5);
    // 3 s after a pause, the instruments go down in 0.6 s (design 5.2).
    const pause: Transport = { playing: false, changedAtWall: 20, previousChangeAtWall: 5 };
    expect(turn(pause, 22.9)).toBeCloseTo(0, 5);
    expect(turn(pause, 23.3)).toBeGreaterThan(0.2 * 50 * DEG);
    expect(turn(pause, 23.3)).toBeLessThan(0.8 * 50 * DEG);
    expect(turn(pause, 23.6)).toBeCloseTo(50 * DEG, 5);
  });

  it('lowers the instruments of a silent seat in 0.6 s, after the change (design 5.5)', () => {
    const trumpet = players.find((p) => p.instrument === 'trumpet');
    const turn = (wall: number): number =>
      instrumentTurn(scene, trumpet?.index ?? -1, wall, PLAYING, 20);
    expect(turn(20)).toBeCloseTo(0, 5);
    expect(turn(20.3)).toBeGreaterThan(0.2 * 50 * DEG);
    expect(turn(20.6)).toBeCloseTo(50 * DEG, 5);
  });

  it('moves the trombone slide with the pitch, within the reach of the arm', () => {
    const trombone = players.find((p) => p.instrument === 'trombone');
    const plan = scene.plan.players[trombone?.index ?? -1];
    const rig = plan?.note.family === 'brass' ? plan.note.rig : null;
    if (!trombone || !plan || !rig) {
      throw new Error('The test file has a trombone.');
    }
    // The arm reaches the first part of the travel of 0.55 m (design 5.3).
    expect(rig.slideReach).toBeGreaterThan(0.15);
    expect(rig.slideReach).toBeLessThan(0.55);
    const slideAt = (t: number): Vec3 =>
      poseAt(scene.plan, t + plan.timeOffset, 10, PLAYING, allAudible(scene.score)).players[
        trombone.index
      ]?.slideOffset ?? [0, 0, 0];
    // E2 7, B♭2 1, E3 2, F3 1, A3 2, B♭3 1, D4 1, A2 2: the positions of the keys.
    const positions = [7, 1, 2, 1, 2, 1, 1, 2];
    for (const [i, position] of positions.entries()) {
      const offset = slideAt(i * 0.25 + 0.15);
      const along = dot(offset, rig.slideAxis);
      expect(along, `note ${i}`).toBeCloseTo(((position - 1) / 6) * rig.slideReach, 6);
      expect(length(offset), `note ${i}`).toBeCloseTo(Math.abs(along), 6);
    }
    // The chord ends with B♭2 in the first position.
    expect(dot(slideAt(3.2), rig.slideAxis)).toBeCloseTo(0, 6);
    // In the rest pose, the slide is closed.
    const rest = poseAt(scene.plan, 0.2, 0, NOT_STARTED, allAudible(scene.score)).players[
      trombone.index
    ];
    expect(length(rest?.slideOffset ?? [1, 0, 0])).toBe(0);
  });

  it('closes the fingers for the pitch, and shows the highest note of a chord', () => {
    const curl = (player: WindPlayer, bone: BoneName, t: number): number => {
      const offset = scene.plan.players[player.index]?.timeOffset ?? 0;
      const pose = poseAt(scene.plan, t + offset, 10, PLAYING, allAudible(scene.score)).players[
        player.index
      ];
      return turnOf(pose?.rotations ?? new Float32Array(0), boneIndex(bone));
    };
    for (const player of players) {
      const bones = player.instrument === 'trombone' ? [] : (['fingersL', 'fingersR'] as const);
      const fingerings = new Set<string>();
      for (const [i] of KEYS[player.instrument].entries()) {
        fingerings.add(bones.map((b) => curl(player, b, i * 0.25 + 0.15).toFixed(4)).join(' '));
      }
      if (bones.length > 0) {
        expect(fingerings.size, player.instrument).toBeGreaterThan(2);
      }
      // A chord of the first and the second key shows the second key, the higher one.
      for (const bone of bones) {
        expect(curl(player, bone, 3.2), `${player.instrument} ${bone}`).toBeCloseTo(
          curl(player, bone, 0.25 + 0.15),
          6,
        );
      }
    }
    // The tuba player has both notes of the chord: B♭1 with no valve, and F1 with two.
    const tuba = players.find((p) => p.instrument === 'tuba');
    const cast = scene.layout.players[tuba?.index ?? -1]?.cast;
    const chordNotes = scene.score.notes.filter(
      (n) => n.seatIndex === cast?.seatIndex && n.player === cast.player && n.startSec === 3,
    );
    expect(chordNotes.map((n) => n.pitch).toSorted((a, b) => a - b)).toEqual([29, 34]);
    if (tuba) {
      expect(curl(tuba, 'fingersR', 3.2)).toBeCloseTo(WIND_BODY.curlOpen, 6);
    }
  });

  it('leans back to breathe in before a phrase', () => {
    for (const player of players) {
      const offset = scene.plan.players[player.index]?.timeOffset ?? 0;
      const chestZ = (t: number): number =>
        posedAt(scene, player, t + offset).frames[boneIndex('chest')]?.position[2] ?? 0;
      // The second phrase starts at 2.88 s, after a rest of 0.98 s.
      expect(chestZ(2.88) - chestZ(2.4), player.instrument).toBeGreaterThan(0.001);
    }
  });
});
