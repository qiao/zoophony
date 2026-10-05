import { describe, expect, it } from 'vitest';

import { note, programChange, tempo, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { dot, invert, length, rotate, sub } from '../models/math.ts';
import type { Vec3 } from '../models/math.ts';
import { buildPlayer } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { patchedDemos } from '../../tools/patch-demos.ts';
import type { PlayerNote } from '../score/types.ts';
import { BOWED_HOLDS, isBowed } from './bowed.ts';
import { boneRotation } from './frames.ts';
import { PLAYER_OFFSETS } from './plan.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { posedPiecePoint, posedPoint, poseSkeleton } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { PLAYING, allAudible, sceneOf } from './test-scene.ts';
import type { TestScene } from './test-scene.ts';
import type { Transport } from './types.ts';

/** The target of design 9.7: each note event within 5 ms of its note time. */
const EVENT_TOLERANCE = 0.005;

/** The step of the samples of the pose around a note, in seconds. */
const STEP = 0.0005;

/** A smaller move between two samples is no move, in meters. */
const STILL = 2e-6;

/**
 * Legato notes, notes after rests, a chord of more notes than players (double stops), pizzicato,
 * and tremolo, on the violins and the cellos, at 120 BPM.
 */
const FILE: TestFile = {
  tracks: [
    [tempo(0, 120)],
    track(
      [programChange(0, 0, 40)],
      ...[0, 240, 480, 960, 1200].map((t, i) => note(t, 0, 67 + i * 2, t + 240)),
      chordNotes(1920, 0, [60, 64, 67, 72, 76, 79, 84], 2400),
      note(2880, 0, 74, 3360),
      [programChange(3600, 0, 45)],
      ...[3840, 4320, 4560].map((t) => note(t, 0, 69, t + 120)),
      [programChange(5000, 0, 44)],
      note(5280, 0, 76, 6240),
      [programChange(6400, 0, 40)],
      note(6720, 0, 72, 7200),
    ),
    track(
      [programChange(0, 1, 42)],
      ...[0, 480, 1440, 1680, 1920].map((t, i) => note(t, 1, 43 + i * 3, t + 240)),
      [programChange(2600, 1, 45)],
      note(2880, 1, 50, 3000),
      note(3360, 1, 53, 3480),
    ),
  ],
};

/** The note ons of a chord, each with its own note off. */
function chordNotes(tick: number, channel: number, keys: readonly number[], end: number) {
  return keys.flatMap((key) => note(tick, channel, key, end));
}

/** One note event of a player: its time in the score and its technique. */
interface NoteEvent {
  readonly time: number;
  readonly note: PlayerNote;
}

/**
 * Lists the note events of a player from the score: each note start, with the notes that start
 * within 50 ms of it as one event (a chord, design 3.8).
 */
function noteEvents(notes: readonly PlayerNote[]): NoteEvent[] {
  const events: NoteEvent[] = [];
  for (const n of notes) {
    const last = events.at(-1);
    if (!last || n.startSec - last.time > 0.05) {
      events.push({ time: n.startSec, note: n });
    }
  }
  return events;
}

/** The measure of the motion of a note event: a bow place, or a place of the plucking palm. */
function measure(posed: PosedSkeleton, pizzicato: boolean): Vec3 {
  const instrument = posed.frames[boneIndex('instrument')];
  if (!instrument) {
    throw new Error('The player has no instrument bone.');
  }
  if (pizzicato) {
    // The palm in the axes of the instrument, so that the sway of the body does not count.
    const palm = posedPoint(posed, 'handR', posed.model.body.palmR);
    return rotate(invert(instrument.rotation), sub(palm, instrument.position));
  }
  const hair = posed.model.instrument.targets.find((t) => t.kind === 'bow-hair');
  const contact = posed.model.instrument.targets.find((t) => t.kind === 'bow-contact');
  if (!hair || !contact) {
    throw new Error('A bowed string has a bow and a bow contact.');
  }
  const start = posedPiecePoint(posed, { bone: 'bow', at: hair.from });
  const end = posedPiecePoint(posed, { bone: 'bow', at: hair.to });
  const direction = sub(end, start);
  const along =
    dot(sub(posedPiecePoint(posed, { bone: 'instrument', at: contact.from }), start), direction) /
    length(direction);
  return [along, 0, 0];
}

/**
 * Finds the time of a note event in the pose: the first sample after which the bow moves in the
 * direction of the new stroke while it did not before, or the plucking palm starts to move.
 *
 * @returns The time, or `null` if the pose shows no event in the window.
 */
function eventInPose(
  scene: TestScene,
  index: number,
  model: PlayerModel,
  around: number,
  pizzicato: boolean,
  direction: number,
): number | null {
  const buffer = createScenePose(scene.plan);
  const audible = allAudible(scene.score);
  const samples: { time: number; value: Vec3 }[] = [];
  for (let time = around - 0.03; time <= around + 0.03; time += STEP) {
    const pose = poseAt(scene.plan, time, 10, PLAYING, audible, buffer).players[index];
    if (!pose) {
      throw new Error('The player has no pose.');
    }
    samples.push({ time, value: measure(poseSkeleton(model, pose), pizzicato) });
  }
  const move = (k: number): Vec3 =>
    sub(samples[k + 1]?.value ?? [0, 0, 0], samples[k]?.value ?? [0, 0, 0]);
  const moving = (k: number): boolean =>
    pizzicato ? length(move(k)) > STILL : move(k)[0] * direction > STILL;
  for (let k = 1; k + 1 < samples.length; k++) {
    if (moving(k) && !moving(k - 1)) {
      return samples[k]?.time ?? null;
    }
  }
  return null;
}

/** The result of a check of the note events. */
interface EventCheck {
  /** The largest error of a note event, in seconds. */
  readonly error: number;
  /** The number of note events. */
  readonly count: number;
}

/** Checks the note events of all bowed players of a scene, and gives the largest error. */
function largestError(scene: TestScene, until: number, principalsOnly: boolean): EventCheck {
  let error = 0;
  let count = 0;
  for (const [index, place] of scene.layout.players.entries()) {
    const plan = scene.plan.players[index];
    const { cast } = place;
    if (!plan?.bowed || !isBowed(cast.instrument) || (principalsOnly && cast.player > 0)) {
      continue;
    }
    const model = buildPlayer(cast.species, cast.instrument, cast.kettles);
    const notes = scene.score.notes.filter(
      (n) => n.seatIndex === cast.seatIndex && n.player === cast.player,
    );
    const strokes = plan.bowed.strokes;
    for (const [i, event] of noteEvents(notes).entries()) {
      if (event.time > until) {
        break;
      }
      const stroke = strokes[i];
      const pizzicato = event.note.technique === 'pizzicato';
      // A tremolo starts upward on the hair. A bow stroke goes from its start to its end.
      const direction =
        event.note.technique !== 'tremolo' && stroke && stroke.bowTo < stroke.bowFrom ? -1 : 1;
      const expected = event.time + plan.timeOffset;
      const found = eventInPose(scene, index, model, expected, pizzicato, direction);
      expect(found, `${cast.instrument} ${cast.player} at ${event.time}`).not.toBeNull();
      const e = Math.abs((found ?? Infinity) - expected);
      expect(e, `${cast.instrument} ${cast.player} at ${event.time}`).toBeLessThanOrEqual(
        EVENT_TOLERANCE,
      );
      error = Math.max(error, e);
      count++;
    }
  }
  return { error, count };
}

describe('the pose timing (design 9.7)', () => {
  it('gives each note event of the bowed strings within 5 ms of its note time', () => {
    const scene = sceneOf(FILE, 7, 'full');
    const { error, count } = largestError(scene, Infinity, false);
    expect(count).toBeGreaterThan(40);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });

  it('gives each note event of the first 10 s of the Beethoven demo within 5 ms', async () => {
    const demo = (await patchedDemos()).find((d) => d.file.startsWith('beethoven'));
    if (!demo) {
      throw new Error('The demos have the Beethoven file.');
    }
    const scene = sceneOf(demo.bytes, 1);
    const { error, count } = largestError(scene, 10, true);
    expect(count).toBeGreaterThan(50);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });
});

describe('the seeded offsets (design 5.3, 9.7)', () => {
  it('keeps the timing offset of each player within 20 ms, and seeds it', () => {
    const offsets = (seed: number): number[] =>
      sceneOf(FILE, seed, 'full').plan.players.map((p) => p.timeOffset);
    const a = offsets(1);
    expect(a.length).toBeGreaterThan(5);
    for (const offset of a) {
      expect(Math.abs(offset)).toBeLessThanOrEqual(PLAYER_OFFSETS.timeSec);
    }
    expect(offsets(1)).toEqual(a);
    expect(offsets(2)).not.toEqual(a);
    // Players in unison do not move as copies.
    expect(new Set(a).size).toBe(a.length);
    expect(Math.max(...a) - Math.min(...a)).toBeGreaterThan(0.005);
  });
});

describe('the rest rules (design 5.2, 5.5, 9.7)', () => {
  const scene = sceneOf(FILE, 3, 'full');
  const violin = scene.layout.players.findIndex((p) => p.cast.instrument === 'violin');
  const rest = BOWED_HOLDS.violin.rest;
  const turnAt = (wall: number, transport: Transport): number => {
    const pose = poseAt(scene.plan, 1, wall, transport, allAudible(scene.score)).players[violin];
    const w = boneRotation(pose?.rotations ?? new Float32Array(0), boneIndex('instrument'))[3];
    return 2 * Math.acos(Math.min(1, Math.abs(w)));
  };

  it('keeps the rest pose before the first play, and lifts the instruments in 0.3 s', () => {
    expect(rest).not.toBeNull();
    const down = turnAt(0, { playing: false, changedAtWall: null, previousChangeAtWall: null });
    expect(down).toBeGreaterThan(1);
    const play: Transport = { playing: true, changedAtWall: 5, previousChangeAtWall: null };
    expect(turnAt(5, play)).toBeCloseTo(down, 5);
    expect(turnAt(5.15, play)).toBeLessThan(0.8 * down);
    expect(turnAt(5.3, play)).toBeCloseTo(0, 5);
  });

  it('keeps the instruments up for 3 s after a pause, then lowers them in 0.6 s', () => {
    const pause: Transport = { playing: false, changedAtWall: 20, previousChangeAtWall: 5 };
    const down = turnAt(0, { playing: false, changedAtWall: null, previousChangeAtWall: null });
    expect(turnAt(22.9, pause)).toBeCloseTo(0, 5);
    expect(turnAt(23.3, pause)).toBeGreaterThan(0.2 * down);
    expect(turnAt(23.3, pause)).toBeLessThan(0.8 * down);
    expect(turnAt(23.6, pause)).toBeCloseTo(down, 5);
  });
});
