import { describe, expect, it } from 'vitest';

import { MathUtils, Quaternion, Vector3 } from 'three';
import { note, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
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
    new Vector3(...posedPoint(posed, 'handL', body.palmL)).distanceTo(
      new Vector3(...posedPiecePoint(posed, grips.palmL)),
    ),
    new Vector3(...posedPoint(posed, 'handR', body.palmR)).distanceTo(
      new Vector3(...posedPiecePoint(posed, grips.palmR)),
    ),
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
    const down = new Vector3(0, 0, -1).applyQuaternion(frame?.rotation ?? new Quaternion());
    const head = posed.frames[boneIndex('head')];
    const ahead = new Vector3(0, 0, -1).applyQuaternion(head?.rotation ?? new Quaternion());
    // The tip of the jaw points lower than the face.
    expect(down.y).toBeLessThan(ahead.y - 0.1);
  });

  it('lifts the head 22° at the full opening of the jaw, and keeps it level in a rest', () => {
    if (!singer) {
      throw new Error('The test file has a singer.');
    }
    // The angle of the face above the front of the chest. The head and the neck share the lift.
    // The spine leans back with the breath, so the chest is the reference.
    const elevation = (t: number, transport?: Transport): number => {
      const { frames } = posedAt(scene, singer, t + offset, 10, transport);
      const chest = frames[boneIndex('chest')]?.rotation.clone().invert() ?? new Quaternion();
      const head = chest.multiply(frames[boneIndex('head')]?.rotation ?? new Quaternion());
      const ahead = new Vector3(0, 0, -1).applyQuaternion(head);
      return Math.asin(ahead.y);
    };
    const loudness = noteLoudness(scene.score);
    const open = gestureSize(loudness[0] ?? 0, plan?.amplitude ?? 0);
    expect(CHOIR_MOTION.headLift).toBeCloseTo(22 * MathUtils.DEG2RAD, 12);
    const rest = elevation(4.5);
    expect(elevation(0.75) - rest).toBeCloseTo(CHOIR_MOTION.headLift * open, 2);
    expect(elevation(0.75, NOT_STARTED)).toBeCloseTo(rest, 6);
  });

  it('turns the chest 6° to each side in 2 beats of a phrase', () => {
    const twist = (t: number): number => {
      const chest = boneRotation(poseOf(t).rotations, boneIndex('chest'));
      const forward = new Vector3(0, 0, -1).applyQuaternion(chest);
      return Math.atan2(-forward.x, -forward.z);
    };
    const phrase = plan?.note.family === 'choir' ? plan.note.track.phraseGestures[0] : undefined;
    expect(phrase).toBeDefined();
    const size = CHOIR_MOTION.sway * (phrase ?? 0);
    expect(CHOIR_MOTION.sway).toBeCloseTo(6 * MathUtils.DEG2RAD, 12);
    // Beat 1 at 0.5 s and beat 3 at 1.5 s are the two sides. Beat 2 at 1 s is the middle.
    expect(twist(0.5)).toBeCloseTo(size, 3);
    expect(twist(1)).toBeCloseTo(0, 3);
    expect(twist(1.5)).toBeCloseTo(-size, 3);
    // 1 s after the phrase, the sway is over.
    expect(twist(4.75)).toBeCloseTo(0, 6);
  });

  it('leans back with the breath in before a phrase (audit 2, N8)', () => {
    // The angle of the spine behind the vertical.
    const lean = (t: number, transport?: Transport): number => {
      const spine = boneRotation(poseOf(t, transport).rotations, boneIndex('spine'));
      const up = new Vector3(0, 1, 0).applyQuaternion(spine);
      return Math.atan2(up.z, up.y);
    };
    const top = CHOIR_MOTION.breath * (plan?.amplitude ?? 0);
    expect(CHOIR_MOTION.breath).toBeCloseTo(4 * MathUtils.DEG2RAD, 12);
    // The idle breath of the wall clock adds a small lean at each time. The breath in rises in
    // the 0.4 s before the phrase at 0.5 s, and falls over the phrase. The singer alone leads the
    // count-in, and its nod ends 0.4 s after the downbeat (design 5.4), so the idle lean comes
    // from the ready pause.
    const idle = lean(-1);
    expect(lean(0.5) - idle).toBeCloseTo(top, 3);
    expect(lean(2) - idle).toBeGreaterThan(0);
    expect(lean(2) - idle).toBeLessThan(top);
    expect(lean(0.5, NOT_STARTED)).toBeCloseTo(lean(0, NOT_STARTED), 6);
  });
});

describe('the voices of a choir (design 5.3)', () => {
  it('turns neighbor voices to opposite sides (audit 2, N8)', () => {
    // Two voices sing the same phrase.
    const voices = sceneOf({
      tracks: [
        [tempo(0, 120), timeSignature(0, 4, 4)],
        track([programChange(0, 0, 52)], note(480, 0, 72, 3360)),
        track([programChange(0, 1, 52)], note(480, 1, 60, 3360)),
      ],
    });
    const twists = voices.plan.players.map((p, i) => {
      const pose = poseAt(voices.plan, 1.5 + p.timeOffset, 10, PLAYING, allAudible(voices.score));
      const chest = boneRotation(
        pose.players[i]?.rotations ?? new Float32Array(),
        boneIndex('chest'),
      );
      const forward = new Vector3(0, 0, -1).applyQuaternion(chest);
      return { seat: p.seatIndex, twist: Math.atan2(-forward.x, -forward.z) };
    });
    const first = twists.filter((t) => t.seat === 0).map((t) => Math.sign(t.twist));
    const second = twists.filter((t) => t.seat === 1).map((t) => Math.sign(t.twist));
    expect(first.length).toBeGreaterThan(0);
    expect(second.length).toBeGreaterThan(0);
    expect(new Set(first).size).toBe(1);
    expect(second.every((sign) => sign === -(first[0] ?? 0))).toBe(true);
  });
});
