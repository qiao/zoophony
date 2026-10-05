import { CONDUCTOR } from '../models/cast.ts';
import type { SceneLayout } from '../models/layout.ts';
import { buildPlayer } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { Skeleton } from '../models/rig.ts';
import type { SpeciesId } from '../models/species.ts';
import type { KettleCount } from '../models/instruments/percussion.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import { add, scale, sub } from '../models/math.ts';
import type { Vec3 } from '../models/tuples.ts';
import type { PlayerNote, Score } from '../score/types.ts';
import { bowedRig } from './bowed.ts';
import type { BowedRig } from './bowed.ts';
import { choirRig } from './choir.ts';
import { conductorRig } from './conductor.ts';
import type { ConductorRig } from './conductor.ts';
import { buildBatonTrack, findCues } from './conductor-notes.ts';
import type { BatonTrack, CueTrack } from './conductor-notes.ts';
import type { ChoirRig } from './choir.ts';
import { buildChoirTrack } from './choir-notes.ts';
import type { ChoirTrack } from './choir-notes.ts';
import { MOTION_FAMILIES, isInFamily } from './family.ts';
import type { HandTrack } from './hand-notes.ts';
import { handTracks, handsRig } from './hands.ts';
import type { HandsRig } from './hands.ts';
import { idleParams } from './idle.ts';
import type { IdleParams } from './idle.ts';
import { noteLoudness } from './loudness.ts';
import { buildPassages } from './passages.ts';
import type { Passages } from './passages.ts';
import { percussionRig, percussionTracks } from './percussion.ts';
import type { PercussionRig } from './percussion.ts';
import { mixHash, mulberry32 } from './random.ts';
import type { StrikeTrack } from './strikes.ts';
import { TUNINGS, buildStrokes } from './strokes.ts';
import type { Stroke } from './strokes.ts';
import { buildWindTrack } from './wind-notes.ts';
import type { WindTrack } from './wind-notes.ts';
import { windRig } from './winds.ts';
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

/** The note layer of a bowed string player (design 5.3). */
export interface BowedLayer {
  readonly family: 'bowed';
  readonly rig: BowedRig;
  readonly strokes: readonly Stroke[];
  /** The starts of the strokes, for the search by time. */
  readonly starts: Float64Array;
}

/** The note layer of a woodwind or brass player (design 5.3). */
export interface WindLayer {
  readonly family: 'woodwind' | 'brass';
  readonly rig: WindRig;
  readonly track: WindTrack;
}

/** The note layer of a piano or harp player: the two hands (design 5.3). */
export interface HandsLayer {
  readonly family: 'keyboard' | 'harp';
  readonly rig: HandsRig;
  readonly left: HandTrack;
  readonly right: HandTrack;
}

/** The note layer of a singer: the jaw and the sway of the phrases (design 5.3). */
export interface ChoirLayer {
  readonly family: 'choir';
  readonly rig: ChoirRig;
  readonly track: ChoirTrack;
}

/** The note layer of a percussion player: the strikes of the two hands (design 5.3). */
export interface PercussionLayer {
  readonly family: 'percussion';
  readonly rig: PercussionRig;
  /** The strikes of each hand. The cymbals share one track, and a free hand has `null`. */
  readonly left: StrikeTrack | null;
  readonly right: StrikeTrack | null;
}

/** The note layer of the conductor: the baton and the cues (design 5.4). */
export interface ConductorLayer {
  readonly family: 'conductor';
  readonly rig: ConductorRig;
  readonly baton: BatonTrack;
  readonly cues: CueTrack;
}

/**
 * The note data of one animal, by motion family. A switch on `family` selects the data. Each
 * family has its own member, its branch in `noteLayerOf()`, and its case in `poseAnimal()` of
 * `pose-at.ts`.
 */
export type NoteLayer =
  | BowedLayer
  | WindLayer
  | HandsLayer
  | ChoirLayer
  | PercussionLayer
  | ConductorLayer;

/** The data of one animal that the pose calculates one time for each score. */
export interface PlayerPlan {
  /** The index of the seat in `Score.seats`, or -1 for the conductor. */
  readonly seatIndex: number;
  readonly instrument: InstrumentId;
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
  /** The note data and the rig of the motion family of the player. */
  readonly note: NoteLayer;
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

/** The player models and the rigs of one score. Players of one kind share them. */
interface PlanCaches {
  /** The player models, by species, instrument, and kettle count. */
  readonly models: Map<string, PlayerModel>;
  readonly bowedRigs: Map<PlayerModel, BowedRig>;
  readonly windRigs: Map<PlayerModel, WindRig>;
  readonly handsRigs: Map<PlayerModel, HandsRig>;
  readonly choirRigs: Map<PlayerModel, ChoirRig>;
  readonly percussionRigs: Map<PlayerModel, PercussionRig>;
}

/**
 * Gives the value of a key from a cache, and makes the value one time.
 *
 * @param cache The cache.
 * @param key The key.
 * @param make Makes the value of a key that is not in the cache.
 * @returns The value.
 */
function cached<K, V>(cache: Map<K, V>, key: K, make: () => V): V {
  let value = cache.get(key);
  if (value === undefined) {
    value = make();
    cache.set(key, value);
  }
  return value;
}

/**
 * Gives the player model of a kind of player, and builds it one time.
 *
 * @param caches The caches of the score.
 * @param species The species.
 * @param instrument The instrument.
 * @param kettles The kettle count of the timpani.
 * @returns The model.
 */
function modelOf(
  caches: PlanCaches,
  species: SpeciesId,
  instrument: InstrumentId,
  kettles: KettleCount,
): PlayerModel {
  return cached(caches.models, `${species} ${instrument} ${kettles}`, () =>
    buildPlayer(species, instrument, kettles),
  );
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
export function lookAngles(
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
function notesOfPlayers(score: Score, layout: SceneLayout, loudness: Float32Array): PlayerNotes[] {
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
 * Calculates the note layer of one player from its notes (design 5.3).
 *
 * @param caches The caches of the score.
 * @param model The player model.
 * @param instrument The instrument of the player.
 * @param own The notes of the player, with their loudness.
 * @param amplitude The seeded amplitude of the player.
 * @returns The note layer of the motion family of the instrument.
 */
function noteLayerOf(
  caches: PlanCaches,
  model: PlayerModel,
  instrument: InstrumentId,
  own: PlayerNotes,
  amplitude: number,
): NoteLayer {
  if (isInFamily(instrument, ['bowed'])) {
    const rig = cached(caches.bowedRigs, model, () => bowedRig(model, instrument));
    const tuning = TUNINGS[instrument];
    const strokes = buildStrokes(own.notes, own.loudness, rig.bowRange, amplitude, tuning);
    return { family: 'bowed', rig, strokes, starts: Float64Array.from(strokes, (s) => s.start) };
  }
  if (isInFamily(instrument, ['woodwind', 'brass'])) {
    const rig = cached(caches.windRigs, model, () => windRig(model, instrument));
    return {
      family: MOTION_FAMILIES[instrument],
      rig,
      track: buildWindTrack(own.notes, rig.hold.fingering, rig.hold.fundamental),
    };
  }
  if (isInFamily(instrument, ['keyboard', 'harp'])) {
    const rig = cached(caches.handsRigs, model, () => handsRig(model, instrument));
    const { left, right } = handTracks(rig, own.notes, own.loudness, amplitude);
    return { family: MOTION_FAMILIES[instrument], rig, left, right };
  }
  if (isInFamily(instrument, ['choir'])) {
    const rig = cached(caches.choirRigs, model, () => choirRig(model));
    return { family: 'choir', rig, track: buildChoirTrack(own.notes, own.loudness, amplitude) };
  }
  if (isInFamily(instrument, ['percussion'])) {
    const rig = cached(caches.percussionRigs, model, () => percussionRig(model, instrument));
    return {
      family: 'percussion',
      rig,
      ...percussionTracks(rig, own.notes, own.loudness, amplitude),
    };
  }
  throw new Error(`The ${instrument} is not the instrument of a player.`);
}

/**
 * Calculates the note layer of the conductor (design 5.4): the beats of the baton, and the cues
 * of the left hand with the places of the cued seats.
 *
 * @param score The score.
 * @param layout The layout of the score.
 * @param bear The model of the conductor.
 * @param loudness The loudness of each note of the score.
 * @returns The note layer.
 */
function conductorLayer(
  score: Score,
  layout: SceneLayout,
  bear: PlayerModel,
  loudness: Float32Array,
): ConductorLayer {
  const { position, facing } = layout.conductor;
  const cues = findCues(
    score.beats,
    score.notes,
    score.seats.length,
    (seat) => (score.seats[seat]?.playerCount ?? 0) > 0,
  );
  const targets = cues.map((cue): Vec3 => {
    const places = layout.players.filter((p) => p.cast.seatIndex === cue.seatIndex);
    const sum = places.reduce((a, p): Vec3 => add(a, p.position), [0, 0, 0]);
    const middle = scale(sum, 1 / Math.max(1, places.length));
    return turnY(sub(middle, position), -facing);
  });
  return {
    family: 'conductor',
    rig: conductorRig(bear),
    baton: buildBatonTrack(score.beats, score.notes, loudness),
    cues: {
      starts: Float64Array.from(cues, (c) => c.start),
      seats: Int32Array.from(cues, (c) => c.seatIndex),
      targets,
    },
  };
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
  const caches: PlanCaches = {
    models: new Map(),
    bowedRigs: new Map(),
    windRigs: new Map(),
    handsRigs: new Map(),
    choirRigs: new Map(),
    percussionRigs: new Map(),
  };
  const bear = modelOf(caches, CONDUCTOR.species, CONDUCTOR.instrument, 4);
  const bearHead = turnY(
    bear.skeleton.positions[boneIndex('head')] ?? [0, 0, 0],
    layout.conductor.facing,
  );
  const at = layout.conductor.position;
  const conductorHead: Vec3 = [at[0] + bearHead[0], at[1] + bearHead[1], at[2] + bearHead[2]];

  const loudness = noteLoudness(score);
  const notes = notesOfPlayers(score, layout, loudness);
  const players = layout.players.map((place, index): PlayerPlan => {
    const { cast } = place;
    const model = modelOf(caches, cast.species, cast.instrument, cast.kettles);
    const playerSeed = mixHash(seed, index);
    const next = mulberry32(playerSeed);
    const timeOffset = (next() * 2 - 1) * PLAYER_OFFSETS.timeSec;
    const amplitude = 1 + (next() * 2 - 1) * PLAYER_OFFSETS.amplitude;
    const own = notes[index] ?? { notes: [], loudness: [] };
    const [lookYaw, lookPitch] = lookAngles(
      model.skeleton,
      place.position,
      place.facing,
      conductorHead,
    );
    return {
      seatIndex: cast.seatIndex,
      instrument: cast.instrument,
      skeleton: model.skeleton,
      timeOffset,
      amplitude,
      idle: idleParams(mixHash(playerSeed, 1)),
      lookYaw,
      lookPitch,
      passages: buildPassages(own.notes, own.loudness),
      note: noteLayerOf(caches, model, cast.instrument, own, amplitude),
    };
  });

  const conductorSeed = mixHash(seed, -1);
  return {
    players,
    conductor: {
      seatIndex: -1,
      instrument: CONDUCTOR.instrument,
      skeleton: bear.skeleton,
      timeOffset: 0,
      amplitude: 1,
      idle: idleParams(mixHash(conductorSeed, 1)),
      lookYaw: 0,
      lookPitch: 0,
      passages: buildPassages([], []),
      note: conductorLayer(score, layout, bear, loudness),
    },
    beats: Float64Array.from(score.beats, (b) => b.timeSec),
  };
}
