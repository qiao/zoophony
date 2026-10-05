// Runs the spike checks of ../spike/checks.mjs on the unchanged spike page in Playwright WebKit,
// with an optional CPU load. Results go to results/spike-<mode>-busy<n>-<run>.json.
//
// Usage: node spike-full.mjs <full|runs> [base URL]
// The default base URL is http://localhost:4181 (../spike/serve.mjs --port 4181 --mbps 50).
// BUSY=<n> starts n Node processes with an endless loop for the time of the run.
// RUN=<name> names the result file (default 1).

import { webkit } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

import {
  compactSample,
  fullPlay,
  loadAndFirstSound,
  summarizeFullPlay,
  summarizeRuns,
} from '../spike/checks.mjs';

const mode = process.argv[2] ?? 'full';
const url = `${process.argv[3] ?? 'http://localhost:4181'}/spike.html`;
const busyCount = Number(process.env.BUSY ?? 0);
const busy = Array.from({ length: busyCount }, () =>
  spawn(process.execPath, ['-e', 'for (;;) {}'], { stdio: 'ignore' }),
);
const browser = await webkit.launch({ headless: false });

function makeDriver() {
  let context;
  let page;
  let other;
  return {
    async open(target) {
      context = await browser.newContext();
      page = await context.newPage();
      await page.goto(target);
    },
    evaluate: (expression) => page.evaluate(expression),
    click: (selector) => page.click(selector),
    async hide() {
      other = await context.newPage();
      await other.bringToFront();
    },
    async show() {
      await page.bringToFront();
      await other.close();
    },
    close: () => context.close(),
  };
}

const result = {
  browser: `Playwright WebKit ${browser.version()}`,
  mode,
  url,
  busy: busyCount,
  date: new Date(),
};
try {
  if (mode === 'full') {
    const run = await fullPlay(makeDriver(), url);
    result.summary = summarizeFullPlay(run);
    result.samples = run.samples.map(compactSample);
    result.events = run.events;
  } else {
    const runs = [];
    for (let i = 0; i < 5; i += 1) {
      runs.push(await loadAndFirstSound(makeDriver(), url));
    }
    result.summary = summarizeRuns(runs);
    result.runs = runs;
  }
} finally {
  await browser.close();
  for (const child of busy) {
    child.kill();
  }
}
mkdirSync(new URL('results/', import.meta.url), { recursive: true });
const file = `results/spike-${mode}-busy${busyCount}-${process.env.RUN ?? '1'}.json`;
writeFileSync(new URL(file, import.meta.url), `${JSON.stringify(result, null, 2)}\n`);
const { slowBlocks, maxRenderMs, songTimeSlope, reachedEnd } = result.summary;
console.log(
  file,
  mode === 'full'
    ? { slowBlocks, maxRenderMs, songTimeSlope, lostMs: Math.round((1 - songTimeSlope) * 316_560), reachedEnd }
    : result.summary,
);
