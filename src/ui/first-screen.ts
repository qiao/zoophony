import { createButton, createElement, setAttribute, setText } from './dom.ts';
import { createIcon } from './icons.ts';

/** The radius of the load ring in its view box of 84 × 84. */
const RING_RADIUS = 40;

/** The length of the load ring. */
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** The namespace of SVG elements. */
const SVG_NS = 'http://www.w3.org/2000/svg';

/** What the first screen shows in one frame. */
export interface FirstScreenView {
  readonly shown: boolean;
  /** True while the samples load. Then the ring shows the progress. */
  readonly loading: boolean;
  /** The part of the ring that shows the progress, from 0 to 1. */
  readonly loadShare: number;
  /** The load text, or '' for none. */
  readonly loadText: string;
}

/**
 * Creates one circle of the load ring.
 *
 * @param className The class of the circle.
 * @returns The circle.
 */
function createRingCircle(className: string): SVGCircleElement {
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('class', className);
  circle.setAttribute('cx', '42');
  circle.setAttribute('cy', '42');
  circle.setAttribute('r', String(RING_RADIUS));
  return circle;
}

/**
 * The first screen (design 2.2, 2.8): a round play button of 72 px in the middle of the stage.
 * While the samples load, a ring around the button shows the progress, and a label below it shows
 * the load text. A polite live region reads the load text (2.8).
 */
export class FirstScreen {
  readonly element: HTMLElement;
  readonly #ring: SVGSVGElement;
  readonly #done: SVGCircleElement;
  readonly #status: HTMLElement;

  /**
   * Creates the first screen.
   *
   * @param onPlay The action of a click on the play button.
   */
  constructor(onPlay: () => void) {
    this.element = createElement('div', 'first-screen');
    const button = createButton('', 'Play');
    button.addEventListener('click', onPlay);
    this.#ring = document.createElementNS(SVG_NS, 'svg');
    this.#ring.setAttribute('class', 'ring');
    this.#ring.setAttribute('viewBox', '0 0 84 84');
    this.#ring.setAttribute('aria-hidden', 'true');
    this.#done = createRingCircle('done');
    this.#done.setAttribute('stroke-dasharray', RING_LENGTH.toFixed(1));
    this.#done.setAttribute('stroke-dashoffset', RING_LENGTH.toFixed(1));
    this.#ring.append(createRingCircle('track'), this.#done);
    button.append(this.#ring, createIcon('play', 'icon'));
    this.#status = createElement('div', 'status');
    this.#status.setAttribute('aria-live', 'polite');
    this.element.append(button, this.#status);
  }

  /**
   * Shows the state of one frame. It writes the DOM only where a value changed.
   *
   * @param view The values of the frame.
   */
  update(view: FirstScreenView): void {
    this.element.hidden = !view.shown;
    this.#ring.style.visibility = view.loading ? '' : 'hidden';
    const offset = (RING_LENGTH * (1 - view.loadShare)).toFixed(1);
    setAttribute(this.#done, 'stroke-dashoffset', offset);
    setText(this.#status, view.loading ? view.loadText : '');
  }
}
