import type { MidiFile } from '../midi/types.ts';

/** The MIDI default tempo: 120 quarter notes for each minute (design 3.3). */
const DEFAULT_MICROSECONDS_PER_QUARTER = 500_000;

/**
 * The tempo map of a file. It converts ticks to seconds with the tempo events of all tracks,
 * because a tempo event in any track applies to all tracks (design 3.3). Before the first tempo
 * event, the tempo is 120 BPM.
 */
export class TempoMap {
  readonly #ticksPerQuarter: number;
  /** The start tick of each segment of constant tempo, in ascending order. The first is 0. */
  readonly #ticks: number[] = [0];
  /** The start time of each segment, in seconds. */
  readonly #seconds: number[] = [0];
  /** The tempo of each segment, in microseconds for each quarter note. */
  readonly #tempos: number[] = [DEFAULT_MICROSECONDS_PER_QUARTER];

  /**
   * Builds the tempo map of a file. Of two tempo events at the same tick, the event of the later
   * track applies.
   *
   * @param file The parsed file.
   */
  constructor(file: MidiFile) {
    this.#ticksPerQuarter = file.ticksPerQuarter;
    const events = file.tracks
      .flatMap((track) => track.events)
      .filter((event) => event.type === 'tempo')
      .toSorted((a, b) => a.tick - b.tick);
    for (const event of events) {
      const last = this.#ticks.length - 1;
      if (event.tick === this.#ticks[last]) {
        this.#tempos[last] = event.microsecondsPerQuarter;
      } else {
        this.#seconds.push(this.toSeconds(event.tick));
        this.#ticks.push(event.tick);
        this.#tempos.push(event.microsecondsPerQuarter);
      }
    }
  }

  /**
   * Converts a tick to song seconds.
   *
   * @param tick Ticks from the start of the file, at least 0.
   * @returns The song time in seconds.
   */
  toSeconds(tick: number): number {
    const i = this.#segment(tick);
    const start = this.#ticks[i] ?? 0;
    const seconds = this.#seconds[i] ?? 0;
    const tempo = this.#tempos[i] ?? DEFAULT_MICROSECONDS_PER_QUARTER;
    return seconds + ((tick - start) * tempo) / (this.#ticksPerQuarter * 1_000_000);
  }

  /**
   * Gives the tempo at a tick.
   *
   * @param tick Ticks from the start of the file, at least 0.
   * @returns Microseconds for each quarter note.
   */
  tempoAt(tick: number): number {
    return this.#tempos[this.#segment(tick)] ?? DEFAULT_MICROSECONDS_PER_QUARTER;
  }

  /** Finds the last segment that starts at or before a tick, with a binary search. */
  #segment(tick: number): number {
    let low = 0;
    let high = this.#ticks.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if ((this.#ticks[middle] ?? 0) <= tick) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    return low;
  }
}
