import { MIDI_FILE_TYPES } from '../app/file-rules.ts';
import { createButton, createElement } from './dom.ts';
import { createIcon } from './icons.ts';

/** The second line of the file button on a screen with a mouse (design 2.8). */
const SOURCE_HINT = 'From this device, or drop it on the page';

/** The second line of the file button on a touch screen, which cannot drop a file. */
const TOUCH_SOURCE_HINT = 'From this device';

/** The id of the second line, which describes the button. */
const SOURCE_HINT_ID = 'file-source';

/**
 * The file button below the demo list (design 2.1, 2.8): the folder icon, the name "Open a MIDI
 * file", a dim second line that says where the file comes from, and a chevron. The second line
 * says "From this device, or drop it on the page", or "From this device" on a touch screen, which
 * cannot drop a file. It also describes the button to a screen reader.
 */
export class FilePicker {
  readonly element: HTMLElement;

  /**
   * Creates the button and its hidden file input.
   *
   * @param onFile The action of a selected file.
   */
  constructor(onFile: (file: File) => void) {
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
    const touch = window.matchMedia('(pointer: coarse)').matches;
    const hint = createElement('small', '', touch ? TOUCH_SOURCE_HINT : SOURCE_HINT);
    hint.id = SOURCE_HINT_ID;
    const text = createElement('span', 'file-text');
    text.append(createElement('span', '', 'Open a MIDI file'), hint);
    const button = createButton('file-button', 'Open a MIDI file');
    button.append(createIcon('folder', 'file-icon'), text, createIcon('chevron', 'chevron'));
    button.setAttribute('aria-describedby', SOURCE_HINT_ID);
    button.addEventListener('click', () => {
      input.click();
    });
    this.element.append(button, input);
  }
}
