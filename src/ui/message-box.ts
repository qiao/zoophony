import { RETRY_TEXT } from '../app/messages.ts';
import { createButton, createElement, setText } from './dom.ts';
import { createIcon } from './icons.ts';

/** What the message box shows: the text and the "Try again" button. */
interface MessageView {
  readonly text: string;
  readonly retry: boolean;
}

/** The actions of the buttons of the message box. */
interface MessageActions {
  /** A click on "Try again". */
  readonly onRetry: () => void;
  /** A click on the close button, or the Escape key in the message. */
  readonly onClose: () => void;
  /** Gets the focus when a message that holds the focus closes. */
  readonly focusAfterClose: () => void;
}

/**
 * The message at the bottom center, above the bar (design 2.8): on `--panel` with a bar in
 * `--danger` on the left, the text, the "Try again" button of a failure, and a close
 * button. A polite live region reads each new message.
 */
export class MessageBox {
  /** The live region. It stays in the page, and the box inside it shows and hides. */
  readonly element: HTMLElement;
  readonly #box: HTMLElement;
  readonly #text: HTMLElement;
  readonly #retry: HTMLButtonElement;
  readonly #focusAfterClose: () => void;
  #hovered = false;

  /**
   * Creates the hidden message box.
   *
   * @param actions The actions of the buttons.
   */
  constructor(actions: MessageActions) {
    this.#focusAfterClose = actions.focusAfterClose;
    this.element = createElement('div', 'messages');
    this.element.setAttribute('aria-live', 'polite');
    this.#box = createElement('div', 'message');
    this.#box.hidden = true;
    this.#text = createElement('span');
    this.#retry = createButton('retry', '');
    this.#retry.textContent = RETRY_TEXT;
    this.#retry.addEventListener('click', actions.onRetry);
    const close = createButton('close', 'Close the message');
    close.append(createIcon('close'));
    close.addEventListener('click', actions.onClose);
    this.#box.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        actions.onClose();
      }
    });
    this.#box.addEventListener('pointerenter', () => {
      this.#hovered = true;
    });
    this.#box.addEventListener('pointerleave', () => {
      this.#hovered = false;
    });
    this.#box.append(this.#text, this.#retry, close);
    this.element.append(this.#box);
  }

  /** True while the pointer is over the message or a button of it has the focus. */
  get held(): boolean {
    return !this.#box.hidden && (this.#hovered || this.#box.contains(document.activeElement));
  }

  /**
   * Shows a message, or hides the box. It writes the DOM only where a value changed. When the
   * box hides with the focus in it, the focus goes to `focusAfterClose()`.
   *
   * @param view The message, or `null` for none.
   */
  update(view: MessageView | null): void {
    if (!view) {
      if (!this.#box.hidden) {
        const hadFocus = this.#box.contains(document.activeElement);
        this.#box.hidden = true;
        this.#hovered = false;
        setText(this.#text, '');
        if (hadFocus) {
          this.#focusAfterClose();
        }
      }
      return;
    }
    this.#box.hidden = false;
    setText(this.#text, view.text);
    this.#retry.hidden = !view.retry;
  }
}
