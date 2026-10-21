// Measures the makeup gain of the DynamicsCompressorNode of Chromium for a limiter threshold.
import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage();
for (const threshold of [-2, -3]) {
  const out = await page.evaluate(async (t) => {
    const ctx = new OfflineAudioContext(1, 48000, 48000);
    const osc = ctx.createOscillator();
    osc.frequency.value = 1000;
    const g = ctx.createGain();
    g.gain.value = 10 ** (-30 / 20);
    const c = ctx.createDynamicsCompressor();
    c.threshold.value = t; c.knee.value = 0; c.ratio.value = 20; c.attack.value = 0.002; c.release.value = 0.15;
    osc.connect(g).connect(c).connect(ctx.destination);
    osc.start();
    const b = await ctx.startRendering();
    const d = b.getChannelData(0);
    let p = 0; for (let i = 24000; i < 48000; i++) p = Math.max(p, Math.abs(d[i]));
    return 20 * Math.log10(p);
  }, threshold);
  console.log(`threshold ${threshold}: sine at -30 dBFS gives ${out.toFixed(2)} dBFS, makeup ${(out + 30).toFixed(2)} dB, formula ${(-0.6 * threshold * (1 - 1 / 20)).toFixed(2)} dB`);
}
await browser.close();
