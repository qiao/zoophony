import { PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import type { Vec3 } from '../models/tuples.ts';
import type { CameraPose } from '../shots/types.ts';
import {
  ELEVATION_LIMITS,
  FIELD_OF_VIEW,
  MAX_DISTANCE_FACTOR,
  MIN_DISTANCE,
  NEAR,
  VIEW_OFFSET_Y,
  defaultView,
  farPlane,
} from '../shots/view.ts';

/**
 * The camera and the orbit controls of the stage (design 2.5, 4.5). In Cinematic mode, the shots
 * of design 5.6 move the camera with {@link StageCamera.follow}. In Free mode, the orbit controls
 * move it with {@link StageCamera.update}, from the camera of the last frame.
 */
export class StageCamera {
  readonly camera: PerspectiveCamera;
  readonly #controls: OrbitControls;
  readonly #stageSide: number;
  #width = 1;
  #height = 1;
  /** True after the user or a shot moves the view. Then a resize keeps the view. */
  #moved = false;

  /**
   * Creates the camera and its orbit controls.
   *
   * @param canvas The element that gets the pointer events, or `null` with no events (a test).
   * @param stageSide The stage side `S`, in meters.
   * @param reducedMotion True if the user prefers reduced motion. Then the controls have no
   *   inertia (design 2.5).
   */
  constructor(canvas: HTMLElement | null, stageSide: number, reducedMotion: boolean) {
    this.#stageSide = stageSide;
    this.camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, NEAR, farPlane(1, stageSide));
    const controls = new OrbitControls(this.camera, canvas);
    // Design 2.5: the controls rotate and zoom around the target of the last shot.
    controls.enablePan = false;
    controls.enableDamping = !reducedMotion;
    // The polar angle of three.js counts from the vertical, so it is 90° less the elevation.
    controls.minPolarAngle = Math.PI / 2 - ELEVATION_LIMITS[1];
    controls.maxPolarAngle = Math.PI / 2 - ELEVATION_LIMITS[0];
    controls.minDistance = MIN_DISTANCE;
    controls.addEventListener('start', () => {
      this.#moved = true;
    });
    this.#controls = controls;
  }

  /**
   * Sets the size of the viewport. Before the view moves, the camera takes the default view of
   * the new size.
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
    this.#controls.maxDistance = MAX_DISTANCE_FACTOR * distance;
    if (this.#moved) {
      this.camera.updateProjectionMatrix();
    } else {
      this.reset();
    }
  }

  /** The width of the view divided by its height. */
  get aspect(): number {
    return this.#width / this.#height;
  }

  /** The point that the camera looks at, and that the orbit controls turn around. */
  get target(): Vec3 {
    const { x, y, z } = this.#controls.target;
    return [x, y, z];
  }

  /** Returns to the default view with the field of view of 4.5 ("Reset view", design 2.5). */
  reset(): void {
    const view = defaultView(this.#stageSide, this.#width, this.#height);
    this.camera.position.set(...view.position);
    this.camera.fov = FIELD_OF_VIEW;
    this.#controls.target.set(...view.target);
    this.#controls.update();
    this.#moved = false;
    this.#updateFar();
  }

  /**
   * Shows the camera of a shot (Cinematic mode, design 5.6). It also moves the target of the
   * orbit controls, so that a change to Free mode continues from this camera with no jump.
   *
   * @param pose The camera from `cameraAt()`.
   */
  follow(pose: CameraPose): void {
    this.camera.position.set(...pose.position);
    this.#controls.target.set(...pose.target);
    this.camera.lookAt(this.#controls.target);
    this.camera.fov = pose.fov;
    this.#moved = true;
    this.#updateFar();
  }

  /** Applies the inertia of the controls (Free mode), and keeps the far plane behind the stage. */
  update(): void {
    this.#controls.update();
    this.#updateFar();
  }

  /** Removes the event listeners of the orbit controls from the canvas. */
  dispose(): void {
    if (this.#controls.domElement) {
      this.#controls.dispose();
    }
  }

  #updateFar(): void {
    const distance = this.camera.position.distanceTo(this.#controls.target);
    this.camera.far = farPlane(distance, this.#stageSide);
    this.camera.updateProjectionMatrix();
  }
}
