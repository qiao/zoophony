import { describe, expect, it } from 'vitest';

import { MathUtils, Vector3 } from 'three';
import { note, programChange, tempo, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { placePoint } from '../models/instruments/hold.ts';
import { TIMPANI, xylophoneBarPosition } from '../models/instruments/percussion.ts';
import type { PiecePoint } from '../models/instruments/types.ts';
import { ARM_REACH } from './ik.ts';
import { gestureSize } from './loudness.ts';
import {
  GRIP_CURL,
  PERCUSSION_HOLDS,
  PERCUSSION_PLACES,
  kettleOf,
  targetKeyOf,
} from './percussion-rig.ts';
import type { PercussionInstrument } from './percussion-rig.ts';
import type { PercussionLayer } from './plan.ts';
import { poseAt } from './pose-at.ts';
import { STRIKE_MOTION } from './strikes.ts';
import type { StrikeTrack } from './strikes.ts';
import { armHang, armLengthErrors, posedAt, posedPiecePoint, turnOf } from './test-kinematics.ts';
import type { PosedSkeleton } from './test-kinematics.ts';
import { NOT_STARTED, PLAYING, allAudible, firstPlayers, sceneOf } from './test-scene.ts';
import type { ScenePlayer } from './test-scene.ts';

/** The timpani keys: two notes on each of the four kettles, then a roll on one kettle. */
const TIMPANI_KEYS = [38, 41, 45, 47, 50, 53, 55, 57] as const;

/** The keys of the Orchestra kit: bass drum, snare drum, cymbals, triangle, and tambourine. */
const DRUM_KEYS = [35, 38, 57, 81, 54, 35, 38, 57, 81, 54] as const;

/** The xylophone keys: naturals and sharps, low and high. */
const XYLOPHONE_KEYS = [72, 73, 79, 84, 90, 96, 101, 74] as const;

/**
 * The timpani, the percussion of the Orchestra kit, and the xylophone at 120 BPM, one note each
 * 0.5 s, then a fast roll of the timpani.
 */
const FILE: TestFile = {
  tracks: [
    [tempo(0, 120)],
    track(
      [programChange(0, 2, 47)],
      ...TIMPANI_KEYS.map((key, i) => note(i * 480, 2, key, i * 480 + 200)),
      ...[0, 1, 2, 3, 4, 5].map((i) => note(4320 + i * 120, 2, 45, 4320 + i * 120 + 100)),
    ),
    track(
      [programChange(0, 9, 48)],
      ...DRUM_KEYS.map((key, i) => note(i * 480, 9, key, i * 480 + 200)),
    ),
    track(
      [programChange(0, 3, 13)],
      ...XYLOPHONE_KEYS.map((key, i) => note(i * 480, 3, key, i * 480 + 200)),
    ),
  ],
};

/** The loudness of each note: velocity 100 and the General MIDI volume 100 (design 5.3). */
const LOUDNESS = (100 / 127) * (100 / 127);

const scene = sceneOf(FILE);
const INSTRUMENTS = [
  'timpani',
  'bass-drum',
  'snare-drum',
  'cymbals',
  'small-percussion',
  'xylophone',
] as const satisfies readonly PercussionInstrument[];
const players = firstPlayers(scene, INSTRUMENTS);

function playerOf<I extends PercussionInstrument>(instrument: I): ScenePlayer<I> {
  const player = players.find((p): p is ScenePlayer<I> => p.instrument === instrument);
  if (!player) {
    throw new Error(`The test file has the ${instrument}.`);
  }
  return player;
}

function layerOf(player: ScenePlayer): PercussionLayer {
  const layer = scene.plan.players[player.index]?.note;
  if (layer?.family !== 'percussion') {
    throw new Error(`The ${player.instrument} has no percussion layer.`);
  }
  return layer;
}

function bindAt(player: ScenePlayer, bone: BoneName): Vector3 {
  return new Vector3(...(player.model.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0]));
}

function offsetOf(player: ScenePlayer): number {
  return scene.plan.players[player.index]?.timeOffset ?? 0;
}

/** Gives a point of a flat list of points. */
function pointOf(list: Float64Array, i: number): Vector3 {
  return new Vector3(list[3 * i] ?? 0, list[3 * i + 1] ?? 0, list[3 * i + 2] ?? 0);
}

/** Gives the target of a piece of the player in the bind pose. */
function bindPoint(player: ScenePlayer, point: PiecePoint): Vector3 {
  return new Vector3(...placePoint(player.model.pieces, point));
}

/** Gives the posed head of the mallet of a hand. */
function malletHead(posed: PosedSkeleton, side: 'L' | 'R'): Vector3 {
  const bone = side === 'L' ? 'malletL' : 'malletR';
  const target = posed.model.instrument.targets.find(
    (t) => (t.kind === 'mallet-head' || t.kind === 'plate') && t.bone === bone,
  );
  if (!target) {
    throw new Error(`The ${posed.model.instrument.id} has no mallet in the hand ${side}.`);
  }
  return new Vector3(...posedPiecePoint(posed, { bone, at: target.from }));
}

/** Gives each strike of a track: the time of the note and the target. */
function strikesOf(hand: StrikeTrack | null): { start: number; point: Vector3 }[] {
  return Array.from(hand?.starts ?? [], (start, i) => ({
    start,
    point: pointOf(hand?.points ?? new Float64Array(0), i),
  }));
}

describe('percussionTracks (design 5.3)', () => {
  it('plays each timpani note on the kettle with the nearest middle of its range', () => {
    expect(kettleOf(38, 4)).toBe(0);
    expect(kettleOf(43, 4)).toBe(0);
    expect(kettleOf(44, 4)).toBe(1);
    expect(kettleOf(48, 4)).toBe(2);
    expect(kettleOf(57, 4)).toBe(3);
    // With two kettles, a high note plays on the smaller kettle.
    expect(kettleOf(57, 2)).toBe(1);
    expect(kettleOf(30, 3)).toBe(0);
    expect(TIMPANI.keys[1]).toEqual([41, 48]);
  });

  it('strikes the kettle of each timpani note, with the mallets side by side', () => {
    const timpani = playerOf('timpani');
    const layer = layerOf(timpani);
    const heads = timpani.model.instrument.targets.filter((t) => t.kind === 'head');
    const strikes = [
      ...strikesOf(layer.left).map((s) => ({ ...s, offset: PERCUSSION_HOLDS.timpani.offsetL })),
      ...strikesOf(layer.right).map((s) => ({ ...s, offset: PERCUSSION_HOLDS.timpani.offsetR })),
    ];
    for (const [i, key] of TIMPANI_KEYS.entries()) {
      const strike = strikes.find((s) => Math.abs(s.start - i * 0.5) < 1e-9);
      const head = heads[kettleOf(key, heads.length)];
      if (!strike || !head) {
        throw new Error(`The timpani strikes the note ${key}.`);
      }
      const kettle = bindPoint(timpani, { bone: 'instrument', at: head.from });
      const target = kettle.add(new Vector3(...strike.offset));
      expect(strike.point.distanceTo(target), `${key}`).toBeLessThan(1e-9);
    }
  });

  it('alternates the hands of the timpani roll', () => {
    const layer = layerOf(playerOf('timpani'));
    const roll = (hand: StrikeTrack | null): number[] =>
      Array.from(hand?.starts ?? []).filter((t) => t >= 4.5);
    expect(roll(layer.left).length + roll(layer.right).length).toBe(6);
    expect(Math.abs(roll(layer.left).length - roll(layer.right).length)).toBeLessThanOrEqual(1);
  });

  it('strikes the bar of each xylophone note', () => {
    const xylophone = playerOf('xylophone');
    const layer = layerOf(xylophone);
    const strikes = [...strikesOf(layer.left), ...strikesOf(layer.right)];
    for (const [i, key] of XYLOPHONE_KEYS.entries()) {
      const strike = strikes.find((s) => Math.abs(s.start - i * 0.5) < 1e-9);
      const bar = bindPoint(xylophone, { bone: 'instrument', at: xylophoneBarPosition(key) });
      expect(strike?.point.distanceTo(bar), `${key}`).toBeLessThan(1e-9);
    }
  });

  it('strikes the triangle and the tambourine with the right hand only', () => {
    const small = playerOf('small-percussion');
    const layer = layerOf(small);
    expect(layer.left).toBeNull();
    const strikes = strikesOf(layer.right);
    expect(strikes.map((s) => s.start)).toEqual([1.5, 2, 4, 4.5]);
    const tambourine = small.model.instrument.targets.find((t) => t.kind === 'head');
    const head = bindPoint(small, { bone: 'instrument', at: tambourine?.from ?? [0, 0, 0] });
    expect(strikes[1]?.point.distanceTo(head)).toBeLessThan(1e-9);
    expect(targetKeyOf('small-percussion', 54)).toBe(1);
    expect(targetKeyOf('small-percussion', 81)).toBe(0);
  });
});

describe('posePercussion (design 5.3, 4.7)', () => {
  it('puts the mallet head on its target at the note start', () => {
    for (const player of players) {
      const layer = layerOf(player);
      for (const [side, hand] of [
        ['L', layer.left],
        ['R', layer.right],
      ] as const) {
        if (!hand || player.instrument === 'cymbals') {
          continue;
        }
        for (const strike of strikesOf(hand)) {
          const posed = posedAt(scene, player, strike.start + offsetOf(player));
          const label = `${player.instrument} ${side} at ${strike.start}`;
          expect(malletHead(posed, side).distanceTo(strike.point), label).toBeLessThan(1e-4);
        }
      }
    }
  });

  it('lifts the timpani mallet before the note, to its rest height and the gesture', () => {
    const timpani = playerOf('timpani');
    const layer = layerOf(timpani);
    const hand = layer.left ?? layer.right;
    const side = layer.left ? 'L' : 'R';
    const strike = strikesOf(hand)[1];
    if (!hand || !strike) {
      throw new Error('The timpani has two strikes.');
    }
    const { sizes } = PERCUSSION_HOLDS.timpani;
    const at = (t: number): number =>
      malletHead(posedAt(scene, timpani, t + offsetOf(timpani)), side).y - strike.point.y;
    // The middle of the lift: half the rest height and the full peak.
    const amplitude = scene.plan.players[timpani.index]?.amplitude ?? 1;
    expect(at(strike.start - STRIKE_MOTION.upSec / 2)).toBeCloseTo(
      sizes.rest / 2 + sizes.lift * gestureSize(LOUDNESS, amplitude),
      3,
    );
    expect(at(strike.start - STRIKE_MOTION.upSec - 0.05)).toBeCloseTo(sizes.rest, 4);
    expect(sizes).toEqual({ lift: 0.12, rest: 0.04 });
  });

  it('closes the cymbals at the note start, and opens them before and after', () => {
    const cymbals = playerOf('cymbals');
    const gap = (t: number): number => {
      const posed = posedAt(scene, cymbals, t + offsetOf(cymbals));
      return malletHead(posed, 'R').sub(malletHead(posed, 'L')).x;
    };
    for (const start of [1, 3.5]) {
      expect(Math.abs(gap(start)), `${start}`).toBeLessThan(1e-4);
      expect(gap(start - 0.1), `${start}`).toBeGreaterThan(0.1);
      expect(gap(start + STRIKE_MOTION.reboundSec)).toBeCloseTo(
        2 * PERCUSSION_HOLDS.cymbals.sizes.rest,
        4,
      );
    }
  });

  it('keeps the triangle in the left hand, and strikes it with the beater', () => {
    const small = playerOf('small-percussion');
    const bar = small.model.instrument.targets.find((t) => t.kind === 'bar');
    if (!bar) {
      throw new Error('The small percussion has a triangle.');
    }
    const posed = posedAt(scene, small, 1.5 + offsetOf(small));
    const triangle = new Vector3(...posedPiecePoint(posed, { bone: 'malletL', at: bar.from }));
    expect(malletHead(posed, 'R').distanceTo(triangle)).toBeLessThan(1e-4);
  });

  it('points each mallet from its home below and in front of the shoulder', () => {
    for (const instrument of ['timpani', 'snare-drum', 'xylophone'] as const) {
      const player = playerOf(instrument);
      const strike = strikesOf(layerOf(player).right)[0];
      if (!strike) {
        throw new Error(`The ${instrument} strikes with the right hand.`);
      }
      const posed = posedAt(scene, player, strike.start + offsetOf(player));
      const grip = posed.frames[boneIndex('malletR')]?.position ?? new Vector3();
      const head = malletHead(posed, 'R');
      const home = new Vector3(...PERCUSSION_PLACES.malletHome)
        .multiplyScalar(player.model.body.headHeight)
        .add(bindAt(player, 'upperArmR'));
      const along = head.clone().sub(grip).normalize().dot(head.clone().sub(home).normalize());
      expect(along, instrument).toBeCloseTo(1, 9);
    }
  });

  it('meets the cymbals in front of the chest, and holds the triangle up in front', () => {
    const cymbals = playerOf('cymbals');
    const h = cymbals.model.body.headHeight;
    const crash = posedAt(scene, cymbals, 1 + offsetOf(cymbals));
    const middle = malletHead(crash, 'L').add(malletHead(crash, 'R')).multiplyScalar(0.5);
    const shoulders = bindAt(cymbals, 'upperArmL')
      .add(bindAt(cymbals, 'upperArmR'))
      .multiplyScalar(0.5);
    const point = new Vector3(...PERCUSSION_PLACES.crash).multiplyScalar(h).add(shoulders);
    expect(middle.distanceTo(point)).toBeLessThan(1e-4);
    const small = playerOf('small-percussion');
    const clip = posedAt(scene, small, 1).frames[boneIndex('malletL')]?.position ?? new Vector3();
    const expected = new Vector3(...PERCUSSION_PLACES.triangleClip)
      .multiplyScalar(small.model.body.headHeight)
      .add(bindAt(small, 'upperArmL'));
    expect(clip.distanceTo(expected)).toBeLessThan(1e-4);
  });

  it('keeps the bones of the arms at their bind lengths, with 97% of the reach at most', () => {
    for (const player of players) {
      for (let t = 0; t < 5.5; t += 0.05) {
        const posed = posedAt(scene, player, t);
        for (const error of armLengthErrors(posed)) {
          expect(error, `${player.instrument} at ${t}`).toBeLessThan(5e-7);
        }
        // The free left arm of the bass drum player hangs straight.
        const arms = [
          ['upperArmL', 'handL'],
          ['upperArmR', 'handR'],
        ] as const;
        for (const [shoulder, wrist] of player.instrument === 'bass-drum' ? arms.slice(1) : arms) {
          const at = (bone: BoneName): Vector3 =>
            posed.frames[boneIndex(bone)]?.position ?? new Vector3();
          const bind = (bone: BoneName): Vector3 => bindAt(player, bone);
          const elbow = shoulder === 'upperArmL' ? 'forearmL' : 'forearmR';
          const arm = bind(elbow).distanceTo(bind(shoulder)) + bind(wrist).distanceTo(bind(elbow));
          expect(
            at(wrist).distanceTo(at(shoulder)) / arm,
            `${player.instrument} ${wrist} at ${t}`,
          ).toBeLessThanOrEqual(ARM_REACH + 1e-9);
        }
      }
    }
  });

  it('holds the mallets with the fingers curled 60°, and hangs the free arm of the bass drum', () => {
    const drum = playerOf('bass-drum');
    const pose = poseAt(scene.plan, 1.2, 10, PLAYING, allAudible(scene.score)).players[drum.index];
    const rest = poseAt(scene.plan, 1.2, 10, NOT_STARTED, allAudible(scene.score)).players[
      drum.index
    ];
    const turn = (bone: BoneName): number =>
      turnOf(pose?.rotations ?? new Float32Array(0), boneIndex(bone));
    expect(turn('fingersR')).toBeCloseTo(GRIP_CURL, 5);
    // The free arm hangs as in the rest pose, with open fingers.
    for (const bone of ['upperArmL', 'forearmL', 'handL', 'fingersL'] as const) {
      const at = boneIndex(bone) * 4;
      expect([...(pose?.rotations.subarray(at, at + 4) ?? [])], bone).toEqual(
        [...(rest?.rotations.subarray(at, at + 4) ?? [])].map((v) => expect.closeTo(v, 6)),
      );
    }
    expect(turn('fingersL')).toBe(0);
  });

  it('hangs the arms a little out to the sides in the rest pose (design 5.2)', () => {
    // A rest pose with the arms of the bind pose puts the arms 0.25 H into the hips.
    for (const player of players) {
      const posed = posedAt(scene, player, 1, 0, NOT_STARTED);
      for (const side of ['L', 'R'] as const) {
        const { out, bend } = armHang(posed, side);
        const label = `${player.instrument} ${side}`;
        expect(out * MathUtils.RAD2DEG, label).toBeGreaterThan(15);
        expect(out * MathUtils.RAD2DEG, label).toBeLessThan(40);
        // The elbow bends about 60°, so that the palms rest at the hips.
        expect(bend * MathUtils.RAD2DEG, label).toBeGreaterThan(45);
        expect(bend * MathUtils.RAD2DEG, label).toBeLessThan(75);
      }
    }
  });
});
