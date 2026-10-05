// Opens each probe in Playwright WebKit or in the installed Chrome, runs it for a fixed time,
// and prints one result line for each probe. Start serve.mjs first.
//
// Usage: node run.mjs <webkit|chrome> <seconds> <probe>...
//   A probe is "synth:<query>" for page/synth.html, or "<query>" for page/probe.html.
// BUSY=<n> starts n Node processes with an endless loop for the time of the run.
// OUT=<file> appends each result as one JSON line.

import { chromium, webkit } from '@playwright/test';
import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const [name, seconds, ...probes] = process.argv.slice(2);
const busyCount = Number(process.env.BUSY ?? 0);
const busy = Array.from({ length: busyCount }, () =>
  spawn(process.execPath, ['-e', 'for (;;) {}'], { stdio: 'ignore' }),
);
const browser =
  name === 'webkit'
    ? await webkit.launch({ headless: false })
    : await chromium.launch({
        channel: 'chrome',
        headless: false,
        args: ['--autoplay-policy=no-user-gesture-required'],
      });

/** The slope of currentTime against performance.now(), from 5 s after the start. */
function slope(samples) {
  const points = samples.filter(([wallMs]) => wallMs > 5000);
  const xs = points.map(([wallMs]) => wallMs / 1000);
  const ys = points.map(([, contextSec]) => contextSec);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const sxy = xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i] - my), 0);
  const sxx = xs.reduce((sum, x) => sum + (x - mx) ** 2, 0);
  return sxy / sxx;
}

try {
  for (const probe of probes) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const path = probe.startsWith('synth:') ? `synth.html?${probe.slice(6)}` : `probe.html?${probe}`;
    await page.goto(`http://localhost:4192/${path}`);
    await page.click('#go');
    await page.waitForFunction(() => window.probe.state === 'running');
    await page.waitForTimeout(Number(seconds) * 1000);
    const values = await page.evaluate(() => window.probe);
    const fit = slope(values.samples);
    const result = {
      browser: name,
      version: browser.version(),
      probe,
      busy: busyCount,
      seconds: Number(seconds),
      date: new Date(),
      context: values.ctx,
      stats: values.stats,
      playback: values.playback ?? null,
      slope: fit,
      lostMsPer316s: Math.round((1 - fit) * 316_000),
    };
    console.log(
      `${name} busy=${busyCount} ${probe}: lost ${result.lostMsPer316s} ms per 316 s, ` +
        `${JSON.stringify(values.stats)} ${JSON.stringify(values.playback ?? null)}`,
    );
    if (process.env.OUT) {
      appendFileSync(process.env.OUT, `${JSON.stringify(result)}\n`);
    }
    await context.close();
  }
} finally {
  await browser.close();
  for (const child of busy) {
    child.kill();
  }
}
