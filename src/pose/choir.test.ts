import { describe, expect, it } from 'vitest';

import { note, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { DEG, length, rotate, sub } from '../models/math.ts';
import { boneIndex } from '../models/rig.ts';
import { CHOIR_MOTION } from './choir-notes.ts';
import { boneRotation } from './frames.ts';
import { gestureSize, noteLoudness } from './loudness.ts';
import { poseAt } from './pose-at.ts';
import {
  armLengthErrors,
  posedAt,
  posedPiecePoint,
  posedPoint,
  turnOf,
} from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { NOT_STARTED, PLAYING, allAudible, firstPlayers, sceneOf } from './test-scene.ts';
import type { Transport } from './types.ts';

/** One singer at 120 BPM in 4/4: a phrase of three notes from 0.5 s to 3.5 s, then one note. */
const FILE: TestFile = {
  tracks: [
    [tempo(0, 120), timeSignature(0, 4, 4)],
    track(
      [programChange(0, 0, 52)],
      note(480, 0, 67, 1400),
      note(1440, 0, 69, 2400),
      note(2400, 0, 71, 3360),
      note(5760, 0, 72, 6720),
    ),
  ],
};

const scene = sceneOf(FILE);
const [singer] = firstPlayers(scene, ['choir-folder'] as const);
const plan = singer ? scene.plan.players[singer.index] : undefined;
const offset = plan?.timeOffset ?? 0;

function poseOf(time: number, transport: Transport = PLAYING) {
  const pose = poseAt(scene.plan, time + offset, 10, transport, allAudible(scene.score)).players[
    singer?.index ?? -1
  ];
  if (!pose) {
    throw new Error('The test file has a singer.');
  }
  return pose;
}

function gripGaps(posed: PosedSkeleton): number[] {
  const { grips } = posed.model.instrument;
  const { body } = posed.model;
  if (!grips.palmL || !grips.palmR) {
    throw new Error('The folder has grips of the palms.');
  }
  return [
    length(sub(posedPoint(posed, 'handL', body.palmL), posedPiecePoint(posed, grips.palmL))),
    length(sub(posedPoint(posed, 'handR', body.palmR), posedPiecePoint(posed, grips.palmR))),
  ];
}

describe('the pose of a singer (design 5.3)', () => {
  it('keeps the palms on the folder while it sings and in the rest pose', () => {
    if (!singer) {
      throw new Error('The test file has a singer.');
    }
    for (const [t, transport] of [
      [0.2, PLAYING],
      [1.5, PLAYING],
      [2.9, PLAYING],
      [6.5, PLAYING],
      [1.5, NOT_STARTED],
    ] as const) {
      const posed = posedAt(scene, singer, t + offset, 10, transport);
      for (const gap of gripGaps(posed)) {
        expect(gap, `at ${t}`).toBeLessThan(1e-4);
      }
      for (const error of armLengthErrors(posed)) {
        expect(error, `at ${t}`).toBeLessThan(5e-7);
      }
    }
  });

  it('opens the jaw while a note sounds, and closes it in a rest', () => {
    const jaw = (t: number, transport?: Transport): number =>
      turnOf(poseOf(t, transport).rotations, boneIndex('jaw'));
    const loudness = noteLoudness(scene.score);
    for (const [i, n] of scene.score.notes.entries()) {
      const open = CHOIR_MOTION.jaw * gestureSize(loudness[i] ?? 0, plan?.amplitude ?? 0);
      for (const t of [n.startSec, (n.startSec + n.endSec) / 2]) {
        expect(jaw(t), `note ${i} at ${t}`).toBeCloseTo(open, 4);
      }
      // Before the next note, the jaw closes to half and opens again.
      for (let t = n.startSec; t <= n.endSec; t += 0.01) {
        expect(jaw(t), `note ${i} at ${t}`).toBeGreaterThan(0.45 * open);
      }
    }
    expect(jaw(4.5)).toBe(0);
    expect(jaw(1.5, NOT_STARTED)).toBe(0);
  });

  it('opens the lower beak down', () => {
    if (!singer) {
      throw new Error('The test file has a singer.');
    }
    const posed = posedAt(scene, singer, 1.5 + offset);
    const frame = posed.frames[boneIndex('jaw')];
    const down = rotate(frame?.rotation ?? [0, 0, 0, 1], [0, 0, -1]);
    const head = posed.frames[boneIndex('head')];
    const ahead = rotate(head?.rotation ?? [0, 0, 0, 1], [0, 0, -1]);
    // The tip of the jaw points lower than the face.
    expect(down[1]).toBeLessThan(ahead[1] - 0.1);
  });

  it('turns the chest 3° to each side in 2 beats of a phrase', () => {
    const twist = (t: number): number => {
      const forward = rotate(boneRotation(poseOf(t).rotations, boneIndex('chest')), [0, 0, -1]);
      return Math.atan2(-forward[0], -forward[2]);
    };
    const phrase = plan?.note.family === 'choir' ? plan.note.track.phraseGestures[0] : undefined;
    expect(phrase).toBeDefined();
    const size = CHOIR_MOTION.sway * (phrase ?? 0);
    expect(CHOIR_MOTION.sway).toBeCloseTo(3 * DEG, 12);
    // Beat 1 at 0.5 s and beat 3 at 1.5 s are the two sides. Beat 2 at 1 s is the middle.
    expect(twist(0.5)).toBeCloseTo(size, 3);
    expect(twist(1)).toBeCloseTo(0, 3);
    expect(twist(1.5)).toBeCloseTo(-size, 3);
    // 1 s after the phrase, the sway is over.
    expect(twist(4.75)).toBeCloseTo(0, 6);
  });
});
