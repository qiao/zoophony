import { APP_NAME } from '../app/page-title.ts';
import { createElement, setText } from './dom.ts';
import { createIcon } from './icons.ts';

/**
 * Creates the logo of the mockup (design 2.8): the gold paw and the name "Zoophony". It is plain
 * content, no control. A screen reader reads the name and skips the paw.
 *
 * @returns The logo element.
 */
export function createLogo(): HTMLElement {
  const logo = createElement('div', 'logo');
  logo.append(createIcon('paw'), createElement('span', '', APP_NAME));
  return logo;
}

/**
 * The title at the top left (2.8): the logo, then the piece title in a serif (24 px to 36 px)
 * and the composer. It is a polite live region, so that a screen reader reads the current piece
 * when it changes. The logo does not change, so the region does not read it again.
 */
export class Title {
  readonly element: HTMLElement;
  readonly #title: HTMLElement;
  readonly #composer: HTMLElement;

  /** Creates the title with no text. */
  constructor() {
    this.element = createElement('header', 'title');
    this.element.setAttribute('aria-live', 'polite');
    this.#title = createElement('h1');
    this.#composer = createElement('p');
    this.element.append(createLogo(), this.#title, this.#composer);
  }

  /**
   * Shows the title of a piece.
   *
   * @param title The piece title.
   * @param composer The composer, or '' for none.
   */
  show(title: string, composer: string): void {
    setText(this.#title, title);
    setText(this.#composer, composer);
    this.#composer.hidden = composer === '';
  }
}
