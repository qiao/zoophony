import { Group, Mesh, MeshPhysicalMaterial, Vector3 } from 'three';

import { STAGE_COLORS } from '../models/props.ts';
import type { Vec3 } from '../models/tuples.ts';
import { STAGE_CORNER_CUT, STAGE_LIP, buildStage } from '../models/stage.ts';
import { createGeometry } from './geometry.ts';
import { addLightPool } from './light-pool.ts';
import type { PoolUniforms } from './light-pool.ts';

/**
 * The finish of the stage wood (design 4.5, materials): walnut with a soft sheen under a thin
 * lacquer. The diffuse light of the wood gives most of the light of the planks, so the lit floor
 * keeps the warm color of the wood, as in `orchestra-latest.png`. The pool of the stage lights
 * (`addLightPool()`) sets the width of the lit area.
 */
export const STAGE_FINISH = {
  /** The roughness of the wood below the lacquer, before the grain: a broad, soft sheen. */
  roughness: 0.6,
  /** The largest change of the wood color by the grain, as a factor. */
  grain: 0.16,
  /** The largest change of the roughness by the grain. */
  grainRoughness: 0.12,
  /**
   * The factor of the direct gloss of the lights on the wood below the lacquer. A gloss has the
   * color of the light, and the factor 2.0 of a broad gloss made the lit floor pale: a saturation
   * of 0.39 against 0.54 to 0.60 in `orchestra-latest.png` (`pnpm look-lab`).
   */
  specular: 0.5,
  /**
   * The largest change of the roughness from one plank to the next. Each plank has its own tone in
   * its vertex colors (`plankColor()` of `models/stage.ts`), but the gloss of the key light was the
   * same on each plank, and it hid the tones. A gloss of its own shows each plank.
   */
  plankRoughness: 0.2,
  /** The largest change of the direct gloss from one plank to the next, as a factor. */
  plankGloss: 0.6,
  /**
   * The part of the gloss that the dark line between two planks keeps. A seam is a groove, so it
   * reflects little light. With the full gloss, the seams did not show in the default view.
   */
  seamGloss: 0.35,
  /**
   * The strength of the lacquer layer above the wood, from 0 to 1. It gives the glare of the key
   * light on the floor in front of the podium. With 0.6, the podium top was almost white in the
   * default view.
   */
  clearcoat: 0.3,
  /** The roughness of the lacquer layer: a soft glare of the key light. */
  clearcoatRoughness: 0.35,
} as const;

/**
 * The baked light of the sides of the stage (design 4.5, scene colors): the light of the lit floor
 * and of the hall on the skirt and on the raised lip of the edge. The key light stands behind the
 * orchestra and reaches neither, so with no baked light the skirt was black (a value of 4 against
 * 33 in `mockup.png`), and the edge had 40 against 74. The light is a part of the base color, and
 * it falls off from the middle of the stage to its corners.
 */
export const SIDE_GLOW = {
  /** The light of the skirt, as a part of its base color. */
  skirt: 0.8,
  /** The light of the lip of the edge, as a part of its base color. */
  edge: 0.25,
  /** The part of the light that the corners lose. */
  fade: 0.6,
} as const;

/**
 * The GLSL of the grain: a value noise, stretched along x, the direction of the planks. It needs
 * the varying `vWoodPosition`.
 */
const GRAIN_GLSL = /* glsl */ `
varying vec3 vWoodPosition;
uniform float uGrain;
uniform float uGrainRoughness;
uniform float uHalfSide;
uniform float uCornerCut;
uniform vec3 uSideGlow;
uniform float uSpecular;
uniform vec3 uSeamColor;
uniform vec3 uPlank;

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

// The value of one octave of the grain, faded to its mean 0.5 when one cell of the noise covers
// less than about 4 pixels. The finer cells shimmered as streaks in a moving camera.
float woodOctave(vec2 q) {
  vec2 w = fwidth(q);
  return mix(woodNoise(q), 0.5, smoothstep(0.12, 0.3, max(w.x, w.y)));
}

// A number from 0 to 1 for each plank. Each plank has its own tone in the vertex colors, and the
// tone is the same at each point of the plank.
float plankNumber(vec3 color) {
  return fract(sin(dot(color, vec3(1271.1, 3117.7, 7451.3))) * 43758.5453);
}

// 1 on the dark line between two planks, which has the color STAGE_COLORS.seam, else 0.
float seamOf(vec3 color) {
  vec3 d = abs(color - uSeamColor);
  return 1.0 - step(1e-4, max(d.r, max(d.g, d.b)));
}

// The grain from -1 to 1: long streaks along x, with a finer noise on them.
float woodGrain(vec3 p) {
  float streaks = woodOctave(vec2(p.x * 0.7, p.z * 26.0 + p.y * 26.0));
  float fine = woodOctave(vec2(p.x * 3.0, p.z * 90.0 + p.y * 90.0));
  return (streaks * 0.7 + fine * 0.3) * 2.0 - 1.0;
}
`;

/**
 * The GLSL of the baked light of the skirt and the lip ({@link SIDE_GLOW}), after the emissive
 * light of the standard shader. The skirt lies below the stage top at y = 0, and the lip stands
 * within its width of the outline: the four edges and the four corner cuts. The planks and the
 * podium get no baked light. The light fades from the middle of each side to the corners.
 */
const SIDE_GLOW_GLSL = /* glsl */ `
vec2 sideAbs = abs(vWoodPosition.xz);
float sideEdge = min(
  uHalfSide - max(sideAbs.x, sideAbs.y),
  (2.0 * uHalfSide - uCornerCut - sideAbs.x - sideAbs.y) * 0.70710678
);
float onLip = step(0.001, vWoodPosition.y) * step(sideEdge, ${(STAGE_LIP.width + 0.001).toFixed(4)});
float onSide = max(step(vWoodPosition.y, -0.001), onLip);
float sideFade = 1.0 - uSideGlow.z * smoothstep(0.2 * uHalfSide, uHalfSide, abs(vWoodPosition.x));
float sideGlow = vWoodPosition.y < -${STAGE_LIP.drop.toFixed(4)} ? uSideGlow.x : uSideGlow.y;
totalEmissiveRadiance += diffuseColor.rgb * sideGlow * sideFade * onSide;
`;

/**
 * The GLSL of the gloss of the wood ({@link STAGE_FINISH}): the factor of the direct gloss, the
 * gloss of each plank, and the small gloss of the seams.
 */
const GLOSS_GLSL = /* glsl */ `
float seamGloss = mix(1.0, uPlank.z, stageSeam);
reflectedLight.directSpecular *= uSpecular * (1.0 + uPlank.y * (stagePlank - 0.5)) * seamGloss;
reflectedLight.indirectSpecular *= seamGloss;
#ifdef USE_CLEARCOAT
clearcoatSpecularDirect *= seamGloss;
clearcoatSpecularIndirect *= seamGloss;
#endif
`;

/**
 * The GLSL of the grain and of the number of each plank, after the vertex colors. The grain of
 * each plank starts at its own place, so the grain does not run on across a joint.
 */
const PLANK_GLSL = /* glsl */ `
float stagePlank = plankNumber(vColor.rgb);
float stageSeam = seamOf(vColor.rgb);
float grain = woodGrain(vWoodPosition + vec3(stagePlank * 41.0, 0.0, stagePlank * 0.37));
diffuseColor.rgb *= 1.0 + uGrain * grain;
`;

/**
 * Creates the material of the stage: the vertex colors of the planks with flat shading, a
 * wood finish under a thin lacquer, a grain that the fragment shader adds, the baked light of the skirt and the
 * edge, and the pool of the stage lights (design 4.5, materials).
 *
 * @param stageSide The stage side `S`, in meters, for the fade of the baked light.
 * @param pool The uniforms of the pool of the stage lights (design 4.5).
 * @returns The material.
 */
export function createStageMaterial(stageSide: number, pool: PoolUniforms): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: STAGE_FINISH.roughness,
    metalness: 0,
    clearcoat: STAGE_FINISH.clearcoat,
    clearcoatRoughness: STAGE_FINISH.clearcoatRoughness,
  });
  material.onBeforeCompile = (shader) => {
    addLightPool(shader, pool);
    shader.uniforms['uGrain'] = { value: STAGE_FINISH.grain };
    shader.uniforms['uGrainRoughness'] = { value: STAGE_FINISH.grainRoughness };
    shader.uniforms['uHalfSide'] = { value: stageSide / 2 };
    shader.uniforms['uCornerCut'] = { value: STAGE_CORNER_CUT * stageSide };
    shader.uniforms['uSpecular'] = { value: STAGE_FINISH.specular };
    shader.uniforms['uSeamColor'] = { value: new Vector3(...STAGE_COLORS.seam) };
    shader.uniforms['uPlank'] = {
      value: new Vector3(
        STAGE_FINISH.plankRoughness,
        STAGE_FINISH.plankGloss,
        STAGE_FINISH.seamGloss,
      ),
    };
    shader.uniforms['uSideGlow'] = {
      value: new Vector3(SIDE_GLOW.skirt, SIDE_GLOW.edge, SIDE_GLOW.fade),
    };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWoodPosition;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvWoodPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GRAIN_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${PLANK_GLSL}`)
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor - uGrainRoughness * grain + uPlank.x * (stagePlank - 0.5), 0.05, 1.0);',
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\n${SIDE_GLOW_GLSL}`,
      )
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\n${GLOSS_GLSL}`);
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
 * @param pool The uniforms of the pool of the stage lights (design 4.5).
 * @returns A group with the stage mesh. The mesh has its own material.
 */
export function createStage(stageSide: number, podium: Vec3 | null, pool: PoolUniforms): Group {
  const stage = new Mesh(
    createGeometry(buildStage(stageSide, podium)),
    createStageMaterial(stageSide, pool),
  );
  stage.castShadow = true;
  stage.receiveShadow = true;
  return new Group().add(stage);
}
