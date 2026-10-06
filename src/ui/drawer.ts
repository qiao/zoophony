import { sheetCloses, sheetOffset } from '../app/phone-layout.ts';
import { createButton, createElement } from './dom.ts';
import { createIcon } from './icons.ts';

/**
 * The drawer on the right (design 2.3, 2.8): 340 px wide, with a close button at the top and the
 * sections "Demos", "Seats", "Settings", and "Credits". On a screen narrower than 700 px, it is a
 * sheet above the bar with a drag handle: a drag of the handle down closes the sheet. It starts
 * closed, and it slides and fades in and out in 200 ms.
 */
export class Drawer {
  readonly element: HTMLElement;
  /** The close button at the top of the drawer (design 2.8). */
  readonly closeButton: HTMLButtonElement;

  /**
   * Creates the closed drawer with the drag handle, the close button, and no sections.
   *
   * @param onClose The action of a click on the close button.
   */
  constructor(onClose: () => void) {
    this.element = createElement('aside', 'drawer');
    this.element.setAttribute('aria-label', 'Drawer');
    this.element.hidden = true;
    this.closeButton = createButton('close-drawer', 'Close the drawer');
    this.closeButton.append(createIcon('close'));
    this.closeButton.addEventListener('click', onClose);
    this.element.append(this.#createHandle(), this.closeButton);
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
   * Opens or closes the drawer. An open drawer moves the stage beside it (design 2.8).
   *
   * @param open True to open it.
   */
  setOpen(open: boolean): void {
    this.element.classList.remove('from-stage');
    this.element.hidden = !open;
  }

  /**
   * Opens the drawer after a click on an animal (design 2.3). The stage then stays in place, so
   * that the next click hits the animal under the pointer (audit 2026-10-06-ux-design-2, N18). A
   * drawer that is open already keeps the place of the stage.
   */
  openFromStage(): void {
    if (!this.open) {
      this.element.classList.add('from-stage');
      this.element.hidden = false;
    }
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
