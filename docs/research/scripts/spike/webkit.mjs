// Runs the spike checks in Playwright WebKit. This is an extra data point only: Playwright
// WebKit is a WebKit build of Playwright, not Safari.
//
// Usage: node webkit.mjs <runs|full> [base URL]
// The default base URL is http://localhost:4181 (serve.mjs --mbps 50). Results go to results/.

import { webkit } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  compactSample,
  fullPlay,
  loadAndFirstSound,
  summarizeFullPlay,
  summarizeRuns,
} from './checks.mjs';

const mode = process.argv[2] ?? 'full';
const base = process.argv[3] ?? 'http://localhost:4181';
const url = `${base}/spike.html`;
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

mkdirSync(new URL('results/', import.meta.url), { recursive: true });
const result = { browser: `Playwright WebKit ${browser.version()}`, mode, url, date: new Date() };
if (mode === 'full') {
  const run = await fullPlay(makeDriver(), url);
  result.summary = summarizeFullPlay(run);
  result.samples = run.samples.map(compactSample);
  result.events = run.events;
} else {
  const runs = [];
  for (let i = 0; i < 5; i += 1) {
    runs.push(await loadAndFirstSound(makeDriver(), url));
    console.log(JSON.stringify(runs.at(-1)));
  }
  result.summary = summarizeRuns(runs);
  result.runs = runs;
}
await browser.close();
writeFileSync(
  new URL(`results/webkit-${mode}.json`, import.meta.url),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(result.browser, JSON.stringify(result.summary, null, 2));
