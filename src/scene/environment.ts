import {
  BackSide,
  BoxGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  Scene,
  SphereGeometry,
} from 'three';
import type { WebGLRenderTarget, WebGLRenderer } from 'three';

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
