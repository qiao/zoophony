import { describe, expect, it } from 'vitest';

import { MathUtils } from 'three';
import { note, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import type { Vec3 } from '../models/tuples.ts';
import { perf60File } from '../models/test-perf-60.ts';
import { CONDUCTOR } from '../models/cast.ts';
import { buildPlayer } from '../models/player.ts';
import { BONE_NAMES, boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { boneRotation } from './frames.ts';
import { createIdleState, idleAt } from './idle.ts';
import { gestureSize, noteLoudness } from './loudness.ts';
import { activityAt } from './passages.ts';
import {
  PLAYER_OFFSETS,
  conductorHead,
  lookAngles,
  prepareConductor,
  preparePlayer,
} from './plan.ts';
import { mixHash } from './random.ts';
import { beatSway, createScenePose, poseAt } from './pose-at.ts';
import { turnOf } from './test-kinematics.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from './test-scene.ts';
import type { AnimalPose, Transport } from './types.ts';

/** Four bars at 120 BPM in 4/4: a violin, a cello, and the timpani, each on its own track. */
const FILE: TestFile = {
  tracks: [
    [tempo(0, 120), timeSignature(0, 4, 4)],
    track(
      [programChange(0, 0, 40)],
      ...[0, 480, 960, 1440, 1920].map((t) => note(t, 0, 67 + t / 480)),
    ),
    track([programChange(0, 1, 42)], note(0, 1, 48, 1920), note(1920, 1, 43, 3840)),
    track([programChange(0, 2, 47)], note(960, 2, 45, 1920), note(1920, 2, 50, 7680)),
  ],
};

/** The bones of the legs and of the trunk. No layer of the pose moves them (design 4.7). */
const STILL_BONES = [
  'thighL',
  'shinL',
  'footL',
  'thighR',
  'shinR',
  'footR',
  'trunk1',
  'trunk2',
  'trunk3',
] as const satisfies readonly BoneName[];

function isIdentity(pose: AnimalPose, bone: number): boolean {
  const { x, y, z, w } = boneRotation(pose.rotations, bone);
  return x === 0 && y === 0 && z === 0 && w === 1;
}

describe('poseAt (design 5.1)', () => {
  const scene = sceneOf(FILE);
  const audible = allAudible(scene.score);
  // The timpani player shows the idle layer and the beat layer.
  const timpani = scene.layout.players.findIndex((p) => p.cast.instrument === 'timpani');

  it('gives one pose for each player and one for the conductor, with unit rotations', () => {
    const pose = poseAt(scene.plan, 1.2, 5, PLAYING, audible);
    expect(pose.players).toHaveLength(scene.layout.players.length);
    for (const animal of [...pose.players, pose.conductor]) {
      expect(animal.rotations).toHaveLength(BONE_NAMES.length * 4);
      for (let b = 0; b < BONE_NAMES.length; b++) {
        expect(boneRotation(animal.rotations, b).length()).toBeCloseTo(1, 5);
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

  it('gives each player of each motion family the same pose alone and in the scene', () => {
    // The frame path writes scratch objects in place. Each player must write them before it
    // reads them, so that no player and no frame changes the pose of another. The states seek
    // back and forth, and cover the rest pose, a lowering after a pause, a lift, a silent seat,
    // pizzicato, tremolo, and a cue of the conductor (review of step 5, F7).
    const articulations: TestFile = {
      tracks: [
        [tempo(0, 120), timeSignature(0, 4, 4)],
        track([programChange(0, 0, 45)], ...[0, 480, 960, 7680].map((t) => note(t, 0, 67))),
        track([programChange(0, 1, 44)], note(0, 1, 60, 1920), note(7680, 1, 62, 9600)),
        // The flute rests for more than two bars, so the conductor cues it at 8 s.
        track([programChange(0, 2, 73)], note(0, 2, 72), note(7680, 2, 74, 8640)),
      ],
    };
    const pause = {
      playing: false,
      changedAtWall: 6,
      weightAtChange: 1,
      startSec: 0,
      holdSec: 3,
    } as const;
    const lift = {
      playing: true,
      changedAtWall: 11.9,
      weightAtChange: 0,
      startSec: 0,
      holdSec: 3,
    } as const;
    const states = [
      { time: 1.3, wall: 4, transport: PLAYING, muted: false },
      { time: 0.2, wall: 0.5, transport: NOT_STARTED, muted: false },
      { time: 7.8, wall: 9, transport: PLAYING, muted: false },
      // 3.2 s after the pause, the instruments go down.
      { time: 2.1, wall: 9.2, transport: pause, muted: false },
      { time: 0.6, wall: 12, transport: lift, muted: false },
      { time: 7.9, wall: 4, transport: PLAYING, muted: true },
      { time: 1.3, wall: 4.2, transport: PLAYING, muted: true },
    ] as const;
    for (const all of [sceneOf(perf60File(), 1, 'one-per-part'), sceneOf(articulations)]) {
      for (const [k, { time, wall, transport, muted }] of states.entries()) {
        // The first seat went silent at the wall time 3.9 s.
        const audibility = allAudible(all.score).map((a, seat) =>
          muted && seat === 0 ? { audible: false, changedAtWall: 3.9, weightAtChange: 1 } : a,
        );
        const together = structuredClone(poseAt(all.plan, time, wall, transport, audibility));
        // The players go in the opposite order, so that each one follows other players than in
        // the scene.
        for (const [i, player] of [...all.plan.players.entries()].toReversed()) {
          const plan = { ...all.plan, players: [player] };
          const alone = poseAt(plan, time, wall, transport, audibility);
          expect(alone.players[0], `state ${k}, player ${i}`).toEqual(together.players[i]);
        }
        const conductor = poseAt({ ...all.plan, players: [] }, time, wall, transport, audibility);
        expect(conductor.conductor, `state ${k}, conductor`).toEqual(together.conductor);
      }
    }
  });

  it('writes the poses into a buffer that the caller gives', () => {
    const buffer = createScenePose(scene.plan);
    const poses = poseAt(scene.plan, 2, 2, PLAYING, audible, buffer);
    expect(poses).toBe(buffer);
    expect(poses).toEqual(poseAt(scene.plan, 2, 2, PLAYING, audible));
  });

  it('keeps the legs and the trunk of each animal in the bind pose (design 4.7)', () => {
    for (const [time, wall, transport] of [
      [2.25, 0, PLAYING],
      [3.1, 3.7, PLAYING],
      [1, 12.2, NOT_STARTED],
    ] as const) {
      const poses = poseAt(scene.plan, time, wall, transport, audible);
      for (const pose of [...poses.players, poses.conductor]) {
        for (const name of STILL_BONES) {
          expect(isIdentity(pose, boneIndex(name)), name).toBe(true);
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
      chests.add(boneRotation(pose.rotations, boneIndex('chest')).x);
    }
    expect(Math.max(...blinks)).toBeGreaterThan(0.5);
    expect(chests.size).toBeGreaterThan(100);
  });

  it('turns the head up to the conductor during a look', () => {
    const player = scene.plan.players[timpani];
    if (!player) {
      throw new Error('The test file has the timpani.');
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
      const pose = poseAt(scene.plan, 0, time, NOT_STARTED, audible).players[timpani];
      // The x part of the rotation: the turn up around x.
      return pose ? boneRotation(pose.rotations, boneIndex('head')).x : 0;
    };
    expect(head(wall)).toBeGreaterThan(0.5 * Math.sin((0.6 * player.lookPitch) / 2));
    // 5 s later, the look is over, and the head turns back.
    idleAt(player.idle, wall + 5, idle);
    expect(idle.look).toBe(0);
    expect(head(wall + 5)).toBe(0);
  });

  it('twitches the ears by 12° (design 5.1)', () => {
    const player = scene.plan.players[timpani];
    if (!player) {
      throw new Error('The test file has the timpani.');
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
    const pose = poseAt(scene.plan, 0, wall, NOT_STARTED, audible).players[timpani];
    for (const bone of ['earL', 'earR'] as const) {
      const turn = turnOf(pose?.rotations ?? new Float32Array(0), boneIndex(bone));
      expect(Math.abs(turn - 12 * MathUtils.DEG2RAD), bone).toBeLessThan(1.2 * MathUtils.DEG2RAD);
    }
  });

  it('sways the spine by 2° on a beat at a gesture size of 1 (design 5.1)', () => {
    const player = scene.plan.players[timpani];
    if (!player) {
      throw new Error('The test file has the timpani.');
    }
    // The middle of a beat, inside the passage of the timpani from 1 s to 8 s.
    const pose = poseAt(scene.plan, 2.25 + player.timeOffset, 10, PLAYING, audible).players[
      timpani
    ];
    const { z, w } = boneRotation(pose?.rotations ?? new Float32Array(0), boneIndex('spine'));
    // The spine turns around z for the sway, then around x for the breath: z / w = tan(sway / 2).
    const sway = Math.abs(2 * Math.atan2(z, w));
    const gesture = gestureSize(activityAt(player.passages, 2.25).loudness, player.amplitude);
    expect(Math.abs(sway / gesture - 2 * MathUtils.DEG2RAD)).toBeLessThan(0.2 * MathUtils.DEG2RAD);
  });

  it('sways a playing player with the beat, and not in the rest pose', () => {
    const spine = boneIndex('spine');
    const roll = (transport: typeof PLAYING, time: number): number => {
      const pose = poseAt(scene.plan, time, 10, transport, audible).players[timpani];
      return pose ? boneRotation(pose.rotations, spine).z : 0;
    };
    // The beats are 0.5 s apart. The middles of two neighbor beats sway to opposite sides.
    const offset = scene.plan.players[timpani]?.timeOffset ?? 0;
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

  it('takes the player models from the cache of the score (audit 2026-10-05, finding 8)', () => {
    const { plan, layout, models } = sceneOf(FILE);
    for (const [i, player] of plan.players.entries()) {
      const cast = layout.players[i]?.cast;
      expect(cast).toBeDefined();
      if (cast) {
        expect(player.skeleton).toBe(
          models.get(cast.species, cast.instrument, cast.kettles).skeleton,
        );
      }
    }
    expect(plan.conductor.skeleton).toBe(
      models.get(CONDUCTOR.species, CONDUCTOR.instrument).skeleton,
    );
  });

  it('turns the heads of the seated players to the conductor, up and nearly straight', () => {
    const { plan, layout } = sceneOf(FILE);
    const seated = plan.players.filter((_, i) => layout.players[i]?.support === 'chair');
    // The timpani make the file orchestral: 4 violins and 3 cellos (design 3.8).
    expect(seated).toHaveLength(7);
    for (const player of seated) {
      expect(Math.abs(player.lookYaw)).toBeLessThan(0.2);
      expect(player.lookPitch).toBeGreaterThan(0);
    }
  });
});

describe('preparePlayer and prepareConductor (design 5.1, 5.4)', () => {
  it('give the plans of preparePoses() from the notes and the places of one animal', () => {
    const { score, layout, plan, models } = sceneOf(FILE);
    const bear = models.get(CONDUCTOR.species, CONDUCTOR.instrument);
    const loudness = noteLoudness(score);
    for (const [i, place] of layout.players.entries()) {
      const { cast } = place;
      const own = score.notes.flatMap((n, k) =>
        n.seatIndex === cast.seatIndex && n.player === cast.player
          ? [{ note: n, loudness: loudness[k] ?? 0 }]
          : [],
      );
      const player = preparePlayer(
        {
          model: models.get(cast.species, cast.instrument, cast.kettles),
          place,
          notes: own.map((o) => o.note),
          loudness: own.map((o) => o.loudness),
          lookTarget: conductorHead(bear, layout.conductor),
        },
        mixHash(1, i),
      );
      expect(player).toEqual(plan.players[i]);
    }
    const conductor = prepareConductor(
      {
        model: bear,
        place: layout.conductor,
        beats: score.beats,
        notes: score.notes,
        loudness,
        seatCount: score.seats.length,
        players: layout.players,
      },
      mixHash(1, -1),
    );
    expect(conductor).toEqual(plan.conductor);
  });

  it('gives no cue to a seat with no player', () => {
    // The cello enters after two full bars of rest, so the conductor cues it (design 5.4).
    const entry: TestFile = {
      tracks: [
        [tempo(0, 120), timeSignature(0, 4, 4)],
        track(
          [programChange(0, 0, 40)],
          ...[0, 1, 2, 3, 4, 5].map((bar) => note(bar * 1920, 0, 67, (bar + 1) * 1920)),
        ),
        track([programChange(0, 1, 42)], note(3840, 1, 48, 5760)),
      ],
    };
    const { score, layout, models } = sceneOf(entry);
    const inputs = {
      model: models.get(CONDUCTOR.species, CONDUCTOR.instrument),
      place: layout.conductor,
      beats: score.beats,
      notes: score.notes,
      loudness: noteLoudness(score),
      seatCount: score.seats.length,
    };
    const cued = prepareConductor({ ...inputs, players: layout.players }, 1).note;
    const none = prepareConductor({ ...inputs, players: [] }, 1).note;
    expect(cued.family === 'conductor' && cued.cues.starts.length).toBeGreaterThan(0);
    expect(none.family === 'conductor' && none.cues.starts.length).toBe(0);
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

  it('sways to each side in 2 beats for a singer (design 5.3)', () => {
    const beats = Float64Array.from([1, 1.5, 2, 2.5, 3]);
    expect(beatSway(beats, 1, 2)).toBeCloseTo(0, 9);
    expect(beatSway(beats, 1.5, 2)).toBeCloseTo(1, 9);
    expect(beatSway(beats, 2, 2)).toBeCloseTo(0, 9);
    expect(beatSway(beats, 2.5, 2)).toBeCloseTo(-1, 9);
  });
});

describe('poseAt in a count-in (design 5.2)', () => {
  const scene = sceneOf(FILE);
  const audible = allAudible(scene.score);
  const violin = scene.layout.players.findIndex((p) => p.cast.instrument === 'violin');

  it('holds the players at the pause point in the count-in after a pause', () => {
    // A play at 1.25 s, between two notes of the violin. The beat is 0.5 s at 120 BPM in 4/4.
    const resume: Transport = { ...PLAYING, startSec: 1.25 };
    const held = structuredClone(poseAt(scene.plan, 1.25, 8, resume, audible).players);
    for (const time of [0.75, 1, 1.2]) {
      expect(poseAt(scene.plan, time, 8, resume, audible).players, `${time}`).toEqual(held);
    }
    // After the pause point, the bow moves on.
    const later = poseAt(scene.plan, 1.35, 8, resume, audible).players[violin];
    expect(later?.rotations).not.toEqual(held[violin]?.rotations);
  });

  it('lets the players prepare for the first notes in the count-in from the song start', () => {
    // The violin lands the bow on the string before its first note at 0 s (design 5.3).
    const before = structuredClone(poseAt(scene.plan, -0.3, 8, PLAYING, audible).players);
    const atStart = poseAt(scene.plan, 0, 8, PLAYING, audible).players;
    expect(before[violin]?.rotations).not.toEqual(atStart[violin]?.rotations);
  });

  it('has the instruments up before the downbeat after a play from the song start', () => {
    // The count-in of the file is 0.6 s and one beat of 0.5 s. The lift takes 0.3 s (5.2).
    // A play at the wall time 10 s reaches the song time -0.01 s at 11.09 s. The poses equal the
    // poses of a play long before.
    const wall = 10 + 1.1 - 0.01;
    const play: Transport = { ...PLAYING, changedAtWall: 10 };
    const up = structuredClone(poseAt(scene.plan, -0.01, wall, PLAYING, audible).players);
    expect(poseAt(scene.plan, -0.01, wall, play, audible).players).toEqual(up);
    expect(poseAt(scene.plan, -0.01, 10.2, play, audible).players).not.toEqual(
      poseAt(scene.plan, -0.01, 10.2, PLAYING, audible).players,
    );
  });
});
