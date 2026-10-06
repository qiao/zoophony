/** The seek of the left and the right arrow keys, in seconds (design 2.4). */
export const KEY_SEEK_SEC = 5;

/** The action of a key of the page (design 2.4). */
export type KeyAction = 'play' | 'seek-back' | 'seek-forward' | 'seek-start';

/**
 * The kind of the element with the keyboard focus. A control that uses a key itself keeps it:
 * a button uses Space, a range uses the arrows and Home, and a menu uses Space and the arrows.
 */
export type FocusKind = 'page' | 'button' | 'range' | 'menu' | 'text';

/** A key press of the page. */
export interface KeyPress {
  /** The `KeyboardEvent.key`, for example ' ' or 'ArrowLeft'. */
  readonly key: string;
  /** True for a key that the system repeats while the user holds it. */
  readonly repeat: boolean;
  /** True with Ctrl, Alt, or Meta: a shortcut of the browser or of the system. */
  readonly modified: boolean;
}

/**
 * Gives the action of a key of the page (design 2.4): Space plays and pauses, the left and the
 * right arrows seek 5 s, and Home goes to the start. The keys do nothing while the focus is in a
 * text field, with Ctrl, Alt, or Meta, and when the control with the focus uses the key itself.
 * Space does not repeat, so that a held key does not play and pause many times.
 *
 * @param press The key press.
 * @param focus The kind of the element with the focus.
 * @returns The action, or `null` for none.
 */
export function keyAction(press: KeyPress, focus: FocusKind): KeyAction | null {
  if (press.modified || focus === 'text') {
    return null;
  }
  switch (press.key) {
    case ' ':
      return press.repeat || focus === 'button' || focus === 'menu' ? null : 'play';
    case 'ArrowLeft':
      return focus === 'range' || focus === 'menu' ? null : 'seek-back';
    case 'ArrowRight':
      return focus === 'range' || focus === 'menu' ? null : 'seek-forward';
    case 'Home':
      return focus === 'range' || focus === 'menu' ? null : 'seek-start';
    default:
      return null;
  }
}

/**
 * Gives the seek point of a seek key.
 *
 * @param action The seek action.
 * @param songSec The song time that the bar shows, in seconds.
 * @returns The seek point, in song seconds. `App` limits it to the song.
 */
export function keySeekPoint(action: Exclude<KeyAction, 'play'>, songSec: number): number {
  switch (action) {
    case 'seek-back':
      return songSec - KEY_SEEK_SEC;
    case 'seek-forward':
      return songSec + KEY_SEEK_SEC;
    case 'seek-start':
      return 0;
  }
}
