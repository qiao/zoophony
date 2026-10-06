import './ui.css';

import { createElement } from './dom.ts';

/**
 * Shows a message that covers the page in place of the app, for example for a browser with no
 * WebGL2 (design 2.6, 2.8).
 *
 * @param parent The element that gets the message.
 * @param text The message text of design 2.8.
 */
export function showFullPageMessage(parent: HTMLElement, text: string): void {
  const page = createElement('main', 'full-page');
  page.append(createElement('p', '', text));
  parent.append(page);
}
