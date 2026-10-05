import { DEMOS, DEMO_IDS } from '../app/demos.ts';
import type { DemoId } from '../app/demos.ts';
import { clockText } from '../app/time-text.ts';
import { createButton, createElement, setAttribute } from './dom.ts';

/**
 * The demo list of the drawer (design 2.8, 8.2): one row for each demo, with the title of the
 * list, the composer, and the length. The current demo has an accent bar on the left.
 */
export class DemoList {
  readonly element: HTMLElement;
  readonly #rows = new Map<DemoId, HTMLButtonElement>();

  /**
   * Creates the rows of the six demos, in the order of the list.
   *
   * @param onSelect The action of a click on a row.
   */
  constructor(onSelect: (id: DemoId) => void) {
    this.element = createElement('ul', 'list');
    this.element.setAttribute('aria-label', 'Demos');
    for (const id of DEMO_IDS) {
      const demo = DEMOS[id];
      const row = createButton('demo', '');
      row.append(
        createElement('span', '', demo.listTitle),
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
