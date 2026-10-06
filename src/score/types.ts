import type { MidiError } from '../midi/types.ts';

/**
 * The reasons to refuse a file (design 3.3). The UI shows the message text of design 2.8 for
 * each reason.
 */
export type FileError = MidiError | 'no-notes';

/**
 * The sections of the orchestra, in the order of the seats (design 3.2). `sound-only` holds the
 * notes of programs with no animal (3.5). Its seat has no players.
 */
export const SECTION_ORDER = [
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
] as const;

/** A section of the orchestra (design 3.2). */
export type SectionId = (typeof SECTION_ORDER)[number];

/** The way a player plays a note. The program of the note selects it (design 3.5). */
export type Technique = 'normal' | 'pizzicato' | 'tremolo';

/** One group of animals of one section (design 3.7). */
export interface Seat {
  readonly section: SectionId;
  /** The (port, channel) pairs that feed this seat. A merge (3.7) gives more than one pair. */
  readonly sources: readonly { readonly port: number; readonly channel: number }[];
  /** 0 for the first seat of its section. Selects the species variant (4.3). */
  readonly indexInSection: number;
  /** 1 to the cap of the section (3.8). 0 for the sound-only seat. */
  readonly playerCount: number;
  /** The melodic programs of the seat, in the order of first use. */
  readonly programs: readonly number[];
  /** The drum kits of the rhythm sources of the seat (3.6), in the order of first use. */
  readonly kits: readonly number[];
}

/** One note after the app gives it to one player (design 3.2). */
export interface PlayerNote {
  readonly seatIndex: number;
  /** 0 is the principal player of the seat. */
  readonly player: number;
  /** MIDI key, 0 to 127. */
  readonly pitch: number;
  /** 1 to 127. */
  readonly velocity: number;
  /** Seconds, after the tempo map. */
  readonly startSec: number;
  /** Seconds, at key release. The sustain pedal does not change this value. */
  readonly endSec: number;
  readonly technique: Technique;
  /**
   * `port * 16 + channel` of the note on (3.4). A merged seat has notes of more than one channel,
   * and the size of a gesture reads the controllers of this channel (5.3).
   */
  readonly synthChannel: number;
}

/** One conducted beat (design 3.2, 5.4). */
export interface Beat {
  readonly timeSec: number;
  /** 0 is the downbeat of the bar. */
  readonly indexInBar: number;
  /** The number of conducted beats in this bar. */
  readonly beatsInBar: number;
  /**
   * The pattern of the baton. 'generic' is one down-up motion for each beat, larger on the
   * downbeat.
   */
  readonly pattern: 1 | 2 | 3 | 4 | 6 | 'generic';
}

/**
 * The value of the setting "Section size" (design 3.8). `auto` uses the rule for an orchestral
 * file. `one-per-part` gives one player for each simultaneous note. `full` gives the base sizes.
 */
export type SectionSize = 'auto' | 'one-per-part' | 'full';

/** All that the scene and the synth play of one file (design 3.2). */
export interface Score {
  /**
   * The time of the last note-off. The UI shows `Math.floor(durationSec + 0.001)` seconds, so
   * that a rounding error in a tempo event of the file cannot remove a second.
   */
  readonly durationSec: number;
  /**
   * The sequence name (FF 03 in the first track). It is '' if the file has none, if the name has
   * no letter, or if it is a generic name (8.2).
   */
  readonly sequenceName: string;
  /** The rules of 3.8 decide this value. */
  readonly orchestral: boolean;
  /**
   * The seat that sits at the front left of the conductor, as the soloist of a concerto (3.8,
   * 4.2): the piano seat, else the seat that clearly leads. `null` if no seat is the soloist.
   */
  readonly soloist: number | null;
  /**
   * The choir seat of the vocal soloists, such as the four soloists of the Ode to Joy (3.8). They
   * stand in front of the choir (4.5). `null` if no seat passes the rule.
   */
  readonly vocalSoloists: number | null;
  /** Ordered by the order of `SECTION_ORDER`, then by the first (port, channel). */
  readonly seats: readonly Seat[];
  /** Sorted by startSec. */
  readonly notes: readonly PlayerNote[];
  readonly beats: readonly Beat[];
  /** Sorted by timeSec. */
  readonly synthEvents: readonly SynthEvent[];
  /**
   * Presets that must load before play: the presets of the notes, in the order of first use. A
   * melodic preset has the bank of its channel at its program change. Drum kits use bank 128.
   */
  readonly presets: readonly ScorePreset[];
}

/** The result of `buildScore()`: the score, or the reason to refuse the file (design 3.3). */
export type ScoreResult =
  | { readonly ok: true; readonly score: Score }
  | { readonly ok: false; readonly error: FileError };

/** One event for the synth, in song seconds (design 3.2). There is no SysEx. */
export interface SynthEvent {
  readonly timeSec: number;
  /** portIndex * 16 + channel (3.4). */
  readonly channel: number;
  /** High nibble of the MIDI status byte. */
  readonly kind: 0x80 | 0x90 | 0xa0 | 0xb0 | 0xc0 | 0xd0 | 0xe0;
  readonly data1: number;
  readonly data2: number;
  /** The seat of a note event (sound-only notes too), or -1 for an event of a full channel. */
  readonly seatIndex: number;
}

/** A preset that must load before play (an entry of `Score.presets`, design 3.2). */
export interface ScorePreset {
  /** Drum kits use bank 128. */
  readonly bank: number;
  readonly program: number;
  readonly drumKit: boolean;
}
