// The load probe of the report 2026-10-21-load-performance.md.
//
// It serves `dist/` as GitHub Pages does (HTTP/2, gzip for text types, `Cache-Control:
// max-age=600`, ETag), and opens the app in headless Chrome with the GPU of the Mac. A phone run
// shapes the network in the server, so that the fetches of the Worker also get the shape: Fast 4G
// of DevTools (165 ms for each request, 8.1 Mbit/s down for all requests together). It also sets
// a 4x CPU throttle on the main thread of the page.
//
// Usage, from the root of the tree, after `pnpm build`:
//   node docs/research/2026-10-21-load-performance/load-probe.ts [--runs 3] [--phone] [--repeat]
//     [--port 4321] [--out <file.json>]
//
// `--repeat` loads the page two times in one browser context, and gives the times of the second
// load (a repeat visit in the 600 s of `max-age`).
//
// Times are in milliseconds from the start of the navigation (`performance.now()`).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createSecureServer } from 'node:http2';
import type { Http2ServerRequest, Http2ServerResponse } from 'node:http2';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';
import { chromiumArgs } from '../../../tools/chromium-args.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: string): string => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? fallback) : fallback;
};
const RUNS = Number(option('--runs', '3'));
const PHONE = args.includes('--phone');
const REPEAT = args.includes('--repeat');
const PORT = Number(option('--port', '4321'));
const OUT = option('--out', '');
const ROOT = normalize(option('--root', 'dist'));
const PROFILE = args.includes('--profile');
/** Plain HTTP/1.1 with no TLS: Chrome keeps no HTTP cache for a site with a certificate error. */
const HTTP1 = args.includes('--http1');

/** Fast 4G of DevTools: 60 ms RTT x 2.75, 9 Mbit/s x 0.9 down. */
const LATENCY_MS = PHONE ? 165 : 0;
const DOWN_BYTES_PER_S = PHONE ? (9e6 / 8) * 0.9 : Infinity;
const CPU_RATE = PHONE ? 4 : 1;

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.mid': 'audio/midi',
  '.sf3': 'application/octet-stream',
  '.bin': 'application/octet-stream',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
const GZIP_TYPES = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt']);

/** The bytes that the server sent for each path in the current load. */
let sent = new Map<string, number>();

/** The start and the end of each response, in ms from the request of the page. */
let timeline: [string, number, number, number][] = [];
let pageAt = 0;

/**
 * The shaper: the open bodies share the rate of the link. Each pass gives each body at most 4 KB,
 * in turn, so that each body keeps the order of its own bytes.
 */
const streams: { rest: Buffer; write: (c: Buffer) => void; end: () => void }[] = [];
let budget = 0;
let last = performance.now();
setInterval(() => {
  const now = performance.now();
  budget = Math.min(budget + ((now - last) / 1000) * DOWN_BYTES_PER_S, DOWN_BYTES_PER_S * 0.02);
  last = now;
  while (streams.length > 0 && budget >= 1) {
    for (let i = 0; i < streams.length && budget >= 1; ) {
      const stream = streams[i]!;
      const take = Math.min(stream.rest.length, 4096, Math.floor(budget));
      stream.write(stream.rest.subarray(0, take));
      stream.rest = stream.rest.subarray(take);
      budget -= take;
      if (stream.rest.length === 0) {
        streams.splice(i, 1);
        stream.end();
      } else {
        i++;
      }
    }
  }
}, 5).unref();

const cache = new Map<string, { body: Buffer; gz: Buffer | null; etag: string }>();

function fileOf(path: string): { body: Buffer; gz: Buffer | null; etag: string } | null {
  let file = join(ROOT, normalize(decodeURIComponent(path)));
  if (!file.startsWith(ROOT)) {
    return null;
  }
  if (existsSync(file) && statSync(file).isDirectory()) {
    file = join(file, 'index.html');
  }
  if (!existsSync(file)) {
    return null;
  }
  const hit = cache.get(file);
  if (hit) {
    return hit;
  }
  const body = readFileSync(file);
  const gz = GZIP_TYPES.has(extname(file)) ? gzipSync(body) : null;
  const etag = `"${createHash('sha1').update(body).digest('hex').slice(0, 16)}"`;
  const entry = { body, gz, etag };
  cache.set(file, entry);
  return entry;
}

function serve(request: Http2ServerRequest, response: Http2ServerResponse): void {
  const path = new URL(request.url, 'https://localhost').pathname;
  const entry = fileOf(path);
  const reply = (): void => {
    if (!entry) {
      response.writeHead(404);
      response.end();
      return;
    }
    const filePath = path.endsWith('/') ? `${path}index.html` : path;
    const type = TYPES[extname(filePath)] ?? 'application/octet-stream';
    const headers: Record<string, string> = {
      'content-type': type,
      'cache-control': 'max-age=600',
      etag: entry.etag,
    };
    if (request.headers['if-none-match'] === entry.etag) {
      response.writeHead(304, headers);
      response.end();
      if (path === '/') {
        pageAt = performance.now();
      }
      sent.set(path, (sent.get(path) ?? 0) + 0);
      return;
    }
    const gzip = entry.gz !== null && String(request.headers['accept-encoding']).includes('gzip');
    const body = gzip ? entry.gz! : entry.body;
    if (gzip) {
      headers['content-encoding'] = 'gzip';
    }
    headers['content-length'] = String(body.length);
    response.writeHead(200, headers);
    sent.set(path, (sent.get(path) ?? 0) + body.length);
    if (path === '/') {
      pageAt = performance.now();
    }
    const row: [string, number, number, number] = [path, Math.round(performance.now() - pageAt), -1, body.length];
    timeline.push(row);
    response.on('finish', () => {
      row[2] = Math.round(performance.now() - pageAt);
    });
    if (DOWN_BYTES_PER_S === Infinity) {
      response.end(body);
      return;
    }
    streams.push({ rest: body, write: (c) => response.write(c), end: () => response.end() });
  };
  if (LATENCY_MS > 0) {
    setTimeout(reply, LATENCY_MS);
  } else {
    reply();
  }
}

const certDir = join('scratch', 'load-probe-cert');
if (!existsSync(join(certDir, 'cert.pem'))) {
  mkdirSync(certDir, { recursive: true });
  execFileSync('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-subj',
    '/CN=localhost',
    '-days',
    '30',
    '-keyout',
    join(certDir, 'key.pem'),
    '-out',
    join(certDir, 'cert.pem'),
  ]);
}
const server = HTTP1
  ? createServer((request, response) => serve(request as never, response as never))
  : createSecureServer(
      {
        key: readFileSync(join(certDir, 'key.pem')),
        cert: readFileSync(join(certDir, 'cert.pem')),
        allowHTTP1: true,
      },
      serve,
    );
await new Promise<void>((resolve) => server.listen(PORT, resolve));

/** The marks that the init script writes into `window.__load`. */
const INIT = `(() => {
  const load = { fcp: null, lcp: null, longTasks: [], emptyDraw: null, firstDraw: null, firstFrame: null, ready: null };
  window.__load = load;
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (e.name === 'first-contentful-paint') load.fcp = e.startTime;
  }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) load.lcp = e.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) load.longTasks.push([Math.round(e.startTime), Math.round(e.duration)]);
  }).observe({ type: 'longtask', buffered: true });
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, options) {
    const gl = getContext.call(this, kind, options);
    if (gl && kind === 'webgl2' && this.id === 'stage' && !gl.__wrapped) {
      gl.__wrapped = true;
      for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
        const draw = gl[name].bind(gl);
        gl[name] = function (...a) {
          if (load.emptyDraw === null) load.emptyDraw = performance.now();
          if (load.firstDraw === null && this.canvas.dataset.demo) {
            load.firstDraw = performance.now();
            requestAnimationFrame(() => { load.firstFrame = performance.now(); });
          }
          return draw(...a);
        };
      }
    }
    return gl;
  };
  const check = () => {
    if (load.ready !== null) return;
    const canvas = document.querySelector('#stage');
    const ring = document.querySelector('.first-screen:not(.boot) .ring');
    if (canvas && canvas.dataset.demo && ring && ring.style.visibility === 'hidden') {
      load.ready = performance.now();
    }
  };
  new MutationObserver(check).observe(document, { subtree: true, attributes: true, childList: true, characterData: true });
})();`;

interface RunResult {
  fcp: number | null;
  lcp: number | null;
  firstDraw: number | null;
  firstFrame: number | null;
  ready: number | null;
  longTasks: [number, number][];
  tbt: number;
  bytes: Record<string, number>;
  totalBytes: number;
}

// Chrome trusts the key of the certificate, so that it keeps an HTTP cache: with a certificate
// error, it keeps none, and a repeat visit loads each file again.
const spki = execFileSync('sh', [
  '-c',
  `openssl x509 -in ${join(certDir, 'cert.pem')} -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64`,
])
  .toString()
  .trim();
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: [...chromiumArgs('darwin'), `--ignore-certificate-errors-spki-list=${spki}`],
});
const results: RunResult[] = [];
const url = `${HTTP1 ? 'http' : 'https'}://localhost:${PORT}/`;
for (let run = 0; run < RUNS; run++) {
  const context = await browser.newContext({
    ...(PHONE
      ? { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true }
      : { viewport: { width: 1350, height: 940 }, deviceScaleFactor: 1 }),
  });
  await context.addInitScript(INIT);
  const loads = REPEAT ? 2 : 1;
  let result: RunResult | null = null;
  for (let visit = 0; visit < loads; visit++) {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE });
    sent = new Map();
    timeline = [];
    if (PROFILE) {
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
      await cdp.send('Profiler.start');
    }
    await page.goto(url, { waitUntil: 'load', timeout: 120_000 });
    await page.waitForFunction(() => (window as unknown as { __load: { ready: number | null } }).__load.ready !== null, null, {
      timeout: 180_000,
      polling: 500,
    });
    const load = (await page.evaluate(() => (window as unknown as { __load: RunResult }).__load)) as RunResult;
    const fcp = load.fcp ?? 0;
    const tbt = load.longTasks
      .filter(([start]) => start >= fcp && (load.ready === null || start <= load.ready))
      .reduce((sum, [, d]) => sum + Math.max(0, d - 50), 0);
    const bytes = Object.fromEntries([...sent.entries()].toSorted((a, b) => b[1] - a[1]));
    const totalBytes = [...sent.values()].reduce((s, b) => s + b, 0);
    if (PROFILE) {
      const { profile } = await cdp.send('Profiler.stop');
      writeFileSync(OUT.replace(/\.json$/, '-profile.json'), JSON.stringify(profile));
    }
    result = { ...load, tbt, bytes, totalBytes, timeline: timeline.toSorted((a, b) => a[1] - b[1]) } as RunResult;
    await page.close();
  }
  if (result) {
    results.push(result);
    const r = result;
    console.log(
      `run ${run + 1}: empty stage ${Math.round((r as unknown as { emptyDraw: number }).emptyDraw ?? -1)} fcp ${Math.round(r.fcp ?? -1)} lcp ${Math.round(r.lcp ?? -1)} first frame ${Math.round(
        r.firstFrame ?? -1,
      )} ready ${Math.round(r.ready ?? -1)} tbt ${r.tbt} bytes ${r.totalBytes} long tasks ${JSON.stringify(r.longTasks)}`,
    );
  }
  await context.close();
}
await browser.close();
server.close();

const median = (values: number[]): number => {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? NaN;
};
const summary = {
  mode: `${PHONE ? 'phone (Fast 4G, 4x CPU)' : 'desktop'}${REPEAT ? ', repeat visit' : ', first visit'}`,
  runs: RUNS,
  median: {
    fcp: Math.round(median(results.map((r) => r.fcp ?? NaN))),
    lcp: Math.round(median(results.map((r) => r.lcp ?? NaN))),
    emptyStage: Math.round(median(results.map((r) => (r as unknown as { emptyDraw: number }).emptyDraw ?? NaN))),
    firstFrame: Math.round(median(results.map((r) => r.firstFrame ?? NaN))),
    ready: Math.round(median(results.map((r) => r.ready ?? NaN))),
    tbt: Math.round(median(results.map((r) => r.tbt))),
    totalBytes: Math.round(median(results.map((r) => r.totalBytes))),
  },
  results,
};
console.log(JSON.stringify(summary.median));
if (OUT) {
  writeFileSync(OUT, `${JSON.stringify(summary, null, 2)}\n`);
}
process.exit(0);
