/**
 * The loudness meter of `pnpm loudness` (design 6.8). It measures a stereo signal at 48 kHz with
 * the K-weighting and the gates of ITU-R BS.1770-4 and the loudness range of EBU Tech 3342. It
 * also gives the true peak with 4 times oversampling, and the gain reduction of a limiter from
 * its input and its output. All functions are pure.
 */

/** The sample rate of the meter in Hz. The K-weighting coefficients are for this rate. */
export const METER_RATE = 48_000;

/** One biquad filter: the coefficients b0, b1, b2, a1, a2 (a0 is 1). */
type Biquad = readonly [number, number, number, number, number];

/** The K-weighting of BS.1770-4 at 48 kHz: the high shelf, then the high pass (RLB). */
const K_WEIGHTING: readonly Biquad[] = [
  [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
  [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621],
];

/** The step of the momentary and the short-term windows in samples: 100 ms. */
const HOP = METER_RATE / 10;

/** The length of a momentary window in samples: 400 ms. */
const MOMENTARY = (METER_RATE * 4) / 10;

/** The length of a short-term window in samples: 3 s. */
const SHORT_TERM = METER_RATE * 3;

/** The short-term loudness below which the music counts as quiet, in LUFS. */
export const QUIET_LUFS = -30;

/** A stereo signal at {@link METER_RATE}. */
export interface Stereo {
  readonly left: Float32Array;
  readonly right: Float32Array;
}

/** The loudness of a signal. */
export interface Loudness {
  /** The integrated loudness in LUFS: the absolute gate -70 LUFS and the relative gate -10 LU. */
  readonly integrated: number;
  /** The loudness range in LU: the 10th to the 95th percentile of the gated short-term values. */
  readonly range: number;
  /** The highest short-term loudness in LUFS. */
  readonly maxShortTerm: number;
  /**
   * The short-term loudness at each step of 100 ms, in LUFS. Value `i` is the window that ends
   * at `(i + 1) * 0.1 s`. The first 29 windows count the time before the start as silence.
   */
  readonly shortTerm: Float64Array;
  /** The highest absolute sample in dBFS. */
  readonly samplePeak: number;
  /** The highest absolute value of the 4 times oversampled signal in dBTP. */
  readonly truePeak: number;
}

/**
 * Filters a channel with a chain of biquads.
 *
 * @param input The channel.
 * @param stages The filters, in order.
 * @returns The filtered channel.
 */
function filter(input: Float32Array, stages: readonly Biquad[]): Float64Array {
  let x: ArrayLike<number> = input;
  let y = new Float64Array(input.length);
  for (const [b0, b1, b2, a1, a2] of stages) {
    y = new Float64Array(input.length);
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = x[i] ?? 0;
      const out = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = v;
      y2 = y1;
      y1 = out;
      y[i] = out;
    }
    x = y;
  }
  return y;
}

/**
 * Converts a mean power of the K-weighted channels to a loudness.
 *
 * @param power The sum of the mean squares of both channels.
 * @returns The loudness in LUFS.
 */
function loudnessOfPower(power: number): number {
  return -0.691 + 10 * Math.log10(power + 1e-30);
}

/**
 * Calculates the running sum of the squares of both K-weighted channels.
 *
 * @param audio The signal.
 * @returns The sums: value `i` is the sum of the first `i` samples, so the array has one more value.
 */
function energySums(audio: Stereo): Float64Array {
  const left = filter(audio.left, K_WEIGHTING);
  const right = filter(audio.right, K_WEIGHTING);
  const sums = new Float64Array(left.length + 1);
  for (let i = 0; i < left.length; i++) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    sums[i + 1] = (sums[i] ?? 0) + l * l + r * r;
  }
  return sums;
}

/**
 * Calculates the mean power of the windows of one length, at each step of 100 ms.
 *
 * @param sums The running sums of {@link energySums}.
 * @param size The window length in samples.
 * @returns The power of each full window. A signal shorter than the window gives no value.
 */
function windowPowers(sums: Float64Array, size: number): Float64Array {
  const length = sums.length - 1;
  const count = length >= size ? Math.floor((length - size) / HOP) + 1 : 0;
  const powers = new Float64Array(count);
  for (let k = 0; k < count; k++) {
    const start = k * HOP;
    powers[k] = ((sums[start + size] ?? 0) - (sums[start] ?? 0)) / size;
  }
  return powers;
}

/**
 * Calculates the mean of the powers above a loudness gate.
 *
 * @param powers The powers.
 * @param gate The gate in LUFS.
 * @returns The mean power, or 0 if no power is above the gate.
 */
function gatedMean(powers: ArrayLike<number>, gate: number): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < powers.length; i++) {
    const power = powers[i] ?? 0;
    if (loudnessOfPower(power) > gate) {
      sum += power;
      count += 1;
    }
  }
  return count ? sum / count : 0;
}

/**
 * Gives a percentile of sorted values, with a linear interpolation between ranks.
 *
 * @param sorted The values, sorted up. At least one.
 * @param share The percentile as a share from 0 to 1.
 * @returns The value.
 */
function percentile(sorted: readonly number[], share: number): number {
  const at = share * (sorted.length - 1);
  const low = sorted[Math.floor(at)] ?? 0;
  const high = sorted[Math.ceil(at)] ?? 0;
  return low + (high - low) * (at - Math.floor(at));
}

/** The phases of the oversampling filter: a Kaiser-windowed sinc of 4 × 48 taps. */
const OVERSAMPLE = 4;

/** The taps of each phase of the oversampling filter. */
const TAPS_PER_PHASE = 48;

/**
 * Calculates the modified Bessel function of the first kind and order 0.
 *
 * @param x The argument.
 * @returns The value.
 */
function besselI0(x: number): number {
  let sum = 1;
  let term = 1;
  for (let k = 1; k < 50; k++) {
    term *= (x / (2 * k)) ** 2;
    sum += term;
  }
  return sum;
}

/**
 * Makes the phases of the oversampling filter: a sinc with a Kaiser window of beta 9.
 *
 * @returns One array of taps for each phase.
 */
function makePhases(): Float64Array[] {
  const length = OVERSAMPLE * TAPS_PER_PHASE;
  const center = (length - 1) / 2;
  const beta = 9;
  const phases = Array.from({ length: OVERSAMPLE }, () => new Float64Array(TAPS_PER_PHASE));
  for (let n = 0; n < length; n++) {
    const t = (n - center) / OVERSAMPLE;
    const sinc = t === 0 ? 1 : Math.sin(Math.PI * t) / (Math.PI * t);
    const r = (2 * n) / (length - 1) - 1;
    const tap = sinc * (besselI0(beta * Math.sqrt(1 - r * r)) / besselI0(beta));
    const phase = phases[n % OVERSAMPLE];
    if (phase) {
      phase[Math.floor(n / OVERSAMPLE)] = tap;
    }
  }
  return phases;
}

/** The phases of {@link makePhases}. */
const PHASES: readonly Float64Array[] = makePhases();

/**
 * Calculates the true peak of one channel. It oversamples only near the samples above a quarter
 * (-12 dB) of the sample peak, because an inter-sample peak far above its neighbors does not
 * occur in music.
 *
 * @param channel The channel.
 * @param samplePeak The highest absolute sample of the signal.
 * @returns The highest absolute value of the oversampled channel.
 */
function truePeakOf(channel: Float32Array, samplePeak: number): number {
  const floor = samplePeak / 4;
  let peak = 0;
  for (let i = TAPS_PER_PHASE; i < channel.length; i++) {
    const near = Math.max(
      Math.abs(channel[i - TAPS_PER_PHASE / 2] ?? 0),
      Math.abs(channel[i - TAPS_PER_PHASE / 2 - 1] ?? 0),
    );
    if (near < floor) {
      continue;
    }
    for (const phase of PHASES) {
      let sum = 0;
      for (let k = 0; k < TAPS_PER_PHASE; k++) {
        sum += (phase[k] ?? 0) * (channel[i - k] ?? 0);
      }
      peak = Math.max(peak, Math.abs(sum));
    }
  }
  return peak;
}

/**
 * Converts an amplitude to decibels.
 *
 * @param value The amplitude.
 * @returns The level in dB.
 */
function decibels(value: number): number {
  return 20 * Math.log10(value + 1e-30);
}

/**
 * Measures the loudness and the peaks of a signal (BS.1770-4, EBU Tech 3342).
 *
 * @param audio The signal at {@link METER_RATE}.
 * @returns The loudness, the short-term values, and the peaks.
 */
export function measureLoudness(audio: Stereo): Loudness {
  const sums = energySums(audio);
  const momentary = windowPowers(sums, MOMENTARY);
  const relative = loudnessOfPower(gatedMean(momentary, -70)) - 10;
  const integrated = loudnessOfPower(gatedMean(momentary, relative));

  const shortPowers = windowPowers(sums, SHORT_TERM);
  const shortGate = loudnessOfPower(gatedMean(shortPowers, -70)) - 20;
  const gated = [...shortPowers]
    .map(loudnessOfPower)
    .filter((value) => value > -70 && value > shortGate)
    .toSorted((a, b) => a - b);
  const range = gated.length ? percentile(gated, 0.95) - percentile(gated, 0.1) : 0;

  const steps = Math.floor((sums.length - 1) / HOP);
  const shortTerm = new Float64Array(steps);
  for (let i = 0; i < steps; i++) {
    const end = (i + 1) * HOP;
    const start = Math.max(0, end - SHORT_TERM);
    shortTerm[i] = loudnessOfPower(((sums[end] ?? 0) - (sums[start] ?? 0)) / SHORT_TERM);
  }

  let peak = 0;
  for (let i = 0; i < audio.left.length; i++) {
    peak = Math.max(peak, Math.abs(audio.left[i] ?? 0), Math.abs(audio.right[i] ?? 0));
  }
  const truePeak = Math.max(peak, truePeakOf(audio.left, peak), truePeakOf(audio.right, peak));

  return {
    integrated,
    range,
    maxShortTerm: Math.max(...shortTerm),
    shortTerm,
    samplePeak: decibels(peak),
    truePeak: decibels(truePeak),
  };
}

/**
 * Gives the median of the short-term loudness in a time range, with the windows that end in it.
 *
 * @param shortTerm The short-term values of {@link Loudness.shortTerm}.
 * @param fromSec The start of the range in seconds.
 * @param toSec The end of the range in seconds.
 * @returns The median in LUFS, or -Infinity for an empty range.
 */
export function medianShortTerm(shortTerm: Float64Array, fromSec: number, toSec: number): number {
  const values = [...shortTerm.subarray(Math.round(fromSec * 10), Math.round(toSec * 10))];
  return values.length
    ? percentile(
        values.toSorted((a, b) => a - b),
        0.5,
      )
    : -Infinity;
}

/**
 * Gives the share of the short-term values in a time range that are below a loudness.
 *
 * @param shortTerm The short-term values of {@link Loudness.shortTerm}.
 * @param toSec The end of the range in seconds. The range starts at 0 s.
 * @param below The loudness in LUFS.
 * @returns The share from 0 to 1.
 */
export function shareBelow(shortTerm: Float64Array, toSec: number, below: number): number {
  const values = shortTerm.subarray(0, Math.round(toSec * 10));
  return values.length ? values.filter((value) => value < below).length / values.length : 0;
}

/** The gain reduction of a limiter, from its input and its output. */
export interface GainReduction {
  /** The delay of the output after the input, in samples. */
  readonly delay: number;
  /** The highest gain reduction of a block of 50 ms, in dB. */
  readonly max: number;
  /** The share of the blocks of 50 ms with more than 1 dB of gain reduction. */
  readonly over1: number;
  /** The share of the blocks of 50 ms with more than 3 dB of gain reduction. */
  readonly over3: number;
}

/** The length of a block of the gain reduction in samples: 50 ms. */
const GR_BLOCK = METER_RATE / 20;

/** The block peak of the input, below which a block gives no gain reduction: -40 dBFS. */
const GR_FLOOR = 0.01;

/**
 * Finds the delay of a limiter output after its input: the lag up to 20 ms with the highest
 * correlation of the left channels.
 *
 * @param input The input of the limiter.
 * @param output The output of the limiter.
 * @returns The delay in samples.
 */
function limiterDelay(input: Float32Array, output: Float32Array): number {
  const length = Math.min(input.length, output.length, METER_RATE * 60);
  let best = 0;
  let bestSum = -Infinity;
  for (let lag = 0; lag <= METER_RATE / 50; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < length; i += 4) {
      sum += (input[i] ?? 0) * (output[i + lag] ?? 0);
    }
    if (sum > bestSum) {
      bestSum = sum;
      best = lag;
    }
  }
  return best;
}

/**
 * Measures the gain reduction of a limiter with a gain of 1 below its threshold: the peak of
 * each block of 50 ms of the input against the same block of the output.
 *
 * @param input The input of the limiter, at the level of the output below the threshold.
 * @param output The output of the limiter.
 * @returns The delay and the gain reduction.
 */
export function gainReduction(input: Stereo, output: Stereo): GainReduction {
  const delay = limiterDelay(input.left, output.left);
  const blockPeak = (audio: Stereo, start: number): number => {
    let peak = 0;
    for (let i = start; i < start + GR_BLOCK; i++) {
      peak = Math.max(peak, Math.abs(audio.left[i] ?? 0), Math.abs(audio.right[i] ?? 0));
    }
    return peak;
  };
  let max = 0;
  let over1 = 0;
  let over3 = 0;
  let blocks = 0;
  for (let start = 0; start + delay + GR_BLOCK <= output.left.length; start += GR_BLOCK) {
    const before = blockPeak(input, start);
    if (before < GR_FLOOR) {
      continue;
    }
    const reduction = Math.max(0, decibels(before) - decibels(blockPeak(output, start + delay)));
    blocks += 1;
    max = Math.max(max, reduction);
    over1 += reduction > 1 ? 1 : 0;
    over3 += reduction > 3 ? 1 : 0;
  }
  return {
    delay,
    max,
    over1: blocks ? over1 / blocks : 0,
    over3: blocks ? over3 / blocks : 0,
  };
}
