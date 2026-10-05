import { Mesh, ShaderMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { createLights } from './lights.ts';

/** Finds the beam: the only mesh of the light group. */
function beamMaterial(): ShaderMaterial {
  const beam = createLights(6.6, 'high').children.find((child) => child instanceof Mesh);
  if (!(beam instanceof Mesh) || !(beam.material instanceof ShaderMaterial)) {
    throw new Error('The light group has no beam.');
  }
  return beam.material;
}

describe('createLights', () => {
  it('converts the linear beam color to the output color space (review of step 3, F1)', () => {
    expect(beamMaterial().fragmentShader).toContain('#include <colorspace_fragment>');
  });
});
