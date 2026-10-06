// Research script of docs/research/demo-loudness.md. It checks the bar mute in the built app:
// `vite preview` serves dist/ on a free port, headless Chromium plays the Boulanger demo, a seek
// goes to 232 s, and an AnalyserNode before the destination reads the level every 10 ms. The
// script clicks Mute, then Mute again, and prints the time from each click to each level step.
// Usage: pnpm build, then node app-mute.ts
import { chromium } from '@playwright/test';
import { preview } from 'vite';

import { FIRST_PLAY, SAMPLES_READY } from '../../../../src/app/dev-hook.ts';
import { ROOT } from './synth.ts';

interface Tap {
  /** [performance.now(), mean square] of each read. */
  readonly reads: [number, number][];
  worklet: AudioWorkletNode | null;
}

const INIT = (): void => {
  const tap: Tap = { reads: [], worklet: null };
  (window as unknown as { tap: Tap }).tap = tap;
  let analyser: AnalyserNode | null = null;
  const connect = AudioNode.prototype.connect;
  // @ts-expect-error The patch keeps the overloads of connect().
  AudioNode.prototype.connect = function (destination: AudioNode, ...rest: number[]) {
    if (destination instanceof AudioDestinationNode && !analyser) {
      analyser = this.context.createAnalyser();
      analyser.fftSize = 512;
      connect.call(this, analyser);
    }
    return connect.call(this, destination, ...rest);
  };
  const Original = window.AudioWorkletNode;
  window.AudioWorkletNode = class extends Original {
    constructor(...args: ConstructorParameters<typeof AudioWorkletNode>) {
      super(...args);
      tap.worklet = this;
    }
  };
  const data = new Float32Array(512);
  setInterval(() => {
    if (!analyser) {
      return;
    }
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (const v of data) {
      sum += v * v;
    }
    tap.reads.push([performance.now(), sum / data.length]);
  }, 10);
};

const server = await preview({ root: ROOT, logLevel: 'error', preview: { port: 0 } });
const url = server.resolvedUrls?.local[0];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  if (!url) {
    throw new Error('The preview server has no URL.');
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(INIT);
  await page.goto(url);
  await page.waitForSelector(SAMPLES_READY, { timeout: 90_000 });
  await page.click(FIRST_PLAY);
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    (window as unknown as { tap: Tap }).tap.worklet?.port.postMessage({
      type: 'seek',
      songSec: 232,
    });
  });
  await page.waitForTimeout(3000);
  const clickMute = (): Promise<number> =>
    page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>('button[aria-label="Mute"]');
      button?.click();
      return performance.now();
    });
  const muteAt = await clickMute();
  await page.waitForTimeout(2500);
  const unmuteAt = await clickMute();
  await page.waitForTimeout(1000);
  const reads = await page.evaluate(() => (window as unknown as { tap: Tap }).tap.reads);
  const level = (from: number, to: number): number => {
    const part = reads.filter(([time]) => time >= from && time < to);
    return 10 * Math.log10(part.reduce((sum, [, ms]) => sum + ms, 0) / part.length + 1e-30);
  };
  const before = level(muteAt - 1000, muteAt);
  const fall = [20, 40, 60].map((drop) => {
    const below = reads.find(
      ([time, ms]) => time > muteAt && 10 * Math.log10(ms + 1e-30) < before - drop,
    );
    return `-${drop} dB after ${below ? Math.round(below[0] - muteAt) : 'never'} ms`;
  });
  const rise = reads.find(
    ([time, ms]) => time > unmuteAt && 10 * Math.log10(ms + 1e-30) > before - 6,
  );
  console.log(`level in the second before the mute ${before.toFixed(1)} dBFS`);
  const after = reads.filter(([time]) => time > muteAt && time < muteAt + 500);
  console.log(
    `reads in the 0.5 s after the mute (ms, dBFS): ${after
      .map(([time, ms]) => `${Math.round(time - muteAt)} ${(10 * Math.log10(ms + 1e-30)).toFixed(0)}`)
      .join(', ')}`,
  );
  console.log(`mute: ${fall.join(', ')}`);
  console.log(
    `unmute: within 6 dB of that level after ${rise ? Math.round(rise[0] - unmuteAt) : 'never'} ms`,
  );
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) => {
    server.httpServer.close((error) => (error ? reject(error) : resolve()));
  });
}
