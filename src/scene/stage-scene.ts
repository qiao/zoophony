import { Scene } from 'three';
import type { WebGLRenderer } from 'three';

import type { SceneLayout } from '../models/layout.ts';
import { buildPlayer } from '../models/player.ts';
import { violinPlayingPose } from '../pose/violin-pose.ts';
import { StageCamera } from './camera.ts';
import { disposeTree } from './dispose.ts';
import { createMaterials } from './geometry.ts';
import { createLights } from './lights.ts';
import { tierPixelRatio } from './quality.ts';
import type { QualityTier } from './quality.ts';
import { applyPose, createMusicStand, createPlayerMesh, createSeatedPlayer } from './player.ts';
import { createRenderer } from './renderer.ts';
import { createStage } from './stage.ts';

/** The inputs of {@link StageScene}. */
export interface StageSceneOptions {
  /** The positions of the stage, the players, and the stands. */
  readonly layout: SceneLayout;
  readonly tier: QualityTier;
  readonly devicePixelRatio: number;
  /** True if the user prefers reduced motion (design 2.5). */
  readonly reducedMotion: boolean;
}

/**
 * The 3D scene of the page: the renderer, the stage, the lights, the camera, and the players. In
 * step 3, each player is a rabbit with a violin in a static playing pose.
 */
export class StageScene {
  readonly #renderer: WebGLRenderer;
  readonly #scene = new Scene();
  readonly #camera: StageCamera;
  readonly #tier: QualityTier;

  /**
   * Creates the scene on a canvas.
   *
   * @param canvas The canvas of the page. The CSS sets its size.
   * @param options The layout, the quality tier, and the motion preference.
   */
  constructor(canvas: HTMLCanvasElement, options: StageSceneOptions) {
    const { layout } = options;
    this.#tier = options.tier;
    this.#renderer = createRenderer(canvas, options.tier, options.devicePixelRatio);
    this.#camera = new StageCamera(canvas, layout.stageSide, options.reducedMotion);
    const materials = createMaterials();
    this.#scene.add(createStage(layout.stageSide, materials));
    this.#scene.add(createLights(layout.stageSide, options.tier));
    const model = buildPlayer('rabbit', 'violin');
    const pose = violinPlayingPose(model);
    for (const place of layout.players) {
      const mesh = createPlayerMesh(model, materials);
      applyPose(mesh, pose);
      this.#scene.add(createSeatedPlayer(mesh, place, materials));
    }
    for (const stand of layout.stands) {
      this.#scene.add(createMusicStand(stand, materials));
    }
  }

  /**
   * Sets the size of the drawing buffer and of the camera view. A browser zoom or a move to
   * another display changes the `devicePixelRatio`, so the pixel ratio of the tier follows it.
   *
   * @param width The width of the canvas, in CSS pixels.
   * @param height The height of the canvas, in CSS pixels.
   * @param devicePixelRatio The current `devicePixelRatio` of the window.
   */
  resize(width: number, height: number, devicePixelRatio: number): void {
    const pixelRatio = tierPixelRatio(this.#tier, devicePixelRatio);
    if (pixelRatio !== this.#renderer.getPixelRatio()) {
      this.#renderer.setPixelRatio(pixelRatio);
    }
    this.#renderer.setSize(width, height, false);
    this.#camera.resize(width, height);
  }

  /** Renders one frame. */
  render(): void {
    this.#camera.update();
    this.#renderer.render(this.#scene, this.#camera.camera);
  }

  /**
   * Frees the GPU resources of the scene and the renderer, and removes the listeners of the orbit
   * controls. Call it before a new scene replaces this one, for example for another demo. The
   * scene must not render again.
   */
  dispose(): void {
    disposeTree(this.#scene);
    this.#camera.dispose();
    this.#renderer.dispose();
  }
}
