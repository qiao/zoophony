import './ui.css';

import { ABOUT_TEXT } from '../app/messages.ts';
import { APP_NAME } from '../app/page-title.ts';
import { createElement } from './dom.ts';

/**
 * Shows a message that covers the page in place of the app, for example for a browser with no
 * WebGL2 (design 2.6, 2.8). The name of the app and one line about it stand above the message.
 *
 * @param parent The element that gets the message.
 * @param text The message text of design 2.8.
 */
export function showFullPageMessage(parent: HTMLElement, text: string): void {
  const page = createElement('main', 'full-page');
  const box = createElement('div', 'full-page-box');
  box.append(
    createElement('h1', '', APP_NAME),
    createElement('p', 'about', ABOUT_TEXT),
    createElement('p', 'message-text', text),
  );
  page.append(box);
  parent.append(page);
}
