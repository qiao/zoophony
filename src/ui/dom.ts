/**
 * Creates an HTML element with a class and a text.
 *
 * @param tag The tag name.
 * @param className The class, or '' for none.
 * @param text The text content, or '' for none.
 * @returns The element.
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text) {
    element.textContent = text;
  }
  return element;
}

/**
 * Creates a button with an accessible name (design 2.8).
 *
 * @param className The class, or '' for none.
 * @param label The `aria-label`, or '' for a button that shows its name as text.
 * @returns The button.
 */
export function createButton(className: string, label: string): HTMLButtonElement {
  const button = createElement('button', className);
  button.type = 'button';
  if (label) {
    button.setAttribute('aria-label', label);
  }
  return button;
}

/**
 * Sets the text of an element if it changed. A frame calls it, so it writes the DOM only on a
 * change.
 *
 * @param element The element.
 * @param text The text.
 */
export function setText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

/**
 * Sets an attribute of an element if it changed.
 *
 * @param element The element.
 * @param name The attribute name.
 * @param value The value.
 */
export function setAttribute(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) {
    element.setAttribute(name, value);
  }
}
