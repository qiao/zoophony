import { isClick } from './pick.ts';
import type { PointerPoint } from './pick.ts';

/**
 * The two camera modes (design 2.5). In `cinematic`, the shots of design 5.6 move the camera. In
 * `free`, the orbit controls move it.
 */
export type CameraMode = 'cinematic' | 'free';

/**
 * An event that can change the camera mode (design 2.5): a drag of more than 4 px, a wheel, or a
 * pinch on the stage; a click of 4 px or less; the "Automatic camera" button or the key C;
 * "Reset view"; and a new piece or a new section size.
 */
export type CameraEvent = 'drag' | 'wheel' | 'pinch' | 'click' | 'toggle' | 'reset' | 'new-piece';

/**
 * Gives the camera mode at the page load (design 2.5).
 *
 * @param reducedMotion True if the user prefers reduced motion.
 * @returns `free` with reduced motion, else `cinematic`.
 */
export function startMode(reducedMotion: boolean): CameraMode {
  return reducedMotion ? 'free' : 'cinematic';
}

/**
 * Gives the camera mode after an event (design 2.5). A drag, a wheel, or a pinch changes to Free
 * from the current camera. A click keeps the mode. The toggle switches the mode. "Reset view"
 * changes to Free at the default view. A new piece keeps the mode.
 *
 * @param mode The mode before the event.
 * @param event The event.
 * @returns The mode after the event.
 */
export function nextMode(mode: CameraMode, event: CameraEvent): CameraMode {
  switch (event) {
    case 'drag':
    case 'wheel':
    case 'pinch':
    case 'reset':
      return 'free';
    case 'toggle':
      return mode === 'cinematic' ? 'free' : 'cinematic';
    case 'click':
    case 'new-piece':
      return mode;
  }
}

/**
 * Tells if an event of the stage moves the camera (design 2.5). While the first screen shows,
 * the zoom is off: a wheel or a pinch does not move the camera, so it keeps the mode. The frame
 * of the first screen shrinks with the camera, so that the stage stays clear of the play button
 * (design 2.8). A zoom moved the camera into the stage, the frame shrank to 0.18 of the window,
 * and the view looked steeply down at a corner of the stage (bug report of 2026-10-07). A drag
 * still turns the view.
 *
 * @param event The event.
 * @param firstScreen True while the first screen shows: before the first play of the piece.
 * @returns False for a zoom on the first screen, else true.
 */
export function movesCamera(event: CameraEvent, firstScreen: boolean): boolean {
  return !firstScreen || (event !== 'wheel' && event !== 'pinch');
}

/**
 * Gives the event of a pointer motion on the stage (design 2.3, 2.5). A motion of more than 4 CSS
 * pixels from the press is a drag of the view, or a pinch with two or more pointers down.
 *
 * @param down The position of the press of the pointer.
 * @param now The current position of the pointer.
 * @param pointers The number of pointers that are down on the stage.
 * @returns The event, or `null` while the motion is still a click.
 */
export function motionEvent(
  down: PointerPoint,
  now: PointerPoint,
  pointers: number,
): CameraEvent | null {
  if (isClick(down, now)) {
    return null;
  }
  return pointers >= 2 ? 'pinch' : 'drag';
}
