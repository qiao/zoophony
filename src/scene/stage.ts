import { Group, Mesh, MeshStandardMaterial } from 'three';

import type { Vec3 } from '../models/tuples.ts';
import { buildStage } from '../models/stage.ts';
import { createGeometry } from './geometry.ts';

/**
 * The finish of the stage wood (design 4.5, materials): polished walnut, glossier than the matte
 * group of the players, so that the spotlight makes highlights on the planks, as in `mockup.png`.
 */
export const STAGE_FINISH = {
  roughness: 0.42,
  /** The largest change of the wood color by the grain, as a factor. */
  grain: 0.16,
  /** The largest change of the roughness by the grain. */
  grainRoughness: 0.12,
} as const;

/**
 * The GLSL of the grain: a value noise, stretched along x, the direction of the planks. It needs
 * the varying `vWoodPosition`.
 */
const GRAIN_GLSL = /* glsl */ `
varying vec3 vWoodPosition;
uniform float uGrain;
uniform float uGrainRoughness;

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
 * Creates the material of the stage: the vertex colors of the planks with flat shading, a
 * polished finish, and a grain that the fragment shader adds (design 4.5, materials).
 *
 * @returns The material.
 */
export function createStageMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: STAGE_FINISH.roughness,
    metalness: 0,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uGrain'] = { value: STAGE_FINISH.grain };
    shader.uniforms['uGrainRoughness'] = { value: STAGE_FINISH.grainRoughness };
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
      );
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
  const stage = new Mesh(createGeometry(buildStage(stageSide, podium)), createStageMaterial());
  stage.castShadow = true;
  stage.receiveShadow = true;
  return new Group().add(stage);
}
