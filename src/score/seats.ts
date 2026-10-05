import { programPlace, sectionByPitch } from './program-map.ts';
import type { ProgramPlace } from './program-map.ts';
import type { Note, Timeline } from './timeline.ts';
import type { Seat, SectionId } from './types.ts';

/** The sections in the order of `SectionId`, which is the order of the seats (design 3.2). */
export const SECTION_ORDER: readonly SectionId[] = [
  'violin',
  'viola',
  'cello',
  'contrabass',
  'harp',
  'piano',
  'flute',
  'oboe',
  'clarinet',
  'bassoon',
  'horn',
  'trumpet',
  'trombone',
  'tuba',
  'timpani',
  'percussion',
  'choir',
  'sound-only',
];

/** The place of a note: a fixed section, or the pitch bands that divide it (design 3.5). */
type NotePlace = Exclude<ProgramPlace, { readonly kind: 'channel' }>;

/** The place of a note that the string bands divide by pitch. */
const STRINGS: NotePlace = { kind: 'divided', bands: 'strings' };

/** A seat before the player allocation of design 3.8: all fields except the player count. */
export type SeatPlan = Omit<Seat, 'playerCount'>;

/** The seats of a file and the seat of each note (design 3.7). */
export interface Seating {
  /** Ordered by the order of `SectionId`, then by the first (port, channel) of each seat. */
  readonly seats: readonly SeatPlan[];
  /**
   * The index in `seats` of each note of `Timeline.notes`, in the same order. The notes of the
   * sound-only seat have a seat too.
   */
  readonly noteSeats: readonly number[];
}

/**
 * Gives each note a section and a seat (design 3.5 to 3.7). The seat key is (port, channel,
 * section). Thus a program change inside a section keeps the seat, and a program change to
 * another section starts a new seat.
 *
 * @param timeline The notes of the file.
 * @returns The seats in the order of design 3.2, and the seat of each note.
 */
export function assignSeats(timeline: Timeline): Seating {
  const notes = timeline.notes;
  const sections = noteSections(notes);
  const keys = notes.map((note, i) => seatKey(note, sections[i] ?? 'sound-only'));
  const groups = new Map<number, SeatGroup>();
  notes.forEach((note, i) => {
    const key = keys[i] ?? 0;
    let group = groups.get(key);
    if (!group) {
      group = { section: sections[i] ?? 'sound-only', sources: new Set(), programs: [] };
      groups.set(key, group);
    }
    group.sources.add(note.port * 16 + note.channel);
    if (!group.programs.includes(note.program)) {
      group.programs.push(note.program);
    }
  });
  const ordered = [...groups.entries()]
    .map(([key, group]) => ({ key, group, first: Math.min(...group.sources) }))
    .toSorted(
      (a, b) =>
        SECTION_ORDER.indexOf(a.group.section) - SECTION_ORDER.indexOf(b.group.section) ||
        a.first - b.first,
    );
  const seatOfKey = new Map(ordered.map((item, i) => [item.key, i]));
  const counts = new Map<SectionId, number>();
  const seats = ordered.map(({ group }): SeatPlan => {
    const indexInSection = counts.get(group.section) ?? 0;
    counts.set(group.section, indexInSection + 1);
    return {
      section: group.section,
      sources: [...group.sources]
        .toSorted((a, b) => a - b)
        .map((synthChannel) => ({
          port: Math.floor(synthChannel / 16),
          channel: synthChannel % 16,
        })),
      indexInSection,
      programs: group.programs,
    };
  });
  return { seats, noteSeats: keys.map((key) => seatOfKey.get(key) ?? 0) };
}

/** The notes of one seat while the seats form. */
interface SeatGroup {
  readonly section: SectionId;
  /** The synth channels (`port * 16 + channel`) of the notes. */
  readonly sources: Set<number>;
  /** The programs of the notes, in the order of first use. */
  readonly programs: number[];
}

/** The sections that have one seat for all channels. */
const ONE_SEAT: ReadonlySet<SectionId> = new Set<SectionId>(['sound-only']);

/**
 * Makes one number of the seat key (port, channel, section) of design 3.7. A section with one
 * seat for all channels gets a negative key with no channel: the sound-only seat holds all notes
 * of the programs with no animal (3.5).
 */
function seatKey(note: Note, section: SectionId): number {
  const index = SECTION_ORDER.indexOf(section);
  if (ONE_SEAT.has(section)) {
    return -1 - index;
  }
  return (note.port * 16 + note.channel) * SECTION_ORDER.length + index;
}

/** Finds the section of each note with the program map of design 3.5. */
function noteSections(notes: readonly Note[]): SectionId[] {
  const places = channelPlaces(notes);
  return notes.map((note, i) => {
    const place = places[i] ?? STRINGS;
    return place.kind === 'section' ? place.section : sectionByPitch(place.bands, note.pitch);
  });
}

/**
 * Finds the place of each note, with the rule for the programs 44 and 45 (design 3.5). A note of
 * 44 or 45 takes the place of the last earlier note of another program on its channel. If there
 * is none, it takes the place of the next later such note. If there is none, the string bands
 * divide it by pitch. They also divide it if that other note divides by pitch.
 */
function channelPlaces(notes: readonly Note[]): NotePlace[] {
  const places = notes.map((note) => programPlace(note.program));
  const channels = new Map<number, number[]>();
  notes.forEach((note, i) => {
    const synthChannel = note.port * 16 + note.channel;
    const list = channels.get(synthChannel);
    if (list) {
      list.push(i);
    } else {
      channels.set(synthChannel, [i]);
    }
  });
  const resolved = new Map<number, NotePlace>();
  for (const list of channels.values()) {
    for (const order of [list, list.toReversed()]) {
      let other: NotePlace | undefined;
      for (const i of order) {
        const place = places[i];
        if (place && place.kind !== 'channel') {
          other = place;
        } else if (other && !resolved.has(i)) {
          resolved.set(i, other.kind === 'divided' ? STRINGS : other);
        }
      }
    }
  }
  return places.map((place, i) =>
    place.kind === 'channel' ? (resolved.get(i) ?? STRINGS) : place,
  );
}
