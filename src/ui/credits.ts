import {
  DEMO_SOURCES_LABEL,
  HALL_REVERB_CREDIT,
  LICENSES_TEXT,
  SOUND_CREDIT,
  creditTexts,
} from '../app/credits.ts';
import type { DemoId } from '../app/demos.ts';
import { createElement, setText } from './dom.ts';

/**
 * The credits section of the drawer (design 2.8, 7.3, 8.1): the credit line of the current demo,
 * the SoundFont credit, the credit of the hall reverb, the link "Third-party licenses", and the
 * sources of the other demos.
 */
export class Credits {
  readonly element: HTMLElement;
  readonly #current: HTMLElement;
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
    const reverb = createElement('p', '', `${HALL_REVERB_CREDIT.text} `);
    HALL_REVERB_CREDIT.links.forEach((link, index) => {
      reverb.append(index > 0 ? ', ' : '', newTabLink(link.text, link.href));
    });
    reverb.append('.');
    this.#sources = createElement('ul', 'list sources');
    this.#sources.setAttribute('aria-label', DEMO_SOURCES_LABEL);
    this.element.append(
      this.#current,
      createElement('p', '', SOUND_CREDIT),
      reverb,
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
