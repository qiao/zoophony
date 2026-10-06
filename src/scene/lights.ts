import { Group, HemisphereLight, MathUtils, SpotLight } from 'three';

import type { ConductorPlace } from '../models/layout.ts';
import { SPOT_HEIGHT_IN_SIDES } from '../models/beam.ts';
import { createBeam } from './beam.ts';
import { TIER_SETTINGS } from './quality.ts';
import type { QualityTier } from './quality.ts';

/**
 * The half angle of the spotlight cone (design 4.5). three.js dims the cone from
 * `angle × (1 - penumbra)` to `angle`. The stage corners are 30.5° from the axis, so they get
 * about 0.8 of the full light.
 */
export const SPOT_ANGLE = 45 * MathUtils.DEG2RAD;

/** The penumbra of the spotlight (design 4.5). */
export const SPOT_PENUMBRA = 0.5;

/**
 * The shadow map of the spotlight covers this part of its cone angle (design 4.5): 33.75° from
 * the axis. The stage corners are 30.5° from the axis, so the map holds the full stage, and each
 * texel is 0.67 times as large as with the full cone.
 */
export const SHADOW_FOCUS = 0.75;

/**
 * The normal bias of the shadow, in texels of the shadow map at the stage, beyond the blur radius
 * of the tier (design 2.6, 4.5). The receiver moves along its normal past the blur disc, so a lit
 * face does not shadow itself. With the first bias of 0.01 m, close shots showed a cross-hatch
 * pattern on the faces (UX audit 2026-10-05, SC5).
 */
export const SHADOW_BIAS_TEXELS = 2;

/**
 * Calculates the normal bias of the shadow of a spotlight (design 4.5): the size of one texel of
 * the shadow map at the stage top, times the blur radius plus {@link SHADOW_BIAS_TEXELS}.
 *
 * @param height The height of the spotlight above the stage top, in meters.
 * @param mapSize The width of the shadow map, in texels.
 * @param radius The blur radius of the tier, in texels.
 * @returns The normal bias, in meters.
 */
export function shadowNormalBias(height: number, mapSize: number, radius: number): number {
  const texel = (2 * height * Math.tan(SPOT_ANGLE * SHADOW_FOCUS)) / mapSize;
  return texel * (radius + SHADOW_BIAS_TEXELS);
}

/** The color of the spotlight (design 4.5): a little warm, so that the wood keeps its hue. */
export const SPOT_COLOR = '#fff6ec';

/** The colors of the fill light (design 4.5). The ground color is the light from the lit stage. */
export const FILL_COLORS = { sky: '#3a3530', ground: '#4a3a30' } as const;

/**
 * The illuminance of the spotlight at the stage center, in lux. The intensity in candela is this
 * value times the square of the light height, so the stage center has the same brightness on
 * each stage size. Step 3 tunes it against the reference image (design 4.5).
 */
export const SPOT_ILLUMINANCE = 2.2;

/**
 * The light on the face of the conductor (design 4.5): a weak spotlight from the orchestra side.
 * The stage spotlight comes from about 74° above the bear, so in the conductor shot its face was
 * dark brown on dark gray (UX audit 2026-10-05, FI1). This light casts no shadow.
 */
export const CONDUCTOR_LIGHT = {
  /** The aim point is this high above the podium top: the face of the bear. */
  aimHeight: 1.2,
  /** The light stands this far in front of the aim point, toward the orchestra, in meters. */
  forward: 3.2,
  /** The light stands this far above the aim point, in meters. */
  up: 2.4,
  /**
   * The illuminance at the aim point, in lux. The stage center gets 2.2 lux from above. The fur
   * of the bear is dark brown, and with 1.2 lux its face stayed darker than the players.
   */
  illuminance: 3,
  /** The half angle of the cone. It holds the bear and its arms. */
  angle: 16 * MathUtils.DEG2RAD,
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
  const light = new SpotLight(SPOT_COLOR, c.illuminance * distanceSquared);
  light.position.set(x + frontX * c.forward, aimY + c.up, z + frontZ * c.forward);
  light.target.position.set(x, aimY, z);
  light.angle = c.angle;
  light.penumbra = c.penumbra;
  light.decay = 2;
  light.castShadow = false;
  return light;
}

/**
 * Sets the shadow map size and the shadow blur of the spotlight for a quality tier (design 2.6).
 * The renderer makes a new shadow map of the new size at the next render.
 *
 * @param spot The spotlight of the stage.
 * @param tier The quality tier.
 */
function setSpotTier(spot: SpotLight, tier: QualityTier): void {
  const settings = TIER_SETTINGS[tier];
  if (spot.shadow.mapSize.x !== settings.shadowMapSize) {
    spot.shadow.mapSize.set(settings.shadowMapSize, settings.shadowMapSize);
    spot.shadow.map?.dispose();
    spot.shadow.map = null;
  }
  spot.shadow.radius = settings.shadowRadius;
  spot.shadow.normalBias = shadowNormalBias(
    spot.position.y - spot.target.position.y,
    settings.shadowMapSize,
    settings.shadowRadius,
  );
}

/**
 * Sets the shadows of the lights of the stage for a new quality tier (design 2.6).
 *
 * @param lights The group of {@link createLights}.
 * @param tier The quality tier.
 */
export function setLightsTier(lights: Group, tier: QualityTier): void {
  for (const child of lights.children) {
    if (child instanceof SpotLight && child.castShadow) {
      setSpotTier(child, tier);
    }
  }
}

/**
 * Creates the lights of the stage: the spotlight, the fill light, the visible beam, and the light
 * on the face of the conductor (design 4.5). The spotlight scales with the stage.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param tier The quality tier. It sets the shadow map size and the shadow blur.
 * @param conductor The place of the conductor, or `null` for a view with no conductor, such as
 *   the gallery.
 * @returns A group with the lights, the targets of the spotlights, and the beam group of
 *   {@link createBeam}.
 */
export function createLights(
  stageSide: number,
  tier: QualityTier,
  conductor: ConductorPlace | null,
): Group {
  const group = new Group();
  const height = SPOT_HEIGHT_IN_SIDES * stageSide;

  const spot = new SpotLight(SPOT_COLOR, SPOT_ILLUMINANCE * height * height);
  spot.position.set(0, height, 0);
  spot.angle = SPOT_ANGLE;
  spot.penumbra = SPOT_PENUMBRA;
  spot.decay = 2;
  spot.castShadow = true;
  spot.shadow.focus = SHADOW_FOCUS;
  // The tallest item on the stage is about 2 m high, so the shadow depth range starts well above it.
  spot.shadow.camera.near = height - 3;
  spot.shadow.camera.far = height + 1;
  spot.shadow.bias = -0.0005;
  spot.target.position.set(0, 0, 0);
  setSpotTier(spot, tier);
  group.add(spot, spot.target);

  group.add(new HemisphereLight(FILL_COLORS.sky, FILL_COLORS.ground, 12));
  group.add(createBeam(stageSide, tier));
  if (conductor) {
    const light = createConductorLight(conductor);
    group.add(light, light.target);
  }
  return group;
}
