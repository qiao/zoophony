import { speciesOf } from '../models/cast.ts';
import { SPECIES } from '../models/species.ts';
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
 * the name of its first program, for example "Celesta". If more than one seat has a name, the
 * name gets the number of the seat, from 1: "Violins 1", "Violins 2".
 *
 * @param seats The seats of a score, `Score.seats`.
 * @returns One name for each seat, in the order of the seats.
 */
export function seatNames(seats: readonly Seat[]): string[] {
  const bases = seats.map((seat) =>
    seat.section === 'piano' ? keyboardName(seat.programs[0]) : SECTION_NAMES[seat.section],
  );
  const counts = new Map<string, number>();
  for (const base of bases) {
    counts.set(base, (counts.get(base) ?? 0) + 1);
  }
  const numbers = new Map<string, number>();
  return bases.map((base) => {
    if ((counts.get(base) ?? 0) < 2) {
      return base;
    }
    const number = (numbers.get(base) ?? 0) + 1;
    numbers.set(base, number);
    return `${base} ${number}`;
  });
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

/** The texts and the dot color of one row of the seat list (design 2.8). */
export interface SeatRowText {
  /** For example "Violins 1". */
  readonly name: string;
  /** For example "Port 0, channel 12, programs 40 and 45". */
  readonly source: string;
  /** The fur color of the species of the seat, or `null` for the sound-only seat. */
  readonly color: string | null;
}

/**
 * Gives the rows of the seat list of a score (design 2.8): the name, the source line, and the
 * color of the dot. The sound-only seat has no animal, so its dot has no color.
 *
 * @param seats The seats of a score, `Score.seats`.
 * @returns One row for each seat, in the order of the seats.
 */
export function seatRows(seats: readonly Seat[]): SeatRowText[] {
  const names = seatNames(seats);
  return seats.map((seat, i) => ({
    name: names[i] ?? '',
    source: sourceLine(seat),
    color:
      seat.section === 'sound-only'
        ? null
        : SPECIES[speciesOf(seat.section, seat.indexInSection)].colors.fur,
  }));
}
