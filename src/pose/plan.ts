import { CONDUCTOR } from '../models/cast.ts';
import type { SceneLayout } from '../models/layout.ts';
import { buildPlayer } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { Skeleton } from '../models/rig.ts';
import { PODIUM_SIZE } from '../models/stage.ts';
import type { SpeciesId } from '../models/species.ts';
import type { KettleCount } from '../models/instruments/percussion.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import type { Vec3 } from '../models/math.ts';
import type { PlayerNote, Score } from '../score/types.ts';
import { bowedRig, isBowed } from './bowed.ts';
import type { BowedRig } from './bowed.ts';
import { MOTION_FAMILIES } from './family.ts';
import type { MotionFamily } from './family.ts';
import { idleParams } from './idle.ts';
import type { IdleParams } from './idle.ts';
import { noteLoudness } from './loudness.ts';
import { buildPassages } from './passages.ts';
import type { Passages } from './passages.ts';
import { mixHash, mulberry32 } from './random.ts';
import { TUNINGS, buildStrokes } from './strokes.ts';
import type { Stroke } from './strokes.ts';
import { buildWindTrack } from './wind-notes.ts';
import type { WindTrack } from './wind-notes.ts';
import { isWind, windRig } from './winds.ts';
import type { WindRig } from './winds.ts';

/** The seeded offsets of each player (design 5.3). */
export const PLAYER_OFFSETS = {
  /** The largest timing offset, in seconds. The offset of a player is from -0.02 to 0.02. */
  timeSec: 0.02,
  /** The amplitude of a player is from `1 - amplitude` to `1 + amplitude`. */
  amplitude: 0.15,
} as const;

/** The largest turns of the head for a look at the conductor, in radians. */
export const LOOK_LIMITS = { yaw: 1.2, pitch: 0.5 } as const;

/** The data of a bowed string player (design 5.3). */
export interface BowedPlan {
  readonly rig: BowedRig;
  readonly strokes: readonly Stroke[];
  /** The starts of the strokes, for the search by time. */
  readonly starts: Float64Array;
}

/** The data of a woodwind or brass player (design 5.3). */
export interface WindPlan {
  readonly rig: WindRig;
  readonly track: WindTrack;
}

/** The data of one animal that the pose calculates one time for each score. */
export interface PlayerPlan {
  /** The index of the seat in `Score.seats`, or -1 for the conductor. */
  readonly seatIndex: number;
  readonly instrument: InstrumentId;
  readonly family: MotionFamily;
  /** The bind skeleton of the player model. */
  readonly skeleton: Skeleton;
  /**
   * The seeded timing offset, in seconds. The note layer of the player runs this much later than
   * the song time (design 5.3).
   */
  readonly timeOffset: number;
  /** The seeded amplitude of the gestures, near 1 (design 5.3). */
  readonly amplitude: number;
  readonly idle: IdleParams;
  /** The turn of the head to the conductor, around y then around x, in radians. */
  readonly lookYaw: number;
  readonly lookPitch: number;
  /** The spans in which the player plays, for the sway of the beat layer. */
  readonly passages: Passages;
  /** The bow strokes and the rig of a bowed string player, or `null` for another family. */
  readonly bowed: BowedPlan | null;
  /** The note data and the rig of a woodwind or brass player, or `null` for another family. */
  readonly wind: WindPlan | null;
}

/**
 * The data of a score that the pose calculates one time, so that each frame only looks up the
 * time (design 5.1). `preparePoses()` makes it.
 */
export interface PosePlan {
  /** One entry for each player, in the order of `SceneLayout.players`. */
  readonly players: readonly PlayerPlan[];
  readonly conductor: PlayerPlan;
  /** The times of the conducted beats, in song seconds (`Score.beats`). */
  readonly beats: Float64Array;
}

/** A cache of the player models of one score, by species, instrument, and kettle count. */
type ModelCache = Map<string, PlayerModel>;

/** A cache of the rigs of the bowed string players, by player model. */
type RigCache = Map<PlayerModel, BowedRig>;

/** A cache of the rigs of the wind players, by player model. */
type WindRigCache = Map<PlayerModel, WindRig>;

/**
 * Gives the player model of a kind of player, and builds it one time.
 *
 * @param cache The cache of the score.
 * @param species The species.
 * @param instrument The instrument.
 * @param kettles The kettle count of the timpani.
 * @returns The model.
 */
function modelOf(
  cache: ModelCache,
  species: SpeciesId,
  instrument: InstrumentId,
  kettles: KettleCount,
): PlayerModel {
  const key = `${species} ${instrument} ${kettles}`;
  let model = cache.get(key);
  if (!model) {
    model = buildPlayer(species, instrument, kettles);
    cache.set(key, model);
  }
  return model;
}

/**
 * Turns a vector around the y axis.
 *
 * @param v The vector.
 * @param angle The angle, in radians. A positive angle turns -z toward -x.
 * @returns The turned vector.
 */
function turnY(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

/**
 * Calculates the turn of the head of a player to look at a point (design 5.1, the looks at the
 * conductor). The player model faces -z, and `facing` turns it around y.
 *
 * @param skeleton The bind skeleton of the player.
 * @param position The place of the player on the stage.
 * @param facing The facing of the player.
 * @param target The point to look at.
 * @returns The yaw around y and the pitch around x, in radians, within {@link LOOK_LIMITS}.
 */
function lookAngles(
  skeleton: Skeleton,
  position: Vec3,
  facing: number,
  target: Vec3,
): readonly [yaw: number, pitch: number] {
  const head = skeleton.positions[boneIndex('head')] ?? [0, 0, 0];
  const world = turnY(head, facing);
  const toTarget: Vec3 = [
    target[0] - position[0] - world[0],
    target[1] - position[1] - world[1],
    target[2] - position[2] - world[2],
  ];
  const local = turnY(toTarget, -facing);
  const yaw = Math.atan2(-local[0], -local[2]);
  const pitch = Math.atan2(local[1], Math.hypot(local[0], local[2]));
  const limit = (x: number, max: number): number => Math.max(-max, Math.min(max, x));
  return [limit(yaw, LOOK_LIMITS.yaw), limit(pitch, LOOK_LIMITS.pitch)];
}

/** The notes of one player, with their loudness. */
interface PlayerNotes {
  readonly notes: PlayerNote[];
  readonly loudness: number[];
}

/**
 * Gives the notes of each player of a layout.
 *
 * @param score The score.
 * @param layout The layout.
 * @returns One entry for each player of the layout, with the notes sorted by start.
 */
function notesOfPlayers(score: Score, layout: SceneLayout): PlayerNotes[] {
  const loudness = noteLoudness(score);
  const out = layout.players.map((): PlayerNotes => ({ notes: [], loudness: [] }));
  const byPlayer = new Map<string, PlayerNotes>();
  for (const [i, place] of layout.players.entries()) {
    const entry = out[i];
    if (entry) {
      byPlayer.set(`${place.cast.seatIndex} ${place.cast.player}`, entry);
    }
  }
  for (const [i, note] of score.notes.entries()) {
    const entry = byPlayer.get(`${note.seatIndex} ${note.player}`);
    if (entry) {
      entry.notes.push(note);
      entry.loudness.push(loudness[i] ?? 0);
    }
  }
  return out;
}

/**
 * Calculates the data of a score that the pose needs at each frame (design 5.1): the player
 * models, the seeded offsets and idle values of each animal, and the looks at the conductor.
 * Pure: the same inputs give the same plan.
 *
 * @param score The score.
 * @param layout The layout of the score, from `layoutScene()`.
 * @param seed The seed of the scene.
 * @returns The plan for `poseAt()`.
 */
export function preparePoses(score: Score, layout: SceneLayout, seed: number): PosePlan {
  const cache: ModelCache = new Map();
  const rigs: RigCache = new Map();
  const windRigs: WindRigCache = new Map();
  const bear = modelOf(cache, CONDUCTOR.species, CONDUCTOR.instrument, 4);
  const bearHead = bear.skeleton.positions[boneIndex('head')] ?? [0, 0, 0];
  const podiumTop = layout.podium[1] + PODIUM_SIZE[1];
  const conductorHead: Vec3 = [
    layout.podium[0] + bearHead[0],
    podiumTop + bearHead[1],
    layout.podium[2] + bearHead[2],
  ];

  const notes = notesOfPlayers(score, layout);
  const players = layout.players.map((place, index): PlayerPlan => {
    const { cast } = place;
    const model = modelOf(cache, cast.species, cast.instrument, cast.kettles);
    const playerSeed = mixHash(seed, index);
    const next = mulberry32(playerSeed);
    const timeOffset = (next() * 2 - 1) * PLAYER_OFFSETS.timeSec;
    const amplitude = 1 + (next() * 2 - 1) * PLAYER_OFFSETS.amplitude;
    const own = notes[index] ?? { notes: [], loudness: [] };
    let bowed: BowedPlan | null = null;
    if (isBowed(cast.instrument)) {
      let rig = rigs.get(model);
      if (!rig) {
        rig = bowedRig(model, cast.instrument);
        rigs.set(model, rig);
      }
      const strokes = buildStrokes(
        own.notes,
        own.loudness,
        rig.bowRange,
        amplitude,
        TUNINGS[cast.instrument],
      );
      bowed = { rig, strokes, starts: Float64Array.from(strokes, (s) => s.start) };
    }
    let wind: WindPlan | null = null;
    if (isWind(cast.instrument)) {
      let rig = windRigs.get(model);
      if (!rig) {
        rig = windRig(model, cast.instrument);
        windRigs.set(model, rig);
      }
      wind = {
        rig,
        track: buildWindTrack(own.notes, rig.hold.fingering, rig.hold.fundamental),
      };
    }
    const [lookYaw, lookPitch] = lookAngles(
      model.skeleton,
      place.position,
      place.facing,
      conductorHead,
    );
    return {
      seatIndex: cast.seatIndex,
      instrument: cast.instrument,
      family: MOTION_FAMILIES[cast.instrument],
      skeleton: model.skeleton,
      timeOffset,
      amplitude,
      idle: idleParams(mixHash(playerSeed, 1)),
      lookYaw,
      lookPitch,
      passages: buildPassages(own.notes, own.loudness),
      bowed,
      wind,
    };
  });

  const conductorSeed = mixHash(seed, -1);
  return {
    players,
    conductor: {
      seatIndex: -1,
      instrument: CONDUCTOR.instrument,
      family: 'conductor',
      skeleton: bear.skeleton,
      timeOffset: 0,
      amplitude: 1,
      idle: idleParams(mixHash(conductorSeed, 1)),
      lookYaw: 0,
      lookPitch: 0,
      passages: buildPassages([], []),
      bowed: null,
      wind: null,
    },
    beats: Float64Array.from(score.beats, (b) => b.timeSec),
  };
}
