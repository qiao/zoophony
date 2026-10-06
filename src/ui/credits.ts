import { DEMO_SOURCES_LABEL, LICENSES_TEXT, SOUND_CREDIT, creditTexts } from '../app/credits.ts';
import type { DemoId } from '../app/demos.ts';
import { createElement, setText } from './dom.ts';

/**
 * The credits section of the drawer (design 2.8, 7.3, 8.1): the credit line of the current demo,
 * the SoundFont credit, the link "Third-party licenses", and the sources of the other demos.
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
    const link = createElement('a', '', LICENSES_TEXT);
    link.href = licensesHref;
    // The license file opens in a new tab, so that the music does not stop.
    link.target = '_blank';
    link.rel = 'noopener';
    const licenses = createElement('p');
    licenses.append(link);
    this.#sources = createElement('ul', 'list sources');
    this.#sources.setAttribute('aria-label', DEMO_SOURCES_LABEL);
    this.element.append(
      this.#current,
      createElement('p', '', SOUND_CREDIT),
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
