import './ui.css';

import type { DemoId } from '../app/demos.ts';
import type { SeatFlag } from '../app/seat-flags.ts';
import type { QualitySetting } from '../app/settings.ts';
import type { SectionSize } from '../score/types.ts';
import { licensesUrl } from '../app/credits.ts';
import { PHONE_LAYOUT_QUERY } from '../app/phone-layout.ts';
import { Bar } from './bar.ts';
import type { BarActions } from './bar.ts';
import { Credits } from './credits.ts';
import { DemoList } from './demo-list.ts';
import { Drawer } from './drawer.ts';
import { DropOverlay } from './drop-overlay.ts';
import { FilePicker } from './file-picker.ts';
import { FirstScreen } from './first-screen.ts';
import { MessageBox } from './message-box.ts';
import { SeatList } from './seat-list.ts';
import { Settings } from './settings.ts';
import { Title } from './title.ts';
import { Tooltips } from './tooltip.ts';

/** The actions of all controls of the UI. */
export interface UiActions extends BarActions {
  /** A click on the play button of the first screen. */
  readonly onFirstPlay: () => void;
  /** A click on a row of the demo list. */
  readonly onSelectDemo: (id: DemoId) => void;
  /** A file that the user selected with the file button or dropped on the page. */
  readonly onFile: (file: File) => void;
  /** A click on the mute or the solo button of a seat. */
  readonly onSeatFlag: (seatIndex: number, flag: SeatFlag) => void;
  /** A click on a button of the setting "Section size". */
  readonly onSectionSize: (size: SectionSize) => void;
  /** A click on a button of the setting "Quality". */
  readonly onQuality: (quality: QualitySetting) => void;
  /** A click on "Try again" in the message of a failure. */
  readonly onRetry: () => void;
  /** A click on the close button of the message, or the Escape key in it. */
  readonly onCloseMessage: () => void;
}

/**
 * The UI over the canvas (design 2.3, 2.8): the title, the first screen, the bar, the drawer with
 * the demo list, the file button, the seat list, the settings, and the credits, the message,
 * and the drop overlay. The DOM order gives the focus order of 2.8: the title, the bar, then the
 * drawer. The play button of the first screen comes before the bar, and the buttons of a message
 * come after it.
 */
export class Ui {
  readonly title = new Title();
  readonly firstScreen: FirstScreen;
  readonly bar: Bar;
  readonly message: MessageBox;
  readonly drawer = new Drawer();
  readonly demoList: DemoList;
  readonly seatList: SeatList;
  readonly settings: Settings;
  readonly credits = new Credits(licensesUrl(import.meta.env.BASE_URL));
  readonly dropOverlay: DropOverlay;
  readonly tooltips: Tooltips;
  readonly #phone: MediaQueryList;

  /**
   * Creates the UI and adds it to a parent element.
   *
   * @param parent The element that gets the UI, after the canvas.
   * @param actions The actions of the controls.
   * @param volume The position of the volume slider at start, from 0 to 100.
   * @param canFullScreen False if the browser has no full screen for the page.
   * @param target The window that gets the drags of files, with the media query of the phone
   *   layout.
   */
  constructor(
    parent: HTMLElement,
    actions: UiActions,
    volume: number,
    canFullScreen: boolean,
    target: Window,
  ) {
    this.tooltips = new Tooltips(target);
    this.bar = new Bar(actions, volume, canFullScreen, this.tooltips);
    this.firstScreen = new FirstScreen(
      actions.onFirstPlay,
      () => {
        this.openDemoList();
      },
      () => {
        this.bar.focusPlay();
      },
    );
    this.message = new MessageBox({
      onRetry: actions.onRetry,
      onClose: actions.onCloseMessage,
      focusAfterClose: () => {
        this.bar.focusPlay();
      },
    });
    this.demoList = new DemoList(actions.onSelectDemo);
    this.drawer.addSection('Demos', this.demoList.element, new FilePicker(actions.onFile).element);
    this.seatList = new SeatList(actions.onSeatFlag, this.tooltips);
    this.drawer.addSection('Seats', this.seatList.element).append(this.seatList.collapse);
    this.settings = new Settings(actions.onSectionSize, actions.onQuality);
    this.drawer.addSection('Settings', this.settings.element);
    this.drawer.addSection('Credits', this.credits.element);
    this.dropOverlay = new DropOverlay(target, actions.onFile);
    // On a phone, the "Playback" group of the settings holds four controls of the bar (2.8).
    const phone = target.matchMedia(PHONE_LAYOUT_QUERY);
    this.#phone = phone;
    const placePlayback = (): void => {
      this.bar.placePlayback(phone.matches ? this.settings.playbackRow : null);
    };
    phone.addEventListener('change', placePlayback);
    placePlayback();
    parent.append(
      this.title.element,
      this.firstScreen.element,
      this.bar.element,
      this.message.element,
      this.drawer.element,
      this.dropOverlay.element,
      this.tooltips.element,
    );
  }

  /**
   * Opens the drawer at the demo list, and gives the focus to the row of the current demo (design
   * 2.8, audit 2026-10-05-ux-design, FI2). The button "Select a piece" of the first screen uses
   * it.
   */
  openDemoList(): void {
    this.drawer.setOpen(true);
    this.drawer.element.scrollTop = 0;
    this.demoList.focusCurrent();
  }

  /**
   * Closes the sheet of the phone layout after a selection in it, so that the new piece shows
   * (design 2.8, audit 2026-10-05-ux-design, PH1). The drawer of a wider screen stays open, so
   * that the user can select again. The drawer button gets the focus that the sheet held, as
   * after the Escape key.
   */
  closeSheetAfterSelection(): void {
    if (!this.#phone.matches || !this.drawer.open) {
      return;
    }
    const refocus = this.drawer.focused;
    this.drawer.setOpen(false);
    if (refocus) {
      this.bar.focusDrawerButton();
    }
  }
}
