import {
  BackSide,
  BoxGeometry,
  Color,
  CubeCamera,
  HalfFloatType,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  WebGLCubeRenderTarget,
} from 'three';
import type { Object3D, WebGLRenderTarget, WebGLRenderer } from 'three';

import type { Vec3 } from '../models/tuples.ts';

/**
 * The environment of the reflections (design 4.5, light and render): a dark room with warm lamps
 * around the horizon and a warm light above, as the hall of `scene.png`. The brass, the copper,
 * and the polished wood reflect it. With no environment, metal looked dim.
 */
export const ENVIRONMENT = {
  /** The dark room, in sRGB. */
  room: '#0b0807',
  /** The light of a lamp, in linear values. */
  lamp: [6, 3.4, 1.6],
  /** The number of lamps around the horizon. */
  lamps: 10,
  /** The light above, in linear values: the spotlight and its beam. */
  top: [3, 2, 1.2],
  /** The factor of the environment light on each material of the scene. */
  intensity: 0.6,
} as const;

/**
 * Builds the scene of the environment: a sphere of the room color seen from inside, warm boxes at
 * the horizon, and a warm box above. It holds no light, so the boxes show only their colors.
 *
 * @returns The scene, with its center at the origin.
 */
export function buildEnvironmentScene(): Scene {
  const scene = new Scene();
  scene.add(
    new Mesh(
      new SphereGeometry(20, 16, 8),
      new MeshBasicMaterial({ color: new Color(ENVIRONMENT.room), side: BackSide }),
    ),
  );
  const lamp = new MeshBasicMaterial({ color: new Color().setRGB(...ENVIRONMENT.lamp) });
  const lampBox = new BoxGeometry(1.2, 0.6, 1.2);
  for (let i = 0; i < ENVIRONMENT.lamps; i++) {
    const angle = ((i + 0.5) / ENVIRONMENT.lamps) * Math.PI * 2;
    const box = new Mesh(lampBox, lamp);
    // Two rows of lamps, as the two balcony tiers.
    box.position.set(15 * Math.sin(angle), i % 2 === 0 ? 2 : 5, 15 * Math.cos(angle));
    scene.add(box);
  }
  const top = new Mesh(
    new BoxGeometry(6, 0.5, 6),
    new MeshBasicMaterial({ color: new Color().setRGB(...ENVIRONMENT.top) }),
  );
  top.position.set(0, 16, 0);
  scene.add(top);
  return scene;
}

/**
 * Creates the environment texture of the reflections: a PMREM of {@link buildEnvironmentScene}.
 * The renderer makes it one time, and each layout uses it.
 *
 * @param renderer The renderer.
 * @returns The target that holds the texture. The caller frees it.
 */
export function createEnvironment(renderer: WebGLRenderer): WebGLRenderTarget {
  const generator = new PMREMGenerator(renderer);
  const scene = buildEnvironmentScene();
  const target = generator.fromScene(scene, 0.04);
  generator.dispose();
  scene.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
      if (object.material instanceof MeshBasicMaterial) {
        object.material.dispose();
      }
    }
  });
  return target;
}

/**
 * The values of the captured environment (design 4.5, light and render). Each layout renders its
 * own hall and lit stage into a cube, so the brass and the lacquer reflect the real lamps and the
 * real pool of light, and the diffuse light of the map holds the warm floor below the players.
 */
export const CAPTURE = {
  /** The width of each face of the cube, in pixels. */
  size: 256,
  /** The height of the point of the capture above the stage top, in meters: about a seated head. */
  height: 1.2,
  /** The factor of the captured environment light on each material: 1 is the physical light. */
  intensity: 1,
} as const;

/** The inputs of {@link captureEnvironment}. */
export interface CaptureOptions {
  /** The point of the capture. */
  readonly position: Vec3;
  /** The objects that the capture hides: the players, the props, and the visible beam. */
  readonly hidden: readonly Object3D[];
}

/**
 * Captures the environment of a layout (design 4.5, light and render): it renders the scene into
 * a cube of half floats from one point, with some objects hidden, and makes a PMREM of the cube.
 * The renderer gives no tone mapping to a render target, so the cube holds the linear light.
 *
 * @param renderer The renderer. It needs a target of half floats.
 * @param scene The scene of the layout, with the environment that its reflections use during the
 *   capture.
 * @param options The point of the capture and the hidden objects.
 * @returns The target that holds the environment texture. The caller frees it.
 */
export function captureEnvironment(
  renderer: WebGLRenderer,
  scene: Scene,
  options: CaptureOptions,
): WebGLRenderTarget {
  const cube = new WebGLCubeRenderTarget(CAPTURE.size, { type: HalfFloatType });
  const camera = new CubeCamera(0.05, 500, cube);
  camera.position.set(...options.position);
  camera.updateMatrixWorld();

  const shown = options.hidden.map((object) => object.visible);
  for (const object of options.hidden) {
    object.visible = false;
  }
  const saved = renderer.getRenderTarget();
  camera.update(renderer, scene);
  renderer.setRenderTarget(saved);
  for (const [i, object] of options.hidden.entries()) {
    object.visible = shown[i] ?? true;
  }

  const generator = new PMREMGenerator(renderer);
  const target = generator.fromCubemap(cube.texture);
  generator.dispose();
  cube.dispose();
  return target;
}
