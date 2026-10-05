import { DROP_TEXT, dragHasFiles } from '../app/file-rules.ts';
import { createElement } from './dom.ts';

/**
 * The drop overlay (design 2.8): while a file is over the page, a dashed accent border and the
 * text "Drop the MIDI file to play it." cover the page. A drop of several files plays the first
 * one.
 */
export class DropOverlay {
  readonly element: HTMLElement;
  /**
   * The count of `dragenter` events with no `dragleave` yet. A drag over a child element gives a
   * `dragleave` of its parent, so the overlay hides only when the count is 0.
   */
  #depth = 0;

  /**
   * Creates the hidden overlay, and listens for drags of files on the page.
   *
   * @param target The window of the page.
   * @param onDrop The action of a dropped file.
   */
  constructor(target: Window, onDrop: (file: File) => void) {
    this.element = createElement('div', 'drop', DROP_TEXT);
    this.element.hidden = true;
    target.addEventListener('dragenter', (event) => {
      if (!carriesFiles(event)) {
        return;
      }
      event.preventDefault();
      this.#depth++;
      this.element.hidden = false;
    });
    target.addEventListener('dragover', (event) => {
      if (!carriesFiles(event)) {
        return;
      }
      // Without this call, the browser opens the file in place of the page.
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    });
    target.addEventListener('dragleave', (event) => {
      if (!carriesFiles(event)) {
        return;
      }
      this.#depth = Math.max(0, this.#depth - 1);
      this.element.hidden = this.#depth === 0;
    });
    target.addEventListener('drop', (event) => {
      if (!carriesFiles(event)) {
        return;
      }
      event.preventDefault();
      this.#depth = 0;
      this.element.hidden = true;
      const file = event.dataTransfer?.files[0];
      if (file) {
        onDrop(file);
      }
    });
  }
}

/**
 * Tells if a drag event carries files.
 *
 * @param event The drag event.
 * @returns True for a drag of one or more files.
 */
function carriesFiles(event: DragEvent): boolean {
  return dragHasFiles([...(event.dataTransfer?.types ?? [])]);
}
