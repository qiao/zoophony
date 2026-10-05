import { AdditiveBlending, Mesh, ShaderMaterial, ShadowMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { createMaterials } from './geometry.ts';
import { FLOOR_LIGHT, createStage } from './stage.ts';

describe('createStage', () => {
  const side = 8;
  const meshes = createStage(side, [0, 0, 3], createMaterials()).children.filter(
    (child) => child instanceof Mesh,
  );

  it('adds the light on the floor as an additive disc of radius S (design 4.5)', () => {
    const disc = meshes.find((mesh) => mesh.material instanceof ShaderMaterial);
    if (!disc || !(disc.material instanceof ShaderMaterial)) {
      throw new Error('The stage has no floor light.');
    }
    const material = disc.material;
    expect(material.blending).toBe(AdditiveBlending);
    expect(material.depthWrite).toBe(false);
    expect(material.fragmentShader).toContain('#include <colorspace_fragment>');
    expect(material.uniforms['uOpacity']?.value).toBe(0.13);
    expect(material.uniforms['uInner']?.value).toBe(0.5 * side);
    expect(material.uniforms['uOuter']?.value).toBe(side);
    expect(FLOOR_LIGHT.color).toBe('#e8dcc0');
    disc.geometry.computeBoundingSphere();
    expect(disc.geometry.boundingSphere?.radius).toBeCloseTo(side, 6);
    expect(disc.castShadow).toBe(false);
  });

  it('keeps the floor light just above the shadow floor at y = -0.40', () => {
    const floor = meshes.find((mesh) => mesh.material instanceof ShadowMaterial);
    const disc = meshes.find((mesh) => mesh.material instanceof ShaderMaterial);
    expect(floor?.position.y).toBeCloseTo(-0.4, 9);
    expect(disc?.position.y).toBeCloseTo(-0.399, 9);
  });
});
