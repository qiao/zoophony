import { Scene } from 'three';
import type { WebGLRenderer } from 'three';

import { StageCamera } from './camera.ts';
import { createMaterials } from './geometry.ts';
import { createLights } from './lights.ts';
import type { QualityTier } from './quality.ts';
import { createRenderer } from './renderer.ts';
import { createStage } from './stage.ts';

/** The inputs of {@link StageScene}. */
export interface StageSceneOptions {
  /** The stage side `S`, in meters. */
  readonly stageSide: number;
  readonly tier: QualityTier;
  readonly devicePixelRatio: number;
  /** True if the user prefers reduced motion (design 2.5). */
  readonly reducedMotion: boolean;
}

/** The 3D scene of the page: the renderer, the stage, the lights, and the camera. */
export class StageScene {
  readonly #renderer: WebGLRenderer;
  readonly #scene = new Scene();
  readonly #camera: StageCamera;

  /**
   * Creates the scene on a canvas.
   *
   * @param canvas The canvas of the page. The CSS sets its size.
   * @param options The stage size, the quality tier, and the motion preference.
   */
  constructor(canvas: HTMLCanvasElement, options: StageSceneOptions) {
    this.#renderer = createRenderer(canvas, options.tier, options.devicePixelRatio);
    this.#camera = new StageCamera(canvas, options.stageSide, options.reducedMotion);
    const materials = createMaterials();
    this.#scene.add(createStage(options.stageSide, materials));
    this.#scene.add(createLights(options.stageSide, options.tier));
  }

  /**
   * Sets the size of the drawing buffer and of the camera view.
   *
   * @param width The width of the canvas, in CSS pixels.
   * @param height The height of the canvas, in CSS pixels.
   */
  resize(width: number, height: number): void {
    this.#renderer.setSize(width, height, false);
    this.#camera.resize(width, height);
  }

  /** Renders one frame. */
  render(): void {
    this.#camera.update();
    this.#renderer.render(this.#scene, this.#camera.camera);
  }
}
