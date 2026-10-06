import { describe, expect, it } from 'vitest';
import { Mesh, MeshStandardMaterial } from 'three';

import { STAGE_FINISH, createStage, createStageMaterial } from './stage.ts';

describe('createStage', () => {
  it('makes one stage mesh that casts and takes the shadows of the spotlight', () => {
    const meshes = createStage(8, [0, 0, 3]).children;
    expect(meshes).toHaveLength(1);
    const [stage] = meshes;
    expect(stage).toBeInstanceOf(Mesh);
    expect(stage?.castShadow).toBe(true);
    expect(stage?.receiveShadow).toBe(true);
  });
});

describe('createStageMaterial (design 4.5, materials)', () => {
  it('gives the wood a polished finish, glossier than the matte group of the players', () => {
    const material = createStageMaterial();
    expect(material).toBeInstanceOf(MeshStandardMaterial);
    expect(material.roughness).toBe(STAGE_FINISH.roughness);
    expect(material.roughness).toBeLessThan(0.85);
    expect(material.metalness).toBe(0);
    expect(material.vertexColors).toBe(true);
    expect(material.flatShading).toBe(true);
  });

  it('adds the grain to the color and the roughness of the standard shader', () => {
    const material = createStageMaterial();
    const shader = {
      uniforms: {},
      vertexShader: '#include <common>\n#include <project_vertex>',
      fragmentShader:
        '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>',
    };
    // SAFETY: onBeforeCompile reads and writes only these three fields of the shader.
    material.onBeforeCompile(
      shader as Parameters<typeof material.onBeforeCompile>[0],
      undefined as never,
    );
    expect(shader.vertexShader).toContain('vWoodPosition = (modelMatrix');
    expect(shader.fragmentShader).toContain('diffuseColor.rgb *= 1.0 + uGrain * grain;');
    expect(shader.fragmentShader).toContain('roughnessFactor = clamp(');
    expect(Object.keys(shader.uniforms)).toEqual(['uGrain', 'uGrainRoughness']);
  });
});
