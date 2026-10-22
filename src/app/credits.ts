import { HALL_CREDIT } from '../audio/hall-credit.ts';
import { SOUNDFONT_CREDITS } from '../audio/soundfont-info.ts';
import { DEMOS, DEMO_IDS } from './demos.ts';
import type { DemoId } from './demos.ts';

/** The text of the link in the drawer that opens the credits, and the heading of their dialog. */
export const CREDITS_TEXT = 'Credits';

/** The `aria-label` of the close button of the credits dialog (design 2.8). */
export const CLOSE_CREDITS_LABEL = 'Close the credits';

/** The text of the link to the third-party license file (design 2.8, 7.3). */
export const LICENSES_TEXT = 'Third-party licenses';

/** The third-party license file in the site. `tools/licenses.ts` writes it (design 7.3). */
export const LICENSES_FILE = 'third-party-licenses.txt';

/** A link of the credits dialog. */
interface CreditLink {
  readonly text: string;
  readonly href: string;
}

/** A credit line with its links. */
export interface LinkedCredit {
  readonly text: string;
  readonly links: readonly CreditLink[];
}

/** The text before the name of the author, on the first line of the credits dialog. */
export const AUTHOR_TEXT = 'Made by';

/**
 * The author of Zoophony, on the first line of the credits dialog (design 2.8). The name is the
 * name of `LICENSE`, and the link goes to the owner of `REPOSITORY_URL`.
 */
export const AUTHOR_LINK: CreditLink = {
  text: 'Xueqiao Xu',
  href: 'https://github.com/qiao',
};

/**
 * The credit of the hall reverb (design 2.8, 6.8): the line of `HALL_CREDIT`, and links to its
 * source and to its license. CC BY 4.0 asks for the credit, a link to the license, and a note of
 * the changes.
 */
export const HALL_REVERB_CREDIT: LinkedCredit = {
  text: HALL_CREDIT.text,
  links: [
    { text: 'Source', href: HALL_CREDIT.sourceUrl },
    { text: HALL_CREDIT.license, href: HALL_CREDIT.licenseUrl },
  ],
};

/**
 * The credits of the SoundFont (design 2.8, 6.2, 7.3): one line for each source of
 * `SOUNDFONT_CREDITS`, with a link to its web page.
 */
export const SOUND_CREDITS: readonly LinkedCredit[] = SOUNDFONT_CREDITS.map((credit) => ({
  text: `Sounds: ${credit.name} by ${credit.author} (${credit.license}).`,
  links: [{ text: 'Source', href: credit.url }],
}));

/** The label above the sources of the demos that do not play (design 8.1). */
export const DEMO_SOURCES_LABEL = 'Demo sources';

/** The source of one demo in the credits dialog: the title of the list and the credit line. */
interface DemoSource {
  readonly title: string;
  readonly credit: string;
}

/** The texts of the credits dialog for the current piece (design 2.8, 7.3, 8.1). */
interface CreditTexts {
  /** The credit line of the current demo, or `null` for a file of the user (8.2). */
  readonly current: string | null;
  /** The sources of the other demos, in the order of the demo list. */
  readonly otherDemos: readonly DemoSource[];
}

/**
 * Gives the texts of the credits dialog (design 2.8, 7.3, 8.1). The dialog shows the credit
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
      title: DEMOS[id].title,
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
