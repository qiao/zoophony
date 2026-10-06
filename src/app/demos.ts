import { spokenTime } from './time-text.ts';

/**
 * The hash ids of the six demos, in the order of the demo list (design 8.2). The first one is the
 * default demo.
 */
export const DEMO_IDS = [
  'boulanger-matin',
  'beethoven-9',
  'mozart-k525',
  'bach-bwv1048',
  'beethoven-8',
  'mozart-k315',
] as const;

/** The hash id of one demo (design 8.2). */
export type DemoId = (typeof DEMO_IDS)[number];

/**
 * The default demo: the first demo of the list. The first screen shows it, and it is part of the
 * first download (design 2.2, 7.2).
 */
export const DEFAULT_DEMO: DemoId = DEMO_IDS[0];

/** The texts and the length of one demo (design 8.2). */
export interface DemoInfo {
  /**
   * The title of the piece at the top left of the page and in the demo list, in one pattern:
   * "{work}, {catalogue number}: {movement}" (audit 2026-10-05-ux-design, CP2).
   */
  readonly title: string;
  readonly composer: string;
  /** The credit line of the credits section. */
  readonly credit: string;
  /** The song length in whole seconds, from `wholeSeconds()` of `app/time-text.ts`. */
  readonly lengthSec: number;
}

/** The texts and the length of each demo (design 8.2). */
export const DEMOS = {
  'boulanger-matin': {
    title: "D'un matin de printemps",
    composer: 'Lili Boulanger',
    credit: 'Score: OpenScore Orchestra, CC0. MIDI file made with MuseScore 4.',
    lengthSec: 280,
  },
  'beethoven-9': {
    title: 'Symphony No. 9, Op. 125: Ode to Joy',
    composer: 'Ludwig van Beethoven',
    credit:
      'Score: OpenScore Orchestra, CC0. Bars 216 to 330 of the finale. MIDI file made with MuseScore 4.',
    lengthSec: 193,
  },
  'mozart-k525': {
    title: 'Eine kleine Nachtmusik, K. 525: I',
    composer: 'Wolfgang Amadeus Mozart',
    credit: 'Score: Mutopia Project, piece 2230, public domain. Typeset by Mike Blackstock.',
    lengthSec: 248,
  },
  'bach-bwv1048': {
    title: 'Brandenburg Concerto No. 3, BWV 1048: I',
    composer: 'Johann Sebastian Bach',
    credit: 'Score: OpenScore Orchestra, CC0. MIDI file made with MuseScore 4.',
    lengthSec: 327,
  },
  'beethoven-8': {
    title: 'Symphony No. 8, Op. 93: II',
    composer: 'Ludwig van Beethoven',
    credit: 'Score: OpenScore Orchestra, CC0. MIDI file made with MuseScore 4.',
    lengthSec: 220,
  },
  'mozart-k315': {
    title: 'Andante in C, K. 315',
    composer: 'Wolfgang Amadeus Mozart',
    credit: 'Score: Mutopia Project, piece 344, public domain. Typeset by Maurizio Tomasi.',
    lengthSec: 255,
  },
} as const satisfies Readonly<Record<DemoId, DemoInfo>>;

/**
 * Gives the `aria-label` of the row of a demo in the demo list (design 2.8): the title, the
 * composer, and the spoken length. A screen reader reads the texts of the row with no pause
 * between them, for example "printemps4:40Lili".
 *
 * @param id The demo.
 * @returns The label, for example "Symphony No. 8, Op. 93: II, Ludwig van Beethoven, 3 minutes 40
 *   seconds".
 */
export function demoRowLabel(id: DemoId): string {
  const demo = DEMOS[id];
  return `${demo.title}, ${demo.composer}, ${spokenTime(demo.lengthSec)}`;
}

/**
 * Finds if a text is the hash id of a demo.
 *
 * @param value The text.
 * @returns True for one of {@link DEMO_IDS}.
 */
export function isDemoId(value: string): value is DemoId {
  return DEMO_IDS.some((id) => id === value);
}

/**
 * Gives the URL of the file of a demo in the site (design 8.3).
 *
 * @param id The demo.
 * @param base The base URL of the site, with a slash at the end.
 * @returns The URL of `demos/<id>.mid`.
 */
export function demoUrl(id: DemoId, base: string): string {
  return `${base}demos/${id}.mid`;
}

/**
 * The id of `perf-60.mid`, the file of the frame target (design 9.5, 9.7). Only the dev server
 * shows it, with the section size "One per part". `tools/write-perf-60.ts` writes it into
 * `perf/`, which the build does not copy into `dist/`.
 */
export const PERF_60 = 'perf-60';

/** A file that the stage can show: a demo, or `perf-60.mid` on the dev server. */
export type StageFile = DemoId | typeof PERF_60;

/**
 * Selects the file of the URL hash `#demo=<id>` (design 2.2). Only on the dev server,
 * `#demo=perf-60` gives `perf-60.mid` (9.5).
 *
 * @param hash The hash of the URL, for example `#demo=beethoven-9`, or '' for none.
 * @param devServer True on the dev server.
 * @returns The file of the hash, or the default demo for a missing or unknown id.
 */
export function fileFromHash(hash: string, devServer: boolean): StageFile {
  const value = new URLSearchParams(hash.replace(/^#/u, '')).get('demo') ?? '';
  if (devServer && value === PERF_60) {
    return PERF_60;
  }
  return isDemoId(value) ? value : DEFAULT_DEMO;
}

/**
 * Gives the URL hash of a demo (design 2.2).
 *
 * @param id The demo.
 * @returns The hash, for example `#demo=beethoven-9`.
 */
export function demoHash(id: DemoId): string {
  return `#demo=${id}`;
}

/**
 * Selects the demo of the URL query `?demo=<id>` of the spike page (design 7.1). The app page
 * uses the URL hash ({@link fileFromHash}).
 *
 * @param search The query of the URL, for example `?demo=beethoven-9`.
 * @param fallback The demo for a missing or unknown id.
 * @returns The demo of the query, or the fallback.
 */
export function demoFromQuery(search: string, fallback: DemoId = DEFAULT_DEMO): DemoId {
  const value = new URLSearchParams(search).get('demo') ?? '';
  return isDemoId(value) ? value : fallback;
}
