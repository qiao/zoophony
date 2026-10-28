import { ShaderChunk, SpotLight, Vector2, Vector3 } from 'three';
import type { Group, WebGLProgramParametersWithUniforms } from 'three';

import { LIGHT_NAMES } from './lights.ts';

/** The most rim lights that the shaders take (`RIM_PLACE.count` of `models/beam.ts`). */
export const MAX_RIM_LIGHTS = 3;

/**
 * The uniforms of the rim lights in the materials of the players, the props, and the stage
 * (design 4.5). The rim lights of `createLights()` are invisible spotlights, so three.js does not
 * render them: the materials add their diffuse light, as a spotlight with the decay 2 gives it.
 * A spotlight of three.js cost about 0.3 ms of GPU time in each frame of `perf-60.mid`.
 */
export interface RimUniforms {
  /** The number of rim lights, at most {@link MAX_RIM_LIGHTS}. */
  readonly uRimCount: { value: number };
  /** The position of each rim light, in world space. */
  readonly uRimPosition: { value: Vector3[] };
  /** The unit axis of the cone of each rim light, from the light to its target. */
  readonly uRimAxis: { value: Vector3[] };
  /** The cosine of the outer and of the inner angle of the cone of each rim light. */
  readonly uRimCone: { value: Vector2[] };
  /** The linear color times the intensity of each rim light. */
  readonly uRimColor: { value: Vector3[] };
}

/**
 * Creates the uniforms of the rim lights, with no light.
 *
 * @returns The uniforms.
 */
export function createRimUniforms(): RimUniforms {
  const list = <T>(make: () => T): T[] => Array.from({ length: MAX_RIM_LIGHTS }, make);
  return {
    uRimCount: { value: 0 },
    uRimPosition: { value: list(() => new Vector3()) },
    uRimAxis: { value: list(() => new Vector3(0, -1, 0)) },
    uRimCone: { value: list(() => new Vector2(1, 1)) },
    uRimColor: { value: list(() => new Vector3()) },
  };
}

/**
 * Writes the rim lights of a light group into the uniforms: the place, the aim, the cone, and the
 * light of each one. Call it after each change of the aim of the rim lights (`aimRimLights()`).
 *
 * @param uniforms The uniforms of {@link createRimUniforms}.
 * @param lights The group of `createLights()`. Its rim lights stand in world space.
 */
export function setRimLights(uniforms: RimUniforms, lights: Group): void {
  const rims = lights.children
    .filter((child): child is SpotLight => child instanceof SpotLight)
    .filter((light) => light.name === LIGHT_NAMES.rim)
    .slice(0, MAX_RIM_LIGHTS);
  uniforms.uRimCount.value = rims.length;
  for (const [i, rim] of rims.entries()) {
    const position = uniforms.uRimPosition.value[i];
    const axis = uniforms.uRimAxis.value[i];
    const cone = uniforms.uRimCone.value[i];
    const color = uniforms.uRimColor.value[i];
    if (!position || !axis || !cone || !color) {
      continue;
    }
    position.copy(rim.position);
    axis.subVectors(rim.target.position, rim.position).normalize();
    cone.set(Math.cos(rim.angle), Math.cos(rim.angle * (1 - rim.penumbra)));
    const { r, g, b } = rim.color;
    color.set(r * rim.intensity, g * rim.intensity, b * rim.intensity);
  }
}

/**
 * The surface of a material with the rim lights: the stage takes their light where the props
 * leave the sky open (`stageBake.g` of `scene/stage.ts`), as it takes the other lights with no
 * shadow.
 */
type RimSurface = 'stage' | 'players';

/**
 * The GLSL of the rim lights after the lights of three.js: the diffuse light of each rim light,
 * with the smooth step of the cone of three.js r186, the decay 2, and the pool of the stage lights
 * (`addLightPool()`). `RIM_SKY` is the factor of the open sky. The lights give no gloss.
 */
const RIM_GLSL = /* glsl */ `
vec3 rimNormal = inverseTransformDirection(geometryNormal, viewMatrix);
for (int i = 0; i < ${MAX_RIM_LIGHTS}; i++) {
  if (i >= uRimCount) {
    break;
  }
  vec3 toLamp = uRimPosition[i] - lightPoolWorld;
  float distanceSquared = max(dot(toLamp, toLamp), 1e-4);
  vec3 direction = toLamp * inversesqrt(distanceSquared);
  float cone = smoothstep(uRimCone[i].x, uRimCone[i].y, dot(-direction, uRimAxis[i]));
  float facing = saturate(dot(rimNormal, direction));
  vec3 irradiance = uRimColor[i] * (facing * cone * lightPool * RIM_SKY / distanceSquared);
  reflectedLight.directDiffuse += irradiance * BRDF_Lambert(material.diffuseContribution);
}
`;

/**
 * Adds the rim lights to the shader of a standard or physical material, after `addLightPool()`,
 * which gives the world position and the pool factor of the pixel. Call it in `onBeforeCompile`.
 *
 * @param shader The shader of the material.
 * @param uniforms The uniforms of {@link createRimUniforms}.
 * @param surface The surface of the material.
 * @throws Error if the shader has no light chunk of three.js that the patch knows.
 */
export function addRimLight(
  shader: WebGLProgramParametersWithUniforms,
  uniforms: RimUniforms,
  surface: RimSurface,
): void {
  if (!shader.fragmentShader.includes('#include <lights_fragment_end>')) {
    throw new Error('The shader has no light chunk of three.js. Update addRimLight().');
  }
  if (!ShaderChunk.lights_physical_fragment.includes('material.diffuseContribution')) {
    throw new Error('The physical material of three.js changed. Update addRimLight().');
  }
  shader.uniforms['uRimCount'] = uniforms.uRimCount;
  shader.uniforms['uRimPosition'] = uniforms.uRimPosition;
  shader.uniforms['uRimAxis'] = uniforms.uRimAxis;
  shader.uniforms['uRimCone'] = uniforms.uRimCone;
  shader.uniforms['uRimColor'] = uniforms.uRimColor;
  const glsl = RIM_GLSL.replace('RIM_SKY', surface === 'stage' ? 'stageBake.g' : '1.0');
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>\nuniform int uRimCount;\nuniform vec3 uRimPosition[${MAX_RIM_LIGHTS}];\nuniform vec3 uRimAxis[${MAX_RIM_LIGHTS}];\nuniform vec2 uRimCone[${MAX_RIM_LIGHTS}];\nuniform vec3 uRimColor[${MAX_RIM_LIGHTS}];`,
    )
    .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\n${glsl}`);
}
