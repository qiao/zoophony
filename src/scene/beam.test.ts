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
  hazeDensity,
  hazeDepthFade,
  hazeHeightFade,
  hazeSurfaceFade,
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

/** Gives the camera position at an elevation and a distance on the audience axis. */
function cameraAt(elevationDeg: number, distance: number, azimuthDeg = 0): Vec3 {
  const e = (elevationDeg * Math.PI) / 180;
  const a = (azimuthDeg * Math.PI) / 180;
  return [
    Math.sin(a) * Math.cos(e) * distance,
    Math.sin(e) * distance,
    Math.cos(a) * Math.cos(e) * distance,
  ];
}

/**
 * Gives the light that the haze sends along the view ray from a camera through a point, with no
 * noise: the sum of the density in steps of 2 cm, to the stage top or to the far side of the
 * column. The shader adds no other factor on a ray that ends on the hall.
 */
function rayLight(side: number, camera: Vec3, through: Vec3): number {
  const d: Vec3 = [through[0] - camera[0], through[1] - camera[1], through[2] - camera[2]];
  const length = Math.hypot(...d);
  const dir: Vec3 = [d[0] / length, d[1] / length, d[2] / length];
  const step = 0.02;
  let sum = 0;
  for (let t = 0; t < 2 * length; t += step) {
    const p: Vec3 = [camera[0] + dir[0] * t, camera[1] + dir[1] * t, camera[2] + dir[2] * t];
    if (p[1] < 0) {
      break;
    }
    if (insideColumn(side, p)) {
      sum += hazeDensity(side, p) * step;
    }
  }
  return sum;
}

describe('the light along the beam (design 4.5)', () => {
  const sides = [6.71, 8.98, 11.29, 11.98];

  it('grows the density smoothly from the stage top to the light, with no step', () => {
    for (const side of sides) {
      const height = SPOT_HEIGHT_IN_SIDES * side;
      expect(hazeHeightFade(side, 0)).toBe(BEAM_LOOK.floor);
      expect(hazeHeightFade(side, BEAM_LOOK.rise * height)).toBe(1);
      let last = hazeHeightFade(side, 0);
      for (let y = 0.01; y <= height; y += 0.01) {
        const fade = hazeHeightFade(side, y);
        expect(fade).toBeGreaterThanOrEqual(last);
        expect(fade - last).toBeLessThan(0.003);
        last = fade;
      }
    }
  });

  it('falls smoothly from the light to the stage on each view ray, and reaches the stage', () => {
    for (const side of sides) {
      const height = SPOT_HEIGHT_IN_SIDES * side;
      const cameras: [string, Vec3][] = [
        ['1440 x 900', defaultView(side, 1440, 900).position],
        ['390 x 844', defaultView(side, 390, 844).position],
        // The high view of the user report of 2026-10-06, and the high shot of design 5.6.
        ['high', cameraAt(36, 1.02 * defaultView(side, 1121, 883).distance, 14)],
        ['high shot', cameraAt(42, 0.75 * 3.3 * side)],
      ];
      for (const [name, camera] of cameras) {
        // The light of the view rays through the axis, from the stage top up to the light.
        const profile: number[] = [];
        for (let i = 0; i <= 100; i++) {
          profile.push(rayLight(side, camera, [0, 0.02 + (height - 0.1) * (i / 100), 0]));
        }
        const most = Math.max(...profile);
        const label = `S ${side}, ${name}`;
        // The beam reaches the stage top. A cut of the haze above the stage gave 0 here.
        expect(profile[0] ?? 0, label).toBeGreaterThan(0.01 * most);
        // No step between two rays 1% of the light height apart, from the stage top up to the
        // last tenth, where the haze fades in under the light.
        for (let i = 1; i <= 85; i++) {
          const step = Math.abs((profile[i] ?? 0) - (profile[i - 1] ?? 0));
          expect(step, `${label}, ray ${i}`).toBeLessThan(0.06 * most);
        }
        // The beam is brighter high up than low down.
        expect(profile[80] ?? 0, label).toBeGreaterThan(3 * (profile[10] ?? 0));
      }
    }
  });
});

describe('the fade of the haze in front of a surface (design 4.5)', () => {
  it('fades the haze to 0 at a surface, smoothly', () => {
    const side = 11.29;
    expect(hazeDepthFade(side, 0)).toBe(0);
    expect(hazeDepthFade(side, -1)).toBe(0);
    expect(hazeDepthFade(side, BEAM_LOOK.soft * side)).toBe(1);
    let last = 0;
    for (let gap = 0.01; gap < 3; gap += 0.01) {
      const fade = hazeDepthFade(side, gap);
      expect(fade).toBeGreaterThanOrEqual(last);
      expect(fade - last).toBeLessThan(0.02);
      last = fade;
    }
  });

  it('keeps the haze off each head of each demo, and on the stage top and the hall', async () => {
    const models = new ModelCache();
    for (const demo of await patchedDemos()) {
      const result = buildScore(demo.bytes, 'auto');
      if (!result.ok) {
        throw new Error(`${demo.file} is not valid.`);
      }
      const layout = layoutScene(result.score, models);
      const side = layout.stageSide;
      const { heads } = prepareSubjects(result.score, layout, models);
      for (const { center, radius } of heads) {
        // The top of the head, with the ears, and the face.
        const top: Vec3 = [center[0], center[1] + 2 * radius, center[2]];
        const face: Vec3 = [center[0], center[1], center[2] + radius];
        expect(top[1], demo.file).toBeLessThan(BEAM_LOOK.items.top);
        expect(hazeSurfaceFade(side, top), demo.file).toBe(0);
        expect(hazeSurfaceFade(side, face), demo.file).toBe(0);
      }
      // The stage top, the hall floor around the stage, the hall, and the air above the players.
      expect(hazeSurfaceFade(side, [0.2 * side, 0, -0.3 * side])).toBe(1);
      expect(hazeSurfaceFade(side, [0, -0.4, -0.5 * side - 1])).toBe(1);
      expect(hazeSurfaceFade(side, [0, 3, -0.6 * side - 2])).toBe(1);
      expect(hazeSurfaceFade(side, [0, BEAM_LOOK.items.topFade, 0])).toBe(1);
    }
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
  it('keeps the haze column inside the cone, from below the stage top up to the light', () => {
    const side = 11.19;
    const [axis, bottom, meet, top] = columnProfile(side);
    expect(axis?.[0]).toBe(0);
    expect(axis?.[1]).toBeLessThan(0);
    expect(bottom).toEqual([BEAM_LOOK.column * side, axis?.[1]]);
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
    expect(insideColumn(side, [0, 2, 0])).toBe(true);
    expect(insideColumn(side, [0.5 * side, 7, 0])).toBe(false);
    expect(insideColumn(side, [0, -0.5, 0])).toBe(false);
  });
});

describe('motePosition (design 4.5)', () => {
  it('keeps each dust mote in the haze column, from the stage top up', () => {
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
          expect(y).toBeGreaterThan(-0.16);
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
      { visible: [false, false, true], override: true, target: true, shadows: false },
    ]);
    expect([beam.visible, hall.visible, player.visible]).toEqual([true, true, true]);
    expect(scene.overrideMaterial).toBeNull();
    expect(renderer.target).toBeNull();
    expect(renderer.shadowMap.autoUpdate).toBe(true);
    expect(depth.size).toEqual([2880, 1800]);
    depth.dispose();
  });

  it('does not count as a frame, so the scene pass does not update the skeletons again', () => {
    const scene = new Scene();
    const renderer = new RecordingRenderer([]);
    const depth = new BeamDepth();
    depth.render(renderer, scene, new PerspectiveCamera(), []);
    expect(renderer.info.render.frame).toBe(7);
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
    expect(uniforms(Mesh)['uInside']?.value).toBe(1);
    frame(1, [0.4 * side, 2, 0]);
    expect(uniforms(Mesh)['uInside']?.value).toBe(0);
    expect(material(Mesh).depthTest).toBe(true);
  });
});
