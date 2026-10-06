import { describe, expect, it } from 'vitest';

import { MathUtils, Quaternion, Vector3 } from 'three';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { noteOff, noteOn, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestEvent, TestFile } from '../midi/test-smf.ts';
import { CONDUCTOR } from '../models/cast.ts';
import { CONDUCTOR_STAND } from '../models/stage.ts';
import { buildPlayer } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { CONDUCTOR_HOLD, batonPoint } from './conductor.ts';
import { CONDUCTOR_MOTION } from './conductor-notes.ts';
import { countInAt } from './count-in.ts';
import { CUE_MOTION, createCueState, cueStateAt, prepOf } from './cues.ts';
import type { Cue, CueState } from './cues.ts';
import { ARM_REACH } from './ik.ts';
import type { ConductorLayer } from './plan.ts';
import { poseAt } from './pose-at.ts';
import { armLengthErrors, poseSkeleton, posedPiecePoint, turnOf } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from './test-scene.ts';
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
  const own = scene.plan.conductor.note;
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
  return poseSkeleton(bear, poseAt(scene.plan, time, 10, transport, audibility).conductor);
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

/**
 * Gives the cue motion of a scene at a song time, as the pose of a play at the wall time 10 s
 * reads it.
 *
 * @param of The scene.
 * @param time The song time.
 * @returns The cue state.
 */
function cueOf(of: TestScene, time: number): CueState {
  const own = of.plan.conductor.note;
  const state = createCueState();
  if (own.family === 'conductor') {
    cueStateAt(own.cues, time, allAudible(of.score), 10, state);
  }
  return state;
}

/**
 * Gives the point of the tip of the baton in the model axes for a point of the beat plane, with
 * the turn of the upper body at a song time.
 *
 * @param time The song time.
 * @param point The point in the beat plane.
 * @returns The point.
 */
function expectedTip(time: number, point: readonly [number, number]): Vector3 {
  const baton = { x: point[0], y: point[1] };
  return batonPoint(layer().rig, baton, cueOf(scene, time).torsoYaw, new Vector3());
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
  const own = of.plan.conductor.note;
  const count: CueCount = { hand: 0, baton: 0 };
  if (own.family !== 'conductor') {
    return count;
  }
  const pose = (time: number): PosedSkeleton =>
    poseSkeleton(bear, poseAt(of.plan, time, 10, PLAYING, allAudible(of.score)).conductor);
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
  it('puts the tip of the baton on the point of each beat at the beat time', () => {
    const { baton } = layer();
    const beatPoint = new Vector3(...CONDUCTOR_HOLD.beatPoint)
      .multiplyScalar(H)
      .add(bindAt('upperArmR'));
    expect(batonPoint(layer().rig, { x: 0, y: 0 }, 0, new Vector3()).distanceTo(beatPoint)).toBe(0);
    for (const [k, time] of baton.beats.entries()) {
      const point = expectedTip(time, [baton.points[2 * k] ?? 0, baton.points[2 * k + 1] ?? 0]);
      expect(tipOf(posed(time)).distanceTo(point), `beat ${k}`).toBeLessThan(1e-4);
    }
    expect(CONDUCTOR_HOLD.beatPoint).toEqual([-0.1, 0.45, -1.3]);
  });

  it('turns the beat plane with the upper body to a cued section', () => {
    // The horns enter at 6 s: the upper body has turned at 5.5 s, one beat before.
    const { baton } = layer();
    const point: readonly [number, number] = [baton.points[22] ?? 0, baton.points[23] ?? 0];
    expect(Math.abs(cueOf(scene, 5.5).torsoYaw)).toBeGreaterThan(0.02);
    const turned = expectedTip(5.5, point);
    expect(tipOf(posed(5.5)).distanceTo(turned)).toBeLessThan(1e-4);
    const still = batonPoint(layer().rig, { x: point[0], y: point[1] }, 0, new Vector3());
    expect(turned.distanceTo(still)).toBeGreaterThan(0.005);
  });

  it('beats in front of the chest, above the desk of the stand (UX audit 2026-10-05, AM1)', () => {
    // The first beat point kept the hand next to the head, and the beat read as a hand at the ear.
    const { baton } = layer();
    const head = bear.body.headCenter;
    const deskTop =
      CONDUCTOR_STAND.deskHeight + (CONDUCTOR_STAND.deskDepth / 2) * Math.cos(CONDUCTOR_STAND.tilt);
    for (const time of baton.beats.slice(0, 12)) {
      const pose = posed(time);
      const hand = at(pose, 'handR');
      expect(head[1] - hand.y, `${time}`).toBeGreaterThan(0.25);
      expect(-hand.z, `${time}`).toBeGreaterThan(0.15);
      expect(tipOf(pose).y, `${time}`).toBeGreaterThan(deskTop);
    }
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

  it('points the baton from its pivot to the tip', () => {
    const pivot = new Vector3(...CONDUCTOR_HOLD.batonPivot)
      .multiplyScalar(H)
      .add(bindAt('upperArmR'));
    // The upper body does not turn at these times, so the pivot keeps its place.
    for (const time of [1.5, 1.75, 3.6]) {
      const pose = posed(time);
      const grip = at(pose, 'baton');
      const tip = tipOf(pose);
      const along = tip.clone().sub(grip);
      const fromPivot = tip.clone().sub(pivot);
      const cosine = along.dot(fromPivot) / (along.length() * fromPivot.length());
      expect(cosine, `${time}`).toBeCloseTo(1, 9);
    }
    expect(CONDUCTOR_HOLD.batonPivot).toEqual([0.1, 0.1, -0.3]);
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
    const demo = (await patchedDemos()).find((d) => d.file.startsWith('boulanger'));
    if (!demo) {
      throw new Error('The demos have the Boulanger demo.');
    }
    const boulanger = sceneOf(demo.bytes, 1);

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
          poseAt(boulanger.plan, t, 10, PLAYING, allAudible(boulanger.score)).conductor,
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

  it('lifts the baton higher into the beat of a baton cue', () => {
    // The trumpets enter loud at 14 s, beat 28. The arc into it is 1.6 times as high at 13.75 s.
    const { baton } = layer();
    const middle = expectedTip(13.75, [
      ((baton.points[54] ?? 0) + (baton.points[56] ?? 0)) / 2,
      ((baton.points[55] ?? 0) + (baton.points[57] ?? 0)) / 2,
    ]);
    const arc = (1 + CUE_MOTION.batonBoost) * (baton.arcs[28] ?? 0);
    expect(tipOf(posed(13.75)).y - middle.y).toBeCloseTo(arc, 3);
  });

  it('gives no cue to a seat that a mute made silent', () => {
    const horns = scene.score.seats.findIndex((s) => s.section === 'horn');
    const muted = allAudible(scene.score).map((a, i) =>
      i === horns ? { audible: false, changedAtWall: 0, before: null } : a,
    );
    const pose = poseAt(scene.plan, 6, 10, PLAYING, muted).conductor;
    for (const bone of ['upperArmL', 'forearmL', 'handL', 'fingersL'] as const) {
      expect(turnOf(pose.rotations, boneIndex(bone)), bone).toBe(0);
    }
    expect(yawOf(poseSkeleton(bear, pose), 'head')).toBeCloseTo(0, 6);
  });

  it('gives the cue at a seek point as an unbroken play gives it', () => {
    // A seek during play to 5.7 s, in the preparation of the cue of the horns at 6 s.
    const seek: Transport = { ...PLAYING, startSec: 5.7 };
    for (let t = 5.7; t < 7; t += 0.05) {
      const after = poseAt(scene.plan, t, 10, seek, allAudible(scene.score)).conductor;
      const unbroken = poseAt(scene.plan, t, 10, PLAYING, allAudible(scene.score)).conductor;
      expect(Array.from(after.rotations), `${t}`).toEqual(Array.from(unbroken.rotations));
    }
  });

  it('keeps the bones of the arms at their bind lengths, with 97% of the reach at most', () => {
    for (let t = -1.1; t < 16; t += 0.05) {
      const pose = posed(t);
      for (const error of armLengthErrors(pose)) {
        expect(error, `${t}`).toBeLessThan(5e-7);
      }
      const arm =
        bindAt('forearmR').distanceTo(bindAt('upperArmR')) +
        bindAt('handR').distanceTo(bindAt('forearmR'));
      expect(at(pose, 'handR').distanceTo(at(pose, 'upperArmR')) / arm, `${t}`).toBeLessThan(
        ARM_REACH + 1e-9,
      );
    }
  });

  describe('count-in from the song start (design 5.4)', () => {
    /** The count-in of the test file: the ready pause of 1.2 s and one beat of 0.5 s. */
    const count = countInAt(scene.plan.beats, 0);
    const beatPoint = new Vector3(...CONDUCTOR_HOLD.beatPoint)
      .multiplyScalar(H)
      .add(bindAt('upperArmR'));

    /** The point of a baton track point in the model axes, with no turn. */
    function pointOf(point: readonly [number, number]): Vector3 {
      return new Vector3(point[0], point[1], 0).add(beatPoint);
    }

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

    it('brings the tip of the baton down to the point of the downbeat at song time 0', () => {
      const downbeat = expectedTip(0, [layer().baton.points[0] ?? 0, layer().baton.points[1] ?? 0]);
      expect(tipOf(posed(0)).distanceTo(downbeat)).toBeLessThan(1e-4);
      // The tip comes down into the point and leaves it upward, so 0 is the lowest point.
      let lowest = Infinity;
      let lowestAt = Infinity;
      for (let t = -0.05; t <= 0.05; t += 0.0005) {
        const height = tipOf(posed(t)).y;
        if (height < lowest) {
          lowest = height;
          lowestAt = t;
        }
      }
      expect(Math.abs(lowestAt)).toBeLessThan(0.005);
    });

    it('raises the baton to the ready point before the preparatory beat', () => {
      const { baton } = layer();
      expect(pointOf(baton.ready).y - pointOf(baton.rest).y).toBeGreaterThan(0.1);
      expect(baton.ready[1] - baton.rest[1]).toBeCloseTo(
        (CONDUCTOR_MOTION.readyLift * (baton.arcs[0] ?? 0)) / CONDUCTOR_MOTION.downbeatArc,
        9,
      );
      for (const time of [-count.lengthSec + 0.2, -0.6, -count.beatSec]) {
        const ready = expectedTip(time, baton.ready);
        expect(tipOf(posed(time)).distanceTo(ready), `${time}`).toBeLessThan(1e-4);
      }
    });

    it('shows the ready gesture 0.2 s after the play, as the arms lift in 0.3 s', () => {
      // A play at the wall time 10 s, with the song time 0.2 s into the count-in.
      const play: Transport = { ...PLAYING, changedAtWall: 10 };
      const time = -count.lengthSec + 0.2;
      const handAt = (wallTime: number, transport: Transport = play): number =>
        at(
          poseSkeleton(
            bear,
            poseAt(scene.plan, time, wallTime, transport, allAudible(scene.score)).conductor,
          ),
          'handL',
        ).y;
      const rest = handAt(0, NOT_STARTED);
      const full = handAt(11);
      expect(full - rest).toBeGreaterThan(0.3);
      // The lift of 0.3 s (5.2) is at smoothstep(2 / 3) = 0.74 after 0.2 s.
      expect((handAt(10.2) - rest) / (full - rest)).toBeCloseTo(20 / 27, 2);
      // At the full weight, the tip of the baton waits above the point of the downbeat.
      const tip = tipOf(
        poseSkeleton(bear, poseAt(scene.plan, time, 11, play, allAudible(scene.score)).conductor),
      );
      expect(tip.y).toBeGreaterThan(beatPoint.y);
    });

    it('points the left hand up and inward in the ready gesture', () => {
      const pose = posed(-0.8);
      const toWrist = at(pose, 'handL').sub(at(pose, 'upperArmL'));
      expect(Math.asin(toWrist.y / toWrist.length())).toBeCloseTo(CONDUCTOR_HOLD.readyLift, 6);
      expect(Math.atan2(toWrist.x, -toWrist.z)).toBeCloseTo(CONDUCTOR_HOLD.readyIn, 6);
      expect(CONDUCTOR_HOLD.readyLift).toBeCloseTo(40 * MathUtils.DEG2RAD, 12);
      expect(CONDUCTOR_HOLD.readyIn).toBeCloseTo(10 * MathUtils.DEG2RAD, 12);
    });

    it('lowers the left hand in 0.6 s after the downbeat', () => {
      const pose = poseAt(scene.plan, 0.6, 10, PLAYING, allAudible(scene.score)).conductor;
      expect(at(posed(0.3), 'handL').y).toBeGreaterThan(at(posed(0.6), 'handL').y);
      for (const bone of ['upperArmL', 'forearmL', 'handL', 'fingersL'] as const) {
        expect(turnOf(pose.rotations, boneIndex(bone)), bone).toBe(0);
      }
    });
  });

  describe('count-in after a pause (design 5.4)', () => {
    /** A play at 3.25 s, between beats 2 and 3 of bar 1. A beat is 0.5 s. */
    const resume: Transport = { ...PLAYING, startSec: 3.25 };
    const count = countInAt(scene.plan.beats, 3.25);

    function tipAt(time: number): Vector3 {
      return tipOf(posed(time, allAudible(scene.score), resume));
    }

    it('gives one beat and no ready pause', () => {
      expect(count.readySec).toBe(0);
      expect(count.beatSec).toBeCloseTo(0.5, 9);
    });

    it('lifts the baton from its point at the pause point and brings it back down to it', () => {
      const atPause = tipAt(3.25);
      expect(tipAt(2.75).distanceTo(atPause)).toBeLessThan(1e-4);
      // Half way, the tip is up by the arc of the next beat, which is not a downbeat.
      const arc = layer().baton.arcs[7] ?? 0;
      expect(arc).toBeGreaterThan(0.05);
      const top = tipAt(3);
      expect(top.y - atPause.y).toBeCloseTo(arc, 3);
      expect(Math.hypot(top.x - atPause.x, top.z - atPause.z)).toBeLessThan(1e-3);
      // The tip comes down into the point with its full speed.
      expect(tipAt(3.245).y - atPause.y).toBeGreaterThan(arc * 0.02);
    });

    it('shows no ready gesture of the left hand', () => {
      const pose = poseAt(scene.plan, 3, 10, resume, allAudible(scene.score)).conductor;
      for (const bone of ['upperArmL', 'forearmL', 'handL', 'fingersL'] as const) {
        expect(turnOf(pose.rotations, boneIndex(bone)), bone).toBe(0);
      }
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

  it('hangs the arms in the rest pose before the first play', () => {
    const pose = poseAt(scene.plan, 6, 0, NOT_STARTED, allAudible(scene.score)).conductor;
    for (const bone of [
      'upperArmL',
      'forearmL',
      'handL',
      'upperArmR',
      'forearmR',
      'handR',
    ] as const) {
      expect(turnOf(pose.rotations, boneIndex(bone)), bone).toBeLessThan(0.01);
    }
  });
});
