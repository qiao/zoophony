import { createButton, createElement } from './dom.ts';
import { createIcon } from './icons.ts';

/**
 * A modal dialog of the page (design 2.8), on a native `<dialog>` element: a heading, a compact
 * close button with the icon "close", and a scroll area for the content. It opens with
 * `showModal()`, so the browser makes the rest of the page inert and moves the focus into the
 * dialog. Escape, the close button, and a click on the backdrop close it. The control that
 * opened it then gets the focus again.
 */
export class ModalDialog {
  /** The `<dialog>` element. */
  readonly element: HTMLDialogElement;
  /** The control that opened the dialog, which gets the focus when it closes. */
  #opener: HTMLElement | null = null;
  /** True while a press started on the backdrop, so that only a full click there closes it. */
  #pressOnBackdrop = false;

  /**
   * Creates the closed dialog.
   *
   * @param className The class of the dialog. The id of the heading starts with it, so it is
   *   unique in the page.
   * @param heading The text of the heading, which also names the dialog.
   * @param closeLabel The `aria-label` of the close button.
   * @param content The content of the scroll area.
   */
  constructor(className: string, heading: string, closeLabel: string, ...content: Element[]) {
    const headingId = `${className}-heading`;
    this.element = createElement('dialog', `modal ${className}`);
    this.element.setAttribute('aria-labelledby', headingId);

    const title = createElement('h2', '', heading);
    title.id = headingId;
    const close = createButton('close', closeLabel);
    close.append(createIcon('close'));
    close.addEventListener('click', () => {
      this.close();
    });
    const header = createElement('div', 'modal-header');
    header.append(title, close);
    const body = createElement('div', 'modal-body');
    body.append(...content);
    this.element.append(header, body);

    // The header and the body fill the box of the dialog, so a press with the dialog as its
    // target is a press on the backdrop.
    this.element.addEventListener('pointerdown', (event) => {
      this.#pressOnBackdrop = event.target === this.element;
    });
    this.element.addEventListener('click', (event) => {
      if (event.target === this.element && this.#pressOnBackdrop) {
        this.close();
      }
      this.#pressOnBackdrop = false;
    });
    this.element.addEventListener('close', () => {
      this.#opener?.focus();
      this.#opener = null;
    });
  }

  /** True while the dialog is open. */
  get open(): boolean {
    return this.element.open;
  }

  /**
   * Opens the dialog as a modal dialog. The browser gives the focus to the close button, the
   * first control of the dialog.
   *
   * @param opener The control that opens the dialog, which gets the focus when it closes.
   */
  show(opener: HTMLElement): void {
    if (this.element.open) {
      return;
    }

    this.#opener = opener;
    this.element.showModal();
  }

  /** Closes the dialog. The control that opened it gets the focus. */
  close(): void {
    if (this.element.open) {
      this.element.close();
    }
  }
}
