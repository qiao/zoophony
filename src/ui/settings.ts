import { QUALITY_OPTIONS, SECTION_SIZE_OPTIONS } from '../app/settings.ts';
import type { QualitySetting, SettingOption } from '../app/settings.ts';
import type { SectionSize } from '../score/types.ts';
import { createButton, createElement, setAttribute } from './dom.ts';

/** A segmented control: a group of toggle buttons, one of which is pressed (design 2.8). */
class Segmented<T extends string> {
  readonly element: HTMLElement;
  readonly #buttons: readonly (readonly [T, HTMLButtonElement])[];

  /**
   * Creates the control.
   *
   * @param label The `aria-label` of the group, for example "Quality".
   * @param options The buttons, in order.
   * @param onSelect The action of a click on a button.
   */
  constructor(label: string, options: readonly SettingOption<T>[], onSelect: (value: T) => void) {
    this.element = createElement('div', 'segmented');
    this.element.setAttribute('role', 'group');
    this.element.setAttribute('aria-label', label);
    this.#buttons = options.map((option) => {
      const button = createButton('', '');
      button.textContent = option.label;
      button.addEventListener('click', () => {
        onSelect(option.value);
      });
      return [option.value, button] as const;
    });
    this.element.append(...this.#buttons.map(([, button]) => button));
  }

  /**
   * Marks the current value.
   *
   * @param value The value of the pressed button.
   */
  show(value: T): void {
    for (const [option, button] of this.#buttons) {
      setAttribute(button, 'aria-pressed', String(option === value));
    }
  }
}

/**
 * The settings of the drawer (design 2.3, 2.8): "Section size" and "Quality". On a phone, the
 * "Playback" group at the top holds the speed menu, the volume slider, "Reset view", and full
 * screen of the bar.
 */
export class Settings {
  readonly element: HTMLElement;
  /** The row of the "Playback" group, for `Bar.placePlayback()`. */
  readonly playbackRow: HTMLElement;
  readonly #sectionSize: Segmented<SectionSize>;
  readonly #quality: Segmented<QualitySetting>;

  /**
   * Creates the two segmented controls.
   *
   * @param onSectionSize The action of a new section size.
   * @param onQuality The action of a new quality setting.
   */
  constructor(
    onSectionSize: (size: SectionSize) => void,
    onQuality: (quality: QualitySetting) => void,
  ) {
    this.element = createElement('div', 'settings');
    this.playbackRow = createElement('div', 'playback-row');
    const playback = createElement('div', 'playback');
    playback.setAttribute('role', 'group');
    playback.setAttribute('aria-label', 'Playback');
    playback.append(createElement('span', 'setting-label', 'Playback'), this.playbackRow);
    this.#sectionSize = new Segmented('Section size', SECTION_SIZE_OPTIONS, onSectionSize);
    this.#quality = new Segmented('Quality', QUALITY_OPTIONS, onQuality);
    this.element.append(
      playback,
      createElement('span', 'setting-label', 'Section size'),
      this.#sectionSize.element,
      createElement('span', 'setting-label', 'Quality'),
      this.#quality.element,
    );
  }

  /**
   * Marks the current values.
   *
   * @param sectionSize The setting "Section size".
   * @param quality The setting "Quality".
   */
  show(sectionSize: SectionSize, quality: QualitySetting): void {
    this.#sectionSize.show(sectionSize);
    this.#quality.show(quality);
  }
}
