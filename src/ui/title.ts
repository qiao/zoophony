import { createElement, setText } from './dom.ts';

/** The title at the top left: the piece title (16 px) and the composer (13 px, dim) (2.8). */
export class Title {
  readonly element: HTMLElement;
  readonly #title: HTMLElement;
  readonly #composer: HTMLElement;

  /** Creates the title with no text. */
  constructor() {
    this.element = createElement('header', 'title');
    this.#title = createElement('h1');
    this.#composer = createElement('p');
    this.element.append(this.#title, this.#composer);
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
