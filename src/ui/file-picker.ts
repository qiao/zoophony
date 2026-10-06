import { MIDI_FILE_TYPES } from '../app/file-rules.ts';
import { createButton, createElement } from './dom.ts';
import { createIcon } from './icons.ts';
import type { Tooltips } from './tooltip.ts';

/** The tooltip of the file button (design 2.8). */
const DROP_HINT = 'Or drop a MIDI file on the page.';

/**
 * The file button below the seat list (design 2.1, 2.8): the button "Select a MIDI file" with the
 * file icon and a chevron, as in the mockup. Its tooltip says "Or drop a MIDI file on the page."
 * A touch screen shows no tooltip, and it cannot drop a file.
 */
export class FilePicker {
  readonly element: HTMLElement;

  /**
   * Creates the button and its hidden file input.
   *
   * @param onFile The action of a selected file.
   * @param tooltips The tooltips of the page.
   */
  constructor(onFile: (file: File) => void, tooltips: Tooltips) {
    this.element = createElement('div', 'file-picker');
    const input = createElement('input');
    input.type = 'file';
    input.accept = MIDI_FILE_TYPES;
    input.hidden = true;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      // A second selection of the same file gives a new change event.
      input.value = '';
      if (file) {
        onFile(file);
      }
    });
    const button = createButton('file-button', '');
    button.append(
      createIcon('file', 'file-icon'),
      createElement('span', '', 'Select a MIDI file'),
      createIcon('chevron', 'chevron'),
    );
    button.addEventListener('click', () => {
      input.click();
    });
    tooltips.attach(button, () => DROP_HINT);
    this.element.append(button, input);
  }
}
