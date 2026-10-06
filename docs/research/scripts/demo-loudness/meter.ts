// Research script of docs/research/demo-loudness.md. It measures a stereo signal at 48 kHz:
// the integrated loudness and the loudness range of ITU-R BS.1770-4 and EBU Tech 3342, the
// sample peak, and the true peak with 4 times oversampling.

/** One biquad filter: the coefficients b0, b1, b2, a1, a2 (a0 is 1). */
type Biquad = readonly [number, number, number, number, number];

/** The K-weighting of BS.1770-4 at 48 kHz: the high shelf, then the high pass (RLB). */
const K_WEIGHTING: readonly Biquad[] = [
  [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
  [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621],
];

/** The result of {@link measure}. */
export interface Measure {
  /** Integrated loudness in LUFS, with the absolute gate -70 LUFS and the relative gate -10 LU. */
  readonly lufs: number;
  /** Loudness range in LU (EBU Tech 3342: 3 s windows, 10th to 95th percentile). */
  readonly lra: number;
  /** The highest momentary loudness (400 ms) in LUFS. */
  readonly maxMomentary: number;
  /** The highest absolute sample in dBFS. */
  readonly samplePeak: number;
  /** The highest absolute value of the 4 times oversampled signal in dBTP. */
  readonly truePeak: number;
}

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
      const v = x[i]!;
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

function loudnessOf(power: number): number {
  return -0.691 + 10 * Math.log10(power + 1e-30);
}

/**
 * Calculates the mean power of the K-weighted channels in windows.
 *
 * @param left The K-weighted left channel.
 * @param right The K-weighted right channel.
 * @param size The window length in samples.
 * @param hop The step between windows in samples.
 * @returns The sum of the mean square of both channels for each window.
 */
function windowPowers(left: Float64Array, right: Float64Array, size: number, hop: number): number[] {
  const powers: number[] = [];
  for (let start = 0; start + size <= left.length; start += hop) {
    let sum = 0;
    for (let i = start; i < start + size; i++) {
      sum += left[i]! * left[i]! + right[i]! * right[i]!;
    }
    powers.push(sum / size);
  }
  return powers;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function percentile(sorted: readonly number[], share: number): number {
  const at = share * (sorted.length - 1);
  const low = Math.floor(at);
  const high = Math.ceil(at);
  return sorted[low]! + (sorted[high]! - sorted[low]!) * (at - low);
}

/** The phases of the oversampling filter: a Kaiser-windowed sinc of 4 × 48 taps. */
const OVERSAMPLE = 4;
const TAPS_PER_PHASE = 48;
const PHASES: readonly Float64Array[] = makePhases();

function besselI0(x: number): number {
  let sum = 1;
  let term = 1;
  for (let k = 1; k < 50; k++) {
    term *= (x / (2 * k)) ** 2;
    sum += term;
  }
  return sum;
}

function makePhases(): Float64Array[] {
  const length = OVERSAMPLE * TAPS_PER_PHASE;
  const center = (length - 1) / 2;
  const beta = 9;
  const taps = new Float64Array(length);
  for (let n = 0; n < length; n++) {
    const t = (n - center) / OVERSAMPLE;
    const sinc = t === 0 ? 1 : Math.sin(Math.PI * t) / (Math.PI * t);
    const r = (2 * n) / (length - 1) - 1;
    taps[n] = sinc * (besselI0(beta * Math.sqrt(1 - r * r)) / besselI0(beta));
  }
  const phases: Float64Array[] = [];
  for (let p = 0; p < OVERSAMPLE; p++) {
    const phase = new Float64Array(TAPS_PER_PHASE);
    for (let k = 0; k < TAPS_PER_PHASE; k++) {
      phase[k] = taps[k * OVERSAMPLE + p]!;
    }
    phases.push(phase);
  }
  return phases;
}

function truePeakOf(channel: Float32Array): number {
  let peak = 0;
  for (let i = TAPS_PER_PHASE; i < channel.length; i++) {
    for (const phase of PHASES) {
      let sum = 0;
      for (let k = 0; k < TAPS_PER_PHASE; k++) {
        sum += phase[k]! * channel[i - k]!;
      }
      peak = Math.max(peak, Math.abs(sum));
    }
  }
  return peak;
}

function db(value: number): number {
  return 20 * Math.log10(value + 1e-30);
}

/**
 * Measures a stereo signal at 48 kHz.
 *
 * @param left The left channel.
 * @param right The right channel.
 * @param truePeak False to skip the true peak, which takes most of the time.
 * @returns The loudness and the peaks.
 */
export function measure(left: Float32Array, right: Float32Array, truePeak = true): Measure {
  const rate = 48_000;
  const kl = filter(left, K_WEIGHTING);
  const kr = filter(right, K_WEIGHTING);
  const blocks = windowPowers(kl, kr, 0.4 * rate, 0.1 * rate);
  const absolute = blocks.filter((power) => loudnessOf(power) > -70);
  const relativeGate = loudnessOf(mean(absolute)) - 10;
  const lufs = loudnessOf(mean(absolute.filter((power) => loudnessOf(power) > relativeGate)));
  const shortTerm = windowPowers(kl, kr, 3 * rate, 0.1 * rate)
    .map(loudnessOf)
    .filter((value) => value > -70);
  const shortGate = loudnessOf(
    mean(windowPowers(kl, kr, 3 * rate, 0.1 * rate).filter((power) => loudnessOf(power) > -70)),
  );
  const gated = shortTerm.filter((value) => value > shortGate - 20).toSorted((a, b) => a - b);
  const lra = gated.length ? percentile(gated, 0.95) - percentile(gated, 0.1) : 0;
  let samplePeak = 0;
  for (let i = 0; i < left.length; i++) {
    samplePeak = Math.max(samplePeak, Math.abs(left[i]!), Math.abs(right[i]!));
  }
  return {
    lufs,
    lra,
    maxMomentary: Math.max(...blocks.map(loudnessOf)),
    samplePeak: db(samplePeak),
    truePeak: truePeak ? db(Math.max(truePeakOf(left), truePeakOf(right), samplePeak)) : NaN,
  };
}
