import { Group, HemisphereLight, Mesh, SRGBColorSpace, SpotLight } from 'three';
import { describe, expect, it } from 'vitest';

import { createLights, setLightsTier } from './lights.ts';
import { conductorOn } from '../models/layout-scene.ts';

/** The cone factor of a three.js spotlight at an angle from its axis (`getSpotAttenuation`). */
function coneFactor(spot: SpotLight, angle: number): number {
  const outer = Math.cos(spot.angle);
  const inner = Math.cos(spot.angle * (1 - spot.penumbra));
  const t = Math.min(1, Math.max(0, (Math.cos(angle) - outer) / (inner - outer)));
  return t * t * (3 - 2 * t);
}

describe('createLights', () => {
  const side = 6.6;
  const lights = createLights(side, 'high', null);

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

  it('puts the visible beam in the light group (scene/beam.ts)', () => {
    const beam = lights.children.find((child) => child instanceof Group);
    expect(beam?.children.some((child) => child instanceof Mesh)).toBe(true);
  });
});

describe('the light on the face of the conductor (design 4.5, UX audit FI1)', () => {
  const podium = [0, 0, 3.79] as const;
  const conductor = conductorOn([...podium]);
  const spots = createLights(11.19, 'high', conductor).children.filter(
    (child) => child instanceof SpotLight,
  );
  const face = conductor.position[1] + 1.2;

  it('aims a weak spotlight with no shadow at the face of the bear, from the orchestra side', () => {
    expect(spots).toHaveLength(2);
    const light = spots.find((spot) => !spot.castShadow);
    if (!light) {
      throw new Error('No light for the conductor.');
    }
    expect(light.target.position.toArray()).toEqual([0, face, 3.79]);
    // The bear faces -z, to the orchestra. The light stands in front of it and above it.
    const dx = light.position.x - light.target.position.x;
    const dy = light.position.y - light.target.position.y;
    const dz = light.position.z - light.target.position.z;
    expect(dz).toBeLessThan(-2);
    expect(Math.abs(dx)).toBeLessThan(1e-9);
    const elevation = Math.atan2(dy, Math.hypot(dx, dz)) * (180 / Math.PI);
    expect(elevation).toBeGreaterThan(25);
    expect(elevation).toBeLessThan(45);
    // The stage center gets 2.2 lux from above. The face of the dark brown bear gets 3 lux from
    // the front, so it reads as well as the light fur of the players.
    const lux = light.intensity / (dx * dx + dy * dy + dz * dz);
    expect(lux).toBeCloseTo(3, 9);
  });

  it('has no light for the conductor in a view with no conductor', () => {
    const lights = createLights(11.19, 'high', null);
    expect(lights.children.filter((child) => child instanceof SpotLight)).toHaveLength(1);
  });
});

describe('setLightsTier (design 2.6)', () => {
  it('gives the spotlight the shadow map and the blur of the new tier', () => {
    const lights = createLights(6.6, 'high', null);
    const spot = lights.children.find((child) => child instanceof SpotLight);
    expect(spot?.shadow.mapSize.toArray()).toEqual([2048, 2048]);
    expect(spot?.shadow.radius).toBe(3);
    setLightsTier(lights, 'low');
    expect(spot?.shadow.mapSize.toArray()).toEqual([512, 512]);
    expect(spot?.shadow.radius).toBe(1);
    setLightsTier(lights, 'medium');
    expect(spot?.shadow.mapSize.toArray()).toEqual([1024, 1024]);
  });
});

describe('the shadow bias (design 2.6, 4.5, UX audit 2026-10-05, SC5)', () => {
  it('moves each receiver past the blur disc of its tier, so a lit face does not shadow itself', () => {
    // S = 11.19: the light is 13.43 m above the stage. The map covers 33.75° from the axis, so a
    // texel of the high map is 2 × 13.43 × tan(33.75°) / 2048 = 8.8 mm at the stage.
    const lights = createLights(11.19, 'high', null);
    const spot = lights.children.find((child) => child instanceof SpotLight);
    if (!spot) {
      throw new Error('The light group has no spotlight.');
    }
    expect(spot.shadow.focus).toBe(0.75);
    const texel = (2 * 1.2 * 11.19 * Math.tan((33.75 * Math.PI) / 180)) / 2048;
    // The blur radius of the high tier is 3 texels, plus two texels.
    expect(spot.shadow.normalBias).toBeCloseTo(5 * texel, 9);
    expect(spot.shadow.normalBias).toBeGreaterThan(0.04);
    // The medium tier: a texel of 2 times the size and a radius of 1. The low tier: 4 times.
    setLightsTier(lights, 'medium');
    expect(spot.shadow.normalBias).toBeCloseTo(3 * 2 * texel, 9);
    setLightsTier(lights, 'low');
    expect(spot.shadow.normalBias).toBeCloseTo(3 * 4 * texel, 9);
  });
});
