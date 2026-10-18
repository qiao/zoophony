import { describe, expect, it } from 'vitest';
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from 'three';
import type { Object3D } from 'three';

import {
  BEAM_LOOK,
  BeamDepth,
  NOISE_SIZE,
  beamAxes,
  hazeProfile,
  createBeam,
  hazeRadius,
  insideHaze,
  setBeamFrame,
  setBeamTier,
  tilingNoise,
} from './beam.ts';
import type { DepthRenderer } from './beam.ts';
import { BEAM_RADIUS_IN_SIDES, BEAM_TOP_RADIUS_IN_SIDES, keyLightPlace } from '../models/beam.ts';
import type { Vec3 } from '../models/tuples.ts';
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

/**
 * Rounds the values of a point to 1 nm, so that a test can compare it.
 *
 * @param point The values.
 * @returns The rounded values.
 */
function rounded(point: readonly number[]): number[] {
  return point.map((v) => Math.round(v * 1e9) / 1e9);
}

/**
 * Gives a point near the axis of a beam with its foot at the stage center: the axis goes from the
 * stage center to the key light.
 */
function onAxis(side: number, y: number, dx = 0, dz = 0): [number, number, number] {
  const [lightX, height, lightZ] = keyLightPlace(side);
  return [(lightX * y) / height + dx, y, (lightZ * y) / height + dz];
}

describe('beamAxes (design 2.4, 4.5)', () => {
  const side = 11.19;
  const height = keyLightPlace(side)[1];
  const foot = [3.9, 3.2] as const;

  it('leans the beam from the light to its foot on the stage top', () => {
    // The foot is the axis at the stage top, and the light stays in its place.
    const [lightX, , lightZ] = keyLightPlace(side);
    expect(rounded(beamAxes(side, [3.9, 0, 3.2], foot))).toEqual([0, 0, 0]);
    expect(rounded(beamAxes(side, [lightX, height, lightZ], foot))).toEqual(
      rounded([0, height, 0]),
    );
    expect(rounded(beamAxes(side, [4.9, 0, 3.2], foot))).toEqual([1, 0, 0]);
    // Halfway up, the axis is halfway between the foot and the light.
    const middle = beamAxes(side, [(3.9 + lightX) / 2, height / 2, (3.2 + lightZ) / 2], foot);
    expect(rounded(middle)).toEqual(rounded([0, height / 2, 0]));
    // At the stage top, a foot at the stage center keeps the stage axes.
    expect(beamAxes(side, [2, 0, -1], [0, 0])).toEqual([2, 0, -1]);
  });

  it('tells a point in the leaning haze cone from a point outside it', () => {
    expect(insideHaze(side, [3.9, 0.5, 3.2], foot)).toBe(true);
    expect(insideHaze(side, [3.9, 0.5, 3.2])).toBe(false);
    expect(insideHaze(side, [0, 0.5, 0], foot)).toBe(false);
  });
});

describe('hazeProfile (design 4.5)', () => {
  it('keeps the haze cone inside the light cone, from below the stage top up to the light', () => {
    const side = 11.19;
    const height = keyLightPlace(side)[1];
    const [axis, bottom, top] = hazeProfile(side);
    expect(axis?.[0]).toBe(0);
    expect(axis?.[1]).toBeLessThan(0);
    expect(bottom).toEqual([hazeRadius(side, axis?.[1] ?? 0), axis?.[1]]);
    expect(top).toEqual([BEAM_TOP_RADIUS_IN_SIDES * side, height]);
    // The haze cone is narrower than the light cone of models/beam.ts at each height.
    for (let y = 0; y < height; y += 0.1) {
      const cone =
        BEAM_RADIUS_IN_SIDES * side +
        ((BEAM_TOP_RADIUS_IN_SIDES - BEAM_RADIUS_IN_SIDES) * side * y) / height;
      expect(hazeRadius(side, y)).toBeLessThanOrEqual(cone);
    }
    expect(hazeRadius(side, 0)).toBeCloseTo(BEAM_LOOK.column * side, 9);
  });

  it('tells a point in the haze cone from a point in the light cone outside it', () => {
    const side = 11.19;
    expect(insideHaze(side, onAxis(side, 7))).toBe(true);
    expect(insideHaze(side, onAxis(side, 2))).toBe(true);
    expect(insideHaze(side, onAxis(side, 7, 2))).toBe(false);
    expect(insideHaze(side, onAxis(side, 7, 0.5 * side))).toBe(false);
    expect(insideHaze(side, [0, -0.5, 0])).toBe(false);
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

  it('keeps the dust motes few and dim, and hides them in front of a surface', () => {
    // 350 bright motes read as a field of stars in the column (user report of 2026-10-06).
    expect(TIER_SETTINGS.high.motes).toBeLessThanOrEqual(150);
    expect(BEAM_LOOK.moteStrength).toBeLessThanOrEqual(1);
    const motes = createBeam(11.19, 'high').children.find((child) => child instanceof Points);
    if (!(motes?.material instanceof ShaderMaterial)) {
      throw new Error('The beam has no motes.');
    }
    expect(motes.material.fragmentShader).toContain('depthFade(scene - distance) * surface');
  });

  it('hides the dust motes on the low tier', () => {
    const beam = createBeam(11.19, 'low');
    const motes = beam.children.find((child) => child instanceof Points);
    expect(motes?.visible).toBe(false);
  });
});

describe('setBeamTier (design 2.6)', () => {
  it('changes the haze samples and the dust motes after the layout', () => {
    const beam = createBeam(11.19, 'high');
    const cone = beam.children.find((child) => child instanceof Mesh);
    const motes = beam.children.find((child) => child instanceof Points);
    if (!(cone instanceof Mesh) || !(cone.material instanceof ShaderMaterial) || !motes) {
      throw new Error('The beam has no cone or no motes.');
    }
    const version = cone.material.version;
    for (const tier of ['low', 'medium', 'high'] as const) {
      setBeamTier(beam, tier);
      expect(cone.material.defines['SAMPLES'], tier).toBe(TIER_SETTINGS[tier].beamSamples);
      expect(motes.visible, tier).toBe(TIER_SETTINGS[tier].motes > 0);
      expect(motes.geometry.drawRange.count, tier).toBe(TIER_SETTINGS[tier].motes);
    }
    // The shader compiles again for each change of the samples.
    expect(cone.material.version).toBeGreaterThan(version);
  });
});

/** A renderer that records the state of the scene at each render. */
class RecordingRenderer implements DepthRenderer {
  readonly shadowMap = { autoUpdate: true };
  readonly info = { render: { frame: 7 } };
  target: WebGLRenderTarget | null = null;
  readonly renders: { visible: boolean[]; override: boolean; target: boolean; shadows: boolean }[] =
    [];
  readonly #watched: readonly Object3D[];

  constructor(watched: readonly Object3D[]) {
    this.#watched = watched;
  }

  getRenderTarget(): WebGLRenderTarget | null {
    return this.target;
  }

  setRenderTarget(target: WebGLRenderTarget | null): void {
    this.target = target;
  }

  render(scene: Object3D): void {
    this.info.render.frame += 1;
    this.renders.push({
      visible: this.#watched.map((object) => object.visible),
      override: scene instanceof Scene && scene.overrideMaterial instanceof MeshBasicMaterial,
      target: this.target !== null,
      shadows: this.shadowMap.autoUpdate,
    });
  }
}

describe('BeamDepth (design 4.5)', () => {
  it('renders the depth with the effects and the hall hidden, and then restores them', () => {
    const scene = new Scene();
    const beam = new Group();
    const hall = new Group();
    const player = new Group();
    scene.add(beam, hall, player);
    const renderer = new RecordingRenderer([beam, hall, player]);
    const depth = new BeamDepth();
    depth.setSize(2880, 1800);
    depth.render(renderer, scene, new PerspectiveCamera(), [beam, hall]);

    expect(renderer.renders).toEqual([
      { visible: [false, false, true], override: true, target: true, shadows: true },
    ]);
    expect([beam.visible, hall.visible, player.visible]).toEqual([true, true, true]);
    expect(scene.overrideMaterial).toBeNull();
    expect(renderer.target).toBeNull();
    expect(renderer.shadowMap.autoUpdate).toBe(true);
    expect(depth.size).toEqual([2880, 1800]);
    depth.dispose();
  });

  it('renders the shadow map of the frame, so that the skeletons upload one time', () => {
    const scene = new Scene();
    const renderer = new RecordingRenderer([]);
    const depth = new BeamDepth();
    depth.render(renderer, scene, new PerspectiveCamera(), []);
    expect(renderer.renders.map((render) => render.shadows)).toEqual([true]);
    // The scene pass starts at the frame number of the shadow pass.
    expect(renderer.info.render.frame).toBe(8);
    depth.dispose();
  });
});

describe('setBeamFrame (design 4.5, 5.6)', () => {
  const side = 11.19;
  const beam = createBeam(side, 'high');
  const depth = new BeamDepth();
  depth.setSize(1440, 900);
  const material = (kind: typeof Mesh | typeof Points): ShaderMaterial => {
    const child = beam.children.find((c) => c instanceof kind);
    if (!child || !(child instanceof Mesh || child instanceof Points)) {
      throw new Error('The beam has no such part.');
    }
    if (!(child.material instanceof ShaderMaterial)) {
      throw new Error('The part has no shader.');
    }
    return child.material;
  };
  const uniforms = (kind: typeof Mesh | typeof Points): ShaderMaterial['uniforms'] =>
    material(kind).uniforms;
  const frame = (factor: number, position: Vec3): PerspectiveCamera => {
    const camera = new PerspectiveCamera(30, 1.6, 0.5, 80);
    camera.position.set(...position);
    setBeamFrame(beam, { stageSide: side, factor, camera, timeSec: 12, depth, foot: [0, 0] });
    return camera;
  };

  it('scales the haze and the motes by the factor of the camera', () => {
    frame(1, [0, 20, 40]);
    const full = uniforms(Mesh)['uStrength']?.value;
    expect(full).toBeCloseTo(BEAM_LOOK.strength / side, 12);
    frame(0.15, [0, 20, 40]);
    expect(uniforms(Mesh)['uStrength']?.value).toBeCloseTo(0.15 * full, 12);
    expect(uniforms(Points)['uStrength']?.value).toBeCloseTo(0.15 * BEAM_LOOK.moteStrength, 12);
    expect(uniforms(Points)['uTime']?.value).toBe(12);
  });

  it('gives the haze and the motes the depth of the scene and the camera range', () => {
    frame(1, [0, 20, 40]);
    for (const kind of [Mesh, Points]) {
      expect(uniforms(kind)['uDepth']?.value).toBe(depth.texture);
      expect(uniforms(kind)['uResolution']?.value.toArray()).toEqual([1440, 900]);
      expect(uniforms(kind)['uNear']?.value).toBe(0.5);
      expect(uniforms(kind)['uFar']?.value).toBe(80);
    }
    expect(uniforms(Points)['uPixels']?.value).toBe(900);
  });

  it('leans the cone and the motes to the foot of the beam', () => {
    const camera = new PerspectiveCamera(30, 1.6, 0.5, 80);
    camera.position.set(0, 20, 40);
    const foot = [3.9, 3.2] as const;
    setBeamFrame(beam, { stageSide: side, factor: 1, camera, timeSec: 12, depth, foot });

    for (const kind of [Mesh, Points]) {
      expect(uniforms(kind)['uFoot']?.value).toEqual(new Vector2(3.9, 3.2));
    }
    // The axis of the mesh goes from the foot on the stage top to the light.
    const cone = beam.children.find((child) => child instanceof Mesh);
    if (!cone) {
      throw new Error('The beam has no cone.');
    }
    const height = keyLightPlace(side)[1];
    const bottom = new Vector3(0, 0, 0).applyMatrix4(cone.matrixWorld);
    const top = new Vector3(0, height, 0).applyMatrix4(cone.matrixWorld);
    expect(rounded(bottom.toArray())).toEqual([3.9, 0, 3.2]);
    expect(rounded(top.toArray())).toEqual(rounded(keyLightPlace(side)));

    // A camera just above the foot is inside the haze cone.
    camera.position.set(3.9, 1, 3.2);
    setBeamFrame(beam, { stageSide: side, factor: 1, camera, timeSec: 12, depth, foot });
    expect(uniforms(Mesh)['uInside']?.value).toBe(1);
    frame(1, [0, 20, 40]);
    expect(uniforms(Mesh)['uFoot']?.value).toEqual(new Vector2(0, 0));
  });

  it('draws the back faces with no depth test when the camera is inside the haze cone', () => {
    frame(1, [0, 20, 40]);
    expect(uniforms(Mesh)['uInside']?.value).toBe(0);
    expect(material(Mesh).depthTest).toBe(true);
    frame(1, onAxis(side, 8, 0.5, 0.5));
    expect(uniforms(Mesh)['uInside']?.value).toBe(1);
    expect(material(Mesh).depthTest).toBe(false);
    frame(1, onAxis(side, 2, 1, 1));
    expect(uniforms(Mesh)['uInside']?.value).toBe(1);
    frame(1, onAxis(side, 2, 0.4 * side));
    expect(uniforms(Mesh)['uInside']?.value).toBe(0);
    expect(material(Mesh).depthTest).toBe(true);
  });
});
