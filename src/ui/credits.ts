import {
  DEMO_SOURCES_LABEL,
  HALL_REVERB_CREDIT,
  LICENSES_TEXT,
  SOUND_CREDITS,
  creditTexts,
} from '../app/credits.ts';
import type { LinkedCredit } from '../app/credits.ts';
import type { DemoId } from '../app/demos.ts';
import { createElement, setText } from './dom.ts';

/**
 * The content of the credits dialog (design 2.8, 7.3, 8.1): the credit line of the current demo,
 * the SoundFont credit, the credit of the hall reverb, the link "Third-party licenses", and the
 * sources of the other demos.
 */
export class Credits {
  /** The element that holds the credits. */
  readonly element: HTMLElement;
  /** The credit line of the current demo. */
  readonly #current: HTMLElement;
  /** The list of the sources of the other demos. */
  readonly #sources: HTMLUListElement;

  /**
   * Creates the section with no current demo.
   *
   * @param licensesHref The URL of the third-party license file.
   */
  constructor(licensesHref: string) {
    this.element = createElement('div', 'credits');
    this.#current = createElement('p');
    const licenses = createElement('p');
    licenses.append(newTabLink(LICENSES_TEXT, licensesHref));
    this.#sources = createElement('ul', 'list sources');
    this.#sources.setAttribute('aria-label', DEMO_SOURCES_LABEL);
    this.element.append(
      this.#current,
      ...SOUND_CREDITS.map(linkedLine),
      linkedLine(HALL_REVERB_CREDIT),
      licenses,
      createElement('span', 'setting-label', DEMO_SOURCES_LABEL),
      this.#sources,
    );
    this.show(null);
  }

  /**
   * Shows the credits of a piece.
   *
   * @param current The current demo, or `null` for a file of the user.
   */
  show(current: DemoId | null): void {
    const texts = creditTexts(current);
    setText(this.#current, texts.current ?? '');
    this.#current.hidden = texts.current === null;
    this.#sources.replaceChildren(
      ...texts.otherDemos.map((source) => {
        const item = createElement('li', '', source.title);
        item.append(createElement('small', '', source.credit));
        return item;
      }),
    );
  }
}

/**
 * Makes a paragraph with a credit line and its links, such as "… Source, CC BY 4.0."
 *
 * @param credit The credit line and its links.
 * @returns The paragraph.
 */
function linkedLine(credit: LinkedCredit): HTMLParagraphElement {
  const line = createElement('p', '', `${credit.text} `);
  credit.links.forEach((link, index) => {
    line.append(index > 0 ? ', ' : '', newTabLink(link.text, link.href));
  });
  line.append('.');
  return line;
}

/**
 * Makes a link that opens in a new tab, so that the music does not stop.
 *
 * @param text The text of the link.
 * @param href The URL.
 * @returns The link.
 */
function newTabLink(text: string, href: string): HTMLAnchorElement {
  const link = createElement('a', '', text);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener';
  return link;
}
