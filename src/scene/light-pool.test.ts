import type { IUniform, Vector4 } from 'three';
import { describe, expect, it } from 'vitest';

import { createMaterials } from './geometry.ts';
import {
  LIGHT_POOL,
  addLightPool,
  createPoolUniforms,
  defaultAim,
  setPoolAim,
} from './light-pool.ts';
import type { PoolUniforms } from './light-pool.ts';

/** The stage side and the podium of the default demo (Boulanger), in meters. */
const SIDE = 11.28;
const PODIUM: [number, number, number] = [0, 0, 4.64];

/**
 * Creates a shader with the chunks that the pool replaces.
 *
 * @returns The uniforms and the fragment shader.
 */
function testShader() {
  const uniforms: Record<string, IUniform<Vector4 | number>> = {};
  return {
    uniforms,
    fragmentShader: '#include <common>\nvoid main() {\n#include <lights_fragment_begin>\n}',
  };
}

/**
 * Calculates the pool factor and the hot spot from the uniforms, as the shader does.
 *
 * @param uniforms The uniforms of the pool.
 * @param x The x of the place, in meters.
 * @param z The z of the place, in meters.
 * @returns The pool factor and the factor of the hot spot.
 */
function shaderFactors(uniforms: PoolUniforms, x: number, z: number): [number, number] {
  const pool = uniforms.uLightPool.value;
  const spot = uniforms.uLightPoolSpot.value;
  const levels = uniforms.uLightPoolLevels.value;
  const dx = (x - pool.x) * pool.z;
  const dz = (z - pool.y) * pool.w;
  const sx = (x - spot.x) * spot.z;
  const sz = (z - spot.y) * spot.w;
  return [
    levels.x + (1 - levels.x) * Math.exp(-(dx * dx + dz * dz)),
    1 + levels.y * Math.exp(-(sx * sx + sz * sz)),
  ];
}

describe('defaultAim', () => {
  it('puts the pool between the stage center and the podium, with the hot spot on the podium', () => {
    const aim = defaultAim(SIDE, PODIUM);
    expect(aim.center).toEqual([0, PODIUM[2] * LIGHT_POOL.centerToPodium]);
    expect(aim.radius).toEqual([LIGHT_POOL.radiusX * SIDE, LIGHT_POOL.radiusZ * SIDE]);
    expect(aim.spot).toEqual([0, PODIUM[2]]);
    expect(aim.boost).toBe(LIGHT_POOL.spotBoost);
    expect(aim.floor).toBe(LIGHT_POOL.floor);
    // The visible beam stands above the stage center.
    expect(aim.beam).toEqual([0, 0]);
  });

  it('puts the pool at the stage center with no podium, and no hot spot', () => {
    const aim = defaultAim(SIDE, null);
    expect(aim.center).toEqual([0, 0]);
    expect(aim.boost).toBe(0);
  });
});

describe('setPoolAim', () => {
  it('gives the shader the centers, the inverse radii, and the levels of the aim', () => {
    const uniforms = createPoolUniforms();
    const aim = defaultAim(SIDE, PODIUM);
    setPoolAim(uniforms, aim);
    const [cx, cz] = aim.center;
    const [rx, rz] = aim.radius;
    const [sx, sz] = aim.spot;
    const [srx, srz] = aim.spotRadius;
    expect(uniforms.uLightPool.value.toArray()).toEqual([cx, cz, 1 / rx, 1 / rz]);
    expect(uniforms.uLightPoolSpot.value.toArray()).toEqual([sx, sz, 1 / srx, 1 / srz]);
    expect(uniforms.uLightPoolLevels.value.toArray()).toEqual([aim.floor, aim.boost]);
  });

  it('starts with no pool, and removes the hot spot of a stage with no podium', () => {
    const uniforms = createPoolUniforms();
    expect(shaderFactors(uniforms, 3, 4)).toEqual([1, 1]);
    setPoolAim(uniforms, defaultAim(SIDE, PODIUM));
    setPoolAim(uniforms, defaultAim(SIDE, null));
    expect(shaderFactors(uniforms, 0, 0)[1]).toBe(1);
  });
});

describe('addLightPool', () => {
  it('multiplies each spotlight by the pool, and the key light by the hot spot', () => {
    const uniforms = createPoolUniforms();
    const shader = testShader();
    // SAFETY: addLightPool reads and writes only these two fields of the shader.
    addLightPool(shader as Parameters<typeof addLightPool>[0], uniforms, 'stage');

    expect(shader.fragmentShader).not.toContain('#include <lights_fragment_begin>');
    expect(shader.fragmentShader).toContain('uniform vec4 uLightPool;');
    expect(shader.fragmentShader).toMatch(
      /getSpotLightInfo\( spotLight, geometryPosition, directLight \);\s*directLight\.color \*= lightPool;\s*#if \( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS \)\s*directLight\.color \*= lightPoolHot;/,
    );
    // The pool comes before the loop of the spotlights.
    expect(shader.fragmentShader.indexOf('float lightPool =')).toBeLessThan(
      shader.fragmentShader.indexOf('getSpotLightInfo('),
    );
    // The materials share the uniforms, so a new stage changes the pool of each material.
    expect(shader.uniforms['uLightPool']).toBe(uniforms.uLightPool);
    expect(shader.uniforms['uLightPoolSpot']).toBe(uniforms.uLightPoolSpot);
    expect(shader.uniforms['uLightPoolLevels']).toBe(uniforms.uLightPoolLevels);
  });

  it('goes into the material of the players only with a pool', () => {
    const [withPool] = createMaterials(createPoolUniforms());
    const shader = testShader();
    // SAFETY: the patch reads and writes only these two fields of the shader.
    withPool.onBeforeCompile(
      shader as Parameters<typeof withPool.onBeforeCompile>[0],
      undefined as never,
    );
    expect(shader.fragmentShader).toContain('directLight.color *= lightPool;');

    const [gallery] = createMaterials();
    const plain = testShader();
    // SAFETY: as above.
    gallery.onBeforeCompile(
      plain as Parameters<typeof gallery.onBeforeCompile>[0],
      undefined as never,
    );
    expect(plain.fragmentShader).toContain('#include <lights_fragment_begin>');
  });
});
