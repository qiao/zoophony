import { describe, expect, it } from 'vitest';
import { Mesh, MeshStandardMaterial, Vector3 } from 'three';

import { PODIUM_FROM_FRONT } from '../models/stage.ts';
import { createPoolUniforms } from './light-pool.ts';
import {
  STAGE_FINISH,
  STAGE_POOL,
  createStage,
  createStageMaterial,
  poolLight,
  poolLine,
} from './stage.ts';

describe('createStage', () => {
  it('makes one stage mesh that casts and takes the shadows of the spotlight', () => {
    const meshes = createStage(8, [0, 0, 3], createPoolUniforms()).children;
    expect(meshes).toHaveLength(1);
    const [stage] = meshes;
    expect(stage).toBeInstanceOf(Mesh);
    expect(stage?.castShadow).toBe(true);
    expect(stage?.receiveShadow).toBe(true);
  });
});

describe('createStageMaterial (design 4.5, materials)', () => {
  it('gives the wood a polished finish, glossier than the matte group of the players', () => {
    const material = createStageMaterial(8, [0, 0, 3], createPoolUniforms());
    expect(material).toBeInstanceOf(MeshStandardMaterial);
    expect(material.roughness).toBe(STAGE_FINISH.roughness);
    expect(material.roughness).toBeLessThan(0.85);
    expect(material.metalness).toBe(0);
    expect(material.vertexColors).toBe(true);
    expect(material.flatShading).toBe(true);
  });

  it('adds the grain, the baked light of the sides, and both pools to the standard shader', () => {
    const material = createStageMaterial(8, [0, 0, 3], createPoolUniforms());
    const shader = {
      uniforms: {},
      vertexShader: '#include <common>\n#include <project_vertex>',
      fragmentShader:
        '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <emissivemap_fragment>\n#include <lights_fragment_begin>\n#include <lights_fragment_end>',
    };
    // SAFETY: onBeforeCompile reads and writes only these three fields of the shader.
    material.onBeforeCompile(
      shader as Parameters<typeof material.onBeforeCompile>[0],
      undefined as never,
    );
    expect(shader.vertexShader).toContain('vWoodPosition = (modelMatrix');
    expect(shader.fragmentShader).toContain('diffuseColor.rgb *= 1.0 + uGrain * grain;');
    expect(shader.fragmentShader).toContain('roughnessFactor = clamp(');
    expect(shader.fragmentShader).toContain('totalEmissiveRadiance += diffuseColor.rgb * sideGlow');
    expect(shader.fragmentShader).toContain('directLight.color *= lightPool;');
    expect(Object.keys(shader.uniforms)).toEqual([
      'uLightPool',
      'uLightPoolSpot',
      'uLightPoolFloor',
      'uGrain',
      'uGrainRoughness',
      'uHalfSide',
      'uSpecular',
      'uSideGlow',
      'uPool',
    ]);
    expect(shader.fragmentShader).toContain('reflectedLight.directSpecular *= uSpecular;');
    expect(shader.fragmentShader).toContain('reflectedLight.directDiffuse *= uPool.z');
    expect(shader.uniforms).toMatchObject({
      uHalfSide: { value: 4 },
      uPool: { value: new Vector3(3, STAGE_POOL.reach * 8, STAGE_POOL.floor) },
    });
  });
});

describe('poolLight (design 4.5, scene colors)', () => {
  it('keeps the full light in front of the podium, and dims the wood toward the back', () => {
    expect(poolLight(-0.3)).toBe(1);
    expect(poolLight(0)).toBe(1);
    expect(poolLight(0.2)).toBeLessThan(1);
    expect(poolLight(0.5)).toBeLessThan(poolLight(0.2));
    // The back edge of a stage with the podium 1 m behind its front edge is S - 1 m behind the
    // podium: 0.85 S on a stage of 6.6 m.
    expect(poolLight(0.85)).toBeLessThan(0.45);
    expect(poolLight(10)).toBeCloseTo(STAGE_POOL.floor, 9);
  });

  it('puts the line of the pool at the podium, or where the podium of a stage would stand', () => {
    expect(poolLine(8, [0.5, 0, 2.7])).toBe(2.7);
    expect(poolLine(8, null)).toBe(4 - PODIUM_FROM_FRONT);
  });
});
