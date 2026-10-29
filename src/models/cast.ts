import { PERCUSSION_PARTS, RHYTHM_CHANNEL, drumPart } from '../score/drum-map.ts';
import type { PercussionPart } from '../score/drum-map.ts';
import type { Score, Seat, SectionId } from '../score/types.ts';
import type { SpeciesId } from './species.ts';
import { kettleCount } from './instruments/percussion.ts';
import type { KettleCount } from './instruments/percussion.ts';
import type { InstrumentId } from './instruments/types.ts';
import { supportOf } from './player.ts';
import type { Support } from './props.ts';

/** The species and the instrument of one player (design 4.3, 4.6). */
export interface PlayerCast {
  /** The index of the seat of the player in `Score.seats`. */
  readonly seatIndex: number;
  /** 0 is the principal player of the seat. */
  readonly player: number;
  readonly species: SpeciesId;
  readonly instrument: InstrumentId;
  /** The number of kettles of the timpani (design 4.6). The other instruments ignore it. */
  readonly kettles: KettleCount;
  /** The support of the player. The soloist of a wind or of a violin stands (design 4.5). */
  readonly support: Support;
}

/** The sections with players: all sections except the sound-only seat. */
export type PlayingSection = Exclude<SectionId, 'sound-only'>;

/**
 * The species of each section (design 4.3). The violin seats alternate their two variants: the
 * rabbit for the first seat, the red fox for the second seat, then the rabbit again.
 */
export const SECTION_SPECIES = {
  violin: ['rabbit', 'fox-red'],
  viola: ['cat'],
  cello: ['dog'],
  contrabass: ['hippo'],
  harp: ['deer'],
  piano: ['polar-bear'],
  flute: ['fox-tan'],
  oboe: ['mouse'],
  clarinet: ['wolf'],
  bassoon: ['beaver'],
  horn: ['pig'],
  trumpet: ['monkey'],
  trombone: ['panda'],
  tuba: ['rhino'],
  timpani: ['elephant'],
  percussion: ['badger'],
  choir: ['penguin'],
} as const satisfies Readonly<Record<PlayingSection, readonly SpeciesId[]>>;

/**
 * The instruments of the players of each section (design 4.6). A percussion seat of a rhythm
 * channel gives each player the instrument of its key group, and a percussion seat of a melodic
 * channel plays the xylophone.
 */
export const SECTION_INSTRUMENTS = {
  violin: ['violin'],
  viola: ['viola'],
  cello: ['cello'],
  contrabass: ['contrabass'],
  harp: ['harp'],
  piano: ['piano'],
  flute: ['flute'],
  oboe: ['oboe'],
  clarinet: ['clarinet'],
  bassoon: ['bassoon'],
  horn: ['horn'],
  trumpet: ['trumpet'],
  trombone: ['trombone'],
  tuba: ['tuba'],
  timpani: ['timpani'],
  percussion: ['bass-drum', 'snare-drum', 'cymbals', 'small-percussion', 'xylophone'],
  choir: ['choir-folder'],
} as const satisfies Readonly<Record<PlayingSection, readonly InstrumentId[]>>;

/** The conductor: the bear with the baton (design 4.3, 4.6). It is not a player of a seat. */
export const CONDUCTOR = { species: 'bear', instrument: 'baton' } as const satisfies {
  readonly species: SpeciesId;
  readonly instrument: InstrumentId;
};

/**
 * The largest number of players of a chamber group (design 4.2). A score with at most 5 players
 * (a solo, a duo, a trio, a quartet, or a quintet) has no conductor and no podium.
 */
export const CHAMBER_PLAYERS = 5;

/**
 * The form of a chamber group (design 4.2, 4.5):
 *
 * - `solo`: one player, at the stage center.
 * - `recital`: a pianist and one other player, who stands or sits in the crook of the piano.
 * - `arc`: two to five players in a small arc, who face each other a little.
 */
export type ChamberForm = 'solo' | 'recital' | 'arc';

/**
 * Finds the form of the chamber group of a score (design 4.2). A score with no players keeps the
 * conductor, so that the stage is not empty.
 *
 * @param seats The seats of the score, with their player counts.
 * @returns The form, or `null` for an orchestra, which has more than 5 players or none.
 */
export function chamberFormOf(seats: readonly Seat[]): ChamberForm | null {
  let players = 0;
  let keyboards = 0;
  for (const seat of seats) {
    if (seat.section !== 'sound-only') {
      players += seat.playerCount;
      keyboards += seat.section === 'piano' ? seat.playerCount : 0;
    }
  }
  if (players === 0 || players > CHAMBER_PLAYERS) {
    return null;
  }
  if (players === 1) {
    return 'solo';
  }
  return players === 2 && keyboards === 1 ? 'recital' : 'arc';
}

/** The kettles of a timpani seat with no notes. */
const DEFAULT_KETTLES: KettleCount = 4;

/**
 * Gives the species of a seat (design 4.3).
 *
 * @param section The section of the seat.
 * @param indexInSection The index of the seat in its section.
 * @returns The species.
 */
export function speciesOf(section: PlayingSection, indexInSection: number): SpeciesId {
  const variants: readonly SpeciesId[] = SECTION_SPECIES[section];
  return variants[indexInSection % variants.length] ?? variants[0] ?? 'rabbit';
}

/**
 * Finds if a seat plays a rhythm channel. Such a percussion seat has one player for each key
 * group (design 3.6, 3.8). The merge rule never mixes a rhythm channel with a melodic channel
 * (3.7).
 */
function isDrumSeat(seat: Seat): boolean {
  return seat.sources.some((source) => source.channel === RHYTHM_CHANNEL);
}

/** The facts of the notes that the cast needs, for each seat. */
interface SeatNotes {
  /** The highest key of the seat, or -1 with no notes. */
  highestKey: number;
  /** The first key group of each drum player, as an index of `PERCUSSION_PARTS`. */
  readonly drumParts: number[];
}

/**
 * Collects the highest key of each seat and the first key group of each drum player. A drum
 * player plays one key group, or the remaining groups if it is the last player (design 3.8).
 * Thus its first group in the order of 3.8 is the group of its rank. The key group of a note
 * uses the first drum kit of its seat.
 */
function collectNotes(score: Score): SeatNotes[] {
  const facts = score.seats.map((): SeatNotes => ({ highestKey: -1, drumParts: [] }));
  for (const note of score.notes) {
    const seat = score.seats[note.seatIndex];
    const fact = facts[note.seatIndex];
    if (!seat || !fact) {
      continue;
    }
    fact.highestKey = Math.max(fact.highestKey, note.pitch);
    if (isDrumSeat(seat)) {
      const found = drumPart(seat.kits[0] ?? 0, note.pitch);
      const part: PercussionPart = found === 'timpani' ? 'small-percussion' : found;
      const rank = PERCUSSION_PARTS.indexOf(part);
      fact.drumParts[note.player] = Math.min(fact.drumParts[note.player] ?? rank, rank);
    }
  }
  return facts;
}

/**
 * Gives each player of a score its species and its instrument (design 4.3, 4.6). The soloist of
 * the score stands when its instrument allows it (design 4.5). In a chamber group, the soloist
 * rule does not apply: a player alone and the partner of a pianist in a recital stand when their
 * instruments allow it, and the players of an arc sit (design 4.2).
 *
 * @param score The score.
 * @returns One entry for each player, in the order of the seats, then of the players in a seat
 *   (the order of `ScenePose.players`, design 5.1).
 */
export function castScore(score: Score): PlayerCast[] {
  const facts = collectNotes(score);
  const form = chamberFormOf(score.seats);
  const cast: PlayerCast[] = [];
  score.seats.forEach((seat, seatIndex) => {
    if (seat.section === 'sound-only') {
      return;
    }
    const section = seat.section;
    const fact = facts[seatIndex];
    const highestKey = fact?.highestKey ?? -1;
    const kettles = highestKey < 0 ? DEFAULT_KETTLES : kettleCount(highestKey);
    for (let player = 0; player < seat.playerCount; player++) {
      let instrument: InstrumentId = SECTION_INSTRUMENTS[section][0];
      if (section === 'percussion') {
        const rank = fact?.drumParts[player] ?? player;
        instrument = isDrumSeat(seat)
          ? (PERCUSSION_PARTS[rank] ?? 'small-percussion')
          : 'xylophone';
      }
      cast.push({
        seatIndex,
        player,
        species: speciesOf(section, seat.indexInSection),
        instrument,
        kettles,
        support: supportOf(instrument, form ? form !== 'arc' : seatIndex === score.soloist),
      });
    }
  });
  return cast;
}
