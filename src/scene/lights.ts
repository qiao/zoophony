import { Group, HemisphereLight, MathUtils, SpotLight, Vector3 } from 'three';

import type { ConductorPlace } from '../models/layout.ts';
import type { Vec3 } from '../models/tuples.ts';
import { SPOT_HEIGHT_IN_SIDES } from '../models/beam.ts';
import { createBeam, setBeamTier } from './beam.ts';
import { TIER_SETTINGS } from './quality.ts';
import type { QualityTier } from './quality.ts';

/**
 * The key light (design 4.5): the stage spotlight, and the only light that casts shadows on the
 * stage. It stands behind the orchestra on the axis of the stage, high, so that the shadows fall to the
 * front and fan out to the sides, as the shadows of the chairs in `mockup.png`. It aims between
 * the stage center and the podium, so its gloss on the planks lies on both sides of the podium.
 * The first key stood above the stage center, and its short shadows did not show under the
 * chairs. A key 0.15 S to the right put the gloss right of the podium only.
 */
export const KEY_LIGHT = {
  /** Warm orange. In `mockup.png`, the white rabbits show a hue of about 20. */
  color: '#ffca98',
  /**
   * The position, in stage sides from the stage center on the stage top. The height is the
   * height of the visible beam, `SPOT_HEIGHT_IN_SIDES` of `models/beam.ts`.
   */
  position: [0, SPOT_HEIGHT_IN_SIDES, -0.7],
  /** The aim, as a part of the way from the stage center to the podium center. */
  aimToPodium: 0.5,
  /**
   * The half angle of the cone. three.js dims the cone from `angle × (1 - penumbra)` to `angle`.
   * With the full penumbra, the light falls off from the axis on, and the back corners of the
   * stage, about 35° from the axis, get no light.
   */
  angle: 34 * MathUtils.DEG2RAD,
  /** The full penumbra, for a soft pool of light. */
  penumbra: 1,
  /** The illuminance at the aim point, on a face that looks at the light, in lux. */
  illuminance: 9,
} as const;

/**
 * The side lights (design 4.5): two warm spotlights from the front corners of the hall, high at
 * the sides. Each one crosses the stage and lights the section on the other side, because the
 * players of a section face the conductor in the middle. Thus the fronts of the players are
 * bright, and the back of the conductor gets the light at a low angle and stays a darker brown,
 * as in `mockup.png`. The light at the left is the mirror of the light at the right. The first
 * lights were a rim light behind the orchestra and a front light above the audience. The key
 * light from behind now draws the rims.
 *
 * The cone is narrow and the light is high, so the section below the light stays outside the
 * cone. A wide, low cone of 28° lit that section from the camera side too, about as bright as the
 * far section, because it is nearer to the light. Thus each body got light from two sides, and
 * its shade side was gone (user, 2026-10-18).
 *
 * The side lights cast the shadows of the players on the players, such as the shadow of an arm on
 * the chest, because they light the fronts that the camera sees. The stage takes no shadow of
 * them (scene/stage.ts), so the floor keeps the shadows of the key light alone.
 */
export const SIDE_LIGHT = {
  /** The color, in sRGB. */
  color: '#ffd2a0',
  /** The position of the light at the right, in stage sides. */
  position: [1.1, 1.4, 0.7],
  /** The aim of the light at the right, in stage sides: the middle of the section at the left. */
  target: [-0.3, 0, 0.1],
  /** The illuminance at the aim point, on a face that looks at the light, in lux. */
  illuminance: 2.7,
  /** The half angle of the cone. */
  angle: 14 * MathUtils.DEG2RAD,
  /** The penumbra of the cone. */
  penumbra: 0.5,
} as const;

/**
 * The fill light (design 4.5): warm and low, so that the shadows stay deep and warm. The ground
 * color is the light from the lit stage. The players and the props take the part `players` of
 * the fill light and of the diffuse light of the environment, so their shade sides stay dark
 * (user, 2026-10-18). The stage takes all of it, so its shadows keep their tone.
 */
export const FILL = { sky: '#302a26', ground: '#2c241e', intensity: 5, players: 0.6 } as const;

/**
 * The normal bias of the shadow, in texels of the shadow map at the stage, beyond the blur radius
 * of the tier (design 2.6, 4.5). The receiver moves along its normal past the blur disc, so a lit
 * face does not shadow itself. With the first bias of 0.01 m, close shots showed a cross-hatch
 * pattern on the faces (UX audit 2026-10-05, SC5).
 */
export const SHADOW_BIAS_TEXELS = 2;

/** The highest item on the stage that casts a shadow, in meters above the stage top. */
export const SHADOW_TOP = 3;

/** The extra angle of the shadow map beyond the lit stage, for the blur of the edge. */
export const SHADOW_MARGIN = 3 * MathUtils.DEG2RAD;

/** The view of the shadow camera of a spotlight. */
export interface ShadowFrustum {
  /** The near plane, in meters along the axis of the light. */
  readonly near: number;
  /** The far plane, in meters along the axis of the light. */
  readonly far: number;
  /** The half angle that the shadow map covers, in radians. */
  readonly halfAngle: number;
}

/**
 * Calculates the view of the shadow camera of a spotlight, such as the key light (design 4.5).
 * The view holds each
 * point of the stage that the cone lights, from the stage top up to {@link SHADOW_TOP}: the half
 * angle is the angle of the farthest corner of the stage, at most the cone angle, plus
 * {@link SHADOW_MARGIN}. The near and the far planes hold the corners with a margin of 0.5 m.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param position The position of the light.
 * @param target The aim point of the light.
 * @param angle The half angle of the cone of the light.
 * @returns The near plane, the far plane, and the half angle.
 */
export function keyShadowFrustum(
  stageSide: number,
  position: Vec3,
  target: Vec3,
  angle: number,
): ShadowFrustum {
  const from = new Vector3(...position);
  const axis = new Vector3(...target).sub(from).normalize();
  const half = stageSide / 2;

  let near = Infinity;
  let far = 0;
  let widest = 0;
  const point = new Vector3();
  for (const x of [-half, half]) {
    for (const z of [-half, half]) {
      for (const y of [0, SHADOW_TOP]) {
        point.set(x, y, z).sub(from);
        const depth = point.dot(axis);
        near = Math.min(near, depth);
        far = Math.max(far, depth);
        widest = Math.max(widest, point.angleTo(axis));
      }
    }
  }

  return {
    near: Math.max(0.1, near - 0.5),
    far: far + 0.5,
    halfAngle: Math.min(widest, angle) + SHADOW_MARGIN,
  };
}

/**
 * Calculates the normal bias of the shadow of a spotlight (design 4.5): the size of one texel of
 * the shadow map at the aim point, times the blur radius plus {@link SHADOW_BIAS_TEXELS}.
 *
 * @param distance The distance from the light to its aim point on the stage, in meters.
 * @param halfAngle The half angle that the shadow map covers, in radians.
 * @param mapSize The width of the shadow map, in texels.
 * @param radius The blur radius of the tier, in texels.
 * @returns The normal bias, in meters.
 */
export function shadowNormalBias(
  distance: number,
  halfAngle: number,
  mapSize: number,
  radius: number,
): number {
  const texel = (2 * distance * Math.tan(halfAngle)) / mapSize;
  return texel * (radius + SHADOW_BIAS_TEXELS);
}

/**
 * The light on the face of the conductor (design 4.5): a weak spotlight from the orchestra side.
 * In the conductor shot, the face was dark brown on dark gray (UX audit 2026-10-05, FI1). This
 * light casts no shadow.
 */
export const CONDUCTOR_LIGHT = {
  /** The aim point is this high above the podium top: the face of the bear. */
  aimHeight: 1.2,
  /** The light stands this far in front of the aim point, toward the orchestra, in meters. */
  forward: 3.2,
  /** The light stands this far above the aim point, in meters. */
  up: 2.4,
  /**
   * The illuminance at the aim point, in lux. The fur of the bear is dark brown, and with 1.2 lux
   * its face stayed darker than the players.
   */
  illuminance: 3,
  /** The half angle of the cone. It holds the bear and its arms. */
  angle: 16 * MathUtils.DEG2RAD,
  /** The penumbra of the cone. */
  penumbra: 0.6,
} as const;

/**
 * Creates the light on the face of the conductor (design 4.5). The bear faces the orchestra, so
 * the light stands in front of it and above it, and aims at its face.
 *
 * @param conductor The place of the conductor.
 * @returns The light. Its target is a child of the light group with it.
 */
export function createConductorLight(conductor: ConductorPlace): SpotLight {
  const c = CONDUCTOR_LIGHT;
  const [x, y, z] = conductor.position;
  const aimY = y + c.aimHeight;
  // The front of the bear is (-sin f, 0, -cos f).
  const frontX = -Math.sin(conductor.facing);
  const frontZ = -Math.cos(conductor.facing);
  const distanceSquared = c.forward * c.forward + c.up * c.up;

  const light = new SpotLight(KEY_LIGHT.color, c.illuminance * distanceSquared);
  light.position.set(x + frontX * c.forward, aimY + c.up, z + frontZ * c.forward);
  light.target.position.set(x, aimY, z);
  light.angle = c.angle;
  light.penumbra = c.penumbra;
  light.decay = 2;
  light.castShadow = false;
  return light;
}

/** The name of the key light in the group of {@link createLights}. */
const KEY_NAME = 'key';

/** The name of each side light in the group of {@link createLights}. */
const SIDE_NAME = 'side';

/**
 * Sets the shadow map size and the shadow blur of a spotlight (design 2.6). The renderer makes a
 * new shadow map of the new size at the next render.
 *
 * @param spot The spotlight.
 * @param mapSize The width and the height of the shadow map, in texels.
 * @param radius The blur radius, in texels.
 */
function setShadowMap(spot: SpotLight, mapSize: number, radius: number): void {
  if (spot.shadow.mapSize.x !== mapSize) {
    spot.shadow.mapSize.set(mapSize, mapSize);
    spot.shadow.map?.dispose();
    spot.shadow.map = null;
  }
  spot.shadow.radius = radius;
  spot.shadow.normalBias = spotNormalBias(spot);
}

/**
 * Sets the shadow of the key light for a quality tier (design 2.6).
 *
 * @param spot The key light.
 * @param tier The quality tier.
 */
function setKeyTier(spot: SpotLight, tier: QualityTier): void {
  const settings = TIER_SETTINGS[tier];
  setShadowMap(spot, settings.shadowMapSize, settings.shadowRadius);
}

/**
 * Sets the shadow of a side light for a quality tier (design 2.6). A tier with no shadow map of
 * the side lights turns their shadow off.
 *
 * @param spot The side light.
 * @param tier The quality tier.
 */
function setSideTier(spot: SpotLight, tier: QualityTier): void {
  const settings = TIER_SETTINGS[tier];
  spot.castShadow = settings.sideShadowMapSize > 0;
  if (spot.castShadow) {
    setShadowMap(spot, settings.sideShadowMapSize, settings.shadowRadius);
  }
}

/**
 * Calculates the normal bias of the shadow of a spotlight for its aim, its shadow map, and its
 * blur ({@link shadowNormalBias}).
 *
 * @param spot The spotlight.
 * @returns The normal bias, in meters.
 */
function spotNormalBias(spot: SpotLight): number {
  return shadowNormalBias(
    spot.position.distanceTo(spot.target.position),
    spot.angle * spot.shadow.focus,
    spot.shadow.mapSize.x,
    spot.shadow.radius,
  );
}

/**
 * Fits the shadow camera of a spotlight to its aim ({@link keyShadowFrustum}): the angle, the near
 * and the far plane, and the normal bias.
 *
 * @param spot The spotlight.
 * @param stageSide The stage side `S`, in meters.
 */
function fitShadow(spot: SpotLight, stageSide: number): void {
  const frustum = keyShadowFrustum(
    stageSide,
    spot.position.toArray(),
    spot.target.position.toArray(),
    spot.angle,
  );
  spot.shadow.focus = frustum.halfAngle / spot.angle;
  spot.shadow.camera.near = frustum.near;
  spot.shadow.camera.far = frustum.far;
  // three.js updates the projection for a new angle or far plane, but not for a new near plane.
  spot.shadow.camera.updateProjectionMatrix();
  spot.shadow.normalBias = spotNormalBias(spot);
}

/**
 * Aims the key light at a point of the stage top (design 2.4, 4.5): the center of the light aim,
 * which a solo moves to the soloed players. The light keeps its place and its intensity, as a
 * spotlight that turns, and its shadow camera follows the aim.
 *
 * @param lights The group of {@link createLights}.
 * @param stageSide The stage side `S`, in meters.
 * @param x The x of the aim point, in meters.
 * @param z The z of the aim point, in meters.
 */
export function aimKeyLight(lights: Group, stageSide: number, x: number, z: number): void {
  for (const child of lights.children) {
    if (child instanceof SpotLight && child.name === KEY_NAME) {
      child.target.position.set(x, 0, z);
      fitShadow(child, stageSide);
    }
  }
}

/**
 * Sets the lights of the stage for a new quality tier (design 2.6): the shadows of the key light
 * and of the side lights, and the haze samples and the dust motes of the visible beam.
 *
 * @param lights The group of {@link createLights}.
 * @param tier The quality tier.
 */
export function setLightsTier(lights: Group, tier: QualityTier): void {
  for (const child of lights.children) {
    if (child instanceof SpotLight && child.name === KEY_NAME) {
      setKeyTier(child, tier);
    } else if (child instanceof SpotLight && child.name === SIDE_NAME) {
      setSideTier(child, tier);
    } else if (child instanceof Group) {
      setBeamTier(child, tier);
    }
  }
}

/**
 * Creates a spotlight that gives an illuminance at its aim point.
 *
 * @param color The color, in sRGB.
 * @param position The position.
 * @param target The aim point.
 * @param illuminance The illuminance at the aim point, on a face that looks at the light, in lux.
 * @returns The light, with no shadow. Its target is at the aim point.
 */
function spotlight(color: string, position: Vec3, target: Vec3, illuminance: number): SpotLight {
  const light = new SpotLight(color);
  light.position.set(...position);
  light.target.position.set(...target);
  light.intensity = illuminance * light.position.distanceToSquared(light.target.position);
  light.decay = 2;
  light.castShadow = false;
  return light;
}

/**
 * Gives the position of the key light of a stage ({@link KEY_LIGHT}).
 *
 * @param stageSide The stage side `S`, in meters.
 * @returns The position, in meters.
 */
export function keyLightPosition(stageSide: number): Vec3 {
  const [kx, ky, kz] = KEY_LIGHT.position;
  return [kx * stageSide, ky * stageSide, kz * stageSide];
}

/**
 * Creates the key light of a stage (design 4.5), with its shadow camera.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param tier The quality tier.
 * @param conductor The place of the conductor, or `null` with no conductor. With no conductor,
 *   the light aims at the stage center.
 * @returns The light. Its target is at the aim point.
 */
function createKeyLight(
  stageSide: number,
  tier: QualityTier,
  conductor: ConductorPlace | null,
): SpotLight {
  const key = KEY_LIGHT;
  const position = keyLightPosition(stageSide);
  const target: Vec3 = conductor
    ? [conductor.position[0] * key.aimToPodium, 0, conductor.position[2] * key.aimToPodium]
    : [0, 0, 0];

  const spot = spotlight(key.color, position, target, key.illuminance);
  spot.name = KEY_NAME;
  spot.angle = key.angle;
  spot.penumbra = key.penumbra;
  spot.castShadow = true;

  spot.shadow.bias = -0.0005;
  setKeyTier(spot, tier);
  fitShadow(spot, stageSide);
  return spot;
}

/** The options of {@link createLights}. */
export interface LightOptions {
  /**
   * True to add the visible beam (the default). The gallery pages show the models, so they have
   * no beam.
   */
  readonly beam?: boolean;
}

/**
 * Creates the lights of the stage: the key light, the fill light, the two side lights, the
 * visible beam, and the light on the face of the conductor (design 4.5). The lights scale with
 * the stage.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param tier The quality tier. It sets the shadow map sizes and the shadow blur.
 * @param conductor The place of the conductor, or `null` for a view with no conductor, such as
 *   the gallery.
 * @param options The options.
 * @returns A group with the lights, the targets of the spotlights, and the beam group of
 *   {@link createBeam}.
 */
export function createLights(
  stageSide: number,
  tier: QualityTier,
  conductor: ConductorPlace | null,
  options: LightOptions = {},
): Group {
  const group = new Group();

  const key = createKeyLight(stageSide, tier, conductor);
  group.add(key, key.target);

  group.add(new HemisphereLight(FILL.sky, FILL.ground, FILL.intensity));

  const side = SIDE_LIGHT;
  for (const sign of [1, -1]) {
    const [px, py, pz] = side.position;
    const [tx, ty, tz] = side.target;
    const light = spotlight(
      side.color,
      [sign * px * stageSide, py * stageSide, pz * stageSide],
      [sign * tx * stageSide, ty * stageSide, tz * stageSide],
      side.illuminance,
    );
    light.name = SIDE_NAME;
    light.angle = side.angle;
    light.penumbra = side.penumbra;
    light.shadow.bias = -0.0005;
    setSideTier(light, tier);
    fitShadow(light, stageSide);
    group.add(light, light.target);
  }

  if (options.beam ?? true) {
    group.add(createBeam(stageSide, tier));
  }
  if (conductor) {
    const light = createConductorLight(conductor);
    group.add(light, light.target);
  }
  return group;
}
