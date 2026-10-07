import { describe, expect, it } from 'vitest';

import { MathUtils, Quaternion, Vector3 } from 'three';
import { chord, note, programChange, tempo, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { toVec3 } from '../models/tuples.ts';
import type { Vec3 } from '../models/tuples.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { harpStringPosition } from '../models/instruments/harp.ts';
import { placePoint } from '../models/instruments/hold.ts';
import { pianoKeyPosition } from '../models/instruments/piano.ts';
import { BIND_ROTATIONS, chainFrames, createFrames, setBoneRotation } from './frames.ts';
import { HAND_MOTION, createHandState } from './hand-notes.ts';
import { HANDS_HOLDS, handsRig, poseHands } from './hands.ts';
import type { HandsInstrument } from './hands.ts';
import { SECTION_SPECIES } from '../models/cast.ts';
import { ARM_REACH } from './ik.ts';
import type { HandsLayer } from './plan.ts';
import { poseAt } from './pose-at.ts';
import {
  demoLooks,
  headClearance,
  partDistance,
  posedPart,
  signedDistance,
} from './test-clearance.ts';
import {
  armLengthErrors,
  posedAt,
  posedPiecePoint,
  posedPoint,
  turnOf,
} from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { NOT_STARTED, PLAYING, allAudible, firstPlayers, sceneOf } from './test-scene.ts';
import type { ScenePlayer } from './test-scene.ts';

/** The keys of the left and of the right hand: bass and treble in turn, 0.5 s apart. */
const PIANO_KEYS = [36, 72, 31, 98, 43, 79, 50, 73] as const;
const HARP_KEYS = [24, 103, 36, 84, 47, 72, 55, 64] as const;

/**
 * The piano and the harp at 120 BPM: single notes of the two hands in turn, then a chord of two
 * hands.
 */
const FILE: TestFile = {
  tracks: [
    [tempo(0, 120)],
    track(
      [programChange(0, 0, 0)],
      ...PIANO_KEYS.map((key, i) => note(i * 480, 0, key, i * 480 + 400)),
      chord(4320, 0, [40, 47, 64, 76], 5280),
    ),
    track(
      [programChange(0, 1, 46)],
      ...HARP_KEYS.map((key, i) => note(i * 480, 1, key, i * 480 + 400)),
      chord(4320, 1, [36, 43, 67, 74], 5280),
    ),
  ],
};

/** The place of the palm over a key (design 5.3), in the instrument axes. */
const PALM_OFFSETS = {
  piano: { L: [0, 0.04, 0.04], R: [0, 0.04, 0.04] },
  harp: { L: [-0.03, 0, 0], R: [0.03, 0, 0] },
} as const satisfies Readonly<Record<HandsInstrument, { L: Vec3; R: Vec3 }>>;

const KEY_POINTS = { piano: pianoKeyPosition, harp: harpStringPosition } as const;

const scene = sceneOf(FILE);
const players = firstPlayers(scene, ['piano', 'harp'] as const);

function layerOf(player: ScenePlayer<HandsInstrument>): HandsLayer {
  const layer = scene.plan.players[player.index]?.note;
  if (layer?.family !== 'keyboard' && layer?.family !== 'harp') {
    throw new Error(`The ${player.instrument} has no hands layer.`);
  }
  return layer;
}

/** Gives the place of the palm of a hand for the middle of two keys, in the model axes. */
function expectedPalm(
  player: ScenePlayer<HandsInstrument>,
  side: 'L' | 'R',
  low: number,
  high = low,
): Vector3 {
  const keyPoint = KEY_POINTS[player.instrument];
  const at = new Vector3(...keyPoint(low))
    .add(new Vector3(...keyPoint(high)))
    .multiplyScalar(0.5)
    .add(new Vector3(...PALM_OFFSETS[player.instrument][side]));
  return new Vector3(...placePoint(player.model.pieces, { bone: 'instrument', at: toVec3(at) }));
}

function palmOf(posed: PosedSkeleton, side: 'L' | 'R'): Vector3 {
  const { body } = posed.model;
  return new Vector3(
    ...(side === 'L'
      ? posedPoint(posed, 'handL', body.palmL)
      : posedPoint(posed, 'handR', body.palmR)),
  );
}

/** The time at which a hand of a player is on the keys or the string of a note. */
function onKeysAt(player: ScenePlayer<HandsInstrument>, start: number): number {
  const offset = scene.plan.players[player.index]?.timeOffset ?? 0;
  // A piano hand is down on the keys after the note start. A harp hand rests on its string
  // just before the note start.
  return start + offset + (player.instrument === 'piano' ? 0.02 : -0.001);
}

describe('poseHands (design 5.3, 4.7)', () => {
  it('gives the bass notes to the left hand and the treble notes to the right hand', () => {
    for (const player of players) {
      const layer = layerOf(player);
      expect(Array.from(layer.left.starts), player.instrument).toEqual([0, 1, 2, 3, 4.5]);
      expect(Array.from(layer.right.starts), player.instrument).toEqual([0.5, 1.5, 2.5, 3.5, 4.5]);
    }
  });

  it('puts each palm on the key or the string of its note', () => {
    for (const player of players) {
      const keys = player.instrument === 'piano' ? PIANO_KEYS : HARP_KEYS;
      for (const [i, key] of keys.entries()) {
        const side = i % 2 === 0 ? 'L' : 'R';
        const posed = posedAt(scene, player, onKeysAt(player, i * 0.5));
        const label = `${player.instrument} ${key}`;
        expect(palmOf(posed, side).distanceTo(expectedPalm(player, side, key)), label).toBeLessThan(
          1e-4,
        );
      }
    }
  });

  it('puts each hand of a wide chord over the middle of its notes', () => {
    const chords = { piano: [40, 47, 64, 76], harp: [36, 43, 67, 74] } as const;
    for (const player of players) {
      const [a, b, c, d] = chords[player.instrument];
      const posed = posedAt(scene, player, onKeysAt(player, 4.5));
      expect(palmOf(posed, 'L').distanceTo(expectedPalm(player, 'L', a, b))).toBeLessThan(1e-4);
      expect(palmOf(posed, 'R').distanceTo(expectedPalm(player, 'R', c, d))).toBeLessThan(1e-4);
    }
  });

  it('keeps the bones of the arms at their bind lengths, with 97% of the reach at most', () => {
    for (const player of players) {
      for (let t = 0; t < 5.5; t += 0.05) {
        const posed = posedAt(scene, player, t);
        for (const error of armLengthErrors(posed)) {
          expect(error, `${player.instrument} at ${t}`).toBeLessThan(5e-7);
        }
        for (const [shoulder, elbow, wrist] of [
          ['upperArmL', 'forearmL', 'handL'],
          ['upperArmR', 'forearmR', 'handR'],
        ] as const) {
          const at = (bone: BoneName): Vector3 =>
            posed.frames[boneIndex(bone)]?.position ?? new Vector3();
          const bind = (bone: BoneName): Vector3 =>
            new Vector3(...(player.model.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0]));
          const arm = bind(elbow).distanceTo(bind(shoulder)) + bind(wrist).distanceTo(bind(elbow));
          expect(
            at(wrist).distanceTo(at(shoulder)) / arm,
            `${player.instrument} ${wrist} at ${t}`,
          ).toBeLessThanOrEqual(ARM_REACH + 1e-9);
        }
      }
    }
  });

  it('lifts a piano hand 0.03 m in its move, and strikes the keys at the note start', () => {
    const piano = players[0];
    if (!piano) {
      throw new Error('The test file has a piano.');
    }
    const layer = layerOf(piano);
    const offset = scene.plan.players[piano.index]?.timeOffset ?? 0;
    // The left hand moves from C2 to G1 in the 0.15 s before 1 s.
    const middle = posedAt(scene, piano, 1 - HAND_MOTION.moveSec / 2 + offset);
    const between = expectedPalm(piano, 'L', 36).add(expectedPalm(piano, 'L', 31));
    const height = palmOf(middle, 'L').y - between.multiplyScalar(0.5).y;
    expect(height).toBeCloseTo(HAND_MOTION.lift * (layer.left.gestures[1] ?? 0), 4);
    expect(HAND_MOTION.lift).toBe(0.03);
  });

  it('pulls a harp palm 0.025 m away from the strings after a pluck', () => {
    const harp = players[1];
    if (!harp) {
      throw new Error('The test file has a harp.');
    }
    const layer = layerOf(harp);
    const offset = scene.plan.players[harp.index]?.timeOffset ?? 0;
    const posed = posedAt(scene, harp, 0.5 + HAND_MOTION.pluckSec + 0.01 + offset);
    const away = palmOf(posed, 'R').sub(expectedPalm(harp, 'R', 103));
    // The right hand plays from the right side of the strings, so it pulls to +x of the harp.
    const piece = (at: Vec3): Vector3 =>
      new Vector3(...placePoint(harp.model.pieces, { bone: 'instrument', at }));
    const right = piece([1, 0, 0])
      .sub(piece([0, 0, 0]))
      .normalize();
    const pull = away.dot(right);
    expect(pull).toBeCloseTo(0.025 * (layer.right.gestures[0] ?? 0), 4);
    expect(away.addScaledVector(right, -pull).length()).toBeLessThan(1e-4);
    // The fingers curl 15° on the string, and 60° after the pluck.
    const curl = (t: number): number => {
      const pose = poseAt(scene.plan, t + offset, 10, PLAYING, allAudible(scene.score)).players[
        harp.index
      ];
      return turnOf(pose?.rotations ?? new Float32Array(0), boneIndex('fingersR'));
    };
    expect(curl(0.5 - 0.001)).toBeCloseTo(15 * MathUtils.DEG2RAD, 4);
    expect(curl(0.5 + HAND_MOTION.pluckSec + 0.01)).toBeCloseTo(60 * MathUtils.DEG2RAD, 4);
  });

  it('rests the palms on the thighs or on a string before the first play (user report of 2026-10-06)', () => {
    for (const player of players) {
      const posed = posedAt(scene, player, 1, 0, NOT_STARTED);
      const h = player.model.body.headHeight;
      for (const side of ['L', 'R'] as const) {
        const label = `${player.instrument} ${side}`;
        const rest = HANDS_HOLDS[player.instrument][`rest${side}`];
        const palm = new Vector3(
          ...posedPoint(posed, `hand${side}`, player.model.body[`palm${side}`]),
        );
        if (rest.kind === 'string') {
          // The right hand of the harp player rests on its string, as it plays.
          const offset = new Vector3(...HANDS_HOLDS.harp.palmR);
          const at = new Vector3(...harpStringPosition(rest.key)).add(offset);
          const string = new Vector3(
            ...posedPiecePoint(posed, { bone: 'instrument', at: toVec3(at) }),
          );
          expect(Math.abs(palm.distanceTo(string) - rest.away) / h, label).toBeLessThan(1e-6);
        } else {
          // The palm is on the thigh.
          const gap = signedDistance(posedPart(posed, [`thigh${side}`]), palm) / h;
          expect(gap, label).toBeGreaterThan(0);
          expect(gap, label).toBeLessThan(0.2);
        }

        // The elbow bends: a hanging arm is straight (180°).
        const shoulder = posed.frames[boneIndex(`upperArm${side}`)]?.position ?? new Vector3();
        const elbow = posed.frames[boneIndex(`forearm${side}`)]?.position ?? new Vector3();
        const wrist = posed.frames[boneIndex(`hand${side}`)]?.position ?? new Vector3();
        const angle = shoulder.clone().sub(elbow).angleTo(wrist.clone().sub(elbow));
        expect(angle * MathUtils.RAD2DEG, label).toBeLessThan(150);
        // The hand stays out of the instrument.
        const instrument = posedPart(posed, ['instrument']);
        for (const bone of [`hand${side}`, `fingers${side}`] as const) {
          const distance = partDistance(posedPart(posed, [bone]), instrument, 0.01);
          expect(distance, `${label} ${bone}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('leans the harp player forward 8° while it plays', () => {
    const harp = players[1];
    if (!harp) {
      throw new Error('The test file has a harp.');
    }
    const spine = (t: number, transport = NOT_STARTED): Vector3 => {
      const posed = posedAt(scene, harp, t, 10, transport);
      const chest = posed.frames[boneIndex('chest')]?.position ?? new Vector3();
      const base = posed.frames[boneIndex('spine')]?.position ?? new Vector3();
      return chest.clone().sub(base);
    };
    const playing = spine(1.2, PLAYING);
    const rest = spine(1.2);
    const angle = Math.acos(playing.dot(rest) / (playing.length() * rest.length()));
    expect(Math.abs(angle - 8 * MathUtils.DEG2RAD)).toBeLessThan(0.3 * MathUtils.DEG2RAD);
  });
});

describe('the reach of the hands (design 5.3)', () => {
  /** Gives the palm error and the reach of a hand that plays one key. */
  function reachOf(instrument: HandsInstrument, side: 'L' | 'R', key: number) {
    const player = players.find((p) => p.instrument === instrument);
    if (!player) {
      throw new Error(`The test file has a ${instrument}.`);
    }
    const rig = handsRig(player.model, instrument);
    const rotations = Float32Array.from(BIND_ROTATIONS);
    const lean = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -rig.hold.lean);
    setBoneRotation(rotations, boneIndex('spine'), lean);
    const [root, , , chest] = chainFrames(player.model.skeleton, rotations, createFrames(4));
    const state = { left: createHandState(), right: createHandState() };
    const target = expectedPalm(player, side, key);
    (side === 'L' ? state.left : state.right).point.splice(0, 3, ...target.toArray());
    if (!root || !chest) {
      throw new Error('The skeleton has a chest.');
    }
    poseHands(rig, { root, chest }, state, 1, rotations);
    const frames = chainFrames(player.model.skeleton, rotations, createFrames(40));
    const arm = side === 'L' ? rig.left.arm : rig.right.arm;
    const joint = (bone: number): Vector3 => frames[bone]?.position ?? new Vector3();
    return {
      error: palmOf({ model: player.model, frames }, side).distanceTo(target),
      reach: joint(arm.bones.hand).distanceTo(joint(arm.bones.upperArm)) / arm.reach,
    };
  }

  it('reaches each piano key from A0 to C8 (the polar bear, design 4.3)', () => {
    // The meerkat (0.85, girth 0.75) reached G1 to D7. Its hands stopped short of A0 and C8.
    for (const [side, keys] of [
      ['L', [21, 23, 29, 31, 36, 48, 60, 72]],
      ['R', [48, 60, 72, 84, 96, 98, 106, 108]],
    ] as const) {
      for (const key of keys) {
        expect(reachOf('piano', side, key).error, `${side} ${key}`).toBeLessThan(1e-4);
      }
    }
  });

  it('reaches each harp string with both hands', () => {
    for (let key = 24; key <= 103; key++) {
      for (const side of ['L', 'R'] as const) {
        expect(reachOf('harp', side, key).error, `${side} ${key}`).toBeLessThan(1e-4);
      }
    }
  });
});

describe('the head and the harp (review of step 5, U1)', () => {
  /** Notes on the lowest and the highest string of the harp. */
  const HARP_FILE: TestFile = {
    tracks: [
      [tempo(0, 120)],
      track([programChange(0, 0, 46)], note(0, 0, 24, 900), note(960, 0, 103, 1860)),
    ],
  };

  // The test poses each harpist 240 times and measures the distance of two meshes each time. It
  // takes 1.2 s on an idle Mac, so a high load can pass the default limit of 5 s.
  it('keeps the head 0.03 m from the harp while the player plays, with each look', async () => {
    const harpScene = sceneOf(HARP_FILE);
    const looks = await demoLooks(['harp']);
    const harps = harpScene.layout.players.flatMap((place, index) =>
      place.cast.instrument === 'harp' ? [{ index, species: place.cast.species }] : [],
    );
    expect(new Set(harps.map((p) => p.species))).toEqual(new Set(SECTION_SPECIES.harp));
    for (const { index, species } of harps) {
      // The lowest string, then the highest string, at the ends of the sway.
      const nearest = headClearance(
        harpScene,
        index,
        looks,
        [0.25, 0.75, 1.25, 1.75],
        (posed) => posedPart(posed, ['instrument']),
        0.03,
      );
      expect(nearest, species).toBeGreaterThanOrEqual(0.03);
    }
  });
});
