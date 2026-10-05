/** The hash ids of the six demos, in the order of the demo list (design 8.2). */
export const DEMO_IDS = [
  'beethoven-5',
  'grieg-ase',
  'mozart-k488',
  'mozart-k315',
  'handel-hallelujah',
  'boulanger-matin',
] as const;

/** The hash id of one demo (design 8.2). */
export type DemoId = (typeof DEMO_IDS)[number];

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
 * Selects the demo of the URL query `?demo=<id>`. This query is temporary, for the review of
 * step 4. Step 6 replaces it with the URL hash of design 2.2.
 *
 * @param search The query of the URL, for example `?demo=grieg-ase`.
 * @returns The demo of the query, or demo 1 for a missing or unknown id.
 */
export function demoFromQuery(search: string): DemoId {
  const value = new URLSearchParams(search).get('demo') ?? '';
  return isDemoId(value) ? value : DEMO_IDS[0];
}

/**
 * Gives the next or the previous demo of the list, and goes around at the ends. The temporary
 * keys of step 4 use it.
 *
 * @param id The current demo.
 * @param step 1 for the next demo, -1 for the previous demo.
 * @returns The demo.
 */
export function stepDemo(id: DemoId, step: number): DemoId {
  const count = DEMO_IDS.length;
  const index = (((DEMO_IDS.indexOf(id) + step) % count) + count) % count;
  return DEMO_IDS[index] ?? DEMO_IDS[0];
}
