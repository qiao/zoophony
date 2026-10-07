import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Data3DTexture,
  DoubleSide,
  Group,
  LatheGeometry,
  LinearFilter,
  Mesh,
  Points,
  RedFormat,
  RepeatWrapping,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';

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
   * The player layer: a box around the stage center that holds each player. `height` is in
   * meters, above the head tops of the tallest players and of the singers on the risers (2.54 m).
   * `half` is half the side of the box, in stage sides. The column has no haze in this layer.
   */
  layer: { height: 2.6, half: 0.47 },
  /**
   * The height where the haze gets its full density, as a part of the light height. From the
   * player layer up to this height, the density grows with a smoothstep. Thus the beam is
   * brightest at the top and fades out toward the heads, as in `mockup.png`.
   */
  fadeTop: 0.45,
  /**
   * The fade of the haze on a view ray from above, in radians. A ray that meets the top of the
   * player box ends on a player or on the stage top, and it has no haze. A ray that passes over
   * the edge of the box at this angle above the box top passes over the orchestra, and it has the
   * full haze. An angle gives the edge the same softness on the screen for each camera distance.
   */
  edgeAngle: 0.03,
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
 * Gives the factor of the haze density at a height (design 4.5): 0 in the player layer of
 * {@link BEAM_LOOK}, then a smoothstep to 1 at {@link BEAM_LOOK}.fadeTop of the light height. The
 * shader of the beam uses the same smoothstep.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param y The height above the stage top, in meters.
 * @returns The factor, from 0 to 1.
 */
export function hazeHeightFade(stageSide: number, y: number): number {
  const low = BEAM_LOOK.layer.height;
  const high = BEAM_LOOK.fadeTop * SPOT_HEIGHT_IN_SIDES * stageSide;
  return smoothstep((y - low) / (high - low));
}

/**
 * Gives the factor of the haze light on a view ray (design 4.5). A ray from above the player
 * layer that meets the top of its box ends on a player or on the stage top, so it gets no haze.
 * The factor grows to 1 for a ray that passes over the edge of the box at the angle
 * {@link BEAM_LOOK}.edgeAngle above the box top, as the camera sees it. A level ray, a rising ray,
 * and a ray from a camera in the layer keep the full haze, because the haze lies above the layer.
 * The shader of the beam uses the same rule.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param origin The camera position.
 * @param direction The unit direction of the view ray.
 * @returns The factor, from 0 to 1.
 */
export function hazeRayFade(stageSide: number, origin: Vec3, direction: Vec3): number {
  const [ox, oy, oz] = origin;
  const [dx, dy, dz] = direction;
  const { height, half } = BEAM_LOOK.layer;
  if (oy <= height || dy >= -1e-4) {
    return 1;
  }
  const t = (height - oy) / dy;
  const outside = Math.max(Math.abs(ox + dx * t), Math.abs(oz + dz * t)) - half * stageSide;
  // The ray passes over the edge of the box at about outside × -dy above the box top, at the
  // distance t from the camera.
  return smoothstep((outside * -dy) / t / BEAM_LOOK.edgeAngle);
}

/**
 * Gives the place of a dust mote (design 4.5). Each mote rises and falls slowly on its own path
 * through the haze column, above the player layer, and its height wraps. The vertex shader of the
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
  const y = BEAM_LOOK.layer.height + (0.9 * height - BEAM_LOOK.layer.height) * h;
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

/** The GLSL of {@link hazeRayFade}, for the haze and for the motes. */
const RAY_FADE = /* glsl */ `
uniform float uSide;
uniform vec2 uLayer;
uniform float uEdgeAngle;

float rayFade(vec3 origin, vec3 dir) {
  if (origin.y <= uLayer.x || dir.y >= -1e-4) {
    return 1.0;
  }
  float t = (uLayer.x - origin.y) / dir.y;
  vec2 q = origin.xz + dir.xz * t;
  float outside = max(abs(q.x), abs(q.y)) - uLayer.y * uSide;
  return smoothstep(0.0, uEdgeAngle, outside * -dir.y / t);
}
`;

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
uniform float uColumn;
uniform float uBottom;
uniform float uFadeTop;
uniform float uNoise;
uniform float uNoiseScale;
uniform vec3 uDrift;
uniform sampler3D uNoiseTexture;
varying vec3 vWorld;
${RAY_FADE}
float radiusAt(float y) {
  return mix(uBottomRadius, uTopRadius, y / uHeight);
}

// The density of the haze at a point. The haze fills a column of the radius uColumn inside the
// cone, so that it does not veil the full orchestra. The player layer has no haze.
float density(vec3 p) {
  float radius = max(min(radiusAt(p.y), uColumn), 1e-3);
  float r = length(p.xz) / radius;
  float radial = 1.0 - smoothstep(uCore, 1.0, r);
  float height = clamp(p.y / uHeight, 0.0, 1.0);
  // The light is more concentrated where the cone is narrow, so the haze is brighter there. Thus
  // a view ray across the cone gets about the same light at each height, and the beam looks like
  // a column of light, as in mockup.png.
  float concentration = min(pow(uColumn / radius, 0.8), 6.0);
  float vertical = uBottom * concentration * smoothstep(1.0, 0.9, height);
  vertical *= smoothstep(uLayer.x, uFadeTop, p.y);
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
  // The ray also leaves the column.
  float ac = dir.x * dir.x + dir.z * dir.z;
  if (front && ac > 1e-6) {
    float bc = 2.0 * (origin.x * dir.x + origin.z * dir.z);
    float cc = origin.x * origin.x + origin.z * origin.z - uColumn * uColumn;
    far = min(far, (-bc + sqrt(max(bc * bc - 4.0 * ac * cc, 0.0))) / (2.0 * ac));
  }
  // The player layer and the light close the column. A ray down ends at the layer, and a ray up
  // at the light. Thus all samples fall where the haze has a density. Near the rim, the plane
  // can lie a little before the entry point, and the ray then has no length.
  if (dir.y < -1e-4) {
    far = min(far, max((uLayer.x - origin.y) / dir.y, near));
  } else if (dir.y > 1e-4) {
    far = min(far, max((uHeight - origin.y) / dir.y, near));
  }
  float span = max(far - near, 0.0);
  // A ray that meets the top of the player layer ends on a player or on the stage top.
  float ray = rayFade(origin, dir);
  if (span <= 0.0 || ray <= 0.0) {
    discard;
  }
  float sum = 0.0;
  for (int i = 0; i < SAMPLES; i++) {
    float t = near + span * (float(i) + 0.5) / float(SAMPLES);
    sum += density(origin + dir * t);
  }
  float light = uStrength * ray * sum * span / float(SAMPLES);
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
uniform float uFadeTop;
varying float vLight;
${RAY_FADE}
void main() {
  // Each mote rises and falls slowly on its own path through the column, above the player layer,
  // and its height wraps. motePosition() in TypeScript gives the same place.
  float height = fract(seed.z + 0.012 * uTime * (seed.w - 0.5));
  float y = mix(uLayer.x, uHeight * 0.9, height);
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
  // The motes fade as the haze does: near the player layer, and in front of the players.
  float fade = smoothstep(uLayer.x, uFadeTop, p.y) * rayFade(cameraPosition, normalize(p - cameraPosition));
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
 * cone of `models/beam.ts`, from the player layer up to the light, with a flat bottom. The
 * mesh of the beam has this outline, so the shader runs only where the haze is. On the full cone,
 * the beam cost about 1 ms more on the development Mac.
 *
 * @param stageSide The stage side `S`, in meters.
 * @returns The radius and the height of each point of the outline, from the axis at the layer up.
 */
export function columnProfile(stageSide: number): [number, number][] {
  const height = SPOT_HEIGHT_IN_SIDES * stageSide;
  const bottom = BEAM_RADIUS_IN_SIDES * stageSide;
  const top = BEAM_TOP_RADIUS_IN_SIDES * stageSide;
  const column = BEAM_LOOK.column * stageSide;
  const base = BEAM_LOOK.layer.height;
  // The cone is as wide as the column at this height.
  const meet = (height * (bottom - column)) / (bottom - top);
  return [
    [0, base],
    [column, base],
    [column, meet],
    [top, height],
  ];
}

/**
 * Tells if a point is inside the haze column (see {@link columnProfile}).
 *
 * @param stageSide The stage side `S`, in meters.
 * @param point The point.
 * @returns True inside the column and the cone, above the player layer.
 */
export function insideColumn(stageSide: number, point: Vec3): boolean {
  return (
    insideBeam(stageSide, point) &&
    point[1] >= BEAM_LOOK.layer.height &&
    Math.hypot(point[0], point[2]) < BEAM_LOOK.column * stageSide
  );
}

/** The uniforms of the cone and of the player layer that the beam and the motes share. */
function coneUniforms(stageSide: number) {
  return {
    uColor: { value: new Color(BEAM_LOOK.color) },
    uHeight: { value: SPOT_HEIGHT_IN_SIDES * stageSide },
    uBottomRadius: { value: BEAM_RADIUS_IN_SIDES * stageSide },
    uTopRadius: { value: BEAM_TOP_RADIUS_IN_SIDES * stageSide },
    uCore: { value: BEAM_LOOK.core },
    uColumn: { value: BEAM_LOOK.column * stageSide },
    uSide: { value: stageSide },
    uLayer: { value: new Vector2(BEAM_LOOK.layer.height, BEAM_LOOK.layer.half) },
    uFadeTop: { value: BEAM_LOOK.fadeTop * SPOT_HEIGHT_IN_SIDES * stageSide },
    uEdgeAngle: { value: BEAM_LOOK.edgeAngle },
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
      setValue(u, 'uInside', insideColumn(stageSide, [camera.x, camera.y, camera.z]) ? 1 : 0);
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
