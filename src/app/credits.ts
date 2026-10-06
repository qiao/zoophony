import { DEMOS, DEMO_IDS } from './demos.ts';
import type { DemoId } from './demos.ts';

/** The credit of the SoundFont in the credits section (design 2.8, 6.2, 7.3). */
export const SOUND_CREDIT = 'Sounds: GeneralUser GS 2.0.3 by S. Christian Collins.';

/** The text of the link to the third-party license file (design 2.8, 7.3). */
export const LICENSES_TEXT = 'Third-party licenses';

/** The third-party license file in the site. `tools/licenses.ts` writes it (design 7.3). */
export const LICENSES_FILE = 'third-party-licenses.txt';

/** The label above the sources of the demos that do not play (design 8.1). */
export const DEMO_SOURCES_LABEL = 'Demo sources';

/** The source of one demo in the credits section: the title of the list and the credit line. */
export interface DemoSource {
  readonly title: string;
  readonly credit: string;
}

/** The texts of the credits section for the current piece (design 2.8, 7.3, 8.1). */
export interface CreditTexts {
  /** The credit line of the current demo, or `null` for a file of the user (8.2). */
  readonly current: string | null;
  /** The sources of the other demos, in the order of the demo list. */
  readonly otherDemos: readonly DemoSource[];
}

/**
 * Gives the texts of the credits section (design 2.8, 7.3, 8.1). The section shows the credit
 * line of the current demo first. A file of the user has no credit line. The credits list the
 * source of each demo, so the sources of the other demos follow.
 *
 * @param current The current demo, or `null` for a file of the user.
 * @returns The texts.
 */
export function creditTexts(current: DemoId | null): CreditTexts {
  return {
    current: current ? DEMOS[current].credit : null,
    otherDemos: DEMO_IDS.filter((id) => id !== current).map((id) => ({
      title: DEMOS[id].listTitle,
      credit: DEMOS[id].credit,
    })),
  };
}

/**
 * Gives the URL of the third-party license file (design 7.3).
 *
 * @param base The base URL of the site, with a slash at the end.
 * @returns The URL of the file.
 */
export function licensesUrl(base: string): string {
  return `${base}${LICENSES_FILE}`;
}
