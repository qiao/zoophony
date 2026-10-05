import { HemisphereLight, Mesh, SRGBColorSpace, ShaderMaterial, SpotLight } from 'three';
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

/** The cone factor of a three.js spotlight at an angle from its axis (`getSpotAttenuation`). */
function coneFactor(spot: SpotLight, angle: number): number {
  const outer = Math.cos(spot.angle);
  const inner = Math.cos(spot.angle * (1 - spot.penumbra));
  const t = Math.min(1, Math.max(0, (Math.cos(angle) - outer) / (inner - outer)));
  return t * t * (3 - 2 * t);
}

describe('createLights', () => {
  const side = 6.6;
  const lights = createLights(side, 'high');

  it('lights the stage corners with most of the full light (design 4.5)', () => {
    const spot = lights.children.find((child) => child instanceof SpotLight);
    if (!spot) {
      throw new Error('The light group has no spotlight.');
    }
    // A top corner is S / √2 from the center, and the light is 1.2 × S above it.
    const corner = Math.atan(side / Math.SQRT2 / spot.position.y);
    expect(coneFactor(spot, corner)).toBeGreaterThan(0.75);
    expect(coneFactor(spot, 0)).toBe(1);
  });

  it('gives the fill light the warm ground color of the lit stage (design 4.5)', () => {
    const fill = lights.children.find((child) => child instanceof HemisphereLight);
    expect(fill?.groundColor.getHexString(SRGBColorSpace)).toBe('4a3a30');
  });

  it('converts the linear beam color to the output color space (review of step 3, F1)', () => {
    expect(beamMaterial().fragmentShader).toContain('#include <colorspace_fragment>');
  });
});
