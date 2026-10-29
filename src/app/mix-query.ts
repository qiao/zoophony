import type { MixName } from '../audio/output-chain.ts';

/**
 * The names of the mix presets (design 6.8). The list holds the names of `MIX_BUSES` of
 * `audio/output-chain.ts`, so the app reads the query with no import of the audio code.
 */
const MIX_NAMES: readonly MixName[] = ['hall', 'cinematic'];

/** The mix preset of a page with no valid query `mix` (design 6.8). */
export const DEFAULT_MIX: MixName = 'hall';

/**
 * Checks that a text is the name of a mix preset.
 *
 * @param text The text.
 * @returns True for `hall` and `cinematic`.
 */
export function isMixName(text: string): text is MixName {
  return MIX_NAMES.some((name) => name === text);
}

/**
 * Reads the mix preset of the page from the query `mix`, such as `?mix=cinematic` (design 6.8).
 * The query is for a listening test of the two presets, and the settings have no control for it.
 *
 * @param search The query of the page URL, such as `location.search`.
 * @returns The mix preset of the query, or `hall` with no query or with an unknown value.
 */
export function mixOfQuery(search: string): MixName {
  const text = new URLSearchParams(search).get('mix');
  return text !== null && isMixName(text) ? text : DEFAULT_MIX;
}
