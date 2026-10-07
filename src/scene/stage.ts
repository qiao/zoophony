import { Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';

import type { Vec3 } from '../models/tuples.ts';
import { PODIUM_FROM_FRONT, STAGE_EDGE, buildStage } from '../models/stage.ts';
import { createGeometry } from './geometry.ts';

/**
 * The finish of the stage wood (design 4.5, materials): polished walnut, glossier than the matte
 * group of the players, so that the spotlight makes highlights on the planks, as in `mockup.png`.
 */
export const STAGE_FINISH = {
  /** The roughness of the wood, before the grain. */
  roughness: 0.38,
  /** The largest change of the wood color by the grain, as a factor. */
  grain: 0.16,
  /** The largest change of the roughness by the grain. */
  grainRoughness: 0.12,
  /**
   * The part of the direct gloss of the lights that the wood keeps. With the full gloss, the
   * gloss of the key light in front of the podium was a pale spot of 178 with a saturation of
   * 0.30, against a warm 133 and 0.55 in `mockup.png`.
   */
  specular: 0.55,
} as const;

/**
 * The baked light of the sides of the stage (design 4.5, scene colors): the light of the lit floor
 * and of the hall on the skirt and on the chamfer of the edge. The key light stands behind the
 * orchestra and reaches neither, so with no baked light the skirt was black (a value of 4 against
 * 33 in `mockup.png`), and the edge had 40 against 74. The light is a part of the base color, and
 * it falls off from the middle of the stage to its corners.
 */
export const SIDE_GLOW = {
  /** The light of the skirt, as a part of its base color. */
  skirt: 0.8,
  /** The light of the chamfer of the edge, as a part of its base color. */
  edge: 0.25,
  /** The part of the light that the corners lose. */
  fade: 0.6,
} as const;

/**
 * The fall-off of the direct light on the stage wood behind the podium (design 4.5, scene
 * colors). The key light stands behind the orchestra, so with no fall-off it lit the wood of the
 * full orchestra and the back of the stage, where `mockup.png` is dark. Only the direct diffuse
 * light of the wood falls off, with the distance behind the podium. The players keep the full
 * light, so their fur keeps the values of the cast colors. The gloss and the wood in front of the
 * podium keep the full light.
 */
export const STAGE_POOL = {
  /**
   * The distance behind the podium at which the light above the floor value falls to 1/e, in
   * stage sides.
   */
  reach: 0.55,
  /** The part of the direct diffuse light that the wood keeps far behind the podium. */
  floor: 0.22,
} as const;

/**
 * Calculates the part of the direct diffuse light that the stage wood keeps at a distance behind
 * the podium ({@link STAGE_POOL}). The shader of {@link createStageMaterial} uses the same formula.
 *
 * @param behind The distance behind the podium center, toward the back of the stage, in stage
 *   sides. A point in front of the podium has a negative distance.
 * @returns The factor: 1 in front of the podium, down to `STAGE_POOL.floor` far behind it.
 */
export function poolLight(behind: number): number {
  const pool = STAGE_POOL;
  const t = Math.max(0, behind) / pool.reach;
  return pool.floor + (1 - pool.floor) * Math.exp(-t * t);
}

/**
 * Gives the line of the pool on the stage ({@link STAGE_POOL}): the z of the podium center. A
 * stage with no podium takes the place of the podium of a stage with no piano.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param podium The podium center, or `null` with no podium.
 * @returns The z of the line, in meters.
 */
export function poolLine(stageSide: number, podium: Vec3 | null): number {
  return podium ? podium[2] : stageSide / 2 - PODIUM_FROM_FRONT;
}

/**
 * The GLSL of the grain: a value noise, stretched along x, the direction of the planks. It needs
 * the varying `vWoodPosition`.
 */
const GRAIN_GLSL = /* glsl */ `
varying vec3 vWoodPosition;
uniform float uGrain;
uniform float uGrainRoughness;
uniform float uHalfSide;
uniform vec3 uSideGlow;
uniform float uSpecular;
uniform vec3 uPool;

float woodHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float woodNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = woodHash(i);
  float b = woodHash(i + vec2(1.0, 0.0));
  float c = woodHash(i + vec2(0.0, 1.0));
  float d = woodHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// The grain from -1 to 1: long streaks along x, with a finer noise on them.
float woodGrain(vec3 p) {
  float streaks = woodNoise(vec2(p.x * 0.7, p.z * 26.0 + p.y * 26.0));
  float fine = woodNoise(vec2(p.x * 3.0, p.z * 90.0 + p.y * 90.0));
  return (streaks * 0.7 + fine * 0.3) * 2.0 - 1.0;
}
`;

/**
 * The GLSL of the baked light of the skirt and the edge ({@link SIDE_GLOW}), after the emissive
 * light of the standard shader. The stage top is at y = 0, so only the skirt and the chamfer lie
 * below it. The light fades from the middle of each side to the corners.
 */
const SIDE_GLOW_GLSL = /* glsl */ `
float sideFade = 1.0 - uSideGlow.z * smoothstep(0.2 * uHalfSide, uHalfSide, abs(vWoodPosition.x));
float sideGlow = vWoodPosition.y < -${STAGE_EDGE.toFixed(4)} ? uSideGlow.x : uSideGlow.y;
totalEmissiveRadiance += diffuseColor.rgb * sideGlow * sideFade * step(vWoodPosition.y, -0.001);
`;

/**
 * The GLSL of the fall-off of the direct light on the wood ({@link poolLight}), after the lights.
 * `uPool` holds the z of the line of the pool, the reach in meters, and the floor.
 */
const POOL_GLSL = /* glsl */ `
float poolT = max(0.0, uPool.x - vWoodPosition.z) / uPool.y;
reflectedLight.directDiffuse *= uPool.z + (1.0 - uPool.z) * exp(-poolT * poolT);
reflectedLight.directSpecular *= uSpecular;
`;

/**
 * Creates the material of the stage: the vertex colors of the planks with flat shading, a
 * polished finish, a grain that the fragment shader adds, the baked light of the skirt and the
 * edge, and the fall-off of the direct light away from the pool (design 4.5, materials).
 *
 * @param stageSide The stage side `S`, in meters, for the fade of the baked light and the reach
 *   of the pool.
 * @param podium The podium center, or `null` with no podium. The direct light on the wood falls
 *   off behind it.
 * @returns The material.
 */
export function createStageMaterial(stageSide: number, podium: Vec3 | null): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: STAGE_FINISH.roughness,
    metalness: 0,
  });
  const line = poolLine(stageSide, podium);
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uGrain'] = { value: STAGE_FINISH.grain };
    shader.uniforms['uGrainRoughness'] = { value: STAGE_FINISH.grainRoughness };
    shader.uniforms['uHalfSide'] = { value: stageSide / 2 };
    shader.uniforms['uSpecular'] = { value: STAGE_FINISH.specular };
    shader.uniforms['uSideGlow'] = {
      value: new Vector3(SIDE_GLOW.skirt, SIDE_GLOW.edge, SIDE_GLOW.fade),
    };
    shader.uniforms['uPool'] = {
      value: new Vector3(line, STAGE_POOL.reach * stageSide, STAGE_POOL.floor),
    };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWoodPosition;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvWoodPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GRAIN_GLSL}`)
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\nfloat grain = woodGrain(vWoodPosition);\ndiffuseColor.rgb *= 1.0 + uGrain * grain;',
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor - uGrainRoughness * grain, 0.05, 1.0);',
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\n${SIDE_GLOW_GLSL}`,
      )
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\n${POOL_GLSL}`);
  };
  material.customProgramCacheKey = () => 'stage-wood';
  return material;
}

/**
 * Creates the stage (design 4.5). The floor of the hall around it is part of the hall
 * (scene/hall.ts).
 *
 * @param stageSide The stage side `S`, in meters.
 * @param podium The podium center of the layout, or `null` for a layout with no podium.
 * @returns A group with the stage mesh. The mesh has its own material.
 */
export function createStage(stageSide: number, podium: Vec3 | null): Group {
  const stage = new Mesh(
    createGeometry(buildStage(stageSide, podium)),
    createStageMaterial(stageSide, podium),
  );
  stage.castShadow = true;
  stage.receiveShadow = true;
  return new Group().add(stage);
}
