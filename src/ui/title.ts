import { APP_NAME } from '../app/page-title.ts';
import { createElement, setText } from './dom.ts';
import { createIcon } from './icons.ts';
import { LOGO_BACKDROP_LIMIT, TEXT_BACKDROP_LIMIT } from './title-shade.ts';
import type { TitleLine } from './title-shade.ts';

/**
 * The margin around the text of a line of the title, for the shade, in CSS pixels. It holds the
 * smoothed edges of the letters and their text shadow.
 */
const LINE_MARGIN = 4;

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
  /** The `header` element of the title. */
  readonly element: HTMLElement;
  /** The logo above the piece title. */
  readonly #logo: HTMLElement;
  /** The piece title. */
  readonly #title: HTMLElement;
  /** The composer line. */
  readonly #composer: HTMLElement;
  /** The range that measures the text of a line. */
  readonly #range = document.createRange();
  /** The level of the shade that shows, from 0 to 1, or `null` before the first level. */
  #shadeLevel: number | null = null;

  /** Creates the title with no text. */
  constructor() {
    this.element = createElement('header', 'title');
    this.element.setAttribute('aria-live', 'polite');
    this.#logo = createLogo();
    this.#title = createElement('h1');
    this.#composer = createElement('p');
    this.element.append(this.#logo, this.#title, this.#composer);
  }

  /**
   * The lines of the text that show, for the shade (design 2.8): the box of the text of each line
   * with a margin of 4 px, and the lightest backdrop at which its color keeps 4.5:1 with no
   * shade. Each read measures the layout.
   */
  get lines(): TitleLine[] {
    const lines: [HTMLElement, number][] = [
      [this.#logo, LOGO_BACKDROP_LIMIT],
      [this.#title, TEXT_BACKDROP_LIMIT],
      [this.#composer, TEXT_BACKDROP_LIMIT],
    ];

    return lines.flatMap(([element, limit]) => {
      if (element.hidden) {
        return [];
      }
      this.#range.selectNodeContents(element);
      const text = this.#range.getBoundingClientRect();
      if (text.width === 0 || text.height === 0) {
        return [];
      }
      const box = {
        left: text.left - LINE_MARGIN,
        top: text.top - LINE_MARGIN,
        right: text.right + LINE_MARGIN,
        bottom: text.bottom + LINE_MARGIN,
      };
      return [{ box, limit }];
    });
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

  /**
   * Shows the shade behind the title at a level: the level multiplies the alpha of
   * `--title-shade` (design 2.8). It writes the DOM only when the level changes by 0.01 or more.
   *
   * @param level The level, from 0 (no shade) to 1 (the full shade).
   */
  showShade(level: number): void {
    const rounded = Math.round(level * 100) / 100;
    if (rounded === this.#shadeLevel) {
      return;
    }

    this.#shadeLevel = rounded;
    this.element.style.setProperty('--title-shade-level', String(rounded));
  }
}
