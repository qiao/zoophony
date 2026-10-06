import { DEMOS, DEMO_IDS, demoRowLabel } from '../app/demos.ts';
import type { DemoId } from '../app/demos.ts';
import { clockText } from '../app/time-text.ts';
import { createCover } from './covers.ts';
import { createButton, createElement, setAttribute } from './dom.ts';

/**
 * The demo list of the drawer (design 2.8, 8.2): one row for each demo, with its cover, the
 * title of the list, the composer, and the length. The current demo has an accent bar on the left.
 */
export class DemoList {
  readonly element: HTMLElement;
  readonly #rows = new Map<DemoId, HTMLButtonElement>();

  /**
   * Creates the rows of the five demos, in the order of the list.
   *
   * @param onSelect The action of a click on a row.
   */
  constructor(onSelect: (id: DemoId) => void) {
    this.element = createElement('ul', 'list');
    this.element.setAttribute('aria-label', 'Demos');
    for (const id of DEMO_IDS) {
      const demo = DEMOS[id];
      const row = createButton('demo', demoRowLabel(id));
      const cover = createElement('span', 'cover-frame');
      cover.append(createCover(id));
      row.append(
        cover,
        createElement('span', 'name', demo.title),
        createElement('span', 'length', clockText(demo.lengthSec)),
        createElement('small', '', demo.composer),
      );
      row.addEventListener('click', () => {
        onSelect(id);
      });
      const item = createElement('li');
      item.append(row);
      this.element.append(item);
      this.#rows.set(id, row);
    }
  }

  /** Moves the keyboard focus to the row of the current demo, or to the first row. */
  focusCurrent(): void {
    const rows = [...this.#rows.values()];
    const row = rows.find((r) => r.getAttribute('aria-current') === 'true') ?? rows[0];
    row?.focus();
  }

  /**
   * Marks the current demo.
   *
   * @param current The current demo, or `null` for a piece that is not a demo.
   */
  show(current: DemoId | null): void {
    for (const [id, row] of this.#rows) {
      setAttribute(row, 'aria-current', String(id === current));
    }
  }
}
