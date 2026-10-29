import { describe, expect, it } from 'vitest';

import { Vector3 } from 'three';

import { chord, note, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { toVec3 } from '../models/tuples.ts';
import type { Vec3 } from '../models/tuples.ts';
import { CONDUCTOR } from '../models/cast.ts';
import { buildPlayer } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import { choirFile } from '../models/test-choir.ts';
import { patchedDemos } from '../../tools/patch-demos.ts';
import type { PlayerNote } from '../score/types.ts';
import type { PosePlan } from './plan.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import {
  SAMPLE_STEP,
  firstChange,
  posedPiecePoint,
  posedPoint,
  poseSkeleton,
  sampleAround,
  turnOf,
} from './test-kinematics.ts';
import type { PosedSkeleton, PoseSample } from './test-kinematics.ts';
import { PLAYING, conductedSceneOf, ofConductor, sceneOf } from './test-scene.ts';
import type { TestScene } from './test-scene.ts';
import type { AnimalPose } from './types.ts';

/** The target of design 9.7: each note event within 5 ms of its note time. */
const EVENT_TOLERANCE = 0.005;

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
      chord(1920, 0, [60, 64, 67, 72, 76, 79, 84], 2400),
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

/**
 * Makes a vector from a point.
 *
 * @param p The point.
 * @returns A new vector.
 */
function v(p: Vec3): Vector3 {
  return new Vector3(...p);
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
    const inverse = instrument.rotation.clone().invert();
    return toVec3(v(palm).sub(instrument.position).applyQuaternion(inverse));
  }
  const hair = posed.model.instrument.targets.find((t) => t.kind === 'bow-hair');
  const contact = posed.model.instrument.targets.find((t) => t.kind === 'bow-contact');
  if (!hair || !contact) {
    throw new Error('A bowed string has a bow and a bow contact.');
  }
  const start = v(posedPiecePoint(posed, { bone: 'bow', at: hair.from }));
  const direction = v(posedPiecePoint(posed, { bone: 'bow', at: hair.to })).sub(start);
  const point = v(posedPiecePoint(posed, { bone: 'instrument', at: contact.from }));
  const along = point.sub(start).dot(direction) / direction.length();
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
  const samples = sampleAround(scene.plan, index, around - 0.03, around + 0.03, (pose) =>
    measure(poseSkeleton(model, pose), pizzicato),
  );
  const moves = (from: Vec3, to: Vec3): boolean => {
    const move = v(to).sub(v(from));
    return pizzicato ? move.length() > STILL : move.x * direction > STILL;
  };
  return firstChange(samples, moves, true);
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
    if (plan?.note.family !== 'bowed' || (principalsOnly && cast.player > 0)) {
      continue;
    }
    const model = buildPlayer(cast.species, cast.instrument, cast.kettles);
    const notes = scene.score.notes.filter(
      (n) => n.seatIndex === cast.seatIndex && n.player === cast.player,
    );
    const strokes = plan.note.strokes;
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

/** The scenes of the demos, by the start of the file name. The tests share them. */
const demoScenes = new Map<string, Promise<TestScene>>();

/**
 * Builds the scene of a demo one time.
 *
 * @param file The start of the file name of the demo.
 * @returns The scene.
 */
function demoScene(file: string): Promise<TestScene> {
  let scene = demoScenes.get(file);
  if (!scene) {
    scene = patchedDemos().then((demos) => {
      const demo =
        demos.find((d) => d.file === `${file}.mid`) ?? demos.find((d) => d.file.startsWith(file));
      if (!demo) {
        throw new Error(`The demos have the file ${file}.`);
      }
      return sceneOf(demo.bytes, 1);
    });
    demoScenes.set(file, scene);
  }
  return scene;
}

describe('the pose timing (design 9.7)', () => {
  it('gives each note event of the bowed strings within 5 ms of its note time', () => {
    const scene = sceneOf(FILE, 7, 'full');
    const { error, count } = largestError(scene, Infinity, false);
    expect(count).toBeGreaterThan(40);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });

  it('gives each note event of the first 10 s of the Bach demo within 5 ms', async () => {
    const { error, count } = largestError(await demoScene('bach-bwv1048'), 10, true);
    expect(count).toBeGreaterThan(250);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });
});

/** Legato notes, leaps, repeated notes, and rests on five wind sections, at 120 BPM. */
const WIND_FILE: TestFile = {
  tracks: [
    [tempo(0, 120)],
    ...(
      [
        [73, [72, 74, 76, 77, 79, 81, 79, 84, 72, 72, 77]],
        [71, [55, 57, 60, 62, 64, 67, 62, 59, 60, 60, 65]],
        [60, [48, 50, 53, 55, 57, 60, 57, 52, 53, 53, 50]],
        [56, [58, 60, 62, 63, 65, 67, 70, 55, 58, 58, 64]],
        [57, [46, 48, 50, 52, 53, 55, 57, 40, 45, 45, 58]],
      ] as const
    ).map(([program, keys], channel) =>
      track(
        [programChange(0, channel, program)],
        ...keys.map((key, i) => {
          // Eighth notes, a rest of 0.75 s after the seventh note, and a staccato pair.
          const start = i * 240 + (i >= 7 ? 720 : 0);
          return note(start, channel, key, start + (i >= 8 ? 100 : 236));
        }),
      ),
    ),
  ],
};

/** Measures the fingers and the slide of a wind player, which arrive at a note. */
function windMeasure(pose: AnimalPose): Vec3 {
  return [
    turnOf(pose.rotations, boneIndex('fingersL')),
    turnOf(pose.rotations, boneIndex('fingersR')),
    v(pose.slideOffset).length(),
  ];
}

/**
 * Finds the time at which the fingers or the slide of a wind player arrive at a note: the first
 * sample after which they stop, after a move. The move starts at most 0.1 s before the note.
 *
 * @returns The time, or `null` if the pose shows no arrival in the window.
 */
function arrivalInPose(scene: TestScene, index: number, around: number): number | null {
  const samples = sampleAround(scene.plan, index, around - 0.12, around + 0.03, windMeasure);
  return firstChange(samples, (from, to) => v(to).distanceTo(v(from)) > 1e-6, false);
}

/** Checks the note events of all wind players of a scene, and gives the largest error. */
function largestWindError(scene: TestScene, until: number): EventCheck {
  let error = 0;
  let count = 0;
  for (const [index, place] of scene.layout.players.entries()) {
    const plan = scene.plan.players[index];
    const layer = plan?.note;
    if (!plan || (layer?.family !== 'woodwind' && layer?.family !== 'brass')) {
      continue;
    }
    const windTrack = layer.track;
    for (let i = 1; i < windTrack.starts.length; i++) {
      const time = windTrack.starts[i] ?? Infinity;
      if (time > until) {
        break;
      }
      const changes =
        windTrack.fingersL[i] !== windTrack.fingersL[i - 1] ||
        windTrack.fingersR[i] !== windTrack.fingersR[i - 1] ||
        windTrack.slide[i] !== windTrack.slide[i - 1];
      if (!changes) {
        continue;
      }
      const expected = time + plan.timeOffset;
      const found = arrivalInPose(scene, index, expected);
      const label = `${place.cast.instrument} ${place.cast.player} at ${time}`;
      expect(found, label).not.toBeNull();
      const e = Math.abs((found ?? Infinity) - expected);
      expect(e, label).toBeLessThanOrEqual(EVENT_TOLERANCE);
      error = Math.max(error, e);
      count++;
    }
  }
  return { error, count };
}

describe('the pose timing of the winds (design 9.7)', () => {
  it('moves the fingers and the slide to each note, and they arrive within 5 ms of it', () => {
    const scene = sceneOf(WIND_FILE, 5);
    const { error, count } = largestWindError(scene, Infinity);
    expect(count).toBeGreaterThan(35);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });

  it('gives each wind note event of the first 40 s of the Beethoven 8 demo within 5 ms', async () => {
    const { error, count } = largestWindError(await demoScene('beethoven-8'), 40);
    expect(count).toBeGreaterThan(100);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });
});

/** Measures the palm of one hand of a player, in the model axes. */
function palmMeasure(model: PlayerModel, side: 'L' | 'R'): (pose: AnimalPose) => Vec3 {
  return (pose) => {
    const posed = poseSkeleton(model, pose);
    return side === 'L'
      ? posedPoint(posed, 'handL', model.body.palmL)
      : posedPoint(posed, 'handR', model.body.palmR);
  };
}

/**
 * Checks the note events of all piano and harp players of a scene, and gives the largest error.
 * A piano palm stops on its keys at the note start. A harp palm rests on its string, and starts
 * to pluck at the note start.
 */
function largestHandError(scene: TestScene, until: number): EventCheck {
  let error = 0;
  let count = 0;
  for (const [index, place] of scene.layout.players.entries()) {
    const plan = scene.plan.players[index];
    const layer = plan?.note;
    if (!plan || (layer?.family !== 'keyboard' && layer?.family !== 'harp')) {
      continue;
    }
    const { cast } = place;
    const model = buildPlayer(cast.species, cast.instrument, cast.kettles);
    for (const [side, hand] of [
      ['L', layer.left],
      ['R', layer.right],
    ] as const) {
      const palm = palmMeasure(model, side);
      for (const time of hand.starts) {
        if (time > until) {
          break;
        }
        const expected = time + plan.timeOffset;
        const samples = sampleAround(scene.plan, index, expected - 0.03, expected + 0.03, palm);
        const moves = (from: Vec3, to: Vec3): boolean => v(to).distanceTo(v(from)) > STILL;
        const found = firstChange(samples, moves, layer.family === 'harp');
        const label = `${cast.instrument} ${side} at ${time}`;
        expect(found, label).not.toBeNull();
        const e = Math.abs((found ?? Infinity) - expected);
        expect(e, label).toBeLessThanOrEqual(EVENT_TOLERANCE);
        error = Math.max(error, e);
        count++;
      }
    }
  }
  return { error, count };
}

/** Fast notes, chords, and leaps of the two hands of the piano and of the harp, at 120 BPM. */
const HANDS_FILE: TestFile = {
  tracks: [
    [tempo(0, 120)],
    ...(
      [
        [0, [36, 72, 74, 76, 43, 77, 79, 31]],
        [46, [24, 84, 86, 88, 36, 89, 91, 103]],
      ] as const
    ).map(([program, keys], channel) =>
      track(
        [programChange(0, channel, program)],
        ...keys.map((key, i) => note(i * 120, channel, key, i * 120 + 100)),
        chord(1200, channel, [keys[0], keys[4], keys[5], keys[6]], 1680),
        note(1920, channel, keys[1], 2000),
        note(1960, channel, keys[2], 2040),
      ),
    ),
  ],
};

describe('the pose timing of the piano and the harp (design 9.7)', () => {
  it('strikes and plucks each note within 5 ms of its note time', () => {
    const { error, count } = largestHandError(sceneOf(HANDS_FILE, 3), Infinity);
    expect(count).toBeGreaterThan(18);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });

  it('gives each note of the first 20 s of the harpsichord of the Bach demo within 5 ms', async () => {
    const { error, count } = largestHandError(await demoScene('bach-bwv1048'), 20);
    expect(count).toBeGreaterThan(60);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });

  it('gives each note of the first 20 s of the harp of the Boulanger demo within 5 ms', async () => {
    const { error, count } = largestHandError(await demoScene('boulanger'), 20);
    expect(count).toBeGreaterThan(20);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });
});

/**
 * Finds the time at which the jaw of a singer is open for a note: the first sample after which
 * it stops, after it opens.
 *
 * @returns The time, or `null` if the pose shows no stop in the window.
 */
function jawOpenInPose(scene: TestScene, index: number, around: number): number | null {
  const samples = sampleAround(scene.plan, index, around - 0.03, around + 0.03, (pose) => [
    turnOf(pose.rotations, boneIndex('jaw')),
    0,
    0,
  ]);
  return firstChange(samples, (from, to) => Math.abs(to[0] - from[0]) > STILL, false);
}

/** Checks the sung notes of all singers of a scene, and gives the largest error. */
function largestChoirError(scene: TestScene, until: number): EventCheck {
  let error = 0;
  let count = 0;
  for (const [index, place] of scene.layout.players.entries()) {
    const plan = scene.plan.players[index];
    const layer = plan?.note;
    if (!plan || layer?.family !== 'choir') {
      continue;
    }
    for (const time of layer.track.starts) {
      if (time > until) {
        break;
      }
      const expected = time + plan.timeOffset;
      const found = jawOpenInPose(scene, index, expected);
      const label = `singer ${place.cast.player} at ${time}`;
      expect(found, label).not.toBeNull();
      const e = Math.abs((found ?? Infinity) - expected);
      expect(e, label).toBeLessThanOrEqual(EVENT_TOLERANCE);
      error = Math.max(error, e);
      count++;
    }
  }
  return { error, count };
}

/** Legato notes, repeated notes, rests, and a chord of a choir, at 120 BPM. */
const CHOIR_FILE: TestFile = {
  tracks: [
    [tempo(0, 120)],
    track(
      [programChange(0, 0, 52)],
      ...[0, 240, 480, 720, 1440, 1560, 1680].map((t, i) => note(t, 0, 67 + (i % 3), t + 240)),
      chord(2400, 0, [64, 67, 72], 2880),
      note(3360, 0, 74, 3600),
    ),
  ],
};

describe('the pose timing of the choir (design 9.7)', () => {
  it('opens the jaw for each note within 5 ms of its note time', () => {
    const { error, count } = largestChoirError(sceneOf(CHOIR_FILE, 4), Infinity);
    expect(count).toBeGreaterThan(10);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });

  // The test samples each of the 32 singers on the risers around each note of the choir test
  // file. It takes about 1 s on an idle Mac, so a high load can pass the default limit of 5 s.
  it('gives each sung note of the four voices on the risers within 5 ms', () => {
    const scene = sceneOf(choirFile());
    expect(scene.layout.risers).toHaveLength(2);
    const { error, count } = largestChoirError(scene, Infinity);
    expect(count).toBeGreaterThan(1000);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });

  it('gives each sung note of the first 60 s of the Beethoven 9 demo within 5 ms', async () => {
    const { error, count } = largestChoirError(await demoScene('beethoven-9'), 60);
    // In the first 60 s, only the vocal soloists sing: one singer for each voice. With the 8
    // singers of the choir row, the first 60 s give more than 600 notes.
    expect(count).toBeGreaterThan(100);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });
});

/**
 * Measures the height of the striking part of one hand above a target, along the normal of the
 * target: the head of a mallet, or the inner face of a cymbal. For the cymbals, the height is the
 * gap between the two inner faces.
 */
function strikeMeasure(
  model: PlayerModel,
  side: 'L' | 'R',
  point: Vec3,
  normal: Vec3,
): (pose: AnimalPose) => Vec3 {
  const partOf = (bone: 'malletL' | 'malletR') => {
    const target = model.instrument.targets.find(
      (t) => (t.kind === 'mallet-head' || t.kind === 'plate') && t.bone === bone,
    );
    if (!target) {
      throw new Error(`The ${model.instrument.id} has nothing to strike with in ${bone}.`);
    }
    return { bone, at: target.from };
  };
  if (model.instrument.id === 'cymbals') {
    const left = partOf('malletL');
    const right = partOf('malletR');
    return (pose) => {
      const posed = poseSkeleton(model, pose);
      const gap = v(posedPiecePoint(posed, right)).sub(v(posedPiecePoint(posed, left)));
      return [gap.dot(v(normal)), 0, 0];
    };
  }
  const head = partOf(side === 'L' ? 'malletL' : 'malletR');
  return (pose) => [
    v(posedPiecePoint(poseSkeleton(model, pose), head))
      .sub(v(point))
      .dot(v(normal)),
    0,
    0,
  ];
}

/**
 * Checks the strikes of all percussion players of a scene, and gives the largest error. A mallet
 * head comes down to its target and rebounds: the strike is the first sample after which it
 * rises again.
 */
function largestStrikeError(scene: TestScene, until: number): EventCheck {
  let error = 0;
  let count = 0;
  for (const [index, place] of scene.layout.players.entries()) {
    const plan = scene.plan.players[index];
    const layer = plan?.note;
    if (!plan || layer?.family !== 'percussion') {
      continue;
    }
    const { cast } = place;
    const model = buildPlayer(cast.species, cast.instrument, cast.kettles);
    const sides = cast.instrument === 'cymbals' ? (['R'] as const) : (['L', 'R'] as const);
    for (const side of sides) {
      const hand = side === 'L' ? layer.left : layer.right;
      for (const [i, time] of (hand?.starts ?? []).entries()) {
        if (!hand || time > until) {
          break;
        }
        const at = (list: Float64Array): Vec3 => [
          list[3 * i] ?? 0,
          list[3 * i + 1] ?? 0,
          list[3 * i + 2] ?? 0,
        ];
        const expected = time + plan.timeOffset;
        const height = strikeMeasure(model, side, at(hand.points), at(hand.normals));
        const samples = sampleAround(scene.plan, index, expected - 0.03, expected + 0.03, height);
        const rises = (from: Vec3, to: Vec3): boolean => to[0] - from[0] > STILL;
        const found = firstChange(samples, rises, true);
        const label = `${cast.instrument} ${side} at ${time}`;
        expect(found, label).not.toBeNull();
        const e = Math.abs((found ?? Infinity) - expected);
        expect(e, label).toBeLessThanOrEqual(EVENT_TOLERANCE);
        error = Math.max(error, e);
        count++;
      }
    }
  }
  return { error, count };
}

/** Fast and slow strikes of the timpani, the percussion of the Orchestra kit, and the xylophone. */
const STRIKE_FILE: TestFile = {
  tracks: [
    [tempo(0, 120)],
    track(
      [programChange(0, 2, 47)],
      ...[38, 45, 45, 45, 50, 57, 43, 53].map((key, i) => note(i * 160, 2, key, i * 160 + 100)),
      chord(1440, 2, [41, 53], 1700),
    ),
    track(
      [programChange(0, 9, 48)],
      ...[35, 38, 38, 57, 81, 81, 54, 35, 57, 81].map((key, i) =>
        note(i * 120, 9, key, i * 120 + 100),
      ),
    ),
    track(
      [programChange(0, 3, 13)],
      ...[72, 73, 79, 84, 90, 96, 101, 74].map((key, i) => note(i * 100, 3, key, i * 100 + 80)),
    ),
  ],
};

describe('the pose timing of the percussion (design 9.7)', () => {
  it('strikes each note of the mallets, the drums, and the cymbals within 5 ms', () => {
    const { error, count } = largestStrikeError(sceneOf(STRIKE_FILE, 6), Infinity);
    expect(count).toBeGreaterThan(25);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });

  it('gives each timpani strike of the first 120 s of the Beethoven 9 demo within 5 ms', async () => {
    const { error, count } = largestStrikeError(await demoScene('beethoven-9'), 120);
    expect(count).toBeGreaterThan(40);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });

  it('gives each percussion strike of the first 40 s of the Boulanger demo within 5 ms', async () => {
    const { error, count } = largestStrikeError(await demoScene('boulanger'), 40);
    expect(count).toBeGreaterThan(40);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });
});

/**
 * Checks the beats of the conductor of a scene, and gives the largest error. The tip of the baton
 * comes down into the point of each beat and leaves it upward: the beat is the first sample after
 * which the tip rises again.
 */
function largestBeatError(scene: TestScene, until: number): EventCheck {
  const model = buildPlayer(CONDUCTOR.species, CONDUCTOR.instrument);
  const tip = model.instrument.targets.find((t) => t.kind === 'tip');
  if (!tip) {
    throw new Error('The baton has a tip.');
  }
  // The conductor poses with no players, so each sample poses one animal.
  const plan: PosePlan = { ...scene.plan, players: [] };
  const buffer = createScenePose(plan);
  let error = 0;
  let count = 0;
  for (const time of plan.beats) {
    if (time > until) {
      break;
    }
    const samples: PoseSample[] = [];
    for (let t = time - 0.03; t <= time + 0.03; t += SAMPLE_STEP) {
      const posed = poseSkeleton(
        model,
        ofConductor(poseAt(plan, t, 10, PLAYING, [], buffer).conductor),
      );
      samples.push({ time: t, value: posedPiecePoint(posed, { bone: 'baton', at: tip.from }) });
    }
    const found = firstChange(samples, (from, to) => to[1] - from[1] > STILL, true);
    const label = `beat at ${time}`;
    expect(found, label).not.toBeNull();
    const e = Math.abs((found ?? Infinity) - time);
    expect(e, label).toBeLessThanOrEqual(EVENT_TOLERANCE);
    error = Math.max(error, e);
    count++;
  }
  return { error, count };
}

/** Two bars each of 4/4, 3/4, 6/8, and 5/4 at 70 BPM, with a violin note in each bar. */
const BEATS_FILE: TestFile = {
  tracks: [
    [
      tempo(0, 70),
      timeSignature(0, 4, 4),
      timeSignature(3840, 3, 4),
      timeSignature(6720, 6, 8),
      timeSignature(9600, 5, 4),
    ],
    track(
      [programChange(0, 0, 40)],
      ...[0, 1920, 3840, 5280, 6720, 8160, 9600, 12_000].map((t) => note(t, 0, 72, t + 1400)),
    ),
  ],
};

describe('the pose timing of the conductor (design 9.7)', () => {
  it('brings the baton down on each beat of each pattern within 5 ms', () => {
    const scene = conductedSceneOf(BEATS_FILE);
    const patterns = new Set(scene.score.beats.map((b) => b.pattern));
    expect([...patterns]).toEqual([4, 3, 6, 'generic']);
    const { error, count } = largestBeatError(scene, Infinity);
    expect(count).toBe(scene.score.beats.length);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });

  it('brings the baton down on each beat of the pattern of one beat within 5 ms', () => {
    // Eight bars of 2/4 at 192 BPM: one conducted beat of 0.625 s in each bar, as in the first
    // movement of Beethoven's Symphony No. 5 (design 5.4).
    const scene = conductedSceneOf({
      tracks: [[tempo(0, 192), timeSignature(0, 2, 4)], track([], note(0, 0, 60, 8 * 960))],
    });
    expect(scene.score.beats.every((b) => b.pattern === 1)).toBe(true);
    const { error, count } = largestBeatError(scene, Infinity);
    expect(count).toBe(scene.score.beats.length);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });

  it('gives each beat of the Beethoven 8 demo within 5 ms', async () => {
    const scene = await demoScene('beethoven-8');
    expect(scene.score.beats.every((b) => b.pattern === 2)).toBe(true);
    const { error, count } = largestBeatError(scene, Infinity);
    expect(count).toBeGreaterThan(150);
    expect(error).toBeLessThanOrEqual(EVENT_TOLERANCE);
  });
});
