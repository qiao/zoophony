// Runs the spike checks in the installed Google Chrome, headed, with real audio output.
//
// Usage: node chrome.mjs <mode> [base URL]
//   cdp-runs     5 loads with the DevTools network throttle (50 Mbit/s, 20 ms, no cache),
//                each followed by a click on Play (load and first sound targets).
//   server-runs  5 loads from a server with its own limit (start serve.mjs --mbps 50).
//   full         Plays demo 1 to the end, with 20 s in a hidden tab.
// The default base URL is http://localhost:4180 (serve.mjs). Results go to results/.
// The environment variables MBPS (default 50) and RUNS (default 5) change the runs. DEMO selects
// a demo of the spike page with ?demo=<id>, and adds -<id> to the name of the result file.
//
// The script talks to Chrome over the DevTools protocol with no library. Playwright keeps each
// page "visible" when another tab is in front, so it cannot do the hidden-tab check.

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  compactSample,
  fullPlay,
  loadAndFirstSound,
  sleep,
  summarizeFullPlay,
  summarizeRuns,
} from './checks.mjs';

const mode = process.argv[2] ?? 'full';
const base = process.argv[3] ?? 'http://localhost:4180';
const DEMO = process.env.DEMO ?? '';
const url = DEMO ? `${base}/spike.html?demo=${DEMO}` : `${base}/spike.html`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9335;
const MBPS = Number(process.env.MBPS ?? 50);
const RUNS = Number(process.env.RUNS ?? 5);
let version = '';

/** Keeps each AudioContext of the page, so that the driver can read its playbackStats. */
const captureContexts = `
  window.__contexts = [];
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    constructor(...args) { super(...args); window.__contexts.push(this); }
  };
`;

/**
 * Opens a DevTools protocol connection to one target. A message with a session id goes to a
 * child target, such as the decode Worker.
 */
async function connect(webSocketUrl, onEvent) {
  const socket = new WebSocket(webSocketUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve));
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id === undefined) {
      onEvent(message);
      return;
    }
    pending.get(message.id)?.(message);
    pending.delete(message.id);
  });
  return {
    send(method, params = {}, sessionId = undefined) {
      id += 1;
      const messageId = id;
      return new Promise((resolve, reject) => {
        pending.set(messageId, (message) =>
          message.error ? reject(new Error(message.error.message)) : resolve(message.result),
        );
        socket.send(JSON.stringify({ id: messageId, method, params, sessionId }));
      });
    },
    close: () => socket.close(),
  };
}

function makeDriver({ throttle }) {
  let chrome;
  let profile;
  let page;
  let pageId;
  let otherId;
  async function network(sessionId) {
    await page.send('Network.enable', {}, sessionId);
    await page.send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
    if (throttle) {
      const conditions = {
        offline: false,
        latency: 20,
        downloadThroughput: (MBPS * 1e6) / 8,
        uploadThroughput: (MBPS * 1e6) / 8,
      };
      await page.send('Network.emulateNetworkConditions', conditions, sessionId);
    }
  }
  async function onEvent(event) {
    if (event.method === 'Target.attachedToTarget') {
      const { sessionId } = event.params;
      await network(sessionId).catch(() => undefined);
      await page.send('Runtime.runIfWaitingForDebugger', {}, sessionId);
    }
  }
  // Some endpoints answer with plain text, such as "Target activated".
  const http = (path, method = 'GET') =>
    fetch(`http://localhost:${PORT}${path}`, { method })
      .then((response) => response.text())
      .then((text) => (text.startsWith('{') || text.startsWith('[') ? JSON.parse(text) : text));
  return {
    extra: `(() => {
      const stats = window.__contexts?.[0]?.playbackStats;
      if (!stats) return null;
      const values = {};
      for (const key in stats) if (typeof stats[key] === 'number') values[key] = stats[key];
      return values;
    })()`,
    async open(target) {
      profile = join(tmpdir(), `zoophony-chrome-${Date.now()}`);
      chrome = spawn(CHROME, [
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${profile}`,
        '--no-first-run',
        '--no-default-browser-check',
        'about:blank',
      ]);
      for (let i = 0; i < 100 && !pageId; i += 1) {
        await sleep(100);
        const targets = await http('/json').catch(() => []);
        pageId = targets.find((item) => item.type === 'page')?.id;
        if (pageId) {
          const target = targets.find((item) => item.id === pageId);
          page = await connect(target.webSocketDebuggerUrl, (event) => void onEvent(event));
        }
      }
      version = (await http('/json/version')).Browser;
      await page.send('Page.enable');
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: captureContexts });
      await network();
      // The decode Worker fetches the preset files. It is a child target with its own network
      // settings, so the driver stops it at its start and gives it the same throttle.
      await page.send('Target.setAutoAttach', {
        autoAttach: true,
        waitForDebuggerOnStart: true,
        flatten: true,
      });
      await page.send('Page.navigate', { url: target });
    },
    async evaluate(expression) {
      const reply = await page.send('Runtime.evaluate', { expression, returnByValue: true });
      if (reply.exceptionDetails) {
        throw new Error(reply.exceptionDetails.text);
      }
      return reply.result.value;
    },
    async click(selector) {
      const box = await this.evaluate(
        `(() => { const r = document.querySelector('${selector}').getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`,
      );
      for (const type of ['mousePressed', 'mouseReleased']) {
        await page.send('Input.dispatchMouseEvent', {
          type,
          ...box,
          button: 'left',
          clickCount: 1,
        });
      }
    },
    async hide() {
      otherId = (await http('/json/new?about:blank', 'PUT')).id;
    },
    async show() {
      await http(`/json/activate/${pageId}`);
      await http(`/json/close/${otherId}`);
    },
    async close() {
      page.close();
      chrome.kill();
      await new Promise((resolve) => chrome.on('exit', resolve));
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    },
  };
}

mkdirSync(new URL('results/', import.meta.url), { recursive: true });
const result = { mode, url, date: new Date() };
if (mode === 'full') {
  const run = await fullPlay(makeDriver({ throttle: false }), url);
  result.summary = summarizeFullPlay(run);
  result.samples = run.samples.map(compactSample);
  result.events = run.events;
} else {
  const runs = [];
  for (let i = 0; i < RUNS; i += 1) {
    runs.push(await loadAndFirstSound(makeDriver({ throttle: mode === 'cdp-runs' }), url));
    console.log(JSON.stringify(runs.at(-1)));
  }
  result.summary = summarizeRuns(runs);
  result.runs = runs;
}
result.browser = version;
writeFileSync(
  new URL(`results/chrome-${mode}${DEMO ? `-${DEMO}` : ''}.json`, import.meta.url),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(result.browser, JSON.stringify(result.summary, null, 2));
