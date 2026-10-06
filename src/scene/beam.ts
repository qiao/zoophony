import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Data3DTexture,
  DoubleSide,
  Group,
  LinearFilter,
  Mesh,
  Points,
  RedFormat,
  RepeatWrapping,
  ShaderMaterial,
  Vector3,
} from 'three';

import {
  BEAM_RADIUS_IN_SIDES,
  BEAM_TOP_RADIUS_IN_SIDES,
  SPOT_HEIGHT_IN_SIDES,
  insideBeam,
} from '../models/beam.ts';
import { plankHash } from '../models/stage.ts';
import { TIER_SETTINGS } from './quality.ts';
import type { QualityTier } from './quality.ts';

/**
 * The look of the visible beam (design 4.5, light and render). The beam is the cone of
 * `models/beam.ts`. Its shader adds the light that the haze in the cone scatters to the camera:
 * the length of the view ray in the cone, times a density that is highest on the axis and fades to
 * 0 at the outline, with a slow noise and dust motes.
 */
export const BEAM_LOOK = {
  /** The color of the scattered light, in sRGB. */
  color: '#ffd9b0',
  /**
   * The scattered light of a view ray of one stage side through the axis, in linear values. The
   * density scales with 1 / S, so that each stage size shows the same beam.
   */
  strength: 1.6,
  /** The density at the outline, as a part of the density on the axis. The edge stays soft. */
  edge: 0,
  /** The part of the radius where the density starts to fade to the outline. */
  core: 0.5,
  /**
   * The density at the stage. Higher in the cone, the density grows with the concentration of the
   * light: (bottom radius / radius)^0.8, at most 6 times.
   */
  bottom: 0.12,
  /** The change of the density by the noise, from 0 to 1. */
  noise: 0.4,
  /** The size of one cell of the noise, in meters. */
  noiseScale: 2.4,
  /** The speed of the drift of the noise, in meters each second. */
  drift: 0.18,
  /** The size of a dust mote, in meters. */
  moteSize: 0.035,
  /** The light of a dust mote at the axis, in linear values. */
  moteStrength: 2.5,
} as const;

/** The size of the tiling noise texture of the beam, in texels on each side. */
export const NOISE_SIZE = 32;

/**
 * Makes a tiling value noise in a cube of texels: the noise of each texel is a smooth blend of
 * random values on a coarse grid of 8 cells on each side, and the grid wraps at the edges.
 *
 * @param size The texels on each side.
 * @returns The noise, from 0 to 255, x first, then y, then z.
 */
export function tilingNoise(size: number): Uint8Array {
  const cells = 8;
  const lattice = (x: number, y: number, z: number): number =>
    plankHash(
      ((x % cells) + cells) % cells,
      (((y % cells) + cells) % cells) * cells + (((z % cells) + cells) % cells),
    );
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  const data = new Uint8Array(size * size * size);
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const px = (x / size) * cells;
        const py = (y / size) * cells;
        const pz = (z / size) * cells;
        const [ix, iy, iz] = [Math.floor(px), Math.floor(py), Math.floor(pz)];
        const [fx, fy, fz] = [smooth(px - ix), smooth(py - iy), smooth(pz - iz)];
        let value = 0;
        for (let corner = 0; corner < 8; corner++) {
          const dx = corner & 1;
          const dy = (corner >> 1) & 1;
          const dz = (corner >> 2) & 1;
          const weight = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz);
          value += weight * lattice(ix + dx, iy + dy, iz + dz);
        }
        data[x + size * (y + size * z)] = Math.round(value * 255);
      }
    }
  }
  return data;
}

const BEAM_VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const BEAM_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
uniform float uHeight;
uniform float uBottomRadius;
uniform float uTopRadius;
uniform float uInside;
uniform float uCore;
uniform float uBottom;
uniform float uNoise;
uniform float uNoiseScale;
uniform vec3 uDrift;
uniform sampler3D uNoiseTexture;
varying vec3 vWorld;

float radiusAt(float y) {
  return mix(uBottomRadius, uTopRadius, y / uHeight);
}

// The density of the haze at a point, as a part of the density on the axis at the light.
float density(vec3 p) {
  float r = length(p.xz) / max(radiusAt(p.y), 1e-3);
  float radial = 1.0 - smoothstep(uCore, 1.0, r);
  float height = clamp(p.y / uHeight, 0.0, 1.0);
  // The light is more concentrated where the cone is narrow, so the haze is brighter there. Thus
  // a view ray across the cone gets about the same light at each height, and the beam looks like
  // a column of light, as in mockup.png.
  float concentration = min(pow(uBottomRadius / radiusAt(p.y), 0.8), 6.0);
  float vertical = uBottom * concentration * smoothstep(1.0, 0.9, height) * step(0.0, p.y);
  vec3 q = p / uNoiseScale + uDrift;
  float n = texture(uNoiseTexture, q).r * 0.65 + texture(uNoiseTexture, q * 2.3 + 0.37).r * 0.35;
  return radial * vertical * (1.0 - uNoise + uNoise * 2.0 * n);
}

void main() {
  // A camera outside the cone draws the front faces, and a camera inside the back faces.
  bool front = gl_FrontFacing;
  if (front == (uInside > 0.5)) {
    discard;
  }
  vec3 origin = cameraPosition;
  vec3 toFragment = vWorld - origin;
  float hit = length(toFragment);
  vec3 dir = toFragment / hit;
  // The cone: x² + z² = (b + k y)², with the radius b at the stage and the slope k.
  float k = (uTopRadius - uBottomRadius) / uHeight;
  float rb = uBottomRadius + k * origin.y;
  float a = dir.x * dir.x + dir.z * dir.z - k * k * dir.y * dir.y;
  float b = 2.0 * (origin.x * dir.x + origin.z * dir.z - k * dir.y * rb);
  float c = origin.x * origin.x + origin.z * origin.z - rb * rb;
  float disc = max(b * b - 4.0 * a * c, 0.0);
  float s = sqrt(disc);
  float t0 = (-b - s) / (2.0 * a);
  float t1 = (-b + s) / (2.0 * a);
  float near = front ? hit : 0.0;
  float far = front ? max(t0, t1) : hit;
  // The stage top and the light close the cone.
  // A ray down ends at the stage top, and a ray up at the light. Near the rim of the cone, the
  // plane can lie a little before the entry point, and the ray then has no length.
  if (dir.y < -1e-4) {
    far = min(far, max(-origin.y / dir.y, near));
  } else if (dir.y > 1e-4) {
    far = min(far, max((uHeight - origin.y) / dir.y, near));
  }
  float span = max(far - near, 0.0);
  float sum = 0.0;
  for (int i = 0; i < SAMPLES; i++) {
    float t = near + span * (float(i) + 0.5) / float(SAMPLES);
    sum += density(origin + dir * t);
  }
  float light = uStrength * sum * span / float(SAMPLES);
  gl_FragColor = vec4(uColor * light, 1.0);
  #include <colorspace_fragment>
}
`;

const MOTE_VERTEX = /* glsl */ `
attribute vec4 seed;
uniform float uHeight;
uniform float uBottomRadius;
uniform float uTopRadius;
uniform float uTime;
uniform float uSize;
uniform float uPixels;
uniform float uCore;
varying float vLight;
void main() {
  // Each mote rises and falls slowly on its own path through the cone, and its height wraps.
  float height = fract(seed.z + 0.012 * uTime * (seed.w - 0.5));
  float y = height * uHeight * 0.9;
  float radius = mix(uBottomRadius, uTopRadius, y / uHeight);
  float angle = seed.x * 6.2832 + 0.05 * uTime * (seed.w - 0.4);
  float r = sqrt(seed.y) * radius * 0.9;
  vec3 p = vec3(r * cos(angle), y, r * sin(angle));
  p += 0.15 * vec3(sin(uTime * 0.31 + seed.w * 40.0), sin(uTime * 0.23 + seed.x * 30.0), cos(uTime * 0.27 + seed.y * 20.0));
  vec4 view = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * view;
  gl_PointSize = clamp(uSize * projectionMatrix[1][1] * uPixels * 0.5 / -view.z, 1.0, 6.0);
  float radial = 1.0 - smoothstep(uCore, 1.0, r / max(radius, 1e-3));
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + seed.w * 1.6) + seed.x * 50.0);
  // A mote smaller than one pixel spreads its light over the pixel.
  float size = uSize * projectionMatrix[1][1] * uPixels * 0.5 / -view.z;
  vLight = radial * twinkle * min(1.0, size * size) * smoothstep(0.0, 0.1, height);
}
`;

const MOTE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
varying float vLight;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float alpha = 1.0 - smoothstep(0.2, 0.5, d);
  gl_FragColor = vec4(uColor * uStrength * vLight * alpha, 1.0);
  #include <colorspace_fragment>
}
`;

/** The uniforms of the cone that the beam and the motes share. */
function coneUniforms(stageSide: number) {
  return {
    uColor: { value: new Color(BEAM_LOOK.color) },
    uHeight: { value: SPOT_HEIGHT_IN_SIDES * stageSide },
    uBottomRadius: { value: BEAM_RADIUS_IN_SIDES * stageSide },
    uTopRadius: { value: BEAM_TOP_RADIUS_IN_SIDES * stageSide },
    uCore: { value: BEAM_LOOK.core },
  };
}

/**
 * Creates the noise texture of the beam (see {@link tilingNoise}).
 *
 * @returns The texture, with a linear filter and repeat on each axis.
 */
function noiseTexture(): Data3DTexture {
  const texture = new Data3DTexture(tilingNoise(NOISE_SIZE), NOISE_SIZE, NOISE_SIZE, NOISE_SIZE);
  texture.format = RedFormat;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.wrapR = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates the dust motes of the beam: points that drift slowly through the cone (design 4.5).
 *
 * @param stageSide The stage side `S`, in meters.
 * @param count The number of motes.
 * @returns The points.
 */
function createMotes(stageSide: number, count: number): Points {
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) {
    seeds[i] = plankHash(i, 9173);
  }
  const geometry = new BufferGeometry();
  // The vertex shader places each mote from its seed, so the positions are only a placeholder.
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('seed', new BufferAttribute(seeds, 4));
  const material = new ShaderMaterial({
    vertexShader: MOTE_VERTEX,
    fragmentShader: MOTE_FRAGMENT,
    uniforms: {
      ...coneUniforms(stageSide),
      uTime: { value: 0 },
      uSize: { value: BEAM_LOOK.moteSize },
      uPixels: { value: 900 },
      uStrength: { value: BEAM_LOOK.moteStrength },
    },
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const motes = new Points(geometry, material);
  motes.frustumCulled = false;
  motes.name = 'motes';
  return motes;
}

/**
 * Creates the visible beam (design 4.5): the cone of `models/beam.ts` with the haze shader, and the
 * dust motes of the tier.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param tier The quality tier. It sets the noise samples and the number of motes.
 * @returns A group with the cone and the motes.
 */
export function createBeam(stageSide: number, tier: QualityTier): Group {
  const height = SPOT_HEIGHT_IN_SIDES * stageSide;
  const settings = TIER_SETTINGS[tier];
  const geometry = new CylinderGeometry(
    BEAM_TOP_RADIUS_IN_SIDES * stageSide,
    BEAM_RADIUS_IN_SIDES * stageSide,
    height,
    64,
    1,
    true,
  );
  geometry.translate(0, height / 2, 0);
  const material = new ShaderMaterial({
    vertexShader: BEAM_VERTEX,
    fragmentShader: BEAM_FRAGMENT,
    uniforms: {
      ...coneUniforms(stageSide),
      uStrength: { value: BEAM_LOOK.strength / stageSide },
      uInside: { value: 0 },
      uBottom: { value: BEAM_LOOK.bottom },
      uNoise: { value: BEAM_LOOK.noise },
      uNoiseScale: { value: BEAM_LOOK.noiseScale },
      uDrift: { value: new Vector3() },
      uNoiseTexture: { value: noiseTexture() },
    },
    defines: { SAMPLES: settings.beamSamples },
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  });
  const cone = new Mesh(geometry, material);
  cone.name = 'beam';
  cone.renderOrder = 1;
  const group = new Group().add(cone);
  if (settings.motes > 0) {
    group.add(createMotes(stageSide, settings.motes));
  }
  return group;
}

/** The state of the beam in one frame. */
export interface BeamFrame {
  /** The stage side `S`, in meters. */
  readonly stageSide: number;
  /** The factor of the camera (design 4.5, 5.6), from 0 to 1. */
  readonly factor: number;
  /** The camera position. */
  readonly camera: Vector3;
  /** The wall time, in seconds, for the drift of the noise and of the motes. */
  readonly timeSec: number;
  /** The height of the drawing buffer, in pixels, for the size of the motes. */
  readonly pixels: number;
}

/**
 * Sets the beam for the camera of a frame (design 4.5, 5.6): the factor of the camera, the side
 * of the cone that the camera sees, and the drift.
 *
 * @param beam The group of {@link createBeam}.
 * @param frame The state of the frame.
 */
export function setBeamFrame(beam: Group, frame: BeamFrame): void {
  const { stageSide, factor, camera, timeSec, pixels } = frame;
  for (const child of beam.children) {
    if (
      !(child instanceof Mesh || child instanceof Points) ||
      !(child.material instanceof ShaderMaterial)
    ) {
      continue;
    }
    const u = child.material.uniforms;
    if (child instanceof Mesh) {
      setValue(u, 'uStrength', (BEAM_LOOK.strength / stageSide) * factor);
      setValue(u, 'uInside', insideBeam(stageSide, [camera.x, camera.y, camera.z]) ? 1 : 0);
      const drift = u['uDrift']?.value;
      if (drift instanceof Vector3) {
        const d = (BEAM_LOOK.drift * timeSec) / BEAM_LOOK.noiseScale;
        drift.set(d * 0.3, d, d * 0.2);
      }
    } else {
      setValue(u, 'uStrength', BEAM_LOOK.moteStrength * factor);
      setValue(u, 'uTime', timeSec);
      setValue(u, 'uPixels', pixels);
    }
  }
}

/** Sets a number uniform, if the material has it. */
function setValue(uniforms: ShaderMaterial['uniforms'], name: string, value: number): void {
  const uniform = uniforms[name];
  if (uniform) {
    uniform.value = value;
  }
}
