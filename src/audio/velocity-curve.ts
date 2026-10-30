import { GeneratorTypes, Modulator, ModulatorSource } from 'spessasynth_core';
import type { BasicSoundBank } from 'spessasynth_core';

/**
 * The amount of the modulator from the note-on velocity to the initial attenuation, in
 * centibels, for a voice with the default curve of SF2 2.04 (design 6.1, 6.8). The demos give
 * their dynamics only as velocity. With the default of {@link SF2_VELOCITY_ATTENUATION_CB}, pp
 * (velocity 28) is 21 dB below f (velocity 96), so the soft start of `brahms-2` sat 23 LU below
 * `TARGET_LOUDNESS`. This amount is the largest of a sweep that puts the median of the first 10 s
 * of `beethoven-8` and `brahms-2` at most 12 LU below the target (`pnpm loudness`). It keeps p
 * (velocity 40) about 6 dB below f, plus the step of the soft sample layer.
 */
export const VELOCITY_ATTENUATION_CB = 360;

/**
 * The amount of the default modulator from the note-on velocity to the initial attenuation of
 * SF2 2.04 (section 8.4.2), in centibels. In spessasynth_core, the attenuation in dB at the
 * velocity `v` is `amount / 24 * log10(128 / v)`, with no factor of 0.4.
 */
const SF2_VELOCITY_ATTENUATION_CB = 960;

/**
 * The default modulator of SF2 2.04 from the note-on velocity to the initial attenuation: the
 * source enum 0x0502 (concave, negative, unipolar), no secondary source, and a linear transform.
 */
const VELOCITY_TO_ATTENUATION = new Modulator(
  ModulatorSource.fromSourceEnum(0x0502),
  ModulatorSource.fromSourceEnum(0),
  GeneratorTypes.initialAttenuation,
  SF2_VELOCITY_ATTENUATION_CB,
  0,
);

/**
 * Scales each modulator from the note-on velocity to the initial attenuation in a list.
 *
 * @param modulators The modulators.
 * @param factor The scale of each amount.
 */
function scaleModulators(modulators: readonly Modulator[], factor: number): void {
  for (const modulator of modulators) {
    if (Modulator.isIdentical(modulator, VELOCITY_TO_ATTENUATION)) {
      modulator.transformAmount = Math.round(modulator.transformAmount * factor);
    }
  }
}

/**
 * Narrows the velocity curve of a sound bank (design 6.1). The default modulator from the
 * velocity to the attenuation gets `amountCb`. Each instrument and preset modulator with the same
 * source and destination gets the same share of its amount, so a preset with its own curve
 * narrows in the same ratio. Call it before the synth makes a voice of the bank.
 *
 * @param bank The sound bank. The function changes its modulators in place.
 * @param amountCb The amount of the default modulator in centibels.
 */
export function narrowVelocityCurve(bank: BasicSoundBank, amountCb: number): void {
  const factor = amountCb / SF2_VELOCITY_ATTENUATION_CB;
  scaleModulators(bank.defaultModulators, factor);
  for (const item of [...bank.instruments, ...bank.presets]) {
    scaleModulators(item.globalZone.modulators, factor);
    for (const zone of item.zones) {
      scaleModulators(zone.modulators, factor);
    }
  }
}
