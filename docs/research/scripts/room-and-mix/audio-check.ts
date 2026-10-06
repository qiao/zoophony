// Research script of docs/research/room-and-mix.md. Copy it into tools/ to run it, because it
// imports from ../src and needs node_modules. It plays the default demo in headless Chromium,
// taps the output of the chain with two AnalyserNodes, and prints the peaks, the L/R
// correlation, the node links, and the console errors. Usage: node tools/audio-check.ts
import { join } from 'node:path';

import { chromium } from '@playwright/test';
import { createServer } from 'vite';

import { FIRST_PLAY, SAMPLES_READY } from '../src/app/dev-hook.ts';

interface Window {
  __audio: {
    links: string[];
    blocks: [number, number, number, number][];
    worklet: AudioWorkletNode | null;
    convolvers: ConvolverNode[];
    compressors: DynamicsCompressorNode[];
  };
}

const INIT = () => {
  const w = window as unknown as Window;
  w.__audio = { links: [], blocks: [], worklet: null, convolvers: [], compressors: [] };
  const state = w.__audio;
  let left: AnalyserNode | null = null;
  let right: AnalyserNode | null = null;
  const connect = AudioNode.prototype.connect;
  // @ts-expect-error The patch keeps the overloads of connect().
  AudioNode.prototype.connect = function (destination: AudioNode, ...rest: number[]) {
    state.links.push(`${this.constructor.name}->${destination.constructor.name}`);
    if (destination instanceof AudioDestinationNode && !left) {
      const context = this.context;
      const splitter = context.createChannelSplitter(2);
      left = context.createAnalyser();
      right = context.createAnalyser();
      left.fftSize = 32768;
      right.fftSize = 32768;
      connect.call(this, splitter);
      connect.call(splitter, left, 0);
      connect.call(splitter, right, 1);
    }
    return connect.call(this, destination, ...rest);
  };
  const Original = window.AudioWorkletNode;
  window.AudioWorkletNode = class extends Original {
    constructor(...args: ConstructorParameters<typeof AudioWorkletNode>) {
      super(...args);
      state.worklet = this;
    }
  };
  const createConvolver = BaseAudioContext.prototype.createConvolver;
  BaseAudioContext.prototype.createConvolver = function () {
    const node = createConvolver.call(this);
    state.convolvers.push(node);
    return node;
  };
  const createCompressor = BaseAudioContext.prototype.createDynamicsCompressor;
  BaseAudioContext.prototype.createDynamicsCompressor = function () {
    const node = createCompressor.call(this);
    state.compressors.push(node);
    return node;
  };
  const buffer = new Float32Array(32768);
  const other = new Float32Array(32768);
  (w as unknown as { __corr: number[] }).__corr = [0, 0, 0];
  setInterval(() => {
    if (!left || !right) {
      return;
    }
    let peakL = 0;
    let peakR = 0;
    let sum = 0;
    left.getFloatTimeDomainData(buffer);
    for (const v of buffer) {
      peakL = Math.max(peakL, Math.abs(v));
      sum += v * v;
    }
    right.getFloatTimeDomainData(other);
    for (const v of other) {
      peakR = Math.max(peakR, Math.abs(v));
      sum += v * v;
    }
    const corr = (w as unknown as { __corr: number[] }).__corr;
    for (let i = 0; i < buffer.length; i++) {
      corr[0] = (corr[0] ?? 0) + buffer[i]! * other[i]!;
      corr[1] = (corr[1] ?? 0) + buffer[i]! * buffer[i]!;
      corr[2] = (corr[2] ?? 0) + other[i]! * other[i]!;
    }
    state.blocks.push([performance.now(), peakL, peakR, sum / (2 * buffer.length)]);
  }, 200);
};

const db = (v: number): string => (20 * Math.log10(Math.max(v, 1e-9))).toFixed(2);

const server = await createServer({
  root: join(import.meta.dirname, '..'),
  logLevel: 'error',
  server: { port: 4181, strictPort: false },
});
await server.listen();
const base = server.resolvedUrls?.local[0] ?? 'http://localhost:4181/';
const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=metal', '--enable-gpu'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      errors.push(`${m.type()}: ${m.text()}`);
    }
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  const requests: string[] = [];
  page.on('requestfinished', (r) => {
    if (r.url().includes('.wav')) {
      requests.push(r.url());
    }
  });
  await page.addInitScript(INIT);
  await page.goto(base);
  await page.waitForSelector(SAMPLES_READY, { timeout: 90_000 });
  await page.click(FIRST_PLAY);
  const openSec = Number(process.env['OPEN_SEC'] ?? 20);
  const seekSec = Number(process.env['SEEK_SEC'] ?? 234);
  const tailSec = Number(process.env['TAIL_SEC'] ?? 52);
  await page.waitForTimeout(openSec * 1000);
  const opening = await page.evaluate(() => (window as unknown as Window).__audio.blocks.length);
  await page.evaluate((sec) => {
    (window as unknown as Window).__audio.worklet?.port.postMessage({ type: 'seek', songSec: sec });
  }, seekSec);
  await page.waitForTimeout(tailSec * 1000);
  const result = await page.evaluate(() => {
    const s = (window as unknown as Window).__audio;
    const c = s.compressors[0];
    return {
      links: [...new Set(s.links)],
      blocks: s.blocks,
      convolver: s.convolvers.map((n) => ({
        normalize: n.normalize,
        channels: n.buffer?.numberOfChannels,
        seconds: n.buffer?.duration,
        rate: n.buffer?.sampleRate,
      })),
      compressor: c
        ? {
            threshold: c.threshold.value,
            knee: c.knee.value,
            ratio: c.ratio.value,
            attack: c.attack.value,
            release: c.release.value,
            reduction: c.reduction,
          }
        : null,
      sampleRate: s.worklet?.context.sampleRate,
    };
  });
  const rms = (list: [number, number, number, number][]): string =>
    db(Math.sqrt(list.reduce((sum, b) => sum + b[3], 0) / Math.max(1, list.length)));
  const peak = (list: [number, number, number, number][]): number =>
    Math.max(0, ...list.map((b) => Math.max(b[1], b[2])));
  const first = result.blocks.slice(0, opening);
  const tail = result.blocks.slice(opening);
  console.log('links', result.links.join(', '));
  console.log('convolver', JSON.stringify(result.convolver), 'compressor', JSON.stringify(result.compressor));
  console.log('sample rate', result.sampleRate, 'wav requests', requests.join(' '));
  console.log(`opening ${openSec} s: peak ${db(peak(first))} dBFS, mean RMS ${rms(first)} dBFS, ${first.length} reads`);
  console.log(`from ${seekSec} s for ${tailSec} s: peak ${db(peak(tail))} dBFS, mean RMS ${rms(tail)} dBFS, ${tail.length} reads`);
  const corr = await page.evaluate(() => (window as unknown as { __corr: number[] }).__corr);
  const [lr = 0, ll = 1, rr = 1] = corr;
  console.log(`L/R correlation ${(lr / Math.sqrt(ll * rr)).toFixed(3)}, L/R balance ${(10 * Math.log10(ll / rr)).toFixed(2)} dB`);
  console.log('reads at or above full scale', result.blocks.filter((b) => Math.max(b[1], b[2]) >= 1).length);
  console.log('console errors and warnings', errors.length ? errors.join('\n') : 'none');
} finally {
  await browser.close();
  await server.close();
}
