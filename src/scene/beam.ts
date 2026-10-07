import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Data3DTexture,
  DepthTexture,
  DoubleSide,
  Group,
  LatheGeometry,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  Points,
  RedFormat,
  RepeatWrapping,
  ShaderMaterial,
  UnsignedByteType,
  UnsignedIntType,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
} from 'three';
import type { Camera, Object3D, PerspectiveCamera, Scene } from 'three';

import {
  BEAM_RADIUS_IN_SIDES,
  BEAM_TOP_RADIUS_IN_SIDES,
  SPOT_HEIGHT_IN_SIDES,
  insideBeam,
} from '../models/beam.ts';
import { plankHash } from '../models/stage.ts';
import type { Vec3 } from '../models/tuples.ts';
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
  strength: 2.0,
  /** The density at the outline, as a part of the density on the axis. The edge stays soft. */
  edge: 0,
  /** The part of the radius where the density starts to fade to the outline. */
  core: 0.5,
  /**
   * The largest radius of the haze, in stage sides. The cone is 0.75 S wide at the stage, and a
   * haze in the full cone veiled the full orchestra in the frontal default view. The mockup shows
   * a column of light.
   */
  column: 0.3,
  /**
   * The density in the column at the stage. Where the cone is narrower than the column, the
   * density grows with the concentration of the light: (column / radius)^0.8, at most 6 times.
   */
  bottom: 0.35,
  /**
   * The density at the stage top, as a part of the density at the light. From the stage top up,
   * the density grows with a smoothstep to the full density at {@link BEAM_LOOK}.rise of the light
   * height. Thus the beam is brightest at the top and fades toward the stage with no edge, as in
   * `mockup.png`.
   */
  floor: 0.04,
  /** The height of the full density, as a part of the light height. */
  rise: 1.0,
  /**
   * The length of the fade of the haze in front of a surface, in stage sides. A sample of the haze
   * at the gap `g` in front of the surface behind it counts `smoothstep(0, soft × S, g)`. Thus the
   * beam fades out softly where it meets the stage.
   */
  soft: 0.15,
  /**
   * The items on the stage: the players, the instruments, the stands, the chairs, and the risers.
   * The haze in front of an item does not show, so the beam veils no player (user report of
   * 2026-10-06). An item is a surface inside the stage square, with a fade over `margin` meters at
   * each edge, and higher than the stage top: a fade from `low` to `high` meters, and a fade out
   * from `top` to `topFade` meters. The highest head of the demos, with the ears, is 2.54 m.
   */
  items: { low: 0.03, high: 0.2, top: 3, topFade: 4, margin: 0.3 },
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

/**
 * Gives the factor of the haze density at a height (design 4.5): {@link BEAM_LOOK}.floor at the
 * stage top, then a smoothstep to 1 at {@link BEAM_LOOK}.rise of the light height. The shader of
 * the beam uses the same formula.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param y The height above the stage top, in meters.
 * @returns The factor, from {@link BEAM_LOOK}.floor to 1.
 */
export function hazeHeightFade(stageSide: number, y: number): number {
  const high = BEAM_LOOK.rise * SPOT_HEIGHT_IN_SIDES * stageSide;
  return BEAM_LOOK.floor + (1 - BEAM_LOOK.floor) * smoothstep(y / high);
}

/**
 * Gives the factor of a sample of the haze in front of a surface (design 4.5). The factor is 0 at
 * the surface and grows to 1 at the gap {@link BEAM_LOOK}.soft × S. The shader of the beam uses the
 * same formula.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param gap The distance from the sample to the surface behind it, along the view ray, in
 *   meters.
 * @returns The factor, from 0 to 1.
 */
export function hazeDepthFade(stageSide: number, gap: number): number {
  return smoothstep(gap / (BEAM_LOOK.soft * stageSide));
}

/**
 * Gives the factor of the haze in front of a surface point (design 4.5): 0 in front of an item on
 * the stage ({@link BEAM_LOOK}.items), and 1 in front of the stage top, the hall, and the air. The
 * shader of the beam uses the same formula.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param point The surface point behind a pixel, in the stage axes.
 * @returns The factor, from 0 to 1.
 */
export function hazeSurfaceFade(stageSide: number, point: Vec3): number {
  const [x, y, z] = point;
  const { low, high, top, topFade, margin } = BEAM_LOOK.items;
  const edge = Math.max(Math.abs(x), Math.abs(z)) - stageSide / 2;
  const onStage = 1 - smoothstep((edge + margin) / (2 * margin));
  const item = smoothstep((y - low) / (high - low)) * (1 - smoothstep((y - top) / (topFade - top)));
  return 1 - onStage * item;
}

/**
 * Gives the density of the haze at a point, with no noise (design 4.5). The shader of the beam
 * uses the same formula, and the noise changes it by up to {@link BEAM_LOOK}.noise.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param point The point, in the stage axes.
 * @returns The density. It is 0 outside the haze column.
 */
export function hazeDensity(stageSide: number, point: Vec3): number {
  const [x, y, z] = point;
  const height = SPOT_HEIGHT_IN_SIDES * stageSide;
  if (y < 0 || y > height) {
    return 0;
  }
  const cone =
    BEAM_RADIUS_IN_SIDES * stageSide +
    (BEAM_TOP_RADIUS_IN_SIDES - BEAM_RADIUS_IN_SIDES) * stageSide * (y / height);
  const column = BEAM_LOOK.column * stageSide;
  const radius = Math.max(Math.min(cone, column), 1e-3);
  const radial =
    1 - smoothstep((Math.hypot(x, z) / radius - BEAM_LOOK.core) / (1 - BEAM_LOOK.core));
  const concentration = Math.min((column / radius) ** 0.8, 6);
  const top = 1 - smoothstep((y / height - 0.9) / 0.1);
  return radial * BEAM_LOOK.bottom * concentration * top * hazeHeightFade(stageSide, y);
}

/**
 * Gives the distance at which a view ray leaves the cone of the beam (design 4.5): the first root
 * of the cone after the entry and below the light. The shader of the beam uses the same rule. The
 * equation of the cone also holds a mirror cone above the apex. A ray that is steeper than the
 * wall of the cone does not leave the cone through the wall, and its other root lies on the
 * mirror cone. Then the stage top ends the ray, and the distance is `Infinity`.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param origin The camera position.
 * @param direction The unit direction of the view ray.
 * @param near The distance of the entry into the cone.
 * @returns The distance, or `Infinity`.
 */
export function coneExit(stageSide: number, origin: Vec3, direction: Vec3, near: number): number {
  const height = SPOT_HEIGHT_IN_SIDES * stageSide;
  const bottom = BEAM_RADIUS_IN_SIDES * stageSide;
  const k = (BEAM_TOP_RADIUS_IN_SIDES * stageSide - bottom) / height;
  const [ox, oy, oz] = origin;
  const [dx, dy, dz] = direction;
  const rb = bottom + k * oy;
  const a = dx * dx + dz * dz - k * k * dy * dy;
  const b = 2 * (ox * dx + oz * dz - k * dy * rb);
  const c = ox * ox + oz * oz - rb * rb;
  const s = Math.sqrt(Math.max(b * b - 4 * a * c, 0));
  let exit = Infinity;
  if (Math.abs(a) > 1e-6) {
    for (const root of [(-b - s) / (2 * a), (-b + s) / (2 * a)]) {
      if (root > near + 1e-3 && oy + dy * root < height) {
        exit = Math.min(exit, root);
      }
    }
  }
  return exit;
}

/**
 * Gives the place of a dust mote (design 4.5). Each mote rises and falls slowly on its own path
 * through the haze column, from the stage top up, and its height wraps. The vertex shader of the
 * motes uses the same formula.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param seed The 4 seeds of the mote, each from 0 to 1.
 * @param timeSec The time of the drift, in seconds.
 * @returns The place, in the stage axes.
 */
export function motePosition(
  stageSide: number,
  seed: readonly [number, number, number, number],
  timeSec: number,
): Vec3 {
  const [a, b, c, w] = seed;
  const height = SPOT_HEIGHT_IN_SIDES * stageSide;
  const rise = c + 0.012 * timeSec * (w - 0.5);
  const h = rise - Math.floor(rise);
  const y = 0.9 * height * h;
  const cone =
    BEAM_RADIUS_IN_SIDES * stageSide +
    (BEAM_TOP_RADIUS_IN_SIDES - BEAM_RADIUS_IN_SIDES) * stageSide * (y / height);
  const radius = Math.min(cone, BEAM_LOOK.column * stageSide);
  const angle = a * 6.2832 + 0.05 * timeSec * (w - 0.4);
  const r = Math.sqrt(b) * radius * 0.9;
  return [
    r * Math.cos(angle) + 0.15 * Math.sin(timeSec * 0.31 + w * 40),
    y + 0.15 * Math.sin(timeSec * 0.23 + a * 30),
    r * Math.sin(angle) + 0.15 * Math.cos(timeSec * 0.27 + b * 20),
  ];
}

/** Gives the smoothstep of a value that is clamped to the range from 0 to 1. */
function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

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

/**
 * The GLSL of {@link hazeHeightFade}, {@link hazeDepthFade}, and {@link hazeSurfaceFade}, and of
 * the distance from the camera to the scene behind a fragment.
 */
const FADES = /* glsl */ `
#include <packing>
uniform float uFloor;
uniform float uRise;
uniform float uSoft;
uniform vec4 uItems;
uniform vec2 uStageEdge;
uniform sampler2D uDepth;
uniform vec2 uResolution;
uniform float uNear;
uniform float uFar;

float heightFade(float y) {
  return mix(uFloor, 1.0, smoothstep(0.0, uRise, y));
}

float depthFade(float gap) {
  return smoothstep(0.0, uSoft, gap);
}

float surfaceFade(vec3 p) {
  float edge = max(abs(p.x), abs(p.z)) - uStageEdge.x;
  float onStage = 1.0 - smoothstep(-uStageEdge.y, uStageEdge.y, edge);
  float item = smoothstep(uItems.x, uItems.y, p.y) * (1.0 - smoothstep(uItems.z, uItems.w, p.y));
  return 1.0 - onStage * item;
}

// The distance from the camera to the scene behind this fragment, along the view ray. viewZ is
// the view depth of the point on the ray at the distance hit.
float sceneDistance(float hit, float viewZ) {
  float depth = texture(uDepth, gl_FragCoord.xy / uResolution).x;
  return hit * perspectiveDepthToViewZ(depth, uNear, uFar) / viewZ;
}
`;

const BEAM_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying float vViewZ;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 view = viewMatrix * world;
  vViewZ = view.z;
  gl_Position = projectionMatrix * view;
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
uniform float uColumn;
uniform float uBottom;
uniform float uNoise;
uniform float uNoiseScale;
uniform vec3 uDrift;
uniform sampler3D uNoiseTexture;
varying vec3 vWorld;
varying float vViewZ;
${FADES}
float radiusAt(float y) {
  return mix(uBottomRadius, uTopRadius, y / uHeight);
}

// The density of the haze at a point (hazeDensity() in TypeScript, with the noise). The haze
// fills a column of the radius uColumn inside the cone, so that it does not veil the full
// orchestra.
float density(vec3 p) {
  float radius = max(min(radiusAt(p.y), uColumn), 1e-3);
  float r = length(p.xz) / radius;
  float radial = 1.0 - smoothstep(uCore, 1.0, r);
  float height = clamp(p.y / uHeight, 0.0, 1.0);
  // The light is more concentrated where the cone is narrow, so the haze is brighter there.
  float concentration = min(pow(uColumn / radius, 0.8), 6.0);
  float vertical = uBottom * concentration * smoothstep(1.0, 0.9, height) * heightFade(p.y);
  vec3 q = p / uNoiseScale + uDrift;
  float n = texture(uNoiseTexture, q).r * 0.65 + texture(uNoiseTexture, q * 2.3 + 0.37).r * 0.35;
  return radial * vertical * (1.0 - uNoise + uNoise * 2.0 * n);
}

void main() {
  // A camera outside the column draws the front faces, and a camera inside the back faces.
  bool front = gl_FrontFacing;
  if (front == (uInside > 0.5)) {
    discard;
  }
  vec3 origin = cameraPosition;
  vec3 toFragment = vWorld - origin;
  float hit = length(toFragment);
  vec3 dir = toFragment / hit;
  float near = front ? hit : 0.0;
  float far = hit;
  if (front) {
    // The cone: x² + z² = (b + k y)², with the radius b at the stage and the slope k. The ray
    // leaves it at the first root after the entry and below the light (coneExit() in TypeScript).
    float k = (uTopRadius - uBottomRadius) / uHeight;
    float rb = uBottomRadius + k * origin.y;
    float a = dir.x * dir.x + dir.z * dir.z - k * k * dir.y * dir.y;
    float b = 2.0 * (origin.x * dir.x + origin.z * dir.z - k * dir.y * rb);
    float c = origin.x * origin.x + origin.z * origin.z - rb * rb;
    float s = sqrt(max(b * b - 4.0 * a * c, 0.0));
    far = 1e6;
    if (abs(a) > 1e-6) {
      float r0 = (-b - s) / (2.0 * a);
      float r1 = (-b + s) / (2.0 * a);
      if (r0 > near + 1e-3 && origin.y + dir.y * r0 < uHeight) {
        far = min(far, r0);
      }
      if (r1 > near + 1e-3 && origin.y + dir.y * r1 < uHeight) {
        far = min(far, r1);
      }
    }
    // The ray also leaves the column.
    float ac = dir.x * dir.x + dir.z * dir.z;
    if (ac > 1e-6) {
      float bc = 2.0 * (origin.x * dir.x + origin.z * dir.z);
      float cc = origin.x * origin.x + origin.z * origin.z - uColumn * uColumn;
      far = min(far, (-bc + sqrt(max(bc * bc - 4.0 * ac * cc, 0.0))) / (2.0 * ac));
    }
  }
  // The stage top and the light close the column. Near the rim, the plane can lie a little
  // before the entry point, and the ray then has no length.
  if (dir.y < -1e-4) {
    far = min(far, max(-origin.y / dir.y, near));
  } else if (dir.y > 1e-4) {
    far = min(far, max((uHeight - origin.y) / dir.y, near));
  }
  // The ray also ends on the scene: a player, a stand, or a riser.
  float scene = sceneDistance(hit, vViewZ);
  far = min(far, scene);
  float span = far - near;
  if (span <= 0.0) {
    discard;
  }
  float sum = 0.0;
  for (int i = 0; i < SAMPLES; i++) {
    float t = near + span * (float(i) + 0.5) / float(SAMPLES);
    sum += density(origin + dir * t) * depthFade(scene - t);
  }
  float light = uStrength * sum * span / float(SAMPLES) * surfaceFade(origin + dir * scene);
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
uniform float uColumn;
uniform float uFloor;
uniform float uRise;
varying float vLight;
void main() {
  // Each mote rises and falls slowly on its own path through the column, and its height wraps.
  // motePosition() in TypeScript gives the same place.
  float height = fract(seed.z + 0.012 * uTime * (seed.w - 0.5));
  float y = uHeight * 0.9 * height;
  float radius = min(mix(uBottomRadius, uTopRadius, y / uHeight), uColumn);
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
  // The motes fade toward the stage as the haze does.
  float fade = mix(uFloor, 1.0, smoothstep(0.0, uRise, p.y));
  vLight = radial * twinkle * min(1.0, size * size) * fade;
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

/**
 * Gives the outline of the haze (design 4.5): the column of {@link BEAM_LOOK}.column inside the
 * cone of `models/beam.ts`, from a little below the stage top up to the light, with a flat
 * bottom. The stage top hides the bottom. The mesh of the beam has this outline, so the shader
 * runs only where the haze is. On the full cone, the beam cost about 1 ms more on the development
 * Mac.
 *
 * @param stageSide The stage side `S`, in meters.
 * @returns The radius and the height of each point of the outline, from the axis at the bottom up.
 */
export function columnProfile(stageSide: number): [number, number][] {
  const height = SPOT_HEIGHT_IN_SIDES * stageSide;
  const bottom = BEAM_RADIUS_IN_SIDES * stageSide;
  const top = BEAM_TOP_RADIUS_IN_SIDES * stageSide;
  const column = BEAM_LOOK.column * stageSide;
  // The cone is as wide as the column at this height.
  const meet = (height * (bottom - column)) / (bottom - top);
  return [
    [0, COLUMN_BASE],
    [column, COLUMN_BASE],
    [column, meet],
    [top, height],
  ];
}

/** The height of the bottom of the beam mesh, in meters: a little below the stage top. */
const COLUMN_BASE = -0.05;

/**
 * Tells if a point is inside the haze column (see {@link columnProfile}).
 *
 * @param stageSide The stage side `S`, in meters.
 * @param point The point.
 * @returns True inside the column and the cone.
 */
export function insideColumn(stageSide: number, point: Vec3): boolean {
  return (
    insideBeam(stageSide, point) && Math.hypot(point[0], point[2]) < BEAM_LOOK.column * stageSide
  );
}

/** The uniforms of the cone, the fades, and the depth that the beam and the motes share. */
function coneUniforms(stageSide: number) {
  const { low, high, top, topFade, margin } = BEAM_LOOK.items;
  return {
    uColor: { value: new Color(BEAM_LOOK.color) },
    uHeight: { value: SPOT_HEIGHT_IN_SIDES * stageSide },
    uBottomRadius: { value: BEAM_RADIUS_IN_SIDES * stageSide },
    uTopRadius: { value: BEAM_TOP_RADIUS_IN_SIDES * stageSide },
    uCore: { value: BEAM_LOOK.core },
    uColumn: { value: BEAM_LOOK.column * stageSide },
    uFloor: { value: BEAM_LOOK.floor },
    uRise: { value: BEAM_LOOK.rise * SPOT_HEIGHT_IN_SIDES * stageSide },
    uSoft: { value: BEAM_LOOK.soft * stageSide },
    uItems: { value: new Vector4(low, high, top, topFade) },
    uStageEdge: { value: new Vector2(stageSide / 2, margin) },
    uDepth: { value: null },
    uResolution: { value: new Vector2(1, 1) },
    uNear: { value: 0.1 },
    uFar: { value: 100 },
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
 * Creates the dust motes of the beam: points that drift slowly through the haze column (design
 * 4.5, {@link motePosition}).
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
 * @param tier The quality tier. It sets the noise samples and the number of motes
 *   ({@link setBeamTier}).
 * @returns A group with the cone and the motes.
 */
export function createBeam(stageSide: number, tier: QualityTier): Group {
  const geometry = new LatheGeometry(
    columnProfile(stageSide).map(([radius, y]) => new Vector2(radius, y)),
    48,
  );
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
    defines: { SAMPLES: TIER_SETTINGS[tier].beamSamples },
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  });
  const cone = new Mesh(geometry, material);
  cone.name = 'beam';
  cone.renderOrder = 1;
  // The motes of the highest tier. A lower tier draws only a part of them.
  const most = Math.max(...Object.values(TIER_SETTINGS).map((settings) => settings.motes));
  const group = new Group().add(cone, createMotes(stageSide, most));
  setBeamTier(group, tier);
  return group;
}

/**
 * Sets the beam for a new quality tier (design 2.6): the samples of the haze along each view ray
 * and the number of dust motes. A tier with no motes hides them.
 *
 * @param beam The group of {@link createBeam}.
 * @param tier The quality tier.
 */
export function setBeamTier(beam: Group, tier: QualityTier): void {
  const settings = TIER_SETTINGS[tier];
  for (const child of beam.children) {
    if (child instanceof Mesh && child.material instanceof ShaderMaterial) {
      if (child.material.defines['SAMPLES'] !== settings.beamSamples) {
        child.material.defines['SAMPLES'] = settings.beamSamples;
        child.material.needsUpdate = true;
      }
    } else if (child instanceof Points) {
      child.geometry.setDrawRange(0, settings.motes);
      child.visible = settings.motes > 0;
    }
  }
}

/** The parts of the renderer that the depth pass of the beam uses. A `WebGLRenderer` has them. */
export interface DepthRenderer {
  readonly shadowMap: { autoUpdate: boolean };
  readonly info: { readonly render: { frame: number } };
  getRenderTarget(): WebGLRenderTarget | null;
  setRenderTarget(target: WebGLRenderTarget | null): void;
  render(scene: Object3D, camera: Camera): void;
}

/**
 * The depth of the scene with no light effects and no hall, at the size of the drawing buffer
 * (design 4.5). The haze reads it: a view ray ends on the scene, the haze fades in front of a
 * surface, and an item on the stage gets no haze. It renders before the scene, because
 * the scene target cannot give its depth to its own pass. A depth at half size gave a jagged edge
 * of haze around each player.
 */
export class BeamDepth {
  readonly #target: WebGLRenderTarget;
  readonly #texture: DepthTexture;
  /** The material of the depth pass. The color that it writes is not read. */
  readonly #material = new MeshBasicMaterial({ colorWrite: false });
  #width = 1;
  #height = 1;

  constructor() {
    this.#texture = new DepthTexture(1, 1, UnsignedIntType);
    this.#target = new WebGLRenderTarget(1, 1, { type: UnsignedByteType });
    this.#target.depthTexture = this.#texture;
  }

  /** The depth texture of the last {@link BeamDepth.render}. */
  get texture(): DepthTexture {
    return this.#texture;
  }

  /** The width and the height of the drawing buffer, in pixels. */
  get size(): readonly [number, number] {
    return [this.#width, this.#height];
  }

  /**
   * Sets the size of the drawing buffer.
   *
   * @param width The width of the drawing buffer, in pixels.
   * @param height The height of the drawing buffer, in pixels.
   */
  setSize(width: number, height: number): void {
    if (width === this.#width && height === this.#height) {
      return;
    }
    this.#width = width;
    this.#height = height;
    this.#target.setSize(width, height);
  }

  /**
   * Renders the depth of a scene with some objects hidden: the light effects, which write no
   * depth, and the hall. The haze in front of the hall shows in full, so the hall needs no depth.
   *
   * @param renderer The renderer.
   * @param scene The scene.
   * @param camera The camera.
   * @param hidden The objects to hide.
   */
  render(
    renderer: DepthRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    hidden: readonly Object3D[],
  ): void {
    // The depth pass needs no shadow map. The scene pass makes it.
    const shadows = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    const visible = hidden.map((object) => object.visible);
    for (const object of hidden) {
      object.visible = false;
    }
    scene.overrideMaterial = this.#material;
    const target = renderer.getRenderTarget();
    renderer.setRenderTarget(this.#target);
    renderer.render(scene, camera);
    // The pass does not count as a frame. The scene pass of the frame then keeps the skeletons and
    // the geometries that this pass updated, and it does not update them again. With the world
    // matrices, they cost 0.55 ms of the 0.8 ms of this pass on the development Mac.
    renderer.info.render.frame -= 1;
    renderer.setRenderTarget(target);
    scene.overrideMaterial = null;
    for (const [i, object] of hidden.entries()) {
      object.visible = visible[i] ?? true;
    }
    renderer.shadowMap.autoUpdate = shadows;
  }

  /** Frees the target, the depth texture, and the material. */
  dispose(): void {
    this.#texture.dispose();
    this.#target.dispose();
    this.#material.dispose();
  }
}

/** The state of the beam in one frame. */
export interface BeamFrame {
  /** The stage side `S`, in meters. */
  readonly stageSide: number;
  /** The factor of the camera (design 4.5, 5.6), from 0 to 1. */
  readonly factor: number;
  /** The camera of the frame. */
  readonly camera: PerspectiveCamera;
  /** The wall time, in seconds, for the drift of the noise and of the motes. */
  readonly timeSec: number;
  /** The depth of the scene of the frame. Its size is the size of the drawing buffer. */
  readonly depth: BeamDepth;
}

/**
 * Sets the beam for the camera of a frame (design 4.5, 5.6): the factor of the camera, the side
 * of the cone that the camera sees, the depth of the scene, and the drift.
 *
 * @param beam The group of {@link createBeam}.
 * @param frame The state of the frame.
 */
export function setBeamFrame(beam: Group, frame: BeamFrame): void {
  const { stageSide, factor, camera, timeSec, depth } = frame;
  const [width, height] = depth.size;
  const inside = insideColumn(stageSide, camera.position.toArray());
  for (const child of beam.children) {
    if (
      !(child instanceof Mesh || child instanceof Points) ||
      !(child.material instanceof ShaderMaterial)
    ) {
      continue;
    }
    const u = child.material.uniforms;
    setValue(u, 'uNear', camera.near);
    setValue(u, 'uFar', camera.far);
    const texture = u['uDepth'];
    if (texture) {
      texture.value = depth.texture;
    }
    const resolution = u['uResolution']?.value;
    if (resolution instanceof Vector2) {
      resolution.set(width, height);
    }
    if (child instanceof Mesh) {
      setValue(u, 'uStrength', (BEAM_LOOK.strength / stageSide) * factor);
      setValue(u, 'uInside', inside ? 1 : 0);
      // A camera in the column sees the back faces. The depth of the scene ends each view ray,
      // so a player in front of a back face does not hide the haze before the player.
      child.material.depthTest = !inside;
      const drift = u['uDrift']?.value;
      if (drift instanceof Vector3) {
        const d = (BEAM_LOOK.drift * timeSec) / BEAM_LOOK.noiseScale;
        drift.set(d * 0.3, d, d * 0.2);
      }
    } else {
      setValue(u, 'uStrength', BEAM_LOOK.moteStrength * factor);
      setValue(u, 'uTime', timeSec);
      setValue(u, 'uPixels', height);
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
