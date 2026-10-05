import { Scene } from 'three';
import type { WebGLRenderer } from 'three';

import { CONDUCTOR } from '../models/cast.ts';
import type { SceneLayout } from '../models/layout.ts';
import { buildSceneProps } from '../models/props.ts';
import { PODIUM_SIZE } from '../models/stage.ts';
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
  /** The positions of the stage, the players, and the stands. */
  readonly layout: SceneLayout;
  readonly tier: QualityTier;
  readonly devicePixelRatio: number;
  /** True if the user prefers reduced motion (design 2.5). */
  readonly reducedMotion: boolean;
}

/**
 * Gives the players of a layout and the conductor on the podium (design 4.5, 4.6). The conductor
 * is not in `layout.players`. It stands on the podium top and faces the orchestra.
 *
 * @param layout The layout of a score.
 * @returns The places of the players, then of the conductor.
 */
export function playerSpots(layout: SceneLayout): PlayerSpot[] {
  const [x, y, z] = layout.podium;
  return [
    ...layout.players.map(({ cast, position, facing }) => ({
      species: cast.species,
      instrument: cast.instrument,
      kettles: cast.kettles,
      position,
      facing,
    })),
    { ...CONDUCTOR, kettles: 4, position: [x, y + PODIUM_SIZE[1], z], facing: 0 },
  ];
}

/**
 * The 3D scene of the page: the renderer, the stage, the lights, the camera, the props, and the
 * players of one layout. Before step 5, the violins and the violas show the static playing pose
 * of step 3, and the other players show the bind pose.
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
    this.#scene.add(createStage(layout.stageSide, layout.podium, materials));
    this.#scene.add(createLights(layout.stageSide, options.tier));
    this.#scene.add(createStaticMesh(buildSceneProps(layout), materials));
    this.#scene.add(createPlayers(playerSpots(layout), materials));
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
