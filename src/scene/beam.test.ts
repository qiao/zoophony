import { describe, expect, it } from 'vitest';
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
} from 'three';
import type { Object3D } from 'three';

import {
  BEAM_LOOK,
  BeamDepth,
  NOISE_SIZE,
  columnProfile,
  coneExit,
  createBeam,
  hazeHeightFade,
  hazeRayFade,
  insideColumn,
  motePosition,
  setBeamFrame,
  setBeamTier,
  tilingNoise,
} from './beam.ts';
import type { DepthRenderer } from './beam.ts';
import {
  BEAM_RADIUS_IN_SIDES,
  BEAM_TOP_RADIUS_IN_SIDES,
  SPOT_HEIGHT_IN_SIDES,
} from '../models/beam.ts';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { layoutScene } from '../models/layout-scene.ts';
import { ModelCache } from '../models/model-cache.ts';
import { buildScore } from '../score/score.ts';
import { prepareSubjects } from '../shots/subjects.ts';
import { defaultView } from '../shots/view.ts';
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
 * Gives the haze factor of the densest point on the segment from a camera to a point: the height
 * fade times the ray fade, at each point inside the haze column.
 */
function hazeOnRay(side: number, from: Vec3, to: Vec3): number {
  const d: Vec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(...d);
  const ray = hazeRayFade(side, from, [d[0] / length, d[1] / length, d[2] / length]);
  let most = 0;
  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    const p: Vec3 = [from[0] + d[0] * t, from[1] + d[1] * t, from[2] + d[2] * t];
    if (insideColumn(side, p)) {
      most = Math.max(most, hazeHeightFade(side, p[1]) * ray);
    }
  }
  return most;
}

/** Gives the camera position at an elevation and a distance on the audience axis. */
function cameraAt(elevationDeg: number, distance: number): Vec3 {
  const e = (elevationDeg * Math.PI) / 180;
  return [0, Math.sin(e) * distance, Math.cos(e) * distance];
}

describe('the fade of the haze (design 4.5)', () => {
  it('gives no haze in the player layer and the full haze high in the column', () => {
    const side = 11.19;
    expect(hazeHeightFade(side, 0)).toBe(0);
    expect(hazeHeightFade(side, BEAM_LOOK.layer.height)).toBe(0);
    expect(hazeHeightFade(side, 0.5 * 1.2 * side)).toBeGreaterThan(0.5);
    expect(hazeHeightFade(side, BEAM_LOOK.fadeTop * 1.2 * side)).toBe(1);
  });

  it('keeps the haze off the rays from the wide views to the heads of the players', async () => {
    const models = new ModelCache();
    for (const demo of await patchedDemos()) {
      const result = buildScore(demo.bytes, 'auto');
      if (!result.ok) {
        throw new Error(`${demo.file} is not valid.`);
      }
      const layout = layoutScene(result.score, models);
      const side = layout.stageSide;
      const { heads } = prepareSubjects(result.score, layout, models);
      const cameras: [string, Vec3][] = [
        ...(
          [
            [1440, 900],
            [1280, 720],
            [1024, 768],
            [390, 844],
          ] as const
        ).map(([w, h]): [string, Vec3] => [`${w} x ${h}`, defaultView(side, w, h).position]),
        // The high shot of design 5.6, and the highest view of Free mode.
        ['high', cameraAt(42, 0.75 * 3.3 * side)],
        ['top', cameraAt(80, 0.56 * 3.3 * side)],
      ];
      for (const [name, camera] of cameras) {
        let most = 0;
        for (const { center, radius } of heads) {
          // The top of the head, with the ears, is in the player layer.
          const top: Vec3 = [center[0], center[1] + 2 * radius, center[2]];
          expect(top[1]).toBeLessThan(BEAM_LOOK.layer.height);
          expect(Math.max(Math.abs(top[0]), Math.abs(top[2]))).toBeLessThan(
            BEAM_LOOK.layer.half * side,
          );
          most = Math.max(most, hazeOnRay(side, camera, top));
        }
        // 1% of the full density is not visible.
        expect(most, `${demo.file}, ${name}`).toBeLessThan(0.01);
      }
    }
  });

  it('keeps the full haze on the rays from the default view over the orchestra', () => {
    for (const side of [6.71, 8.98, 11.19, 11.98]) {
      const camera = defaultView(side, 1440, 900).position;
      // A ray to the upper column, and a ray that meets the layer top behind the stage.
      for (const point of [
        [0, side, 0],
        [0, BEAM_LOOK.layer.height, -(BEAM_LOOK.layer.half + 0.4) * side],
      ] as const) {
        const d = point.map((v, i) => v - (camera[i] ?? 0));
        const length = Math.hypot(...d);
        const fade = hazeRayFade(side, camera, [
          (d[0] ?? 0) / length,
          (d[1] ?? 0) / length,
          (d[2] ?? 0) / length,
        ]);
        expect(fade, `S ${side}`).toBeGreaterThan(0.99);
      }
    }
  });

  it('keeps the full haze for a camera in the player layer', () => {
    expect(hazeRayFade(11.19, [1, 1.5, 4], [0, -0.6, -0.8])).toBe(1);
  });
});

describe('coneExit (design 4.5)', () => {
  const side = 11.98;
  const height = SPOT_HEIGHT_IN_SIDES * side;

  it('ends a level ray through the axis at the far wall of the cone', () => {
    const y = 0.5 * height;
    const radius =
      BEAM_RADIUS_IN_SIDES * side + (BEAM_TOP_RADIUS_IN_SIDES - BEAM_RADIUS_IN_SIDES) * side * 0.5;
    const origin: Vec3 = [0, y, 30];
    expect(coneExit(side, origin, [0, 0, -1], 30 - radius)).toBeCloseTo(30 + radius, 6);
  });

  it('lets a ray that is steeper than the wall end on the stage top', () => {
    // A camera above the light looks down through the cone: the top view of Free mode. The other
    // root lies on the mirror cone above the apex, and the beam was gone.
    const origin: Vec3 = [0, 2 * height, 0.3 * height];
    const target: Vec3 = [0, 0.8 * height, 0];
    const d = [target[0] - origin[0], target[1] - origin[1], target[2] - origin[2]];
    const length = Math.hypot(...d);
    const dir: Vec3 = [(d[0] ?? 0) / length, (d[1] ?? 0) / length, (d[2] ?? 0) / length];
    expect(coneExit(side, origin, dir, 0.9 * length)).toBe(Infinity);
  });
});

describe('columnProfile (design 4.5)', () => {
  it('keeps the haze column inside the cone, and meets the cone where it is as wide', () => {
    const side = 11.19;
    const [axis, bottom, meet, top] = columnProfile(side);
    expect(axis).toEqual([0, BEAM_LOOK.layer.height]);
    expect(bottom).toEqual([BEAM_LOOK.column * side, BEAM_LOOK.layer.height]);
    // The smallest stage side is 5 m (design 4.5).
    expect(BEAM_LOOK.layer.height).toBeLessThan(columnProfile(5)[2]?.[1] ?? 0);
    expect(BEAM_LOOK.layer.height).toBeLessThan(BEAM_LOOK.fadeTop * SPOT_HEIGHT_IN_SIDES * 5);
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
    expect(insideColumn(side, [0, 7, 0])).toBe(true);
    expect(insideColumn(side, [0.5 * side, 7, 0])).toBe(false);
    expect(insideColumn(side, [0, 2, 0])).toBe(false);
  });
});

describe('motePosition (design 4.5)', () => {
  it('keeps each dust mote in the haze column, above the player layer', () => {
    for (const side of [6.71, 11.19]) {
      const motes = createBeam(side, 'high').children.find((child) => child instanceof Points);
      const seeds = motes?.geometry.getAttribute('seed');
      expect(seeds?.count).toBe(TIER_SETTINGS.high.motes);
      for (let i = 0; i < (seeds?.count ?? 0); i++) {
        const seed = [seeds?.getX(i), seeds?.getY(i), seeds?.getZ(i), seeds?.getW(i)].map(
          (v) => v ?? 0,
        );
        for (const time of [0, 37, 1000]) {
          const [x, y, z] = motePosition(
            side,
            [seed[0] ?? 0, seed[1] ?? 0, seed[2] ?? 0, seed[3] ?? 0],
            time,
          );
          // The drift moves a mote by at most 0.15 m on each axis.
          expect(Math.hypot(x, z)).toBeLessThan(BEAM_LOOK.column * side + 0.22);
          expect(y).toBeGreaterThan(BEAM_LOOK.layer.height - 0.16);
          expect(y).toBeLessThan(SPOT_HEIGHT_IN_SIDES * side);
        }
      }
    }
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
      { visible: [false, false, true], override: true, target: true, shadows: false },
    ]);
    expect([beam.visible, hall.visible, player.visible]).toEqual([true, true, true]);
    expect(scene.overrideMaterial).toBeNull();
    expect(renderer.target).toBeNull();
    expect(renderer.shadowMap.autoUpdate).toBe(true);
    expect(depth.size).toEqual([2880, 1800]);
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
    setBeamFrame(beam, { stageSide: side, factor, camera, timeSec: 12, depth });
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

  it('draws the back faces with no depth test when the camera is inside the column', () => {
    frame(1, [0, 20, 40]);
    expect(uniforms(Mesh)['uInside']?.value).toBe(0);
    expect(material(Mesh).depthTest).toBe(true);
    frame(1, [1, 8, 1]);
    expect(uniforms(Mesh)['uInside']?.value).toBe(1);
    expect(material(Mesh).depthTest).toBe(false);
    frame(1, [1, 2, 1]);
    expect(uniforms(Mesh)['uInside']?.value).toBe(0);
    expect(material(Mesh).depthTest).toBe(true);
  });
});
