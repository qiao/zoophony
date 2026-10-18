import { Group, SpotLight } from 'three';

import type { ShotLamp, ShotRig } from '../shots/shot-light.ts';

/**
 * The light of a close shot in the scene (design 4.5, 5.6), at the full weight of
 * `CameraPose.light`. The lamps cast no shadow. The wide shots keep the light of the stage.
 */
export const SHOT_LOOK = {
  /** The color of the soft key, in sRGB: warm white. */
  keyColor: '#ffe2c4',
  /** The illuminance of the soft key at the target, in lux. */
  key: 1.5,
  /** The illuminance of the follow-spot at the target, as a factor of the key. */
  spot: 1.3,
  /** The color of the kicker, in sRGB: the color of the key light of the stage. */
  kickerColor: '#ffca98',
  /** The illuminance of the kicker at the target, in lux. */
  kicker: 2.5,
  /** The extra exposure of a close shot, in stops. */
  exposure: 0.15,
  /** The vignette of a close shot. The wide shots keep `POST_LOOK.vignette`. */
  vignette: 0.6,
} as const;

/** The names of the two lamps in the group of {@link createShotLights}. */
const LAMPS = { key: 'shot-key', kicker: 'shot-kicker' } as const;

/**
 * Creates one lamp of the light of a shot: a soft spotlight with no shadow and no light.
 *
 * @param name The name of the lamp.
 * @param color The color, in sRGB.
 * @returns The lamp. Its target is not in the scene yet.
 */
function lamp(name: string, color: string): SpotLight {
  const light = new SpotLight(color, 0);
  light.name = name;
  light.penumbra = 1;
  light.decay = 2;
  light.castShadow = false;
  return light;
}

/**
 * Creates the lamps of the light of a close shot (design 4.5, 5.6): the soft key and the kicker,
 * with no light until {@link setShotLights}. They stay in the scene in each shot, so a cut does
 * not change the shader programs.
 *
 * @returns A group with the two lamps and their targets.
 */
export function createShotLights(): Group {
  const key = lamp(LAMPS.key, SHOT_LOOK.keyColor);
  const kicker = lamp(LAMPS.kicker, SHOT_LOOK.kickerColor);
  return new Group().add(key, key.target, kicker, kicker.target);
}

/**
 * Places one lamp, and gives it an illuminance at its target.
 *
 * @param light The lamp.
 * @param place The place, the aim, and the cone of the lamp.
 * @param illuminance The illuminance at the target, in lux.
 */
function placeLamp(light: SpotLight, place: ShotLamp, illuminance: number): void {
  light.position.set(...place.position);
  light.target.position.set(...place.target);
  light.angle = place.angle;
  light.intensity = illuminance * light.position.distanceToSquared(light.target.position);
}

/**
 * Sets the lamps of the light of a shot for a frame (design 4.5, 5.6).
 *
 * @param group The group of {@link createShotLights}.
 * @param rig The places of the lamps, from `shotRig()`.
 * @param light The weight of the light of a close shot, from 0 to 1.
 * @param spot The weight of the follow-spot, from 0 to 1.
 */
export function setShotLights(group: Group, rig: ShotRig, light: number, spot: number): void {
  for (const child of group.children) {
    if (!(child instanceof SpotLight)) {
      continue;
    }
    if (child.name === LAMPS.key) {
      const key = SHOT_LOOK.key * (1 + (SHOT_LOOK.spot - 1) * spot);
      placeLamp(child, rig.key, key * light);
    } else if (child.name === LAMPS.kicker) {
      placeLamp(child, rig.kicker, SHOT_LOOK.kicker * light);
    }
  }
}
