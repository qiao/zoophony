/**
 * The hash ids of the six demos, in the order of the demo list (design 8.2). The first one is the
 * default demo.
 */
export const DEMO_IDS = [
  'boulanger-matin',
  'beethoven-5',
  'grieg-ase',
  'mozart-k488',
  'mozart-k315',
  'handel-hallelujah',
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
  /** The title of the piece at the top left of the page. */
  readonly title: string;
  /** The shorter title of the row in the demo list. */
  readonly listTitle: string;
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
    listTitle: "D'un matin de printemps",
    composer: 'Lili Boulanger',
    credit: 'Score: OpenScore Orchestra, CC0. MIDI file made with MuseScore 4.',
    lengthSec: 280,
  },
  'beethoven-5': {
    title: 'Symphony No. 5, first movement',
    listTitle: 'Symphony No. 5, mvt 1',
    composer: 'Ludwig van Beethoven',
    credit:
      'Score: Mutopia Project, piece 941, public domain. Typeset by Stelios Samelis, adapted by Johannes Heinecke.',
    lengthSec: 316,
  },
  'grieg-ase': {
    title: "Peer Gynt Suite No. 1: Åse's Death",
    listTitle: "Åse's Death",
    composer: 'Edvard Grieg',
    credit: 'Score: Mutopia Project, piece 247, public domain. Typeset by Deborah Lowrey.',
    lengthSec: 216,
  },
  'mozart-k488': {
    title: 'Piano Concerto No. 23, second movement',
    listTitle: 'Piano Concerto No. 23, mvt 2',
    composer: 'Wolfgang Amadeus Mozart',
    credit: 'Score: Mutopia Project, piece 2229, public domain. Typeset by William Chargin.',
    lengthSec: 421,
  },
  'mozart-k315': {
    title: 'Andante in C for flute and orchestra',
    listTitle: 'Andante in C, K. 315',
    composer: 'Wolfgang Amadeus Mozart',
    credit: 'Score: Mutopia Project, piece 344, public domain. Typeset by Maurizio Tomasi.',
    lengthSec: 255,
  },
  'handel-hallelujah': {
    title: 'Messiah: Hallelujah',
    listTitle: 'Hallelujah',
    composer: 'George Frideric Handel',
    credit: 'Score: Mutopia Project, piece 459, public domain. Typeset by Joshua Koo.',
    lengthSec: 188,
  },
} as const satisfies Readonly<Record<DemoId, DemoInfo>>;

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
 * @param hash The hash of the URL, for example `#demo=grieg-ase`, or '' for none.
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
 * @returns The hash, for example `#demo=grieg-ase`.
 */
export function demoHash(id: DemoId): string {
  return `#demo=${id}`;
}

/**
 * Selects the demo of the URL query `?demo=<id>` of the spike page (design 7.1). The app page
 * uses the URL hash ({@link fileFromHash}).
 *
 * @param search The query of the URL, for example `?demo=grieg-ase`.
 * @param fallback The demo for a missing or unknown id.
 * @returns The demo of the query, or the fallback.
 */
export function demoFromQuery(search: string, fallback: DemoId = DEFAULT_DEMO): DemoId {
  const value = new URLSearchParams(search).get('demo') ?? '';
  return isDemoId(value) ? value : fallback;
}
