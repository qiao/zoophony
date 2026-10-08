import type { IUniform, Vector4 } from 'three';
import { describe, expect, it } from 'vitest';

import { createMaterials } from './geometry.ts';
import {
  LIGHT_POOL,
  addLightPool,
  createPoolUniforms,
  defaultAim,
  poolFactor,
  setPoolAim,
  spotFactor,
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
    expect(spotFactor(aim, 0, 0)).toBe(1);
  });
});

describe('poolFactor (design 4.5)', () => {
  const aim = defaultAim(SIDE, PODIUM);
  const [cx, cz] = aim.center;

  it('gives the full light at the pool center, and the same light left and right', () => {
    expect(poolFactor(aim, cx, cz)).toBeCloseTo(1, 9);
    expect(poolFactor(aim, -3, 2)).toBeCloseTo(poolFactor(aim, 3, 2), 9);
  });

  it('dims the sides, the front corners, and the back row of the default demo', () => {
    // The violas near the middle keep most of the light.
    expect(poolFactor(aim, 1.9, 1.9)).toBeGreaterThan(0.9);
    // The first violins and the cellos at the sides: a little darker, as the rabbits and the dogs
    // at the sides of mockup.png (0.8 to 0.9 of the value of the players near the middle).
    for (const [x, z] of [
      [-4.3, 3.2],
      [4.4, 3.5],
    ] as const) {
      expect(poolFactor(aim, x, z)).toBeLessThan(0.8);
      expect(poolFactor(aim, x, z)).toBeGreaterThan(0.75);
    }
    // The back row and the front corners.
    expect(poolFactor(aim, 0, -4.6)).toBeLessThan(0.5);
    expect(poolFactor(aim, SIDE / 2, SIDE / 2)).toBeLessThan(0.6);
    // Far from the stage, the floor value.
    expect(poolFactor(aim, 100, 0)).toBeCloseTo(LIGHT_POOL.floor, 9);
  });
});

describe('spotFactor (design 4.5)', () => {
  it('adds the hot spot of the key light on the podium, and nothing far from it', () => {
    const aim = defaultAim(SIDE, PODIUM);
    expect(spotFactor(aim, 0, PODIUM[2])).toBeCloseTo(1 + LIGHT_POOL.spotBoost, 9);
    expect(spotFactor(aim, 1, PODIUM[2])).toBeLessThan(1 + LIGHT_POOL.spotBoost);
    expect(spotFactor(aim, 0, -4.6)).toBeCloseTo(1, 3);
  });

  it('spreads the hot spot across the stage to the piano and the cellos', () => {
    const aim = defaultAim(SIDE, PODIUM);
    const half = 1 + LIGHT_POOL.spotBoost / 2;
    // A quarter of the stage side left or right of the podium keeps more than half of the boost.
    expect(spotFactor(aim, -0.25 * SIDE, PODIUM[2])).toBeGreaterThan(half);
    expect(spotFactor(aim, 0.25 * SIDE, PODIUM[2])).toBeGreaterThan(half);
    // Along the stage, the same distance keeps less than half of it.
    expect(spotFactor(aim, 0, PODIUM[2] - 0.25 * SIDE)).toBeLessThan(half);
  });
});

describe('setPoolAim', () => {
  it('gives the shader the same factors as poolFactor and spotFactor', () => {
    const uniforms = createPoolUniforms();
    const aim = defaultAim(SIDE, PODIUM);
    setPoolAim(uniforms, aim);
    for (const [x, z] of [
      [0, 0],
      [-4.3, 3.2],
      [2, -4.5],
      [0.4, 4.6],
      [5.6, 5.6],
    ] as const) {
      const [pool, spot] = shaderFactors(uniforms, x, z);
      expect(pool).toBeCloseTo(poolFactor(aim, x, z), 9);
      expect(spot).toBeCloseTo(spotFactor(aim, x, z), 9);
    }
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
    addLightPool(shader as Parameters<typeof addLightPool>[0], uniforms);

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
