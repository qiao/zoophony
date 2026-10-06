import { Vector3 } from 'three';

import { CONDUCTOR } from '../models/cast.ts';
import type { ConductorPlace, PlayerPlace, SceneLayout } from '../models/layout.ts';
import { ModelCache } from '../models/model-cache.ts';
import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { Skeleton } from '../models/rig.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import { toVec3 } from '../models/tuples.ts';
import type { Vec3 } from '../models/tuples.ts';
import type { Beat, PlayerNote, Score } from '../score/types.ts';
import { bowedRig } from './bowed-rig.ts';
import type { BowedRig } from './bowed-rig.ts';
import { choirRig } from './choir.ts';
import { conductorRig } from './conductor.ts';
import type { ConductorRig } from './conductor.ts';
import { buildBatonTrack } from './conductor-notes.ts';
import type { BatonTrack } from './conductor-notes.ts';
import { CUE_MOTION, findCues } from './cues.ts';
import type { CueSeat, CueTrack } from './cues.ts';
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
import { percussionTracks } from './percussion.ts';
import { percussionRig } from './percussion-rig.ts';
import type { PercussionRig } from './percussion-rig.ts';
import { mixHash, mulberry32 } from './random.ts';
import { FULL_PHASE, restPhase } from './rest.ts';
import type { RestPhase } from './rest.ts';
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
  /**
   * The seeded part of the lift and of the lowering of the instruments in which the player moves
   * (design 5.2, 5.5). The conductor has {@link FULL_PHASE}.
   */
  readonly rest: RestPhase;
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

/** The rigs of the player models of one score. Players of one kind share them. */
export interface RigCache {
  readonly bowedRigs: Map<PlayerModel, BowedRig>;
  readonly windRigs: Map<PlayerModel, WindRig>;
  readonly handsRigs: Map<PlayerModel, HandsRig>;
  readonly choirRigs: Map<PlayerModel, ChoirRig>;
  readonly percussionRigs: Map<PlayerModel, PercussionRig>;
}

/**
 * Makes an empty rig cache.
 *
 * @returns The cache.
 */
export function createRigCache(): RigCache {
  return {
    bowedRigs: new Map(),
    windRigs: new Map(),
    handsRigs: new Map(),
    choirRigs: new Map(),
    percussionRigs: new Map(),
  };
}

/** The inputs of the plan of one player. A page with no `Score`, such as the gallery, gives them. */
export interface PlayerInputs {
  readonly model: PlayerModel;
  /** The place of the player on the stage, with its seat and its instrument. */
  readonly place: PlayerPlace;
  /** The notes of the player, sorted by start. */
  readonly notes: readonly PlayerNote[];
  /** The loudness of each note, from 0 to 1, in the order of `notes` (design 5.3). */
  readonly loudness: readonly number[];
  /** The point that the head turns to in the idle looks: the head of the conductor (5.1). */
  readonly lookTarget: Vec3;
}

/** The inputs of the plan of the conductor (design 5.4). */
export interface ConductorInputs {
  readonly model: PlayerModel;
  readonly place: ConductorPlace;
  /** The conducted beats, sorted by time. */
  readonly beats: readonly Beat[];
  /** All notes, sorted by start. */
  readonly notes: readonly PlayerNote[];
  /** The loudness of each note, in the order of `notes`. */
  readonly loudness: ArrayLike<number>;
  /** The number of seats. */
  readonly seatCount: number;
  /** The places of the players. A cue turns to the middle of the players of its seats. */
  readonly players: readonly PlayerPlace[];
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

/** The axis of the facing of a player. A positive turn turns -z toward -x. */
const Y_AXIS = new Vector3(0, 1, 0);

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
  const head = new Vector3(...(skeleton.positions[boneIndex('head')] ?? [0, 0, 0]));
  const local = new Vector3(...target)
    .sub(new Vector3(...position))
    .sub(head.applyAxisAngle(Y_AXIS, facing))
    .applyAxisAngle(Y_AXIS, -facing);
  const yaw = Math.atan2(-local.x, -local.z);
  const pitch = Math.atan2(local.y, Math.hypot(local.x, local.z));
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
 * @param rigs The rigs of the score.
 * @param model The player model.
 * @param instrument The instrument of the player.
 * @param notes The notes of the player, sorted by start.
 * @param loudness The loudness of each note.
 * @param amplitude The seeded amplitude of the player.
 * @returns The note layer of the motion family of the instrument.
 */
function noteLayerOf(
  rigs: RigCache,
  model: PlayerModel,
  instrument: InstrumentId,
  notes: readonly PlayerNote[],
  loudness: readonly number[],
  amplitude: number,
): NoteLayer {
  if (isInFamily(instrument, ['bowed'])) {
    const rig = cached(rigs.bowedRigs, model, () => bowedRig(model, instrument));
    const tuning = TUNINGS[instrument];
    const strokes = buildStrokes(notes, loudness, rig.bowRange, amplitude, tuning);
    return { family: 'bowed', rig, strokes, starts: Float64Array.from(strokes, (s) => s.start) };
  }
  if (isInFamily(instrument, ['woodwind', 'brass'])) {
    const rig = cached(rigs.windRigs, model, () => windRig(model, instrument));
    return {
      family: MOTION_FAMILIES[instrument],
      rig,
      track: buildWindTrack(notes, rig.hold.fingering, rig.hold.fundamental),
    };
  }
  if (isInFamily(instrument, ['keyboard', 'harp'])) {
    const rig = cached(rigs.handsRigs, model, () => handsRig(model, instrument));
    const { left, right } = handTracks(rig, notes, loudness, amplitude);
    return { family: MOTION_FAMILIES[instrument], rig, left, right };
  }
  if (isInFamily(instrument, ['choir'])) {
    const rig = cached(rigs.choirRigs, model, () => choirRig(model));
    return { family: 'choir', rig, track: buildChoirTrack(notes, loudness, amplitude) };
  }
  if (isInFamily(instrument, ['percussion'])) {
    const rig = cached(rigs.percussionRigs, model, () => percussionRig(model, instrument));
    return {
      family: 'percussion',
      rig,
      ...percussionTracks(rig, notes, loudness, amplitude),
    };
  }
  throw new Error(`The ${instrument} is not the instrument of a player.`);
}

/**
 * Calculates the data of one player that the pose needs at each frame (design 5.1, 5.3): the
 * seeded offsets, the seeded rest phase (5.2), the idle values, the look at the conductor, the
 * passages, and the note layer. Pure: the same inputs give the same plan.
 *
 * @param inputs The model, the place, and the notes of the player.
 * @param seed The seed of the player. `preparePoses()` mixes the seed of the scene with the index
 *   of the player.
 * @param rigs The rigs of the score, which the players of one model share. A new cache by default.
 * @returns The plan of the player.
 */
export function preparePlayer(
  inputs: PlayerInputs,
  seed: number,
  rigs = createRigCache(),
): PlayerPlan {
  const { model, place, notes, loudness } = inputs;
  const next = mulberry32(seed);
  const timeOffset = (next() * 2 - 1) * PLAYER_OFFSETS.timeSec;
  const amplitude = 1 + (next() * 2 - 1) * PLAYER_OFFSETS.amplitude;
  const rest = restPhase(next);
  const [lookYaw, lookPitch] = lookAngles(
    model.skeleton,
    place.position,
    place.facing,
    inputs.lookTarget,
  );
  return {
    seatIndex: place.cast.seatIndex,
    instrument: place.cast.instrument,
    skeleton: model.skeleton,
    timeOffset,
    amplitude,
    rest,
    idle: idleParams(mixHash(seed, 1)),
    lookYaw,
    lookPitch,
    passages: buildPassages(notes, loudness),
    note: noteLayerOf(rigs, model, place.cast.instrument, notes, loudness, amplitude),
  };
}

/**
 * Gives the place of the head of the conductor on the stage, for the looks of the players.
 *
 * @param model The model of the conductor.
 * @param place The place of the conductor.
 * @returns The point of the `head` bone in the bind pose.
 */
export function conductorHead(model: PlayerModel, place: ConductorPlace): Vec3 {
  return toVec3(
    new Vector3(...(model.skeleton.positions[boneIndex('head')] ?? [0, 0, 0]))
      .applyAxisAngle(Y_AXIS, place.facing)
      .add(new Vector3(...place.position)),
  );
}

/**
 * Gives the seats of a score as the cues see them (design 5.4): the motion family of each seat,
 * its players, and the middle of their eyes in the model axes of the conductor.
 *
 * @param place The place of the conductor.
 * @param players The places of the players.
 * @param seatCount The number of seats.
 * @returns One entry for each seat, `null` for a seat with no players.
 */
function cueSeats(
  place: ConductorPlace,
  players: readonly PlayerPlace[],
  seatCount: number,
): (CueSeat | null)[] {
  return Array.from({ length: seatCount }, (_, seat): CueSeat | null => {
    const own = players.filter((p) => p.cast.seatIndex === seat);
    const first = own[0];
    if (!first) {
      return null;
    }
    const middle = new Vector3();
    for (const p of own) {
      middle.add(new Vector3(...p.position));
    }
    middle.multiplyScalar(1 / own.length).sub(new Vector3(...place.position));
    middle.y += CUE_MOTION.eyeHeight;
    return {
      family: MOTION_FAMILIES[first.cast.instrument],
      players: own.length,
      center: toVec3(middle.applyAxisAngle(Y_AXIS, -place.facing)),
    };
  });
}

/**
 * Calculates the data of the conductor that the pose needs at each frame (design 5.4): the beats
 * of the baton, and the cues with the turns to the cued seats. The conductor
 * has no timing offset, no look, and the full rest phase. Pure: the same inputs give the same
 * plan.
 *
 * @param inputs The model, the place, the beats, and the notes of the score.
 * @param seed The seed of the conductor.
 * @returns The plan of the conductor.
 */
export function prepareConductor(inputs: ConductorInputs, seed: number): PlayerPlan {
  const { model, place, beats, notes, loudness, players } = inputs;
  const rig = conductorRig(model);
  const baton = buildBatonTrack(beats, notes, loudness);
  const cues = findCues({
    beats,
    notes,
    loudness,
    seats: cueSeats(place, players, inputs.seatCount),
    eyes: model.skeleton.positions[boneIndex('head')] ?? [0, 0, 0],
    shoulder: rig.left.bind.shoulder,
    baton,
  });
  return {
    seatIndex: -1,
    instrument: CONDUCTOR.instrument,
    skeleton: model.skeleton,
    timeOffset: 0,
    amplitude: 1,
    rest: FULL_PHASE,
    idle: idleParams(mixHash(seed, 1)),
    lookYaw: 0,
    lookPitch: 0,
    passages: buildPassages([], []),
    note: {
      family: 'conductor',
      rig,
      baton,
      cues,
    },
  };
}

/**
 * Calculates the data of a score that the pose needs at each frame (design 5.1): the plan of each
 * player and of the conductor. Pure: the same inputs give the same plan.
 *
 * @param score The score.
 * @param layout The layout of the score, from `layoutScene()`.
 * @param seed The seed of the scene.
 * @param models The player models of the score, which the layout and the scene can share. A new
 *   cache by default.
 * @returns The plan for `poseAt()`.
 */
export function preparePoses(
  score: Score,
  layout: SceneLayout,
  seed: number,
  models = new ModelCache(),
): PosePlan {
  const rigs = createRigCache();
  const bear = models.get(CONDUCTOR.species, CONDUCTOR.instrument);
  const lookTarget = conductorHead(bear, layout.conductor);
  const loudness = noteLoudness(score);
  const notes = notesOfPlayers(score, layout, loudness);
  const players = layout.players.map((place, index): PlayerPlan => {
    const { cast } = place;
    const own = notes[index] ?? { notes: [], loudness: [] };
    return preparePlayer(
      {
        model: models.get(cast.species, cast.instrument, cast.kettles),
        place,
        notes: own.notes,
        loudness: own.loudness,
        lookTarget,
      },
      mixHash(seed, index),
      rigs,
    );
  });
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
    mixHash(seed, -1),
  );
  return { players, conductor, beats: Float64Array.from(score.beats, (b) => b.timeSec) };
}
