import { describe, expect, it } from 'vitest';

import { MathUtils, Quaternion, Vector3 } from 'three';
import { noteOff, noteOn, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestEvent, TestFile } from '../midi/test-smf.ts';
import { CONDUCTOR } from '../models/cast.ts';
import { buildPlayer } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { CONDUCTOR_HOLD, conductorBeatPoint } from './conductor.ts';
import { countInAt } from './count-in.ts';
import { CUE_MOTION, prepOf } from './cues.ts';
import type { Cue } from './cues.ts';
import { ARM_REACH } from './ik.ts';
import { buildLeftHandTrack } from './conductor-left.ts';
import type { ConductorLayer, PosePlan } from './plan.ts';
import { poseAt } from './pose-at.ts';
import { armHang, poseSkeleton, posedPiecePoint } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import {
  NOT_STARTED,
  PLAYING,
  allAudible,
  demoSceneOf,
  ofConductor,
  sceneOf,
} from './test-scene.ts';
import type { TestScene } from './test-scene.ts';
import type { SeatAudibility, Transport } from './types.ts';

/**
 * Makes one note of a test file: a note on and its note off.
 *
 * @param start The tick of the note on.
 * @param channel The channel.
 * @param key The key.
 * @param end The tick of the note off.
 * @param velocity The velocity: soft by default.
 * @returns The two events.
 */
function soft(
  start: number,
  channel: number,
  key: number,
  end: number,
  velocity = 64,
): TestEvent[] {
  return [noteOn(start, channel, key, velocity), noteOff(end, channel, key)];
}

/**
 * Bars of 4/4 at 120 BPM: the violins play each bar, the horns play bar 0 and come in again in
 * bar 3 (a cue of the left hand at 6 s), the violas (at the right of the conductor) come in at
 * bar 5 (a cue of the left hand at 10 s), and the trumpets come in loud at bar 7 (a cue of the
 * baton at 14 s). The violins and the horns start at the downbeat of the count-in.
 */
const FILE: TestFile = {
  tracks: [
    [tempo(0, 120), timeSignature(0, 4, 4)],
    track(
      [programChange(0, 0, 40)],
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((bar) => soft(bar * 1920, 0, 72, bar * 1920 + 1900)),
    ),
    track([programChange(0, 1, 60)], soft(0, 1, 60, 1900), soft(3 * 1920, 1, 60, 4 * 1920)),
    track([programChange(0, 2, 41)], soft(5 * 1920, 2, 60, 6 * 1920)),
    track([programChange(0, 3, 56)], soft(7 * 1920, 3, 67, 8 * 1920, 120)),
  ],
};

const scene = sceneOf(FILE);
const bear = buildPlayer(CONDUCTOR.species, CONDUCTOR.instrument);
const H = bear.body.headHeight;

function layer(): ConductorLayer {
  const own = ofConductor(scene.plan.conductor).note;
  if (own.family !== 'conductor') {
    throw new Error('The conductor has the conductor layer.');
  }
  return own;
}

function posed(
  time: number,
  audibility: readonly SeatAudibility[] = allAudible(scene.score),
  transport = PLAYING,
): PosedSkeleton {
  return poseSkeleton(
    bear,
    ofConductor(poseAt(scene.plan, time, 10, transport, audibility).conductor),
  );
}

function tipOf(pose: PosedSkeleton): Vector3 {
  const tip = bear.instrument.targets.find((t) => t.kind === 'tip');
  return new Vector3(...posedPiecePoint(pose, { bone: 'baton', at: tip?.from ?? [0, 0, 0] }));
}

function bindAt(bone: BoneName): Vector3 {
  return new Vector3(...(bear.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0]));
}

function at(pose: PosedSkeleton, bone: BoneName): Vector3 {
  return pose.frames[boneIndex(bone)]?.position ?? new Vector3();
}

/** The bones of the left arm. */
const LEFT_ARM = ['upperArmL', 'forearmL', 'handL', 'fingersL'] as const;

/**
 * Gives the plan of the test file with a change to the note layer of the conductor.
 *
 * @param change The change: no cues, or a left hand that rests at its quiet place.
 * @returns The plan.
 */
function planWith(change: 'no cues' | 'quiet left hand'): PosePlan {
  const conductor = ofConductor(scene.plan.conductor);
  const note = layer();
  const changed: ConductorLayer =
    change === 'no cues'
      ? { ...note, cues: { lands: new Float64Array(0), cues: [] } }
      : { ...note, left: buildLeftHandTrack(note.baton.beats, [], []) };
  return { ...scene.plan, conductor: { ...conductor, note: changed } };
}

/**
 * Gives the local rotations of the left arm of the conductor.
 *
 * @param plan The plan.
 * @param time The song time.
 * @param transport The play state.
 * @param audibility The audibility of the seats.
 * @returns The rotations, four numbers for each bone.
 */
function leftArmOf(
  plan: PosePlan,
  time: number,
  transport: Transport = PLAYING,
  audibility: readonly SeatAudibility[] = allAudible(scene.score),
): number[] {
  const pose = ofConductor(poseAt(plan, time, 10, transport, audibility).conductor);
  return LEFT_ARM.flatMap((bone) => {
    const i = boneIndex(bone);
    return Array.from(pose.rotations.subarray(4 * i, 4 * i + 4));
  });
}

/**
 * Gives the turn around +y of the front of a posed bone: positive to the left.
 *
 * @param pose The posed skeleton.
 * @param bone The bone.
 * @returns The turn, in radians.
 */
function yawOf(pose: PosedSkeleton, bone: BoneName): number {
  const front = new Vector3(0, 0, -1).applyQuaternion(
    pose.frames[boneIndex(bone)]?.rotation ?? new Quaternion(),
  );
  return Math.atan2(-front.x, -front.z);
}

/**
 * Gives the point of the left wrist at the cue point of a cue: the hand points by the turn of
 * the cue and 30° up, at 0.85 of the reach of the arm.
 *
 * @param pose The posed skeleton at the landing.
 * @param cue The cue.
 * @returns The point.
 */
function cuePoint(pose: PosedSkeleton, cue: Cue): Vector3 {
  const reach =
    ARM_REACH *
    (bindAt('forearmL').distanceTo(bindAt('upperArmL')) +
      bindAt('handL').distanceTo(bindAt('forearmL')));
  const lift = CUE_MOTION.cueLift;
  const direction = new Vector3(
    -Math.sin(cue.handYaw) * Math.cos(lift),
    Math.sin(lift),
    -Math.cos(cue.handYaw) * Math.cos(lift),
  );
  return at(pose, 'upperArmL').addScaledVector(direction, CUE_MOTION.cueReach * reach);
}

/** The number of cues of each kind. */
interface CueCount {
  hand: number;
  baton: number;
}

/**
 * Checks each cue of a scene up to a song time (design 5.4). A cue lands within 5 ms of its
 * entry, except the downbeat of the count-in. At the landing of a hand cue, the left wrist is at
 * the cue point, and it comes down onto the point. One beat before the landing, the head and the
 * upper body have turned to the section.
 *
 * @param of The scene.
 * @param until The last song time.
 * @returns The number of cues of each kind that the check saw.
 */
function checkCues(of: TestScene, until: number): CueCount {
  const own = ofConductor(of.plan.conductor).note;
  const count: CueCount = { hand: 0, baton: 0 };
  if (own.family !== 'conductor') {
    return count;
  }
  const pose = (time: number): PosedSkeleton =>
    poseSkeleton(
      bear,
      ofConductor(poseAt(of.plan, time, 10, PLAYING, allAudible(of.score)).conductor),
    );
  for (const [i, cue] of own.cues.cues.entries()) {
    if (cue.landSec > until) {
      break;
    }
    count[cue.kind]++;
    const label = `cue ${i} at ${cue.landSec}`;
    if (i > 0) {
      expect(Math.abs(cue.landSec - cue.entrySec), label).toBeLessThanOrEqual(0.005);
    }
    const turned = pose(cue.landSec - prepOf(cue));
    expect(yawOf(turned, 'chest'), label).toBeCloseTo(cue.torsoYaw, 1);
    expect(yawOf(turned, 'head'), label).toBeCloseTo(cue.torsoYaw + cue.headYaw, 1);
    if (cue.kind === 'hand') {
      const landed = pose(cue.landSec);
      expect(at(landed, 'handL').distanceTo(cuePoint(landed, cue)), label).toBeLessThan(1e-4);
      const before = pose(cue.landSec - 0.005);
      expect(at(before, 'handL').y, label).toBeGreaterThan(at(landed, 'handL').y);
    }
  }
  return count;
}

describe('poseConductor (design 5.4, 4.7)', () => {
  it('gives the shots the beat point of the rig, with no hanging arms', () => {
    expect(conductorBeatPoint(bear)).toEqual(layer().rig.beatPoint);
  });

  it('keeps the beat plane square to the baton at beat 1, with a level axis to the right', () => {
    const { rig } = layer();
    const along = new Vector3(...rig.beatPoint).sub(new Vector3(...rig.pivot)).normalize();
    const right = new Vector3(...rig.beatRight);
    const up = new Vector3(...rig.beatUp);
    expect(right.dot(along)).toBeCloseTo(0, 12);
    expect(up.dot(along)).toBeCloseTo(0, 12);
    expect(right.y).toBeCloseTo(0, 12);
    expect(right.x).toBeGreaterThan(0.9);
    expect(up.y).toBeGreaterThan(0.5);
    // The baton points up, so the up axis leans back toward the bear.
    expect(up.z).toBeGreaterThan(0);
  });

  it('bows to the orchestra after the song end, then stands up (UX audit 2026-10-05, AM2)', () => {
    // Nothing marked the end of a piece. The pause at the song end starts the bow.
    const end = scene.score.durationSec;
    const ended = (elapsed: number): PosedSkeleton =>
      posed(end, allAudible(scene.score), {
        ...PLAYING,
        playing: false,
        changedAtWall: 10 - elapsed,
        before: PLAYING,
      });
    const upright = at(ended(0.1), 'head');
    const bowed = at(ended(1.8), 'head');
    // The bear faces -z, to the orchestra.
    expect(upright.z - bowed.z).toBeGreaterThan(0.15);
    expect(upright.y - bowed.y).toBeGreaterThan(0.03);
    expect(at(ended(4), 'head').distanceTo(upright)).toBeLessThan(1e-3);
    // A pause before the song end gives no bow.
    const paused = (elapsed: number): Vector3 =>
      at(
        posed(end - 5, allAudible(scene.score), {
          ...PLAYING,
          playing: false,
          changedAtWall: 10 - elapsed,
          before: PLAYING,
        }),
        'head',
      );
    expect(paused(1.8).distanceTo(paused(0.1))).toBeLessThan(1e-3);
  });

  it('cues each entry of the test file on its note time', () => {
    const { cues } = layer();
    expect(cues.cues.map((c) => `${c.landSec} ${c.kind}`)).toEqual([
      '0 baton',
      '6 hand',
      '10 hand',
      '14 baton',
    ]);
    expect(checkCues(scene, 20)).toEqual({ hand: 2, baton: 2 });
  });

  describe('the Boulanger demo', async () => {
    const boulanger = await demoSceneOf('boulanger-matin.mid');

    it('cues each entry of the first 60 s on its note time', () => {
      const count = checkCues(boulanger, 60);
      expect(count.hand).toBeGreaterThan(10);
      expect(count.baton).toBeGreaterThan(2);
    });

    it('goes from one cue to the next with no jump in the first 60 s', () => {
      // At 60 frames a second, the left wrist moves at most 0.07 m (4.2 m/s) in a frame, and the
      // head turns at most 0.1 rad (344°/s). The largest steps are 0.056 m and 0.084 rad.
      let wrist: Vector3 | null = null;
      let head = 0;
      for (let t = 1; t < 60; t += 1 / 60) {
        const pose = poseSkeleton(
          bear,
          ofConductor(
            poseAt(boulanger.plan, t, 10, PLAYING, allAudible(boulanger.score)).conductor,
          ),
        );
        const now = at(pose, 'handL').clone();
        const yaw = yawOf(pose, 'head');
        if (wrist) {
          expect(now.distanceTo(wrist), `${t}`).toBeLessThan(0.07);
          expect(Math.abs(yaw - head), `${t}`).toBeLessThan(0.1);
        }
        wrist = now;
        head = yaw;
      }
    });
  });

  it('turns the head and the upper body to the section before the entry', () => {
    // The horns enter at 6 s, with a beat of 0.5 s. The turn takes 4.9 s to 5.5 s.
    const horns = layer().cues.cues[1];
    const yaw = (horns?.torsoYaw ?? 0) + (horns?.headYaw ?? 0);
    expect(Math.abs(yaw)).toBeGreaterThan(0.05);
    expect(yawOf(posed(4.89), 'head')).toBeCloseTo(0, 6);
    expect(yawOf(posed(5.2), 'head') / yaw).toBeCloseTo(0.5, 1);
    expect(yawOf(posed(5.5), 'head')).toBeCloseTo(yaw, 1);
    // The left hand rises before the preparation, and comes down onto the cue point at 6 s.
    expect(at(posed(5.1), 'handL').y).toBeLessThan(at(posed(5.5), 'handL').y);
    expect(at(posed(5.5), 'handL').y).toBeGreaterThan(at(posed(6), 'handL').y);
  });

  it('gives no cue to a seat that a mute made silent', () => {
    const horns = scene.score.seats.findIndex((s) => s.section === 'horn');
    const muted = allAudible(scene.score).map((a, i) =>
      i === horns ? { audible: false, changedAtWall: 0, before: null } : a,
    );
    const pose = ofConductor(poseAt(scene.plan, 6, 10, PLAYING, muted).conductor);
    // The left arm has the pose of a plan with no cues.
    expect(leftArmOf(scene.plan, 6, PLAYING, muted)).toEqual(leftArmOf(planWith('no cues'), 6));
    expect(leftArmOf(scene.plan, 6)).not.toEqual(leftArmOf(planWith('no cues'), 6));
    expect(yawOf(poseSkeleton(bear, pose), 'head')).toBeCloseTo(0, 6);
  });

  it('gives the cue at a seek point as an unbroken play gives it', () => {
    // A seek during play to 5.7 s, in the preparation of the cue of the horns at 6 s.
    const seek: Transport = { ...PLAYING, startSec: 5.7 };
    for (let t = 5.7; t < 7; t += 0.05) {
      const after = ofConductor(poseAt(scene.plan, t, 10, seek, allAudible(scene.score)).conductor);
      const unbroken = ofConductor(
        poseAt(scene.plan, t, 10, PLAYING, allAudible(scene.score)).conductor,
      );
      expect(Array.from(after.rotations), `${t}`).toEqual(Array.from(unbroken.rotations));
    }
  });

  describe('count-in from the song start (design 5.4)', () => {
    /** The count-in of the test file: the ready pause of 1.2 s and one beat of 0.5 s. */
    const count = countInAt(scene.plan.beats, 0);
    const beatPoint = new Vector3(...CONDUCTOR_HOLD.beatPoint)
      .multiplyScalar(H)
      .add(bindAt('upperArmR'));

    it('takes the ready pause and one beat of the first tempo', () => {
      expect(count.readySec).toBe(1.2);
      expect(count.beatSec).toBeCloseTo(0.5, 9);
    });

    it('turns to the first entries in the ready pause, and cues them with the downbeat', () => {
      const [first] = layer().cues.cues;
      expect(first?.kind).toBe('baton');
      expect(first?.landSec).toBe(0);
      const yaw = (first?.torsoYaw ?? 0) + (first?.headYaw ?? 0);
      expect(Math.abs(yaw)).toBeGreaterThan(0.01);
      // The turn takes 0.6 s and ends one beat before the downbeat.
      expect(yawOf(posed(-1.11), 'head')).toBeCloseTo(0, 6);
      expect(yawOf(posed(-0.5), 'head')).toBeCloseTo(yaw, 2);
      expect(yawOf(posed(0), 'head')).toBeCloseTo(yaw, 2);
    });

    it('shows the ready gesture 0.2 s after the play, as the arms lift in 0.3 s', () => {
      // A play at the wall time 10 s, with the song time 0.2 s into the count-in.
      const play: Transport = { ...PLAYING, changedAtWall: 10 };
      const time = -count.lengthSec + 0.2;
      const handAt = (wallTime: number, transport: Transport = play): number =>
        at(
          poseSkeleton(
            bear,
            ofConductor(
              poseAt(scene.plan, time, wallTime, transport, allAudible(scene.score)).conductor,
            ),
          ),
          'handL',
        ).y;
      const rest = handAt(0, NOT_STARTED);
      const full = handAt(11);
      expect(full - rest).toBeGreaterThan(0.3);
      // The lift of 0.3 s (5.2) is at smoothstep(2 / 3) = 0.74 after 0.2 s. The height of the
      // hand follows the weight of the lift within 0.01: the rest elbow of 60° puts the hand on a
      // curved path, 0.007 from the weight.
      expect(Math.abs((handAt(10.2) - rest) / (full - rest) - 20 / 27)).toBeLessThan(0.01);
      // At the full weight, the tip of the baton waits above the point of the downbeat.
      const tip = tipOf(
        poseSkeleton(
          bear,
          ofConductor(poseAt(scene.plan, time, 11, play, allAudible(scene.score)).conductor),
        ),
      );
      expect(tip.y).toBeGreaterThan(beatPoint.y);
    });

    it('points the left hand up and outward in the ready gesture', () => {
      // Before the turn to the cued section starts (-1.11 s).
      const pose = posed(-1.11);
      const toWrist = at(pose, 'handL').sub(at(pose, 'upperArmL'));
      // The skeleton holds 32-bit rotations, so the angles keep about 1e-6 rad of noise.
      expect(Math.asin(toWrist.y / toWrist.length())).toBeCloseTo(CONDUCTOR_HOLD.readyLift, 5);
      expect(Math.atan2(-toWrist.x, -toWrist.z)).toBeCloseTo(CONDUCTOR_HOLD.readyOut, 5);
      expect(CONDUCTOR_HOLD.readyLift).toBeGreaterThan(0);
      expect(CONDUCTOR_HOLD.readyOut).toBeGreaterThan(0);
    });

    it('ends the ready gesture of the left hand in 0.6 s after the downbeat', () => {
      // The left paw of the ready gesture is at the height of the chin, as in bear-views.png, so
      // it can go up or down to its place of the music.
      expect(at(posed(0.3), 'handL').distanceTo(at(posed(0.6), 'handL'))).toBeGreaterThan(0.01);
      // At 0.6 s, the left arm has the pose of a play from 0.6 s, which has no ready gesture.
      const later: Transport = { ...PLAYING, startSec: 0.6 };
      expect(leftArmOf(scene.plan, 0.6)).toEqual(leftArmOf(scene.plan, 0.6, later));
      expect(leftArmOf(scene.plan, 0.3)).not.toEqual(leftArmOf(scene.plan, 0.3, later));
    });
  });

  describe('count-in after a pause (design 5.4)', () => {
    /** A play at 3.25 s, between beats 2 and 3 of bar 1. A beat is 0.5 s. */
    const resume: Transport = { ...PLAYING, startSec: 3.25 };
    const count = countInAt(scene.plan.beats, 3.25);

    it('gives one beat and no ready pause', () => {
      expect(count.readySec).toBe(0);
      expect(count.beatSec).toBeCloseTo(0.5, 9);
    });

    it('shows no ready gesture of the left hand', () => {
      // In the count-in, the left hand holds its pose of the pause point. With a quiet left hand,
      // the mirror of the lift of the baton does not move it.
      const quiet = planWith('quiet left hand');
      expect(leftArmOf(quiet, 3, resume)).toEqual(leftArmOf(quiet, 3.25));
    });

    it('holds a cue at its place at the pause point', () => {
      // The horns come in at 6 s. The head turns from 4.9 s, and the left hand rises from 5 s.
      const atCue: Transport = { ...PLAYING, startSec: 5.8 };
      const pose = (time: number): PosedSkeleton => posed(time, allAudible(scene.score), atCue);
      expect(at(pose(5.4), 'handL').distanceTo(at(pose(5.8), 'handL'))).toBeLessThan(1e-9);
      expect(yawOf(pose(5.4), 'head')).toBeCloseTo(yawOf(pose(5.8), 'head'), 9);
      expect(at(pose(5.9), 'handL').distanceTo(at(pose(5.8), 'handL'))).toBeGreaterThan(1e-3);
    });
  });

  it('hangs the arms a little out to the sides in the rest pose (design 5.2)', () => {
    // A rest pose with the arms of the bind pose puts the arms 0.25 H into the hips.
    const pose = ofConductor(
      poseAt(scene.plan, 6, 0, NOT_STARTED, allAudible(scene.score)).conductor,
    );
    const rested = poseSkeleton(buildPlayer(CONDUCTOR.species, CONDUCTOR.instrument), pose);
    for (const side of ['L', 'R'] as const) {
      const { out, bend } = armHang(rested, side);
      expect(out * MathUtils.RAD2DEG, side).toBeGreaterThan(15);
      expect(out * MathUtils.RAD2DEG, side).toBeLessThan(40);
      // The elbow bends about 60°, so that the palms rest at the hips.
      expect(bend * MathUtils.RAD2DEG, side).toBeGreaterThan(45);
      expect(bend * MathUtils.RAD2DEG, side).toBeLessThan(75);
    }
  });
});
