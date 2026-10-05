import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  Group,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  ShadowMaterial,
} from 'three';
import type { MeshStandardMaterial } from 'three';

import type { Vec3 } from '../models/math.ts';
import { STAGE_THICKNESS, buildStage } from '../models/stage.ts';
import { createGeometry } from './geometry.ts';

/** The side of the shadow-only floor, in stage sides (design 4.5, props). */
export const FLOOR_SIZE_IN_SIDES = 3;

/** The opacity of the shadows on the floor (design 4.5, props). */
export const FLOOR_SHADOW_OPACITY = 0.5;

/**
 * The light on the floor around the stage (design 4.5): its radius in stage sides, its color, and
 * its opacity. The opacity is full up to the inner radius and goes to 0 at the outer radius.
 */
export const FLOOR_LIGHT = {
  color: '#e8dcc0',
  opacity: 0.13,
  innerInSides: 0.5,
  outerInSides: 1.0,
} as const;

const FLOOR_LIGHT_VERTEX = /* glsl */ `
varying vec2 vFloor;
void main() {
  vFloor = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FLOOR_LIGHT_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uInner;
uniform float uOuter;
varying vec2 vFloor;
void main() {
  float fade = 1.0 - clamp((length(vFloor) - uInner) / (uOuter - uInner), 0.0, 1.0);
  gl_FragColor = vec4(uColor, uOpacity * fade);
  // uColor holds linear values. The chunk converts them to the output color space (sRGB).
  #include <colorspace_fragment>
}
`;

/**
 * Creates the light on the floor: an additive disc just above the floor, around the stage
 * (design 4.5). The spotlight lights the floor near the stage in the reference image. The
 * shadow-only floor cannot show light, so this disc adds it. The stage hides its middle.
 *
 * @param stageSide The stage side `S`, in meters.
 * @returns The disc mesh. It writes no depth and casts no shadow.
 */
export function createFloorLight(stageSide: number): Mesh {
  const outer = FLOOR_LIGHT.outerInSides * stageSide;
  const material = new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(FLOOR_LIGHT.color) },
      uOpacity: { value: FLOOR_LIGHT.opacity },
      uInner: { value: FLOOR_LIGHT.innerInSides * stageSide },
      uOuter: { value: outer },
    },
    vertexShader: FLOOR_LIGHT_VERTEX,
    fragmentShader: FLOOR_LIGHT_FRAGMENT,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const disc = new Mesh(new CircleGeometry(outer, 96), material);
  disc.rotation.x = -Math.PI / 2;
  // 1 mm above the shadow floor. The floor writes no depth, so the disc never fails the depth
  // test against it, also in a far view where a depth step is larger than 1 mm.
  disc.position.y = -STAGE_THICKNESS + 0.001;
  return disc;
}

/**
 * Creates the stage, the shadow-only floor, and the light on the floor (design 4.5). The floor
 * shows only shadows, so the CSS gradient of the page shows through it.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param podium The podium center of the layout.
 * @param materials The matte and the metal material of {@link createMaterials}.
 * @returns A group with the stage mesh, the floor, and the light on the floor.
 */
export function createStage(
  stageSide: number,
  podium: Vec3,
  materials: readonly MeshStandardMaterial[],
): Group {
  const stage = new Mesh(createGeometry(buildStage(stageSide, podium)), [...materials]);
  stage.castShadow = true;
  stage.receiveShadow = true;

  const size = FLOOR_SIZE_IN_SIDES * stageSide;
  // The floor writes no depth. Nothing draws below it, and with a depth write the light on the
  // floor showed dark streaks in far views (review of step 4, F4).
  const floor = new Mesh(
    new PlaneGeometry(size, size),
    new ShadowMaterial({ opacity: FLOOR_SHADOW_OPACITY, depthWrite: false }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -STAGE_THICKNESS;
  floor.receiveShadow = true;

  const group = new Group();
  group.add(stage, floor, createFloorLight(stageSide));
  return group;
}
