import { Group, Scene } from 'three';
import type { SkinnedMesh, WebGLRenderer } from 'three';

import { CONDUCTOR } from '../models/cast.ts';
import type { SceneLayout } from '../models/layout.ts';
import type { ScenePose } from '../pose/types.ts';
import type { CameraPose } from '../shots/types.ts';
import type { ModelCache } from '../models/model-cache.ts';
import { buildSceneProps } from '../models/props.ts';
import { StageCamera } from './camera.ts';
import { disposeTree } from './dispose.ts';
import { createMaterials } from './geometry.ts';
import { createLights, setLightsTier } from './lights.ts';
import { pickPlayer } from './pick.ts';
import { tierPixelRatio } from './quality.ts';
import type { QualityTier } from './quality.ts';
import { applyScenePose, createPlayers, createStaticMesh } from './player.ts';
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
  /** The lights of the stage. Their shadows follow the quality tier. */
  readonly lights: Group;
  /** The meshes of the players in the order of `ScenePose.players`, then the conductor. */
  readonly players: readonly SkinnedMesh[];
}

/**
 * The 3D scene of the page: the renderer, and the stage, the lights, the camera, the props, and
 * the players of one layout. The page keeps one renderer, so that a new layout does not compile
 * the shader programs again (review of step 4, F6). The players show the bind pose until
 * {@link StageScene.pose} gives them the poses of a frame.
 */
export class StageScene {
  readonly #canvas: HTMLCanvasElement;
  readonly #renderer: WebGLRenderer;
  #tier: QualityTier;
  readonly #reducedMotion: boolean;
  readonly #materials = createMaterials();
  #view: LayoutView | null = null;
  #width = 1;
  #height = 1;
  #devicePixelRatio = 1;

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
    this.#devicePixelRatio = options.devicePixelRatio;
    this.#renderer = createRenderer(canvas, options.tier, options.devicePixelRatio);
  }

  /**
   * Shows a layout. The scene of the previous layout frees its geometries, its own materials,
   * and its lights. The matte and the metal material stay for the next layout. The camera
   * returns to the default view of the new stage.
   *
   * @param layout The positions of the stage, the players, and the stands.
   * @param models The player models of the score, which the layout and the pose plan share.
   */
  show(layout: SceneLayout, models: ModelCache): void {
    const scene = new Scene();
    const materials = this.#materials;
    scene.add(createStage(layout.stageSide, layout.podium, materials));
    const lights = createLights(layout.stageSide, this.#tier);
    scene.add(lights);
    scene.add(createStaticMesh(buildSceneProps(layout), materials));
    const players = createPlayers(playerSpots(layout), materials, models);
    scene.add(new Group().add(...players));
    const camera = new StageCamera(this.#canvas, layout.stageSide, this.#reducedMotion);
    camera.resize(this.#width, this.#height);
    // The new scene takes its shader programs before the old scene frees its materials, so the
    // renderer keeps the programs that both use.
    this.#renderer.compile(scene, camera.camera);
    this.#disposeView();
    this.#view = { scene, camera, lights, players };
  }

  /**
   * Copies the poses of a frame to the players of the current layout (design 5.1). With no
   * layout, it does nothing.
   *
   * @param pose The poses from `poseAt()` with the plan of the current layout.
   */
  pose(pose: ScenePose): void {
    if (this.#view) {
      applyScenePose(this.#view.players, pose);
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
    this.#width = width;
    this.#height = height;
    this.#devicePixelRatio = devicePixelRatio;
    const pixelRatio = tierPixelRatio(this.#tier, devicePixelRatio);
    if (pixelRatio !== this.#renderer.getPixelRatio()) {
      this.#renderer.setPixelRatio(pixelRatio);
    }
    this.#renderer.setSize(width, height, false);
    this.#view?.camera.resize(width, height);
  }

  /** The quality tier of the renderer (design 2.6). */
  get tier(): QualityTier {
    return this.#tier;
  }

  /**
   * Changes the quality tier (design 2.6): the pixel ratio of the canvas, and the shadow map and
   * the shadow blur of the spotlight. The next layout also uses the new tier.
   *
   * @param tier The new tier.
   */
  setTier(tier: QualityTier): void {
    if (tier === this.#tier) {
      return;
    }
    this.#tier = tier;
    if (this.#view) {
      setLightsTier(this.#view.lights, tier);
    }
    this.resize(this.#width, this.#height, this.#devicePixelRatio);
  }

  /**
   * Finds the player under a point of the canvas (design 2.3).
   *
   * @param x The x of the point from the left of the canvas, in CSS pixels.
   * @param y The y of the point from the top of the canvas, in CSS pixels.
   * @returns The index of the player in `ScenePose.players`, the index after the players for the
   *   conductor, or -1 for no animal.
   */
  pick(x: number, y: number): number {
    if (!this.#view) {
      return -1;
    }
    const camera = this.#view.camera.camera;
    return pickPlayer(
      this.#view.players,
      camera,
      (x / this.#width) * 2 - 1,
      1 - (y / this.#height) * 2,
    );
  }

  /**
   * Returns the camera to the default view of the stage ("Reset view", design 2.5). The app then
   * renders in Free mode.
   */
  resetView(): void {
    this.#view?.camera.reset();
  }

  /** The width of the canvas divided by its height, for the shots of design 5.6. */
  get aspect(): number {
    return this.#width / this.#height;
  }

  /**
   * Renders one frame of the current layout. With no layout, it does nothing.
   *
   * @param shot The camera of the shot of the frame in Cinematic mode, or `null` in Free mode.
   *   Then the orbit controls move the camera (design 2.5).
   */
  render(shot: CameraPose | null): void {
    if (!this.#view) {
      return;
    }
    if (shot) {
      this.#view.camera.follow(shot);
    } else {
      this.#view.camera.update();
    }
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
