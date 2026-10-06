import { DEFAULT_SPEED, SPEEDS, speedText } from '../app/bar-rules.ts';
import type { Speed } from '../app/bar-rules.ts';
import { clockText, seekValueText } from '../app/time-text.ts';
import { createButton, createElement, setAttribute, setText } from './dom.ts';
import { createIcon, setIcon } from './icons.ts';

/** The actions of the controls of the bar. */
export interface BarActions {
  /** A click on play or pause. */
  readonly onPlay: () => void;
  /** A move of the seek bar, in song seconds. */
  readonly onSeek: (songSec: number) => void;
  readonly onSpeed: (speed: Speed) => void;
  /** A move of the volume slider, from 0 to 100. */
  readonly onVolume: (volume: number) => void;
  readonly onMute: () => void;
  readonly onResetView: () => void;
  readonly onFullScreen: () => void;
  readonly onDrawer: () => void;
}

/** What the bar shows in one frame. */
export interface BarView {
  readonly playLabel: 'Play' | 'Pause';
  /** The current song time, in seconds. */
  readonly songSec: number;
  /** The song length in whole seconds. */
  readonly lengthSec: number;
  /** False while the seek bar cannot seek: before the samples are ready. */
  readonly seekable: boolean;
  readonly muted: boolean;
  readonly fullScreen: boolean;
  readonly drawerOpen: boolean;
  /** False while the bar hides during play (design 2.3). */
  readonly shown: boolean;
}

/**
 * Creates the speed menu.
 *
 * @param onSpeed The action of a new speed.
 * @returns The `select` element.
 */
function createSpeedMenu(onSpeed: (speed: Speed) => void): HTMLSelectElement {
  const menu = createElement('select', 'speed hide-narrow');
  menu.setAttribute('aria-label', 'Speed');
  for (const speed of SPEEDS) {
    const option = createElement('option', '', speedText(speed));
    option.value = String(speed);
    option.selected = speed === DEFAULT_SPEED;
    menu.append(option);
  }
  menu.addEventListener('change', () => {
    const speed = SPEEDS.find((value) => String(value) === menu.value);
    if (speed !== undefined) {
      onSpeed(speed);
    }
  });
  return menu;
}

/**
 * Creates a range input.
 *
 * @param className The class.
 * @param label The `aria-label`.
 * @param max The largest value.
 * @returns The input.
 */
function createRange(className: string, label: string, max: number): HTMLInputElement {
  const input = createElement('input', className);
  input.type = 'range';
  input.min = '0';
  input.max = String(max);
  input.step = '1';
  input.setAttribute('aria-label', label);
  return input;
}

/**
 * The bar at the bottom (design 2.3, 2.8). From left to right: play or pause, the current time,
 * the seek bar, the duration, the speed menu, mute, the volume slider, "Reset view", full screen,
 * and the drawer button.
 */
export class Bar {
  readonly element: HTMLElement;
  readonly #play: HTMLButtonElement;
  readonly #playIcon: SVGSVGElement;
  readonly #time: HTMLElement;
  readonly #seek: HTMLInputElement;
  readonly #length: HTMLElement;
  readonly #mute: HTMLButtonElement;
  readonly #muteIcon: SVGSVGElement;
  readonly #fullScreen: HTMLButtonElement;
  readonly #fullScreenIcon: SVGSVGElement;
  readonly #drawer: HTMLButtonElement;
  /** True while the pointer drags the seek bar. Then a frame does not move its thumb. */
  #dragging = false;
  #hovered = false;

  /**
   * Creates the bar and its controls.
   *
   * @param actions The actions of the controls.
   * @param volume The position of the volume slider at start, from 0 to 100.
   * @param canFullScreen False if the browser has no full screen for the page. Then the full
   *   screen button does not show.
   */
  constructor(actions: BarActions, volume: number, canFullScreen: boolean) {
    this.element = createElement('nav', 'bar');
    this.element.setAttribute('aria-label', 'Player controls');

    this.#play = createButton('', 'Play');
    this.#playIcon = createIcon('play');
    this.#play.append(this.#playIcon);
    this.#play.addEventListener('click', actions.onPlay);

    this.#time = createElement('span', 'time', '0:00');
    this.#seek = createRange('seek', 'Seek', 0);
    this.#seek.value = '0';
    this.#seek.addEventListener('input', () => {
      actions.onSeek(Number(this.#seek.value));
    });
    this.#seek.addEventListener('pointerdown', () => {
      this.#dragging = true;
    });
    this.#seek.addEventListener('change', () => {
      this.#dragging = false;
    });
    window.addEventListener('pointerup', () => {
      this.#dragging = false;
    });
    this.#length = createElement('span', 'time', '0:00');

    this.#mute = createButton('', 'Mute');
    this.#mute.setAttribute('aria-pressed', 'false');
    this.#muteIcon = createIcon('volume');
    this.#mute.append(this.#muteIcon);
    this.#mute.addEventListener('click', actions.onMute);

    const volumeSlider = createRange('volume hide-narrow', 'Volume', 100);
    volumeSlider.value = String(volume);
    volumeSlider.addEventListener('input', () => {
      actions.onVolume(Number(volumeSlider.value));
    });

    const reset = createButton('hide-narrow', 'Reset view');
    reset.append(createIcon('reset-view'));
    reset.addEventListener('click', actions.onResetView);

    this.#fullScreen = createButton('hide-narrow', 'Full screen');
    this.#fullScreenIcon = createIcon('full-screen');
    this.#fullScreen.append(this.#fullScreenIcon);
    this.#fullScreen.hidden = !canFullScreen;
    this.#fullScreen.addEventListener('click', actions.onFullScreen);

    this.#drawer = createButton('', 'Open the drawer');
    this.#drawer.setAttribute('aria-expanded', 'false');
    this.#drawer.append(createIcon('drawer'));
    this.#drawer.addEventListener('click', actions.onDrawer);

    this.element.addEventListener('pointerenter', () => {
      this.#hovered = true;
    });
    this.element.addEventListener('pointerleave', () => {
      this.#hovered = false;
    });

    this.element.append(
      this.#play,
      this.#time,
      this.#seek,
      this.#length,
      createSpeedMenu(actions.onSpeed),
      this.#mute,
      volumeSlider,
      reset,
      this.#fullScreen,
      this.#drawer,
    );
  }

  /** Moves the keyboard focus to the play button. */
  focusPlay(): void {
    this.#play.focus();
  }

  /** Moves the keyboard focus to the drawer button. */
  focusDrawerButton(): void {
    this.#drawer.focus();
  }

  /** True while the pointer is over the bar. */
  get hovered(): boolean {
    return this.#hovered;
  }

  /** True while a control of the bar has the keyboard focus. */
  get focused(): boolean {
    return this.element.contains(document.activeElement);
  }

  /**
   * Shows the state of one frame. It writes the DOM only where a value changed.
   *
   * @param view The values of the frame.
   */
  update(view: BarView): void {
    setAttribute(this.#play, 'aria-label', view.playLabel);
    if (this.#playIcon.dataset['shown'] !== view.playLabel) {
      this.#playIcon.dataset['shown'] = view.playLabel;
      setIcon(this.#playIcon, view.playLabel === 'Play' ? 'play' : 'pause');
    }

    const current = Math.min(Math.max(0, Math.floor(view.songSec)), view.lengthSec);
    setText(this.#time, clockText(current));
    setText(this.#length, clockText(view.lengthSec));
    setAttribute(this.#seek, 'max', String(view.lengthSec));
    if (!this.#dragging) {
      if (this.#seek.value !== String(current)) {
        this.#seek.value = String(current);
      }
      setAttribute(this.#seek, 'aria-valuetext', seekValueText(current, view.lengthSec));
    } else {
      const dragged = Number(this.#seek.value);
      setText(this.#time, clockText(dragged));
      setAttribute(this.#seek, 'aria-valuetext', seekValueText(dragged, view.lengthSec));
    }
    this.#seek.disabled = !view.seekable;

    setAttribute(this.#mute, 'aria-pressed', String(view.muted));
    if (this.#muteIcon.dataset['shown'] !== String(view.muted)) {
      this.#muteIcon.dataset['shown'] = String(view.muted);
      setIcon(this.#muteIcon, view.muted ? 'volume-off' : 'volume');
    }

    setAttribute(
      this.#fullScreen,
      'aria-label',
      view.fullScreen ? 'Exit full screen' : 'Full screen',
    );
    if (this.#fullScreenIcon.dataset['shown'] !== String(view.fullScreen)) {
      this.#fullScreenIcon.dataset['shown'] = String(view.fullScreen);
      setIcon(this.#fullScreenIcon, view.fullScreen ? 'exit-full-screen' : 'full-screen');
    }

    setAttribute(this.#drawer, 'aria-expanded', String(view.drawerOpen));
    setAttribute(
      this.#drawer,
      'aria-label',
      view.drawerOpen ? 'Close the drawer' : 'Open the drawer',
    );
    this.element.classList.toggle('is-hidden', !view.shown);
  }
}
