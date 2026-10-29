import hallImpulseUrl from '../../assets/hall/st-pauls-hall-c8m.flac?url';
import hallWavUrl from '../../assets/hall/st-pauls-hall-c8m.wav?url';

/**
 * The URL of the hall impulse response, `assets/hall/st-pauls-hall-c8m.flac` (design 6.8): the
 * samples of the WAV file in a lossless file of about a quarter of its size. The build copies the
 * file into `dist/assets/`. The `Player` fetches it with the presets, after the first frame.
 */
export const HALL_IMPULSE_URL: string = hallImpulseUrl;

/**
 * The URL of the same samples as WAV, `assets/hall/st-pauls-hall-c8m.wav`, for a browser whose
 * `decodeAudioData()` refuses the FLAC file of {@link HALL_IMPULSE_URL} (design 6.8).
 */
export const HALL_WAV_URL: string = hallWavUrl;

/** The gain of the dry path (design 6.8). */
export const DRY_GAIN = 1;

/**
 * The gain of the hall path (design 6.8). With the impulse response of {@link HALL_IMPULSE_URL},
 * the hall gives about 20 % of the output energy of the first 30 s of the Boulanger demo. With
 * the room of the synth, the reverb gives about 26 %.
 */
export const WET_GAIN = 0.0625;

/**
 * The settings of the `DynamicsCompressorNode` that limits the peaks (design 6.8): a hard knee at
 * -3 dBFS with the ratio 20, a short attack, and a release of 150 ms. The compressor lets a
 * short peak pass above its threshold. At -3 dBFS, each demo at -16 LUFS keeps its true peak at
 * or below -1.4 dBTP (`pnpm loudness`).
 */
export const LIMITER = {
  threshold: -3,
  knee: 0,
  ratio: 20,
  attack: 0.002,
  release: 0.15,
} as const;

/**
 * The gain after the limiter, in dB (design 6.8). Web Audio adds a fixed makeup gain of
 * `(1 / g)^0.6` in the compressor, where `g` is the gain of its curve at 0 dBFS. This gain
 * removes it, so the chain does not change the level below the threshold: -1.71 dB.
 */
export const LIMITER_TRIM_DB = 0.6 * LIMITER.threshold * (1 - 1 / LIMITER.ratio);

/**
 * The time constant of a volume change in seconds (design 6.6, 6.8). A mute falls by 20 dB in
 * 69 ms and by 60 dB in 0.21 s, and an unmute rises with the same curve, with no click.
 */
export const VOLUME_TIME_CONSTANT = 0.03;

/** The Web Audio nodes after the synth (design 6.8). */
export interface OutputChain {
  /** The input of the chain. Its gain is the gain of the piece. */
  readonly input: GainNode;
  /** The hall reverb. It is silent until it gets the impulse response. */
  readonly convolver: ConvolverNode;
  readonly dry: GainNode;
  readonly wet: GainNode;
  readonly limiter: DynamicsCompressorNode;
  /** The gain of {@link LIMITER_TRIM_DB}. */
  readonly trim: GainNode;
  /**
   * The gain of the volume slider and the mute button, at the end of the chain. Thus a mute also
   * stops the tail of the hall and of the room of the synth.
   */
  readonly volume: GainNode;
}

/**
 * Makes the output chain of the synth (design 6.8): the input gain goes to a dry path and to the
 * hall reverb, and both go through the limiter, its trim gain, and the volume gain to the
 * destination.
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
  const trim = context.createGain();
  trim.gain.value = gainOfDb(LIMITER_TRIM_DB);
  const volume = context.createGain();
  input.connect(dry);
  input.connect(convolver);
  convolver.connect(wet);
  dry.connect(limiter);
  wet.connect(limiter);
  limiter.connect(trim);
  trim.connect(volume);
  volume.connect(context.destination);
  return { input, convolver, dry, wet, limiter, trim, volume };
}

/**
 * Moves the volume gain of the chain to a new value, with the time constant
 * {@link VOLUME_TIME_CONSTANT} from the current context time (design 6.6, 6.8).
 *
 * @param chain The output chain.
 * @param gain The new gain, 0 for a mute.
 */
export function setOutputVolume(chain: OutputChain, gain: number): void {
  chain.volume.gain.setTargetAtTime(gain, chain.volume.context.currentTime, VOLUME_TIME_CONSTANT);
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
