import { describe, expect, it } from 'vitest';

import { MathUtils, Vector3 } from 'three';
import { note, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { CONDUCTOR } from '../models/cast.ts';
import { buildPlayer } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { CONDUCTOR_HOLD } from './conductor.ts';
import { ARM_REACH } from './ik.ts';
import type { ConductorLayer } from './plan.ts';
import { poseAt } from './pose-at.ts';
import { armLengthErrors, poseSkeleton, posedPiecePoint, turnOf } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from './test-scene.ts';
import type { SeatAudibility } from './types.ts';

/**
 * Four bars of 4/4 at 120 BPM: the violins play each bar, the flutes play bar 0 and come in
 * again in bar 3 (a cue at 6 s), and the violas (at the right of the conductor) come in at bar
 * 5 (a cue at 10 s).
 */
const FILE: TestFile = {
  tracks: [
    [tempo(0, 120), timeSignature(0, 4, 4)],
    track(
      [programChange(0, 0, 40)],
      ...[0, 1, 2, 3, 4, 5, 6].map((bar) => note(bar * 1920, 0, 72, bar * 1920 + 1900)),
    ),
    track([programChange(0, 1, 73)], note(0, 1, 79, 1900), note(3 * 1920, 1, 79, 4 * 1920)),
    track([programChange(0, 2, 41)], note(5 * 1920, 2, 60, 6 * 1920)),
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

describe('poseConductor (design 5.4, 4.7)', () => {
  it('puts the tip of the baton on the point of each beat at the beat time', () => {
    const { baton } = layer();
    const beatPoint = new Vector3(...CONDUCTOR_HOLD.beatPoint)
      .multiplyScalar(H)
      .add(bindAt('upperArmR'));
    for (const [k, time] of baton.beats.entries()) {
      const point = new Vector3(baton.points[2 * k] ?? 0, baton.points[2 * k + 1] ?? 0, 0).add(
        beatPoint,
      );
      expect(tipOf(posed(time)).distanceTo(point), `beat ${k}`).toBeLessThan(1e-4);
    }
    expect(CONDUCTOR_HOLD.beatPoint).toEqual([-0.1, 0.9, -1.2]);
  });

  it('points the baton from its pivot to the tip', () => {
    const pivot = new Vector3(...CONDUCTOR_HOLD.batonPivot)
      .multiplyScalar(H)
      .add(bindAt('upperArmR'));
    for (const time of [1, 1.25, 3.6]) {
      const pose = posed(time);
      const grip = at(pose, 'baton');
      const tip = tipOf(pose);
      const along = tip.clone().sub(grip);
      const fromPivot = tip.clone().sub(pivot);
      const cosine = along.dot(fromPivot) / (along.length() * fromPivot.length());
      expect(cosine, `${time}`).toBeCloseTo(1, 9);
    }
    expect(CONDUCTOR_HOLD.batonPivot).toEqual([0.1, 0.6, -0.2]);
  });

  it('cues the flutes with the left hand, up and to the section', () => {
    const { cues } = layer();
    expect(Array.from(cues.starts)).toEqual([6, 10]);
    const pose = posed(6);
    const shoulder = at(pose, 'upperArmL');
    const wrist = at(pose, 'handL');
    const arm = bindAt('forearmL').distanceTo(bindAt('upperArmL'));
    const forearm = bindAt('handL').distanceTo(bindAt('forearmL'));
    const reach = ARM_REACH * (arm + forearm);
    const toWrist = wrist.clone().sub(shoulder);
    expect(toWrist.length()).toBeCloseTo(CONDUCTOR_HOLD.cueReach * reach, 6);
    expect(Math.asin(toWrist.y / toWrist.length())).toBeCloseTo(CONDUCTOR_HOLD.cueLift, 6);
    // The flutes sit behind the violins, in front of the conductor and to its left.
    const target = cues.targets[0] ?? [0, 0, 0];
    const yaw = Math.atan2(toWrist.x, -toWrist.z);
    expect(yaw).toBeCloseTo(Math.atan2(target[0] - shoulder.x, shoulder.z - target[2]), 6);
    expect(CONDUCTOR_HOLD.cueLift).toBeCloseTo(30 * MathUtils.DEG2RAD, 12);
    expect(CONDUCTOR_HOLD.cueReach).toBe(0.85);
  });

  it('turns the left hand at most 20° to the right for a section at the right', () => {
    const pose = posed(10);
    const toWrist = at(pose, 'handL').sub(at(pose, 'upperArmL'));
    expect(Math.atan2(toWrist.x, -toWrist.z)).toBeCloseTo(CONDUCTOR_HOLD.cueRight, 6);
    expect(CONDUCTOR_HOLD.cueRight).toBeCloseTo(20 * MathUtils.DEG2RAD, 12);
  });

  it('gives no cue to a seat that a mute made silent', () => {
    const flutes = scene.score.seats.findIndex((s) => s.section === 'flute');
    const muted = allAudible(scene.score).map((a, i) =>
      i === flutes ? { audible: false, changedAtWall: 0, previousChangeAtWall: null } : a,
    );
    const pose = poseAt(scene.plan, 6, 10, PLAYING, muted).conductor;
    for (const bone of ['upperArmL', 'forearmL', 'handL', 'fingersL'] as const) {
      expect(turnOf(pose.rotations, boneIndex(bone)), bone).toBe(0);
    }
  });

  it('keeps the bones of the arms at their bind lengths, with 97% of the reach at most', () => {
    for (let t = 0; t < 14; t += 0.05) {
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
