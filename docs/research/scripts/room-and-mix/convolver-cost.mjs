// Times OfflineAudioContext renders in Google Chrome: a dry source, the source through a
// ConvolverNode with a stereo IR, and through a DynamicsCompressorNode. 60 s at 48 kHz.
import { chromium } from '/Users/xueqiaoxu/proj/zoophony/node_modules/.pnpm/playwright-core@1.63.0/node_modules/playwright-core/index.mjs';
import { readFileSync } from 'node:fs';
const ir = readFileSync(process.argv[2]).toString('base64');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const result = await page.evaluate(async (irB64) => {
  const bytes = Uint8Array.from(atob(irB64), (c) => c.charCodeAt(0));
  const seconds = 60, rate = 48000;
  async function run(kind) {
    const ctx = new OfflineAudioContext(2, seconds * rate, rate);
    const noise = ctx.createBuffer(2, rate * 2, rate);
    for (let c = 0; c < 2; c++) { const d = noise.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 0.1 - 0.05; }
    const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
    let node = src;
    if (kind === 'convolver' || kind === 'both') {
      const conv = ctx.createConvolver();
      conv.buffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      node.connect(conv); node = conv;
    }
    if (kind === 'compressor' || kind === 'both') {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -6; comp.ratio.value = 20; comp.knee.value = 0; comp.attack.value = 0.002; comp.release.value = 0.15;
      node.connect(comp); node = comp;
    }
    node.connect(ctx.destination);
    src.start();
    const t0 = performance.now();
    await ctx.startRendering();
    return performance.now() - t0;
  }
  const out = {};
  for (const kind of ['dry', 'convolver', 'compressor', 'both', 'dry', 'convolver', 'compressor', 'both']) {
    const ms = await run(kind);
    out[kind] = Math.min(out[kind] ?? Infinity, ms);
  }
  return out;
}, ir);
const blocks = (60 * 48000) / 128;
for (const [k, v] of Object.entries(result)) console.log(k, `${v.toFixed(0)} ms for 60 s`, `${(v / blocks * 1000).toFixed(1)} µs per block`);
console.log(await browser.version());
await browser.close();
