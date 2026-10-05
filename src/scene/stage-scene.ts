import { Scene } from 'three';
import type { WebGLRenderer } from 'three';

import { CONDUCTOR } from '../models/cast.ts';
import type { SceneLayout } from '../models/layout.ts';
import { buildSceneProps } from '../models/props.ts';
import { StageCamera } from './camera.ts';
import { disposeTree } from './dispose.ts';
import { createMaterials } from './geometry.ts';
import { createLights } from './lights.ts';
import { tierPixelRatio } from './quality.ts';
import type { QualityTier } from './quality.ts';
import { createPlayers, createStaticMesh } from './player.ts';
import type { PlayerSpot } from './player.ts';
import { createRenderer } from './renderer.ts';
import { createStage } from './stage.ts';

/** The inputs of {@link StageScene}. */
export interface StageSceneOptions {
  readonly tier: QualityTier;
  readonly devicePixelRatio: number;
  /** True if the user prefers reduced motion (design 2.5). */
  readonly reducedMotion: boolean;
}

/**
 * Gives the players of a layout and the conductor on the podium (design 4.5, 4.6). The conductor
 * is not in `layout.players`. `layout.conductor` gives its place on the podium top.
 *
 * @param layout The layout of a score.
 * @returns The places of the players, then of the conductor.
 */
export function playerSpots(layout: SceneLayout): PlayerSpot[] {
  return [
    ...layout.players.map(({ cast, position, facing }) => ({
      species: cast.species,
      instrument: cast.instrument,
      kettles: cast.kettles,
      position,
      facing,
    })),
    { ...CONDUCTOR, kettles: 4, ...layout.conductor },
  ];
}

/** The scene and the camera of one layout. */
interface LayoutView {
  readonly scene: Scene;
  readonly camera: StageCamera;
}

/**
 * The 3D scene of the page: the renderer, and the stage, the lights, the camera, the props, and
 * the players of one layout. The page keeps one renderer, so that a new layout does not compile
 * the shader programs again (review of step 4, F6). Before step 5, the violins and the violas
 * show the static playing pose of step 3, and the other players show the bind pose.
 */
export class StageScene {
  readonly #canvas: HTMLCanvasElement;
  readonly #renderer: WebGLRenderer;
  readonly #tier: QualityTier;
  readonly #reducedMotion: boolean;
  readonly #materials = createMaterials();
  #view: LayoutView | null = null;
  #width = 1;
  #height = 1;

  /**
   * Creates the renderer on a canvas. The scene shows nothing until {@link StageScene.show}.
   *
   * @param canvas The canvas of the page. The CSS sets its size.
   * @param options The quality tier and the motion preference.
   */
  constructor(canvas: HTMLCanvasElement, options: StageSceneOptions) {
    this.#canvas = canvas;
    this.#tier = options.tier;
    this.#reducedMotion = options.reducedMotion;
    this.#renderer = createRenderer(canvas, options.tier, options.devicePixelRatio);
  }

  /**
   * Shows a layout. The scene of the previous layout frees its geometries, its own materials,
   * and its lights. The matte and the metal material stay for the next layout. The camera
   * returns to the default view of the new stage.
   *
   * @param layout The positions of the stage, the players, and the stands.
   */
  show(layout: SceneLayout): void {
    const scene = new Scene();
    const materials = this.#materials;
    scene.add(createStage(layout.stageSide, layout.podium, materials));
    scene.add(createLights(layout.stageSide, this.#tier));
    scene.add(createStaticMesh(buildSceneProps(layout), materials));
    scene.add(createPlayers(playerSpots(layout), materials));
    const camera = new StageCamera(this.#canvas, layout.stageSide, this.#reducedMotion);
    camera.resize(this.#width, this.#height);
    // The new scene takes its shader programs before the old scene frees its materials, so the
    // renderer keeps the programs that both use.
    this.#renderer.compile(scene, camera.camera);
    this.#disposeView();
    this.#view = { scene, camera };
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
    this.#width = width;
    this.#height = height;
    const pixelRatio = tierPixelRatio(this.#tier, devicePixelRatio);
    if (pixelRatio !== this.#renderer.getPixelRatio()) {
      this.#renderer.setPixelRatio(pixelRatio);
    }
    this.#renderer.setSize(width, height, false);
    this.#view?.camera.resize(width, height);
  }

  /** Renders one frame of the current layout. With no layout, it does nothing. */
  render(): void {
    if (!this.#view) {
      return;
    }
    this.#view.camera.update();
    this.#renderer.render(this.#view.scene, this.#view.camera.camera);
  }

  /**
   * Frees the GPU resources of the scene, the materials, and the renderer, and removes the
   * listeners of the orbit controls. The scene must not render again.
   */
  dispose(): void {
    this.#disposeView();
    for (const material of this.#materials) {
      material.dispose();
    }
    this.#renderer.dispose();
  }

  #disposeView(): void {
    if (!this.#view) {
      return;
    }
    disposeTree(this.#view.scene, new Set(this.#materials));
    this.#view.camera.dispose();
    this.#view = null;
  }
}
