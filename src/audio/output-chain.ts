import hallImpulseUrl from '../../assets/hall/st-pauls-hall-c8m.wav?url';

/**
 * The URL of the hall impulse response, `assets/hall/st-pauls-hall-c8m.wav` (design 6.8). The
 * build copies the file into `dist/assets/`. The `Player` fetches it with the presets, after the
 * first frame.
 */
export const HALL_IMPULSE_URL: string = hallImpulseUrl;

/** The gain of the dry path (design 6.8). */
export const DRY_GAIN = 1;

/**
 * The gain of the hall path (design 6.8). With the impulse response of {@link HALL_IMPULSE_URL},
 * the hall gives about 20 % of the output energy of the first 30 s of the Beethoven demo and of
 * the Boulanger demo. With the room of the synth, the reverb gives about 26 %.
 */
export const WET_GAIN = 0.0625;

/**
 * The settings of the `DynamicsCompressorNode` that limits the peaks (design 6.8): a hard knee at
 * -2 dBFS with the ratio 20. Web Audio adds a fixed makeup gain of `(1 / g)^0.6`, where `g` is the
 * gain of the curve at 0 dBFS: +1.14 dB here.
 */
export const LIMITER = {
  threshold: -2,
  knee: 0,
  ratio: 20,
  attack: 0.002,
  release: 0.15,
} as const;

/** The Web Audio nodes after the synth (design 6.8). */
export interface OutputChain {
  /** The input of the chain. Its gain is the gain of the piece. */
  readonly input: GainNode;
  /** The hall reverb. It is silent until it gets the impulse response. */
  readonly convolver: ConvolverNode;
  readonly dry: GainNode;
  readonly wet: GainNode;
  readonly limiter: DynamicsCompressorNode;
}

/**
 * Makes the output chain of the synth (design 6.8): the input gain goes to a dry path and to the
 * hall reverb, and both go through the limiter to the destination.
 *
 * @param context The audio context.
 * @returns The nodes of the chain, connected.
 */
export function createOutputChain(context: BaseAudioContext): OutputChain {
  const input = context.createGain();
  const dry = context.createGain();
  dry.gain.value = DRY_GAIN;
  const convolver = context.createConvolver();
  // The wet gain sets the level, so the browser does not scale the impulse response.
  convolver.normalize = false;
  const wet = context.createGain();
  wet.gain.value = WET_GAIN;
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = LIMITER.threshold;
  limiter.knee.value = LIMITER.knee;
  limiter.ratio.value = LIMITER.ratio;
  limiter.attack.value = LIMITER.attack;
  limiter.release.value = LIMITER.release;
  input.connect(dry);
  input.connect(convolver);
  convolver.connect(wet);
  dry.connect(limiter);
  wet.connect(limiter);
  limiter.connect(context.destination);
  return { input, convolver, dry, wet, limiter };
}

/**
 * Converts a level in decibels to a gain.
 *
 * @param db The level in dB.
 * @returns The gain: 1 for 0 dB.
 */
export function gainOfDb(db: number): number {
  return 10 ** (db / 20);
}
