import { PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import {
  DISTANCE_LIMITS,
  ELEVATION_LIMITS,
  FIELD_OF_VIEW,
  NEAR,
  VIEW_OFFSET_Y,
  defaultView,
  farPlane,
} from './view.ts';

/** The camera and the orbit controls of the stage (design 2.5, 4.5). */
export class StageCamera {
  readonly camera: PerspectiveCamera;
  readonly #controls: OrbitControls;
  readonly #stageSide: number;
  #width = 1;
  #height = 1;
  /** True after the user moves the view. Then a resize keeps the view of the user. */
  #moved = false;

  /**
   * Creates the camera and its orbit controls.
   *
   * @param canvas The element that gets the pointer events.
   * @param stageSide The stage side `S`, in meters.
   * @param reducedMotion True if the user prefers reduced motion. Then the controls have no
   *   inertia (design 2.5).
   */
  constructor(canvas: HTMLCanvasElement, stageSide: number, reducedMotion: boolean) {
    this.#stageSide = stageSide;
    this.camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, NEAR, farPlane(1, stageSide));
    const controls = new OrbitControls(this.camera, canvas);
    // Design 2.5: the controls rotate and zoom. The target stays on the stage center.
    controls.enablePan = false;
    controls.enableDamping = !reducedMotion;
    // The polar angle of three.js counts from the vertical, so it is 90° less the elevation.
    controls.minPolarAngle = Math.PI / 2 - ELEVATION_LIMITS[1];
    controls.maxPolarAngle = Math.PI / 2 - ELEVATION_LIMITS[0];
    controls.addEventListener('start', () => {
      this.#moved = true;
    });
    this.#controls = controls;
  }

  /**
   * Sets the size of the viewport. Before the user moves the view, the camera takes the default
   * view of the new size.
   *
   * @param width The width of the canvas, in CSS pixels.
   * @param height The height of the canvas, in CSS pixels.
   */
  resize(width: number, height: number): void {
    this.#width = width;
    this.#height = height;
    this.camera.aspect = width / height;
    // The image moves up by half the bar height (design 4.5, camera).
    this.camera.setViewOffset(width, height, 0, VIEW_OFFSET_Y, width, height);
    const { distance } = defaultView(this.#stageSide, width, height);
    this.#controls.minDistance = DISTANCE_LIMITS[0] * distance;
    this.#controls.maxDistance = DISTANCE_LIMITS[1] * distance;
    if (this.#moved) {
      this.camera.updateProjectionMatrix();
    } else {
      this.reset();
    }
  }

  /** Returns to the default view ("Reset view", design 2.5). */
  reset(): void {
    const view = defaultView(this.#stageSide, this.#width, this.#height);
    this.camera.position.set(...view.position);
    this.#controls.target.set(...view.target);
    this.#controls.update();
    this.#moved = false;
    this.#updateFar();
  }

  /** Applies the inertia of the controls, and keeps the far plane behind the stage. */
  update(): void {
    this.#controls.update();
    this.#updateFar();
  }

  /** Removes the event listeners of the orbit controls from the canvas. */
  dispose(): void {
    this.#controls.dispose();
  }

  #updateFar(): void {
    const distance = this.camera.position.distanceTo(this.#controls.target);
    this.camera.far = farPlane(distance, this.#stageSide);
    this.camera.updateProjectionMatrix();
  }
}
