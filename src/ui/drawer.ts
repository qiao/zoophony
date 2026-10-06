import { sheetCloses, sheetOffset } from '../app/phone-layout.ts';
import { createElement } from './dom.ts';

/**
 * The drawer on the right (design 2.3, 2.8): 340 px wide, with the sections "Demos", "Seats",
 * "Settings", and "Credits". On a screen narrower than 700 px, it is a sheet above the bar with
 * a drag handle: a drag of the handle down closes the sheet. It starts closed.
 */
export class Drawer {
  readonly element: HTMLElement;

  /** Creates the closed drawer with the drag handle and no sections. */
  constructor() {
    this.element = createElement('aside', 'drawer');
    this.element.setAttribute('aria-label', 'Drawer');
    this.element.hidden = true;
    this.element.append(this.#createHandle());
  }

  /**
   * Creates the drag handle of the sheet. Only the phone layout shows it. A screen reader skips
   * it, because the drawer button and the Escape key also close the sheet.
   *
   * @returns The handle.
   */
  #createHandle(): HTMLElement {
    const handle = createElement('div', 'handle');
    handle.setAttribute('aria-hidden', 'true');
    let start: number | null = null;
    const move = (event: PointerEvent): number => event.clientY - (start ?? event.clientY);
    handle.addEventListener('pointerdown', (event) => {
      start = event.clientY;
      handle.setPointerCapture(event.pointerId);
      this.element.classList.add('is-dragged');
    });
    handle.addEventListener('pointermove', (event) => {
      if (start !== null) {
        this.element.style.transform = `translateY(${sheetOffset(move(event))}px)`;
      }
    });
    const end = (event: PointerEvent, cancel: boolean): void => {
      if (start === null) {
        return;
      }
      const closes = !cancel && sheetCloses(move(event), this.element.offsetHeight);
      start = null;
      this.element.classList.remove('is-dragged');
      this.element.style.transform = '';
      if (closes) {
        this.setOpen(false);
      }
    };
    handle.addEventListener('pointerup', (event) => {
      end(event, false);
    });
    handle.addEventListener('pointercancel', (event) => {
      end(event, true);
    });
    return handle;
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

  /** True while an element of the drawer has the keyboard focus. */
  get focused(): boolean {
    return this.element.contains(document.activeElement);
  }

  /**
   * Adds a section at the end of the drawer.
   *
   * @param heading The heading of the section, for example "Demos".
   * @param content The content of the section.
   * @returns The heading, so that a section can add a control to it.
   */
  addSection(heading: string, ...content: Element[]): HTMLHeadingElement {
    const title = createElement('h2', '', heading);
    this.element.append(title, ...content);
    return title;
  }
}
