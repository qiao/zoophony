import { createElement } from './dom.ts';

/**
 * The drawer on the right (design 2.3, 2.8): 340 px wide, with the sections "Demos", "Seats",
 * "Settings", and "Credits". On a screen narrower than 700 px, it is a sheet above the bar. It
 * starts closed.
 */
export class Drawer {
  readonly element: HTMLElement;

  /** Creates the closed drawer with no sections. */
  constructor() {
    this.element = createElement('aside', 'drawer');
    this.element.setAttribute('aria-label', 'Drawer');
    this.element.hidden = true;
  }

  /** True while the drawer is open. */
  get open(): boolean {
    return !this.element.hidden;
  }

  /**
   * Opens or closes the drawer.
   *
   * @param open True to open it.
   */
  setOpen(open: boolean): void {
    this.element.hidden = !open;
  }

  /**
   * Adds a section at the end of the drawer.
   *
   * @param heading The heading of the section, for example "Demos".
   * @param content The content of the section.
   */
  addSection(heading: string, ...content: Element[]): void {
    this.element.append(createElement('h2', '', heading), ...content);
  }
}
