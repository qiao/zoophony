import { speciesOf } from '../models/cast.ts';
import { SPECIES } from '../models/species.ts';
import type { SpeciesId } from '../models/species.ts';
import type { Seat, SectionId } from '../score/types.ts';

/** The name of each section in the seat list (design 2.8). */
export const SECTION_NAMES = {
  violin: 'Violins',
  viola: 'Violas',
  cello: 'Cellos',
  contrabass: 'Contrabasses',
  harp: 'Harp',
  piano: 'Piano',
  flute: 'Flutes',
  oboe: 'Oboes',
  clarinet: 'Clarinets',
  bassoon: 'Bassoons',
  horn: 'Horns',
  trumpet: 'Trumpets',
  trombone: 'Trombones',
  tuba: 'Tuba',
  timpani: 'Timpani',
  percussion: 'Percussion',
  choir: 'Choir',
  'sound-only': 'Other sounds',
} as const satisfies Readonly<Record<SectionId, string>>;

/**
 * The name of each section for a seat with one player (design 2.8, audit 2026-10-06-ux-design-2,
 * N20). One singer of the choir is a voice. The names of the other sections stay the same.
 */
const SECTION_SINGULARS = {
  ...SECTION_NAMES,
  violin: 'Violin',
  viola: 'Viola',
  cello: 'Cello',
  contrabass: 'Contrabass',
  flute: 'Flute',
  oboe: 'Oboe',
  clarinet: 'Clarinet',
  bassoon: 'Bassoon',
  horn: 'Horn',
  trumpet: 'Trumpet',
  trombone: 'Trombone',
  choir: 'Voice',
} as const satisfies Readonly<Record<SectionId, string>>;

/**
 * The name of a seat of the section "piano" after its first program (design 2.8, audit
 * 2026-10-05-ux-design, DR2): the section holds the pianos, the celesta, and the organs (3.5).
 * Each entry gives the highest program of a group of GM programs. The piano model stays.
 */
const KEYBOARD_NAMES: readonly (readonly [number, string])[] = [
  [5, 'Piano'],
  [6, 'Harpsichord'],
  [7, 'Clavinet'],
  [8, 'Celesta'],
  [20, 'Organ'],
  [21, 'Accordion'],
  [22, 'Harmonica'],
  [23, 'Accordion'],
];

/**
 * Gives the name of a seat of the section "piano" after its first program.
 *
 * @param program The first program of the seat, or undefined for none.
 * @returns For example "Celesta" for program 8, or "Piano".
 */
export function keyboardName(program: number | undefined): string {
  if (program === undefined) {
    return SECTION_NAMES.piano;
  }
  return KEYBOARD_NAMES.find(([last]) => program <= last)?.[1] ?? SECTION_NAMES.piano;
}

/**
 * Joins the items of a list (design 2.8): "a", "a and b", or "a, b, and c".
 *
 * @param items The items.
 * @returns The text of the list.
 */
export function listText(items: readonly string[]): string {
  if (items.length <= 2) {
    return items.join(' and ');
  }
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

/**
 * Gives the name of each seat in the seat list (design 2.8). A seat of the section "piano" takes
 * the name of its first program, for example "Celesta". A seat with one player takes the
 * singular, for example "Flute", and the soloist that does not play a keyboard is "Solo flute"
 * (audit 2026-10-06-ux-design-2, N20). If more than one seat of a section has a name, the name
 * gets the number of the seat in that section, from 1: "Violins 1", "Violin 2". The soloist gets
 * no number.
 *
 * @param seats The seats of a score, `Score.seats`.
 * @param counts The number of players of each seat, from {@link playerCounts}.
 * @param soloist The seat of the soloist, `Score.soloist`, or `null` for none.
 * @returns One name for each seat, in the order of the seats.
 */
export function seatNames(
  seats: readonly Seat[],
  counts: readonly number[],
  soloist: number | null,
): string[] {
  const keys = seats.map((seat) =>
    seat.section === 'piano' ? keyboardName(seat.programs[0]) : seat.section,
  );
  const solo = (i: number): boolean => i === soloist && seats[i]?.section !== 'piano';
  const sizes = new Map<string, number>();
  keys.forEach((key, i) => {
    if (!solo(i)) {
      sizes.set(key, (sizes.get(key) ?? 0) + 1);
    }
  });
  const numbers = new Map<string, number>();
  return seats.map((seat, i) => {
    const key = keys[i] ?? '';
    if (seat.section === 'piano') {
      return numbered(key, key, sizes, numbers);
    }
    const one = SECTION_SINGULARS[seat.section];
    if (solo(i)) {
      return `Solo ${one.toLowerCase()}`;
    }
    const name = counts[i] === 1 ? one : SECTION_NAMES[seat.section];
    return numbered(name, key, sizes, numbers);
  });
}

/**
 * Adds the number of a seat in its section to its name when the section has more than one seat.
 *
 * @param name The name of the seat, for example "Violins".
 * @param key The section of the seat, or the keyboard name of a seat of the section "piano".
 * @param sizes The number of named seats of each key.
 * @param numbers The last number of each key. The function writes the new number.
 * @returns For example "Violins 2", or the name alone.
 */
function numbered(
  name: string,
  key: string,
  sizes: ReadonlyMap<string, number>,
  numbers: Map<string, number>,
): string {
  if ((sizes.get(key) ?? 0) < 2) {
    return name;
  }
  const number = (numbers.get(key) ?? 0) + 1;
  numbers.set(key, number);
  return `${name} ${number}`;
}

/**
 * Gives a counted part of a source line, for example "program 40" or "programs 40 and 45".
 *
 * @param noun The noun for one item.
 * @param values The numbers.
 * @returns The part, or '' with no numbers.
 */
function countedPart(noun: string, values: readonly number[]): string {
  if (values.length === 0) {
    return '';
  }
  return `${noun}${values.length > 1 ? 's' : ''} ${listText(values.map(String))}`;
}

/**
 * Gives the part of a source line that names the ports and the channels (design 2.8). The UI
 * shows the channels as 1 to 16 and the ports from 0.
 *
 * @param sources The (port, channel) pairs of a seat, with channels from 0.
 * @returns For example "Port 0, channels 4 and 5", or "Port 0 channel 4, port 1 channel 2".
 */
function channelPart(sources: Seat['sources']): string {
  const ports = new Set(sources.map((source) => source.port));
  const [first] = sources;
  if (ports.size === 1 && first) {
    const channels = countedPart(
      'channel',
      sources.map((source) => source.channel + 1),
    );
    return `Port ${first.port}, ${channels}`;
  }
  const items = sources.map((source) => `port ${source.port} channel ${source.channel + 1}`);
  return capitalize(items.join(', '));
}

/**
 * Makes the first letter of a text upper case.
 *
 * @param text The text.
 * @returns The text with an upper case first letter.
 */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Gives the source line of a seat in the seat list (design 2.8): the ports, the channels, the
 * programs in the order of first use, and the drum kits. The sound-only seat names only its
 * programs and kits.
 *
 * @param seat The seat.
 * @returns For example "Port 0, channel 12, programs 40 and 45", or "Programs 80 and 81".
 */
export function sourceLine(seat: Seat): string {
  const parts = [countedPart('program', seat.programs), countedPart('kit', seat.kits)];
  if (seat.section !== 'sound-only') {
    parts.unshift(channelPart(seat.sources));
  }
  return capitalize(parts.filter((part) => part !== '').join(', '));
}

/** The name of each species in the seat list: one animal, and more than one (design 2.8). */
const SPECIES_NAMES = {
  rabbit: ['rabbit', 'rabbits'],
  'fox-red': ['red fox', 'red foxes'],
  'fox-tan': ['tan fox', 'tan foxes'],
  wolf: ['wolf', 'wolves'],
  elephant: ['elephant', 'elephants'],
  bear: ['bear', 'bears'],
  cat: ['cat', 'cats'],
  hippo: ['hippo', 'hippos'],
  deer: ['deer', 'deer'],
  panda: ['panda', 'pandas'],
  mouse: ['mouse', 'mice'],
  beaver: ['beaver', 'beavers'],
  dog: ['dog', 'dogs'],
  monkey: ['monkey', 'monkeys'],
  pig: ['pig', 'pigs'],
  rhino: ['rhino', 'rhinos'],
  badger: ['badger', 'badgers'],
  meerkat: ['meerkat', 'meerkats'],
  penguin: ['penguin', 'penguins'],
} as const satisfies Readonly<Record<SpeciesId, readonly [string, string]>>;

/** The animal line of the sound-only seat, which has no animal (design 2.8). */
export const NO_ANIMAL_TEXT = 'No animal';

/**
 * Gives the animal line of a seat (design 2.8, audit 2026-10-05-ux-design, DR1): the number of
 * players and their species.
 *
 * @param species The species of the seat, or `null` for the sound-only seat.
 * @param count The number of players of the seat.
 * @returns For example "5 rabbits", "1 deer", or "No animal".
 */
export function animalText(species: SpeciesId | null, count: number): string {
  if (!species || count === 0) {
    return NO_ANIMAL_TEXT;
  }
  const [one, more] = SPECIES_NAMES[species];
  return `${count} ${count === 1 ? one : more}`;
}

/**
 * Counts the players of each seat.
 *
 * @param players The players of the scene, each with the index of its seat.
 * @param seatCount The number of seats.
 * @returns The number of players of each seat, in the order of the seats.
 */
export function playerCounts(
  players: readonly { readonly seatIndex: number }[],
  seatCount: number,
): number[] {
  const counts = Array.from({ length: seatCount }, () => 0);
  for (const player of players) {
    counts[player.seatIndex] = (counts[player.seatIndex] ?? 0) + 1;
  }
  return counts;
}

/** The texts and the dot color of one row of the seat list (design 2.8). */
export interface SeatRowText {
  /** For example "Violins 1". */
  readonly name: string;
  /** The players of the seat, for example "5 rabbits" (design 2.8). */
  readonly animals: string;
  /** For example "Port 0, channel 12, programs 40 and 45". */
  readonly source: string;
  /** The fur color of the species of the seat, or `null` for the sound-only seat. */
  readonly color: string | null;
}

/**
 * Gives the rows of the seat list of a score (design 2.8): the name, the animal line, the source
 * line, and the color of the dot. The sound-only seat has no animal, so its dot has no color.
 *
 * @param seats The seats of a score, `Score.seats`.
 * @param counts The number of players of each seat, from {@link playerCounts}.
 * @param soloist The seat of the soloist, `Score.soloist`, or `null` for none.
 * @returns One row for each seat, in the order of the seats.
 */
export function seatRows(
  seats: readonly Seat[],
  counts: readonly number[],
  soloist: number | null,
): SeatRowText[] {
  const names = seatNames(seats, counts, soloist);
  return seats.map((seat, i) => {
    const species =
      seat.section === 'sound-only' ? null : speciesOf(seat.section, seat.indexInSection);
    return {
      name: names[i] ?? '',
      animals: animalText(species, counts[i] ?? 0),
      source: sourceLine(seat),
      color: species ? SPECIES[species].colors.fur : null,
    };
  });
}
