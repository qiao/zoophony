import { Group, Mesh, Points, Scene, Vector2, Vector3 } from 'three';
import type { Object3D, SkinnedMesh, WebGLRenderTarget, WebGLRenderer } from 'three';

import { CONDUCTOR } from '../models/cast.ts';
import type { SceneLayout } from '../models/layout.ts';
import type { Vec3 } from '../models/tuples.ts';
import { headOf } from '../pose/plan.ts';
import type { ScenePose } from '../pose/types.ts';
import { freeBeamOpacity } from '../shots/beam-opacity.ts';
import type { FrameCover, ScreenBox, ViewFrame } from '../shots/frame.ts';
import type { CameraPose } from '../shots/types.ts';
import type { ModelCache } from '../models/model-cache.ts';
import { buildSceneProps } from '../models/props.ts';
import { StageCamera } from './camera.ts';
import { disposeTree } from './dispose.ts';
import { ENVIRONMENT, createEnvironment } from './environment.ts';
import { FREE_LENS, focusOf, freeFocusDistance, freeFocusOf } from './focus.ts';
import type { Focus, FocusSpot } from './focus.ts';
import { createMaterials } from './geometry.ts';
import { createHall, setHallCamera } from './hall.ts';
import { BeamDepth, setBeamFrame } from './beam.ts';
import { createLights, setLightsTier } from './lights.ts';
import { createPoolUniforms, defaultAim, setPoolAim } from './light-pool.ts';
import { pickPlayer } from './pick.ts';
import { tierPixelRatio } from './quality.ts';
import type { QualityTier } from './quality.ts';
import { applyScenePose, createPlayers, createStaticMesh } from './player.ts';
import type { PlayerSpot } from './player.ts';
import { PostPipeline, targetFormatOf } from './post.ts';
import { createRenderer, probeTargetFormat } from './renderer.ts';
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
 * is not in `layout.players`. `layout.conductor` gives its place on the podium top, and a chamber
 * group has no conductor (design 4.2).
 *
 * @param layout The layout of a score.
 * @returns The places of the players, then of the conductor, if the layout has one.
 */
export function playerSpots(layout: SceneLayout): PlayerSpot[] {
  const spots: PlayerSpot[] = layout.players.map(({ cast, position, facing }) => ({
    species: cast.species,
    instrument: cast.instrument,
    kettles: cast.kettles,
    support: cast.support,
    position,
    facing,
  }));
  if (layout.conductor) {
    spots.push({ ...CONDUCTOR, kettles: 4, support: 'stand', ...layout.conductor });
  }
  return spots;
}

/** The top of a head above the middle of its head bone, in meters: the head of the elephant. */
const HEAD_TOP = 0.5;

/**
 * Gives the highest point of the players above the stage top: the top of the stage in the first
 * screen (design 2.8).
 *
 * @param layout The layout.
 * @param models The player models of the layout.
 * @returns The height in meters, or 0 with no players.
 */
export function playersTop(layout: SceneLayout, models: ModelCache): number {
  let top = 0;
  for (const place of layout.players) {
    const { species, instrument, kettles, support } = place.cast;
    const head = headOf(models.get(species, instrument, kettles, support), place);
    top = Math.max(top, head[1] + HEAD_TOP);
  }
  return top;
}

/**
 * Gives the players and the conductor of a layout for the focus of Free mode (design 4.5): the
 * middle of each head.
 *
 * @param layout The layout.
 * @param models The player models of the layout.
 * @returns One spot for each player, then the conductor, if any.
 */
export function focusSpots(layout: SceneLayout, models: ModelCache): FocusSpot[] {
  return playerSpots(layout).map((spot) => {
    const model = models.get(spot.species, spot.instrument, spot.kettles, spot.support);
    const [x, top, z] = headOf(model, spot);
    return { x, z, top };
  });
}

/** The scene and the camera of one layout. */
interface LayoutView {
  /** The stage side `S`, in meters. */
  readonly stageSide: number;
  /** The heads of the players and the conductor, for the focus of Free mode (design 4.5). */
  readonly spots: readonly FocusSpot[];
  readonly scene: Scene;
  readonly camera: StageCamera;
  /** The lights of the stage. Their shadows follow the quality tier. */
  readonly lights: Group;
  /** The meshes of the players in the order of `ScenePose.players`, then the conductor, if any. */
  readonly players: readonly SkinnedMesh[];
  /** The hall around the stage. Its cutaway follows the camera. */
  readonly hall: Group;
  /** The light effects that write no depth, such as the visible beam (scene/post.ts). */
  readonly effects: readonly Object3D[];
}

/**
 * Gives the time of the moving light effects (design 2.5, 4.5): the drift of the haze and of the
 * dust motes, and the film grain.
 *
 * @param nowMs The wall time of the frame, in milliseconds.
 * @param reducedMotion True if the user prefers reduced motion.
 * @returns The wall time in seconds, or 0 with reduced motion, so that the effects stand still.
 */
export function effectTime(nowMs: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : nowMs / 1000;
}

/**
 * Finds the light effects of a scene: the objects with a material that writes no depth, such as
 * the visible beam and the light on the floor. The depth pass of the post effects hides them.
 *
 * @param scene The scene.
 * @returns The effects.
 */
export function lightEffects(scene: Object3D): Object3D[] {
  const effects: Object3D[] = [];
  scene.traverse((object) => {
    // A player and the stage have a list of materials, and each of them writes depth.
    const isEffect =
      (object instanceof Mesh || object instanceof Points) &&
      !Array.isArray(object.material) &&
      !object.material.depthWrite;
    if (isEffect) {
      effects.push(object);
    }
  });
  return effects;
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
  /** The environment of the reflections (design 4.5). A restored WebGL context makes it again. */
  #environment: WebGLRenderTarget;
  /** The post effects, or `null` for a GPU that cannot render to a target of floats. */
  readonly #post: PostPipeline | null;
  /** The depth of the scene for the haze of the beam (design 4.5). */
  readonly #beamDepth = new BeamDepth();
  #tier: QualityTier;
  readonly #reducedMotion: boolean;
  /** The pool of the stage lights (design 4.5), which the materials of the scene share. */
  readonly #pool = createPoolUniforms();
  readonly #materials = createMaterials(this.#pool);
  #view: LayoutView | null = null;
  #width = 1;
  #height = 1;
  #devicePixelRatio = 1;
  /** False while the first screen shows: then the orbit controls do not zoom (design 2.5). */
  #zoomAllowed = true;
  /** The focus distance of the last frame, in meters, or `null` before the first frame. */
  #focusDistance: number | null = null;
  /** The time of the last frame, in milliseconds, for the move of the focus of Free mode. */
  #focusMs = 0;

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
    // A GPU with no target of floats renders with no post effects, so its canvas has the MSAA
    // (design 2.6, review of step 8, L1).
    const look = probeTargetFormat() === 'none' ? 'stage' : 'post';
    this.#renderer = createRenderer(canvas, options.tier, options.devicePixelRatio, look);
    this.#environment = createEnvironment(this.#renderer);
    // The renderer listens first, and makes its state again. The PMREM of the environment is
    // rendered one time, so a lost context loses its content (review of step 8, U1).
    canvas.addEventListener('webglcontextrestored', () => {
      this.#restoreEnvironment();
    });
    const format = targetFormatOf(this.#renderer);
    this.#post = format === 'none' ? null : new PostPipeline(this.#renderer, format, options.tier);
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
    scene.environment = this.#environment.texture;
    scene.environmentIntensity = ENVIRONMENT.intensity;
    const materials = this.#materials;
    const hall = createHall(layout.stageSide);
    scene.add(hall);
    const podium = layout.conductor ? layout.podium : null;
    setPoolAim(this.#pool, defaultAim(layout.stageSide, podium));
    scene.add(createStage(layout.stageSide, podium, this.#pool));
    const lights = createLights(layout.stageSide, this.#tier, layout.conductor);
    scene.add(lights);
    scene.add(createStaticMesh(buildSceneProps(layout), materials));
    const players = createPlayers(playerSpots(layout), materials, models);
    scene.add(new Group().add(...players));
    const camera = new StageCamera(
      this.#canvas,
      layout.stageSide,
      this.#reducedMotion,
      playersTop(layout, models),
    );
    camera.resize(this.#width, this.#height);
    camera.allowZoom(this.#zoomAllowed);
    // The new scene takes its shader programs before the old scene frees its materials, so the
    // renderer keeps the programs that both use.
    this.#renderer.compile(scene, camera.camera);
    this.#disposeView();
    this.#focusDistance = null;
    this.#view = {
      stageSide: layout.stageSide,
      spots: focusSpots(layout, models),
      scene,
      camera,
      lights,
      players,
      hall,
      effects: lightEffects(scene),
    };
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
    const buffer = this.#renderer.getDrawingBufferSize(new Vector2());
    this.#post?.setSize(buffer.x, buffer.y);
    this.#beamDepth.setSize(buffer.x, buffer.y);
    this.#view?.camera.resize(width, height);
  }

  /** True if the user prefers reduced motion (design 2.5). */
  get reducedMotion(): boolean {
    return this.#reducedMotion;
  }

  /** The position of the camera of the last frame, for the smoke test. */
  get cameraPosition(): Vec3 | null {
    return this.#view ? this.#view.camera.camera.position.toArray() : null;
  }

  /** The quality tier of the renderer (design 2.6). */
  get tier(): QualityTier {
    return this.#tier;
  }

  /**
   * Changes the quality tier (design 2.6): the pixel ratio of the canvas, the shadow map and the
   * shadow blur of the spotlight, and the haze samples and the dust motes of the beam. The next
   * layout also uses the new tier.
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
    this.#post?.setTier(tier);
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
   * Turns the zoom of the orbit controls on or off, also for the camera of the next layout. The
   * zoom is off while the first screen shows (design 2.5, 2.8).
   *
   * @param allowed True to turn the zoom on.
   */
  allowZoom(allowed: boolean): void {
    this.#zoomAllowed = allowed;
    this.#view?.camera.allowZoom(allowed);
  }

  /**
   * Returns the camera to the default view of the stage ("Reset view", design 2.5). The app then
   * renders in Free mode.
   */
  resetView(): void {
    this.#view?.camera.reset();
  }

  /** The frame of the camera on the canvas, in CSS pixels (design 4.5), or `null` with no layout. */
  get frame(): ViewFrame | null {
    return this.#view?.camera.frame ?? null;
  }

  /** The width of the canvas divided by its height, for the shots of design 5.6. */
  get aspect(): number {
    return this.#width / this.#height;
  }

  /**
   * Renders one frame of the current layout. With no layout, it does nothing. The beam takes the
   * factor of the shot, or in Free mode the factor of the camera distance (design 4.5, 5.6).
   *
   * @param shot The camera of the shot of the frame in Cinematic mode, or `null` in Free mode.
   *   Then the orbit controls move the camera (design 2.5).
   * @param cover The parts of the page over the canvas, which move the frame (design 2.8).
   * @param ring The box of the load ring of the play button of the first screen, in CSS pixels,
   *   or `null` while it does not show. The stage shrinks until it is clear of it.
   */
  render(shot: CameraPose | null, cover: FrameCover, ring: ScreenBox | null): void {
    const view = this.#view;
    if (!view) {
      return;
    }
    let beam: number;
    if (shot) {
      view.camera.follow(shot);
      beam = shot.beam;
    } else {
      view.camera.update();
      const [x, y, z] = view.camera.camera.position.toArray();
      beam = freeBeamOpacity(view.stageSide, this.aspect, [x, y, z]);
    }
    view.camera.frameTo(cover, ring, performance.now());
    const camera = view.camera.camera;
    const timeSec = effectTime(performance.now(), this.#reducedMotion);
    const beamGroup = view.lights.children.find((child) => child instanceof Group);
    const depthPass = beamGroup instanceof Group;
    if (depthPass) {
      this.#beamDepth.render(this.#renderer, view.scene, camera, [...view.effects, view.hall]);
      setBeamFrame(beamGroup, {
        stageSide: view.stageSide,
        factor: beam,
        camera,
        timeSec,
        depth: this.#beamDepth,
        foot: [0, 0],
      });
    }
    setHallCamera(view.hall, view.stageSide, camera.position, this.#beamDepth.size[1]);
    const focus = this.#focusOf(view, shot !== null, performance.now());
    // The depth pass of the beam updated the world matrices of the frame (BeamDepth.render).
    view.scene.matrixWorldAutoUpdate = !depthPass;
    if (this.#post) {
      this.#post.render(view.scene, camera, focus, view.effects, timeSec);
    } else {
      this.#renderer.render(view.scene, camera);
    }
    view.scene.matrixWorldAutoUpdate = true;
  }

  /**
   * Calculates the focus of a frame (design 4.5). A shot focuses on its subject. Free mode
   * focuses on the first player or the stage top in the middle of the frame, and the focus moves
   * to a new distance in about 0.3 s, at once with reduced motion.
   *
   * @param view The layout of the frame.
   * @param following True when the camera of the frame comes from a shot.
   * @param nowMs The time of the frame, in milliseconds.
   * @returns The focus.
   */
  #focusOf(view: LayoutView, following: boolean, nowMs: number): Focus {
    const camera = view.camera.camera;
    const position = camera.position.toArray();
    const target = view.camera.target;
    let focus: Focus;
    if (following) {
      focus = focusOf(position, target, camera.fov, camera.far, view.stageSide);
    } else {
      let distance = freeFocusDistance(position, target, view.stageSide, view.spots);
      const last = this.#focusDistance;
      if (last !== null && !this.#reducedMotion) {
        const share = Math.exp(-(nowMs - this.#focusMs) / FREE_LENS.glideMs);
        distance += (last - distance) * share;
      }
      const orbit = camera.position.distanceTo(new Vector3(...target));
      focus = freeFocusOf(orbit, distance, camera.fov, camera.far, view.stageSide);
    }

    this.#focusDistance = focus.distance;
    this.#focusMs = nowMs;
    return focus;
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
    this.#post?.dispose();
    this.#beamDepth.dispose();
    this.#environment.dispose();
    this.#renderer.dispose();
  }

  /** Makes the environment of the reflections again after a restored WebGL context. */
  #restoreEnvironment(): void {
    this.#environment.dispose();
    this.#environment = createEnvironment(this.#renderer);
    if (this.#view) {
      this.#view.scene.environment = this.#environment.texture;
    }
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
