// A probe processor with no synth. Each block does `iters` square roots (a fixed amount of
// work), then writes a quiet tone. The tone matters: Chrome moves a silent context to a timer
// clock, and its currentTime then drifts with no underrun.
class Probe extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.iters = options.processorOptions?.iters ?? 0;
    this.last = 0;
    this.n = 0;
    this.slowWork = 0;
    this.maxWork = 0;
    this.sumWork = 0;
    this.maxGap = 0;
    this.lateGaps = 0;
    this.sink = 0;
  }

  process(inputs, outputs) {
    const start = Date.now();
    if (this.last) {
      const gap = start - this.last;
      this.maxGap = Math.max(this.maxGap, gap);
      if (gap >= 8) this.lateGaps++;
    }
    this.last = start;
    let x = 0;
    for (let i = 0; i < this.iters; i++) x += Math.sqrt(i + x * 1e-9);
    this.sink += x;
    for (const channel of outputs[0] ?? []) {
      for (let i = 0; i < channel.length; i++) {
        channel[i] = 1e-4 * Math.sin((this.n * 128 + i) * 0.0575);
      }
    }
    const work = Date.now() - start;
    this.n++;
    this.sumWork += work;
    if (work > 128000 / sampleRate) this.slowWork++;
    this.maxWork = Math.max(this.maxWork, work);
    if (this.n % 375 === 0) {
      this.port.postMessage({
        n: this.n,
        slowWork: this.slowWork,
        maxWork: this.maxWork,
        meanWork: this.sumWork / this.n,
        maxGap: this.maxGap,
        lateGaps: this.lateGaps,
      });
    }
    return true;
  }
}

registerProcessor('probe', Probe);
