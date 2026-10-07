import { describe, expect, it } from 'vitest';

import { Vector3 } from 'three';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { noteOff, noteOn, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestEvent, TestFile } from '../midi/test-smf.ts';
import { CONDUCTOR } from '../models/cast.ts';
import { boneIndex } from '../models/rig.ts';
import { scoreOf } from '../score/test-score.ts';
import { CLOSE_CURL, LEFT_HAND_PLACES, MIRROR_SCALE } from './conductor.ts';
import type { LeftHandPlace } from './conductor.ts';
import {
  LEFT_HAND_RULES,
  beatLevels,
  createLeftHandState,
  findHolds,
  leftHandAt,
} from './conductor-left.ts';
import type { LeftHandState } from './conductor-left.ts';
import { createCueState, cueStateAt } from './cues.ts';
import type { ConductorLayer } from './plan.ts';
import { poseAt } from './pose-at.ts';
import { poseSkeleton, turnOf } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { PLAYING, allAudible, ofConductor, sceneOf } from './test-scene.ts';

/** The ticks of one bar of 4/4, at 480 ticks for each quarter note. */
const BAR = 1920;

/** The channels and the programs of the seats: violins, violas, cellos, horns, trumpets. */
const SEATS = [
  [0, 40],
  [1, 41],
  [2, 42],
  [3, 60],
  [4, 56],
] as const;

/** The velocity of each beat of the first 18 bars: soft, crescendo, loud, diminuendo, soft. */
function velocityOf(beat: number): number {
  const ramp = (i: number): number => Math.round(40 + (87 * i) / 16);
  if (beat < 16) {
    return 40;
  }
  if (beat < 32) {
    return ramp(beat - 15);
  }
  if (beat < 48) {
    return 127;
  }
  if (beat < 64) {
    return ramp(64 - beat);
  }
  return 40;
}

/**
 * Bars of 4/4 at 120 BPM (a beat of 0.5 s, a bar of 2 s). Five seats play a quarter note on each
 * beat of 18 bars, with no rest, so that only the downbeat of the count-in cues them: soft in
 * bars 0 to 3 (0 s to 8 s), a crescendo in bars 4 to 7 (8 s to 16 s), loud in bars 8 to 11
 * (16 s to 24 s), a diminuendo in bars 12 to 15 (24 s to 32 s), and soft in bars 16 and 17. Then
 * all seats hold a chord of 3 s from 36 s to the song end at 39 s.
 */
const FILE: TestFile = {
  tracks: [
    [tempo(0, 120), timeSignature(0, 4, 4)],
    ...SEATS.map(([channel, program]) => {
      const key = 60 + channel * 2;
      const beats = Array.from({ length: 72 }, (_, beat): TestEvent[] => [
        noteOn(beat * 480, channel, key, velocityOf(beat)),
        noteOff(beat * 480 + 470, channel, key),
      ]);
      const held = [noteOn(18 * BAR, channel, key, 80), noteOff(18 * BAR + 2880, channel, key)];
      return track([programChange(0, channel, program)], ...beats, held);
    }),
  ],
};

const scene = sceneOf(FILE);

function layer(): ConductorLayer {
  const own = ofConductor(scene.plan.conductor).note;
  if (own.family !== 'conductor') {
    throw new Error('The conductor has the conductor layer.');
  }
  return own;
}

function weightsAt(time: number): LeftHandState {
  const state = createLeftHandState();
  leftHandAt(layer().left, time, state);
  return state;
}

const bear = scene.models.get(CONDUCTOR.species, CONDUCTOR.instrument, 4);

function posed(time: number): PosedSkeleton {
  return poseSkeleton(
    bear,
    ofConductor(poseAt(scene.plan, time, 10, PLAYING, allAudible(scene.score)).conductor),
  );
}

function wristAt(time: number): Vector3 {
  return posed(time).frames[boneIndex('handL')]?.position.clone() ?? new Vector3();
}

/**
 * Gives the wrist of a place of the left hand with no turn of the upper body.
 *
 * @param place The place.
 * @returns The wrist, in the model axes.
 */
function placeWrist(place: LeftHandPlace): Vector3 {
  const { rig } = layer();
  return new Vector3(...place.wrist)
    .multiplyScalar(rig.headHeight)
    .add(new Vector3(...rig.left.bind.shoulder));
}

describe('beatLevels (design 5.4)', () => {
  it('gives more players and louder notes a higher level, as a part of the loud beats', () => {
    const [first] = scoreOf(FILE).notes;
    if (!first) {
      throw new Error('The test file has notes.');
    }
    const at = (start: number): typeof first => ({
      ...first,
      startSec: start,
      endSec: start + 0.9,
    });
    // Beats 0 to 18: one note of 0.3. Beat 19: two notes of 0.3. Beat 20: two notes of 0.6.
    // Beat 21: silence. Beat 19 is the 95th percentile of the 21 beats with sound.
    const starts = [...Array.from({ length: 20 }, (_, k) => k), 19, 20, 20];
    const loudness = starts.map((_, i) => (i < 21 ? 0.3 : 0.6));
    const beats = Float64Array.from({ length: 22 }, (_, k) => k);
    const levels = beatLevels(beats, starts.map(at), loudness);
    expect(levels[0]).toBeCloseTo(Math.SQRT1_2, 5);
    expect(levels[19]).toBeCloseTo(1, 6);
    expect(levels[20]).toBe(1);
    expect(levels[21]).toBe(0);
    expect(LEFT_HAND_RULES.topPercentile).toBe(0.95);
  });
});

describe('findHolds (design 5.4)', () => {
  it('finds the held chord at the song end, with a cut-off', () => {
    expect(findHolds(scoreOf(FILE).notes)).toEqual([{ startSec: 36, endSec: 39, cutOff: true }]);
  });

  it('finds a long note before the next notes, and no hold in a rest', () => {
    // Quarter notes from 0 s, a note of 1.5 s at 1.5 s, quarter notes from 3 s, a rest of 1.5 s,
    // and a last quarter note at 5 s. A beat is 0.5 s.
    const quarters = (...ticks: number[]): TestEvent[][] =>
      ticks.map((t) => [noteOn(t, 0, 60), noteOff(t + 470, 0, 60)]);
    const file: TestFile = {
      tracks: [
        [tempo(0, 120), timeSignature(0, 4, 4)],
        track(
          [programChange(0, 0, 40)],
          ...quarters(0, 480, 960),
          [noteOn(1440, 0, 62), noteOff(2880, 0, 62)],
          ...quarters(2880, 3360, 4800),
        ),
      ],
    };
    expect(findHolds(scoreOf(file).notes)).toEqual([{ startSec: 1.5, endSec: 3, cutOff: false }]);
    expect(LEFT_HAND_RULES.holdGapSec).toBe(1.2);
  });

  it('makes one hold of a run of long notes', () => {
    // Three notes of 1.5 s from 0 s, then a rest. A beat is 0.5 s.
    const file: TestFile = {
      tracks: [
        [tempo(0, 120), timeSignature(0, 4, 4)],
        track(
          [programChange(0, 0, 40)],
          ...[0, 1440, 2880].map((t) => [noteOn(t, 0, 60), noteOff(t + 1440, 0, 60)]),
        ),
      ],
    };
    expect(findHolds(scoreOf(file).notes)).toEqual([{ startSec: 0, endSec: 4.5, cutOff: true }]);
  });
});

describe('the weights of the left hand in the demos (design 5.4)', async () => {
  const demos = await patchedDemos();
  /**
   * The largest change of each weight in a frame. A gesture takes at least 0.67 s, the palm of a
   * held chord rises in 0.4 s, and the cut-off closes the hand in 0.25 s, each with a smoothstep.
   */
  const limits = { mirror: 0.04, swell: 0.04, fade: 0.04, hold: 0.07, close: 0.11 } as const;
  it.each(demos.map((d) => [d.file, d.bytes] as const))(
    'changes with no jump in a frame of 1/60 s in %s',
    (_, bytes) => {
      // The hold of a run of long notes once fell to 0 at each new note, and the wrist of the
      // Mozart K. 315 demo jumped 0.3 m in a frame.
      const own = ofConductor(sceneOf(bytes).plan.conductor).note;
      if (own.family !== 'conductor') {
        throw new Error('The conductor has the conductor layer.');
      }
      const before = createLeftHandState();
      const now = createLeftHandState();
      leftHandAt(own.left, -1, before);
      const end = (own.baton.beats.at(-1) ?? 0) + 5;
      for (let t = -1; t < end; t += 1 / 60) {
        leftHandAt(own.left, t, now);
        for (const key of ['mirror', 'swell', 'fade', 'hold', 'close'] as const) {
          expect(Math.abs(now[key] - before[key]), `${key} at ${t}`).toBeLessThan(limits[key]);
        }
        Object.assign(before, now);
      }
    },
  );
});

describe('leftHandAt (design 5.4)', () => {
  it('rests the hand in the soft bars', () => {
    for (const time of [3, 4, 5]) {
      expect(weightsAt(time), `${time}`).toEqual(createLeftHandState());
    }
  });

  it('raises the hand in the crescendo and lowers it in the diminuendo', () => {
    for (const time of [11, 12, 13]) {
      expect(weightsAt(time).swell, `${time}`).toBeGreaterThan(0.9);
      expect(weightsAt(time).fade, `${time}`).toBe(0);
    }
    for (const time of [27, 28, 29]) {
      expect(weightsAt(time).fade, `${time}`).toBeGreaterThan(0.9);
      expect(weightsAt(time).swell, `${time}`).toBe(0);
    }
  });

  it('mirrors the beat in the loud bars only', () => {
    for (const time of [19, 20, 21]) {
      expect(weightsAt(time), `${time}`).toEqual({ ...createLeftHandState(), mirror: 1 });
    }
    expect(weightsAt(4).mirror).toBe(0);
    expect(weightsAt(10).mirror).toBe(0);
  });

  it('holds the palm on the held chord, and closes the hand as the sound ends', () => {
    expect(weightsAt(36).hold).toBe(0);
    expect(weightsAt(36 + LEFT_HAND_RULES.holdRiseSec).hold).toBe(1);
    expect(weightsAt(38).close).toBe(0);
    expect(weightsAt(39 - LEFT_HAND_RULES.closeSec / 2).close).toBeCloseTo(0.5, 9);
    expect(weightsAt(39)).toEqual({ ...createLeftHandState(), hold: 1, close: 1 });
  });
});

describe('the left hand of the conductor (design 5.4)', () => {
  it('has no cue after the downbeat of the count-in', () => {
    expect(layer().cues.cues.map((c) => c.landSec)).toEqual([0]);
    const cue = createCueState();
    cueStateAt(layer().cues, 3, allAudible(scene.score), 10, cue);
    expect(cue).toEqual(createCueState());
  });

  it('rests at the quiet place, raised above the left shoulder and out beside the head', () => {
    const quiet = placeWrist(LEFT_HAND_PLACES.quiet);
    for (const time of [3, 4.25, 5]) {
      expect(wristAt(time).distanceTo(quiet), `${time}`).toBeLessThan(1e-4);
    }
    // The hand that hung at the side moved too little (user report of 2026-10-06). In front of
    // the left of the chest, it seemed to hold the head from behind (review of 2026-10-07).
    const h = bear.body.headHeight;
    const [x, y] = bear.skeleton.positions[boneIndex('upperArmL')] ?? [0, 0, 0];
    expect(x - quiet.x).toBeGreaterThan(0.4 * h);
    expect(quiet.y - y).toBeGreaterThan(0.3 * h);
    expect(-quiet.z).toBeGreaterThan(0.3);
  });

  it('moves the left wrist with the mirror of the tip of the baton in the loud bars', () => {
    const { baton } = layer();
    // The beats 36 to 42 are at 18 s to 21 s, in the loud bars.
    for (let k = 36; k < 42; k++) {
      const a = baton.beats[k] ?? 0;
      const b = baton.beats[k + 1] ?? 0;
      const moved = wristAt(b).sub(wristAt(a));
      const dx = (baton.points[2 * k + 2] ?? 0) - (baton.points[2 * k] ?? 0);
      const dy = (baton.points[2 * k + 3] ?? 0) - (baton.points[2 * k + 1] ?? 0);
      expect(moved.x, `beat ${k}`).toBeCloseTo(-MIRROR_SCALE * dx, 4);
      expect(moved.y, `beat ${k}`).toBeCloseTo(MIRROR_SCALE * dy, 4);
      expect(moved.z, `beat ${k}`).toBeCloseTo(0, 4);
    }
    const mirror = placeWrist(LEFT_HAND_PLACES.mirror);
    expect(wristAt(18).distanceTo(mirror)).toBeLessThan(1e-4);
  });

  it('raises the hand in the crescendo and lowers it in the diminuendo', () => {
    const quiet = placeWrist(LEFT_HAND_PLACES.quiet);
    expect(wristAt(12).y - quiet.y).toBeGreaterThan(0.2);
    expect(quiet.y - wristAt(28).y).toBeGreaterThan(0.1);
  });

  it('holds the palm out on the held chord and closes the fingers at the cut-off', () => {
    expect(wristAt(38).distanceTo(placeWrist(LEFT_HAND_PLACES.hold))).toBeLessThan(1e-4);
    const fingers = (time: number): number =>
      turnOf(
        ofConductor(poseAt(scene.plan, time, 10, PLAYING, allAudible(scene.score)).conductor)
          .rotations,
        boneIndex('fingersL'),
      );
    expect(fingers(38)).toBeCloseTo(LEFT_HAND_PLACES.hold.curl, 5);
    expect(fingers(39)).toBeCloseTo(CLOSE_CURL, 5);
  });
});
