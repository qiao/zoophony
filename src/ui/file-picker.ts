import { MIDI_FILE_TYPES } from '../app/file-rules.ts';
import { createButton, createElement } from './dom.ts';
import { createIcon } from './icons.ts';

/**
 * The file button below the demo list (design 2.1, 2.8): the button "Select a MIDI file" and the
 * text "Or drop a MIDI file on the page." A touch screen does not show the text, because it
 * cannot drop a file.
 */
export class FilePicker {
  readonly element: HTMLElement;

  /**
   * Creates the button, its hidden file input, and the text.
   *
   * @param onFile The action of a selected file.
   */
  constructor(onFile: (file: File) => void) {
    this.element = createElement('div');
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
    const button = createButton('', '');
    button.append(createIcon('file'), 'Select a MIDI file');
    button.addEventListener('click', () => {
      input.click();
    });
    const row = createElement('div', 'file-row');
    row.append(button, input);
    this.element.append(
      row,
      createElement('p', 'hint drop-hint', 'Or drop a MIDI file on the page.'),
    );
  }
}
