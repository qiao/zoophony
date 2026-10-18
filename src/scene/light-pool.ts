import { ShaderChunk, Vector2, Vector4 } from 'three';
import type { WebGLProgramParametersWithUniforms } from 'three';

import type { Vec3 } from '../models/tuples.ts';

/**
 * The pool of the stage lights (design 4.5). Each spotlight gives a place of the stage a part of
 * its light: the pool factor. The pool is bright on the conductor and the middle of the
 * orchestra, and it falls off to the sides, the front corners, and the back of the stage, as in
 * `mockup.png`. On the players and the props, it reaches farther toward the back (`reachBack`),
 * because the back rows of `orchestra-latest.png`, the newest target, are almost as bright as the
 * front rows. The key light also has a hot spot on the podium. The fill light and the reflections
 * do not change. Without the pool, the side lights lit the players at the sides as brightly as the
 * players in the middle.
 */
export const LIGHT_POOL = {
  /** The center of the pool, as a part of the way from the stage center to the podium. */
  centerToPodium: 0.5,
  /** The radius of the pool across the stage (x), in stage sides. */
  radiusX: 0.6,
  /** The radius of the pool along the stage (z), in stage sides. */
  radiusZ: 0.42,
  /**
   * The radius of the pool on the players and the props behind its center (toward the back), in
   * stage sides. It is longer than `radiusZ`, so the back rows keep most of the light, as in
   * `orchestra-latest.png`. The stage keeps `radiusZ`, so the floor at the back stays dark.
   */
  reachBack: 1.2,
  /** The part of the light that a place far from the pool keeps. */
  floor: 0.4,
  /** The extra light of the key light at the podium center, as a part of its light. */
  spotBoost: 0.7,
  /**
   * The radius of the hot spot of the key light across the stage (x), in stage sides. The pool
   * of `orchestra-latest.png` reaches from the piano to the cellos. The first hot spot had a
   * radius of 2 m on each axis, and lit only the stage near the podium.
   */
  spotRadiusX: 0.4,
  /** The radius of the hot spot of the key light along the stage (z), in stage sides. */
  spotRadiusZ: 0.2,
} as const;

/** A place or a size on the stage top, as (x, z), in meters. */
export type StagePair = readonly [x: number, z: number];

/**
 * The aim of the stage lights (design 4.5): the pool, the hot spot and the aim of the key light,
 * and the foot of the visible beam. All values are in meters.
 */
export interface LightAim {
  /** The center of the pool, and the aim point of the key light on the stage top. */
  readonly center: StagePair;
  /** The radii of the pool across (x) and along (z) the stage. */
  readonly radius: StagePair;
  /**
   * The radius of the pool on the players and the props behind its center (toward -z). The stage
   * takes the z radius of `radius` on both sides of the center.
   */
  readonly reachBack: number;
  /** The center of the hot spot of the key light. */
  readonly spot: StagePair;
  /** The radii of the hot spot across (x) and along (z) the stage. */
  readonly spotRadius: StagePair;
  /** The extra light of the key light at the center of the hot spot. 0 gives no hot spot. */
  readonly boost: number;
  /** The part of the light that a place far from the pool keeps. */
  readonly floor: number;
  /** The center of the foot of the visible beam on the stage top. */
  readonly beam: StagePair;
}

/**
 * Gives the aim of the stage lights with no solo ({@link LIGHT_POOL}): the pool between the
 * stage center and the podium, the hot spot on the podium, and the beam above the stage center.
 * With no podium, the pool is around the stage center, with no hot spot.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param podium The podium center, or `null` with no podium.
 * @returns The aim.
 */
export function defaultAim(stageSide: number, podium: Vec3 | null): LightAim {
  const pool = LIGHT_POOL;
  const k = pool.centerToPodium;
  const [x, , z] = podium ?? [0, 0, 0];

  return {
    center: [x * k, z * k],
    radius: [pool.radiusX * stageSide, pool.radiusZ * stageSide],
    reachBack: pool.reachBack * stageSide,
    spot: [x, z],
    spotRadius: [pool.spotRadiusX * stageSide, pool.spotRadiusZ * stageSide],
    boost: podium ? pool.spotBoost : 0,
    floor: pool.floor,
    beam: [0, 0],
  };
}

/** The uniforms of the pool in a shader. Materials that share them share one pool. */
export interface PoolUniforms {
  /** The center (x, z) and the inverse radii (1 / x radius, 1 / z radius), in meters. */
  readonly uLightPool: { value: Vector4 };
  /** The center (x, z) and the inverse radii of the hot spot (1 / x radius, 1 / z radius). */
  readonly uLightPoolSpot: { value: Vector4 };
  /** The part of the light that a place far from the pool keeps, and the boost of the hot spot. */
  readonly uLightPoolLevels: { value: Vector2 };
  /** The inverse radius of the pool on the players and the props behind its center. */
  readonly uLightPoolBack: { value: number };
}

/**
 * Creates the uniforms of a pool with no effect: each place gets the factor 1. The aim of a stage
 * replaces them ({@link setPoolAim}).
 *
 * @returns The uniforms.
 */
export function createPoolUniforms(): PoolUniforms {
  return {
    uLightPool: { value: new Vector4(0, 0, 0, 0) },
    uLightPoolSpot: { value: new Vector4(0, 0, 0, 0) },
    uLightPoolLevels: { value: new Vector2(1, 0) },
    uLightPoolBack: { value: 0 },
  };
}

/**
 * Sets the uniforms of a pool to an aim of the stage lights.
 *
 * @param uniforms The uniforms of {@link createPoolUniforms}.
 * @param aim The aim.
 */
export function setPoolAim(uniforms: PoolUniforms, aim: LightAim): void {
  const [cx, cz] = aim.center;
  const [rx, rz] = aim.radius;
  const [sx, sz] = aim.spot;
  const [srx, srz] = aim.spotRadius;

  uniforms.uLightPool.value.set(cx, cz, 1 / rx, 1 / rz);
  uniforms.uLightPoolSpot.value.set(sx, sz, 1 / srx, 1 / srz);
  uniforms.uLightPoolLevels.value.set(aim.floor, aim.boost);
  uniforms.uLightPoolBack.value = 1 / aim.reachBack;
}

/** The call of three.js r186 that gives the light of one spotlight. */
const SPOT_INFO = 'getSpotLightInfo( spotLight, geometryPosition, directLight );';

/**
 * The surface of a material that takes the pool: the stage, or the players and the props, which
 * take the long reach of the pool toward the back ({@link LightAim}).
 */
export type PoolSurface = 'stage' | 'players';

/**
 * The GLSL of the pool factor and the hot spot, before the lights. `vViewPosition` holds the
 * position of the pixel in view space, so the rotation of the view matrix and the camera position
 * give its world position. `REACH_BACK` marks the line of the long reach of the players.
 */
const POOL_GLSL = /* glsl */ `
vec3 lightPoolWorld = ( vec4( - vViewPosition, 0.0 ) * viewMatrix ).xyz + cameraPosition;
vec2 lightPoolStep = lightPoolWorld.xz - uLightPool.xy;
vec2 lightPoolD = lightPoolStep * uLightPool.zw;
REACH_BACK
vec2 lightPoolS = ( lightPoolWorld.xz - uLightPoolSpot.xy ) * uLightPoolSpot.zw;
float lightPool = uLightPoolLevels.x + ( 1.0 - uLightPoolLevels.x ) * exp( -dot( lightPoolD, lightPoolD ) );
float lightPoolHot = 1.0 + uLightPoolLevels.y * exp( -dot( lightPoolS, lightPoolS ) );
`;

/**
 * The GLSL after the light of one spotlight. three.js puts the spotlights with a shadow first, so
 * the hot spot goes to the key light, and on the high and medium tiers also to the side lights,
 * which cast shadows there (`TODO.md`).
 */
const SPOT_POOL_GLSL = /* glsl */ `
		directLight.color *= lightPool;
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		directLight.color *= lightPoolHot;
		#endif
`;

/** The GLSL of the long reach of the pool toward the back, on the players and the props. */
const REACH_BACK_GLSL =
  'lightPoolD.y = lightPoolStep.y < 0.0 ? lightPoolStep.y * uLightPoolBack : lightPoolD.y;';

/**
 * Adds the pool to the shader of a standard material: the shader multiplies the light of each
 * spotlight by the pool factor at the world position of the pixel, and the light of the key light
 * also by the hot spot ({@link LIGHT_POOL}). The pool factor is 1 at the pool center, with a
 * Gaussian fall-off to the floor value. On the players and the props, the fall-off behind the
 * center has the radius `reachBack` of {@link LightAim}. The factor of the hot spot is 1 + the
 * boost at its center, with a Gaussian fall-off to 1. Call it in `onBeforeCompile`.
 *
 * @param shader The shader of the material.
 * @param uniforms The uniforms of the pool.
 * @param surface The surface of the material.
 * @throws Error if the light chunk of three.js has no spotlight call that the patch knows, for
 *   example after an update of three.js.
 */
export function addLightPool(
  shader: WebGLProgramParametersWithUniforms,
  uniforms: PoolUniforms,
  surface: PoolSurface,
): void {
  const chunk = ShaderChunk.lights_fragment_begin;
  if (!chunk.includes(SPOT_INFO)) {
    throw new Error('The light chunk of three.js changed. Update addLightPool().');
  }

  shader.uniforms['uLightPool'] = uniforms.uLightPool;
  shader.uniforms['uLightPoolSpot'] = uniforms.uLightPoolSpot;
  shader.uniforms['uLightPoolLevels'] = uniforms.uLightPoolLevels;
  shader.uniforms['uLightPoolBack'] = uniforms.uLightPoolBack;
  const pool = POOL_GLSL.replace('REACH_BACK', surface === 'players' ? REACH_BACK_GLSL : '');
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      '#include <common>\nuniform vec4 uLightPool;\nuniform vec4 uLightPoolSpot;\nuniform vec2 uLightPoolLevels;\nuniform float uLightPoolBack;',
    )
    .replace(
      '#include <lights_fragment_begin>',
      pool + chunk.replace(SPOT_INFO, SPOT_INFO + SPOT_POOL_GLSL),
    );
}
