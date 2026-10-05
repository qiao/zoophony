// Runs the spike checks in the installed Firefox or Safari with W3C WebDriver.
//
// Usage: node webdriver.mjs <firefox|safari> <runs|full> [base URL]
//   runs  5 loads, each followed by a click on Play (load and first sound targets).
//   full  Plays demo 1 to the end, with 20 s in a minimized window.
// Firefox needs geckodriver: set GECKODRIVER to its path, or put it on the PATH.
// Safari needs "sudo safaridriver --enable" and Develop > Allow Remote Automation.
// The default base URL is http://localhost:4181 (serve.mjs --mbps 50). Results go to results/.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  compactSample,
  fullPlay,
  loadAndFirstSound,
  sleep,
  summarizeFullPlay,
  summarizeRuns,
} from './checks.mjs';

const [name = 'firefox', mode = 'full', base = 'http://localhost:4181'] = process.argv.slice(2);
const url = `${base}/spike.html`;
const port = name === 'safari' ? 4445 : 4444;
const driverProcess =
  name === 'safari'
    ? spawn('/usr/bin/safaridriver', ['-p', String(port)])
    : spawn(process.env.GECKODRIVER ?? 'geckodriver', ['--port', String(port)]);
await sleep(1500);

const capabilities =
  name === 'safari'
    ? { browserName: 'safari' }
    : {
        browserName: 'firefox',
        'moz:firefoxOptions': {
          binary: '/Applications/Firefox.app/Contents/MacOS/firefox',
          // The release defaults: audible autoplay is blocked, so a context starts suspended.
          prefs: { 'media.autoplay.default': 1, 'media.autoplay.block-webaudio': true },
        },
      };

async function call(method, path, body) {
  const response = await fetch(`http://localhost:${port}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const reply = await response.json();
  if (reply.value?.error) {
    throw new Error(`${method} ${path}: ${reply.value.message}`);
  }
  return reply.value;
}

let browserVersion = '';

function makeDriver() {
  let session = '';
  let rect;
  return {
    async open(target) {
      const reply = await call('POST', '/session', { capabilities: { alwaysMatch: capabilities } });
      session = `/session/${reply.sessionId}`;
      browserVersion = `${reply.capabilities.browserName} ${reply.capabilities.browserVersion}`;
      await call('POST', `${session}/url`, { url: target });
    },
    evaluate: (expression) =>
      call('POST', `${session}/execute/sync`, { script: `return ${expression};`, args: [] }),
    async click(selector) {
      const element = await call('POST', `${session}/element`, {
        using: 'css selector',
        value: selector,
      });
      await call('POST', `${session}/element/${Object.values(element)[0]}/click`, {});
    },
    async hide() {
      rect = await call('GET', `${session}/window/rect`);
      await call('POST', `${session}/window/minimize`, {});
    },
    async show() {
      await call('POST', `${session}/window/rect`, rect);
    },
    async close() {
      await call('DELETE', session);
    },
  };
}

mkdirSync(new URL('results/', import.meta.url), { recursive: true });
const result = { mode, url, date: new Date() };
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
      console.log(JSON.stringify(runs.at(-1)));
    }
    result.summary = summarizeRuns(runs);
    result.runs = runs;
  }
} finally {
  driverProcess.kill();
}
result.browser = browserVersion;
writeFileSync(
  new URL(`results/${name}-${mode}.json`, import.meta.url),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(result.browser, JSON.stringify(result.summary, null, 2));
