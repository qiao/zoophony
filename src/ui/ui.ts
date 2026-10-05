import './ui.css';

import type { DemoId } from '../app/demos.ts';
import { Bar } from './bar.ts';
import type { BarActions } from './bar.ts';
import { DemoList } from './demo-list.ts';
import { Drawer } from './drawer.ts';
import { DropOverlay } from './drop-overlay.ts';
import { FilePicker } from './file-picker.ts';
import { FirstScreen } from './first-screen.ts';
import { Title } from './title.ts';

/** The actions of all controls of the UI. */
export interface UiActions extends BarActions {
  /** A click on the play button of the first screen. */
  readonly onFirstPlay: () => void;
  /** A click on a row of the demo list. */
  readonly onSelectDemo: (id: DemoId) => void;
  /** A file that the user selected with the file button or dropped on the page. */
  readonly onFile: (file: File) => void;
}

/**
 * The UI over the canvas (design 2.3, 2.8): the title, the first screen, the bar, the drawer with
 * the demo list and the file button, and the drop overlay. The DOM order gives the focus order of 2.8: the title, the bar, then the
 * drawer. The play button of the first screen comes before the bar.
 */
export class Ui {
  readonly title = new Title();
  readonly firstScreen: FirstScreen;
  readonly bar: Bar;
  readonly drawer = new Drawer();
  readonly demoList: DemoList;
  readonly dropOverlay: DropOverlay;

  /**
   * Creates the UI and adds it to a parent element.
   *
   * @param parent The element that gets the UI, after the canvas.
   * @param actions The actions of the controls.
   * @param volume The position of the volume slider at start, from 0 to 100.
   * @param canFullScreen False if the browser has no full screen for the page.
   * @param target The window that gets the drags of files.
   */
  constructor(
    parent: HTMLElement,
    actions: UiActions,
    volume: number,
    canFullScreen: boolean,
    target: Window,
  ) {
    this.firstScreen = new FirstScreen(actions.onFirstPlay);
    this.bar = new Bar(actions, volume, canFullScreen);
    this.demoList = new DemoList(actions.onSelectDemo);
    this.drawer.addSection('Demos', this.demoList.element, new FilePicker(actions.onFile).element);
    this.dropOverlay = new DropOverlay(target, actions.onFile);
    parent.append(
      this.title.element,
      this.firstScreen.element,
      this.bar.element,
      this.drawer.element,
      this.dropOverlay.element,
    );
  }
}
