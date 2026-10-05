import { describe, expect, it } from 'vitest';

import { note, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { DEG } from '../models/math.ts';
import type { Vec3 } from '../models/math.ts';
import { buildPlayer } from '../models/player.ts';
import { BONE_NAMES, boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { boneRotation } from './frames.ts';
import { createIdleState, idleAt } from './idle.ts';
import { gestureSize } from './loudness.ts';
import { activityAt } from './passages.ts';
import { PLAYER_OFFSETS, lookAngles } from './plan.ts';
import { beatSway, createScenePose, poseAt } from './pose-at.ts';
import { turnOf } from './test-kinematics.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from './test-scene.ts';
import type { AnimalPose } from './types.ts';

/** Four bars at 120 BPM in 4/4: a violin, a cello, and a harp, each on its own track. */
const FILE: TestFile = {
  tracks: [
    [tempo(0, 120), timeSignature(0, 4, 4)],
    track(
      [programChange(0, 0, 40)],
      ...[0, 480, 960, 1440, 1920].map((t) => note(t, 0, 67 + t / 480)),
    ),
    track([programChange(0, 1, 42)], note(0, 1, 48, 1920), note(1920, 1, 43, 3840)),
    track([programChange(0, 2, 46)], note(960, 2, 72, 1920), note(1920, 2, 74, 7680)),
  ],
};

const IDLE_BONES: ReadonlySet<BoneName> = new Set([
  'spine',
  'chest',
  'neck',
  'head',
  'earL',
  'earR',
  'tail1',
  'tail2',
]);

function isIdentity(pose: AnimalPose, bone: number): boolean {
  const [x, y, z, w] = boneRotation(pose.rotations, bone);
  return x === 0 && y === 0 && z === 0 && w === 1;
}

describe('poseAt (design 5.1)', () => {
  const scene = sceneOf(FILE);
  const audible = allAudible(scene.score);
  const harp = scene.layout.players.findIndex((p) => p.cast.instrument === 'harp');

  it('gives one pose for each player and one for the conductor, with unit rotations', () => {
    const pose = poseAt(scene.plan, 1.2, 5, PLAYING, audible);
    expect(pose.players).toHaveLength(scene.layout.players.length);
    for (const animal of [...pose.players, pose.conductor]) {
      expect(animal.rotations).toHaveLength(BONE_NAMES.length * 4);
      for (let b = 0; b < BONE_NAMES.length; b++) {
        expect(Math.hypot(...boneRotation(animal.rotations, b))).toBeCloseTo(1, 5);
      }
      expect(animal.slideOffset).toEqual([0, 0, 0]);
    }
  });

  it('gives the same poses for the same inputs, whatever came before', () => {
    const first = structuredClone(poseAt(scene.plan, 2.3, 7.1, PLAYING, audible));
    poseAt(scene.plan, 0.4, 1, NOT_STARTED, audible);
    const again = poseAt(scene.plan, 2.3, 7.1, PLAYING, audible);
    expect(again).toEqual(first);
  });

  it('writes the poses into a buffer that the caller gives', () => {
    const buffer = createScenePose(scene.plan);
    const poses = poseAt(scene.plan, 2, 2, PLAYING, audible, buffer);
    expect(poses).toBe(buffer);
    expect(poses).toEqual(poseAt(scene.plan, 2, 2, PLAYING, audible));
  });

  it('moves only the idle bones of a player whose family has no note layer yet', () => {
    for (const wall of [0, 3.7, 12.2]) {
      const pose = poseAt(scene.plan, 2.25, wall, PLAYING, audible).players[harp];
      if (!pose) {
        throw new Error('The test file has a harp.');
      }
      for (const [b, name] of BONE_NAMES.entries()) {
        if (!IDLE_BONES.has(name)) {
          expect(isIdentity(pose, b), name).toBe(true);
        }
      }
    }
  });

  it('blinks and breathes with the wall clock, also before the first play', () => {
    const blinks = new Set<number>();
    const chests = new Set<number>();
    for (let wall = 0; wall < 8; wall += 0.01) {
      const pose = poseAt(scene.plan, 0, wall, NOT_STARTED, audible).conductor;
      blinks.add(pose.blink);
      chests.add(boneRotation(pose.rotations, boneIndex('chest'))[0]);
    }
    expect(Math.max(...blinks)).toBeGreaterThan(0.5);
    expect(chests.size).toBeGreaterThan(100);
  });

  it('turns the head up to the conductor during a look', () => {
    const player = scene.plan.players[harp];
    if (!player) {
      throw new Error('The test file has a harp.');
    }
    const idle = createIdleState();
    let wall = 0;
    for (; wall < 200; wall += 0.05) {
      idleAt(player.idle, wall, idle);
      if (idle.look > 0.99) {
        break;
      }
    }
    expect(idle.look).toBeGreaterThan(0.99);
    const head = (time: number): number => {
      const pose = poseAt(scene.plan, 0, time, NOT_STARTED, audible).players[harp];
      // The x part of the rotation: the turn up around x.
      return pose ? boneRotation(pose.rotations, boneIndex('head'))[0] : 0;
    };
    expect(head(wall)).toBeGreaterThan(0.5 * Math.sin((0.6 * player.lookPitch) / 2));
    idleAt(player.idle, wall + 5, idle);
    if (idle.look === 0) {
      expect(head(wall + 5)).toBe(0);
    }
  });

  it('twitches the ears by 12° (design 5.1)', () => {
    const player = scene.plan.players[harp];
    if (!player) {
      throw new Error('The test file has a harp.');
    }
    const idle = createIdleState();
    let wall = 0;
    for (; wall < 300; wall += 0.01) {
      idleAt(player.idle, wall, idle);
      if (idle.ear > 0.99) {
        break;
      }
    }
    expect(idle.ear).toBeGreaterThan(0.99);
    const pose = poseAt(scene.plan, 0, wall, NOT_STARTED, audible).players[harp];
    for (const bone of ['earL', 'earR'] as const) {
      const turn = turnOf(pose?.rotations ?? new Float32Array(0), boneIndex(bone));
      expect(Math.abs(turn - 12 * DEG), bone).toBeLessThan(1.2 * DEG);
    }
  });

  it('sways the spine by 2° on a beat at a gesture size of 1 (design 5.1)', () => {
    const player = scene.plan.players[harp];
    if (!player) {
      throw new Error('The test file has a harp.');
    }
    // The middle of a beat, inside the passage of the harp from 1 s to 8 s.
    const pose = poseAt(scene.plan, 2.25 + player.timeOffset, 10, PLAYING, audible).players[harp];
    const [, , z, w] = boneRotation(pose?.rotations ?? new Float32Array(0), boneIndex('spine'));
    // The spine turns around z for the sway, then around x for the breath: z / w = tan(sway / 2).
    const sway = Math.abs(2 * Math.atan2(z, w));
    const gesture = gestureSize(activityAt(player.passages, 2.25).loudness, player.amplitude);
    expect(Math.abs(sway / gesture - 2 * DEG)).toBeLessThan(0.2 * DEG);
  });

  it('sways a playing player with the beat, and not in the rest pose', () => {
    const spine = boneIndex('spine');
    const roll = (transport: typeof PLAYING, time: number): number => {
      const pose = poseAt(scene.plan, time, 10, transport, audible).players[harp];
      return pose ? boneRotation(pose.rotations, spine)[2] : 0;
    };
    // The beats are 0.5 s apart. The middles of two neighbor beats sway to opposite sides.
    const offset = scene.plan.players[harp]?.timeOffset ?? 0;
    const a = roll(PLAYING, 2.25 + offset);
    const b = roll(PLAYING, 2.75 + offset);
    expect(Math.abs(a)).toBeGreaterThan(0.005);
    expect(Math.sign(a)).toBe(-Math.sign(b));
    expect(roll(NOT_STARTED, 2.25 + offset)).toBe(0);
  });
});

describe('preparePoses (design 5.1, 5.3)', () => {
  it('gives each player a seeded timing offset of at most 20 ms and a seeded amplitude', () => {
    const a = sceneOf(FILE, 1).plan.players;
    const b = sceneOf(FILE, 1).plan.players;
    const c = sceneOf(FILE, 2).plan.players;
    for (const player of a) {
      expect(Math.abs(player.timeOffset)).toBeLessThanOrEqual(PLAYER_OFFSETS.timeSec);
      expect(Math.abs(player.amplitude - 1)).toBeLessThanOrEqual(PLAYER_OFFSETS.amplitude);
    }
    expect(a.map((p) => p.timeOffset)).toEqual(b.map((p) => p.timeOffset));
    expect(a.map((p) => p.timeOffset)).not.toEqual(c.map((p) => p.timeOffset));
    expect(new Set(a.map((p) => p.timeOffset)).size).toBe(a.length);
    // Players in unison do not move as copies.
    const offsets = a.map((p) => p.timeOffset);
    expect(Math.max(...offsets) - Math.min(...offsets)).toBeGreaterThan(0.005);
  });

  it('spreads the timing offsets from -20 ms to 20 ms (design 5.3)', () => {
    const offsets = [1, 2, 3, 4].flatMap((seed) =>
      sceneOf(FILE, seed).plan.players.map((p) => p.timeOffset),
    );
    expect(Math.min(...offsets)).toBeLessThan(-0.01);
    expect(Math.max(...offsets)).toBeGreaterThan(0.01);
  });

  it('turns the heads of the seated players to the conductor, up and nearly straight', () => {
    const { plan, layout } = sceneOf(FILE);
    for (const [i, player] of plan.players.entries()) {
      expect(['chair', 'stool']).toContain(layout.players[i]?.support);
      expect(Math.abs(player.lookYaw)).toBeLessThan(0.2);
      expect(player.lookPitch).toBeGreaterThan(0);
    }
  });
});

describe('lookAngles (design 5.1)', () => {
  const { skeleton } = buildPlayer('rabbit', 'violin', 4);
  const head = skeleton.positions[boneIndex('head')] ?? [0, 0, 0];
  /** Gives the look at a point above the head and in front of it. */
  const lookAt = (up: number, ahead: number): readonly [number, number] => {
    const target: Vec3 = [head[0], head[1] + up, head[2] - ahead];
    return lookAngles(skeleton, [0, 0, 0], 0, target);
  };

  it('turns the head up or down by at most 0.5 rad', () => {
    expect(lookAt(0.3, 1)[1]).toBeCloseTo(Math.atan2(0.3, 1), 9);
    expect(lookAt(1, 1)[1]).toBeCloseTo(0.5, 9);
    expect(lookAt(-1, 1)[1]).toBeCloseTo(-0.5, 9);
  });
});

describe('beatSway', () => {
  it('sways to one side on one beat and to the other side on the next beat', () => {
    const beats = Float64Array.from([1, 1.5, 2, 2.5]);
    expect(beatSway(beats, 0.5)).toBe(0);
    expect(beatSway(beats, 1.25)).toBeCloseTo(1, 9);
    expect(beatSway(beats, 1.75)).toBeCloseTo(-1, 9);
    expect(beatSway(beats, 2.25)).toBeCloseTo(1, 9);
    expect(beatSway(beats, 1.5)).toBeCloseTo(0, 9);
    expect(beatSway(beats, 3)).toBe(0);
  });
});
