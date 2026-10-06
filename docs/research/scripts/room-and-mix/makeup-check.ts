// Research script of docs/research/room-and-mix.md. Copy it into tools/ to run it, because it
// needs node_modules. It measures the gain of a DynamicsCompressorNode with the limiter settings
// for a sine at several levels, in an OfflineAudioContext of headless Chromium.
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const out = await page.evaluate(async () => {
    const rows: string[] = [];
    for (const level of [-30, -10, -3, -1, 0, 3]) {
      const ctx = new OfflineAudioContext(1, 48000, 48000);
      const osc = ctx.createOscillator();
      osc.frequency.value = 440;
      const g = ctx.createGain();
      g.gain.value = 10 ** (level / 20);
      const c = ctx.createDynamicsCompressor();
      c.threshold.value = -2;
      c.knee.value = 0;
      c.ratio.value = 20;
      c.attack.value = 0.002;
      c.release.value = 0.15;
      osc.connect(g).connect(c).connect(ctx.destination);
      osc.start();
      const buf = await ctx.startRendering();
      const data = buf.getChannelData(0).slice(24000);
      const peak = Math.max(...data.map(Math.abs));
      rows.push(`in ${level} dBFS -> out ${(20 * Math.log10(peak)).toFixed(2)} dBFS`);
    }
    return rows;
  });
  console.log(browser.version(), out.join('\n'));
} finally {
  await browser.close();
}
