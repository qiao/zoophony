import { describe, expect, it } from 'vitest';
import { Mesh, Points, ShaderMaterial, Vector3 } from 'three';

import {
  BEAM_LOOK,
  NOISE_SIZE,
  columnProfile,
  createBeam,
  insideColumn,
  setBeamFrame,
  tilingNoise,
} from './beam.ts';
import {
  BEAM_RADIUS_IN_SIDES,
  BEAM_TOP_RADIUS_IN_SIDES,
  SPOT_HEIGHT_IN_SIDES,
} from '../models/beam.ts';
import { TIER_SETTINGS } from './quality.ts';

describe('tilingNoise', () => {
  const noise = tilingNoise(NOISE_SIZE);
  const at = (x: number, y: number, z: number): number =>
    noise[(x % NOISE_SIZE) + NOISE_SIZE * ((y % NOISE_SIZE) + NOISE_SIZE * (z % NOISE_SIZE))] ?? 0;

  it('fills the cube with values that use most of the range', () => {
    expect(noise).toHaveLength(NOISE_SIZE ** 3);
    expect(Math.min(...noise)).toBeLessThan(64);
    expect(Math.max(...noise)).toBeGreaterThan(192);
  });

  it('wraps at the edges, so the beam shows no seam where the texture repeats', () => {
    // The step over the edge is as small as the largest step inside the cube.
    let inside = 0;
    let edge = 0;
    for (let y = 0; y < NOISE_SIZE; y++) {
      for (let z = 0; z < NOISE_SIZE; z++) {
        for (let x = 0; x + 1 < NOISE_SIZE; x++) {
          inside = Math.max(inside, Math.abs(at(x + 1, y, z) - at(x, y, z)));
        }
        edge = Math.max(edge, Math.abs(at(0, y, z) - at(NOISE_SIZE - 1, y, z)));
      }
    }
    expect(edge).toBeLessThanOrEqual(inside);
  });

  it('makes the same noise on each call', () => {
    expect(tilingNoise(8)).toEqual(tilingNoise(8));
  });
});

describe('columnProfile (design 4.5)', () => {
  it('keeps the haze column inside the cone, and meets the cone where it is as wide', () => {
    const side = 11.19;
    const [bottom, meet, top] = columnProfile(side);
    expect(bottom).toEqual([BEAM_LOOK.column * side, 0]);
    expect(top).toEqual([BEAM_TOP_RADIUS_IN_SIDES * side, SPOT_HEIGHT_IN_SIDES * side]);
    const [radius, y] = meet ?? [0, 0];
    const cone =
      BEAM_RADIUS_IN_SIDES * side +
      ((BEAM_TOP_RADIUS_IN_SIDES - BEAM_RADIUS_IN_SIDES) * side * y) /
        (SPOT_HEIGHT_IN_SIDES * side);
    expect(radius).toBeCloseTo(cone, 9);
  });

  it('tells a point in the column from a point in the cone outside the column', () => {
    const side = 11.19;
    expect(insideColumn(side, [0, 2, 0])).toBe(true);
    expect(insideColumn(side, [0.5 * side, 1, 0])).toBe(false);
  });
});

describe('createBeam (design 2.6, 4.5)', () => {
  it('gives the high tier dust motes and the most noise samples', () => {
    const beam = createBeam(11.19, 'high');
    const cone = beam.children.find((child) => child instanceof Mesh);
    const motes = beam.children.find((child) => child instanceof Points);
    if (!(cone instanceof Mesh) || !(cone.material instanceof ShaderMaterial)) {
      throw new Error('The beam has no cone.');
    }
    expect(cone.material.defines['SAMPLES']).toBe(TIER_SETTINGS.high.beamSamples);
    expect(cone.material.depthWrite).toBe(false);
    expect(cone.material.fragmentShader).toContain('#include <colorspace_fragment>');
    expect(motes).toBeInstanceOf(Points);
    expect(motes?.geometry.getAttribute('seed').count).toBe(TIER_SETTINGS.high.motes);
  });

  it('gives the low tier no dust motes', () => {
    const beam = createBeam(11.19, 'low');
    expect(beam.children.some((child) => child instanceof Points)).toBe(false);
  });
});

describe('setBeamFrame (design 4.5, 5.6)', () => {
  const side = 11.19;
  const beam = createBeam(side, 'high');
  const uniforms = (kind: typeof Mesh | typeof Points): ShaderMaterial['uniforms'] => {
    const child = beam.children.find((c) => c instanceof kind);
    if (!child || !(child instanceof Mesh || child instanceof Points)) {
      throw new Error('The beam has no such part.');
    }
    if (!(child.material instanceof ShaderMaterial)) {
      throw new Error('The part has no shader.');
    }
    return child.material.uniforms;
  };
  const frame = (factor: number, camera: Vector3): void => {
    setBeamFrame(beam, { stageSide: side, factor, camera, timeSec: 12, pixels: 1800 });
  };

  it('scales the haze and the motes by the factor of the camera', () => {
    frame(1, new Vector3(0, 20, 40));
    const full = uniforms(Mesh)['uStrength']?.value;
    expect(full).toBeCloseTo(BEAM_LOOK.strength / side, 12);
    frame(0.15, new Vector3(0, 20, 40));
    expect(uniforms(Mesh)['uStrength']?.value).toBeCloseTo(0.15 * full, 12);
    expect(uniforms(Points)['uStrength']?.value).toBeCloseTo(0.15 * BEAM_LOOK.moteStrength, 12);
    expect(uniforms(Points)['uTime']?.value).toBe(12);
  });

  it('draws the back faces when the camera is inside the cone', () => {
    frame(1, new Vector3(0, 20, 40));
    expect(uniforms(Mesh)['uInside']?.value).toBe(0);
    frame(1, new Vector3(1, 2, 1));
    expect(uniforms(Mesh)['uInside']?.value).toBe(1);
  });
});
