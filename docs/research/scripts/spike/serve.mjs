// Serves dist/ for the spike checks, with no cache and an optional bandwidth limit.
//
// Usage: node serve.mjs [--port 4180] [--mbps 50] [--latency-ms 20] [--log requests.jsonl]
//
// --mbps        Limits the download speed of all responses together (one token bucket).
// --latency-ms  Waits this time before the first byte of each response.
// --log         Writes one JSON line for each response: path, bytes, start and end times.
//
// GET /spike.html?report=1 adds report.js to the page. That script posts the values of
// window.spike to POST /report each 500 ms, and the server appends them to reports.jsonl.
// A person can thus run the checks in a browser that no driver controls (Safari).

import { appendFileSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, '../../../../dist');
const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i], process.argv[i + 1]);
}
const port = Number(args.get('--port') ?? 4180);
const mbps = Number(args.get('--mbps') ?? 0);
const latencyMs = Number(args.get('--latency-ms') ?? 0);
const logFile = args.get('--log');
const reportFile = join(here, 'reports.jsonl');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.mid': 'audio/midi',
  '.sf3': 'application/octet-stream',
};

// One token bucket for all responses: a 50 Mbit/s link shares its speed between requests.
const bytesPerMs = (mbps * 1e6) / 8 / 1000;
let bucketFreeAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Waits until the link can send the chunk, then reserves the time of the chunk. */
async function reserve(bytes) {
  if (!bytesPerMs) {
    return;
  }
  const now = performance.now();
  const start = Math.max(now, bucketFreeAt);
  bucketFreeAt = start + bytes / bytesPerMs;
  await sleep(bucketFreeAt - now);
}

async function send(res, path, body) {
  const start = Date.now();
  await sleep(latencyMs);
  res.writeHead(200, {
    'Content-Type': types[extname(path)] ?? 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
  });
  const chunk = 16 * 1024;
  for (let offset = 0; offset < body.length; offset += chunk) {
    const part = body.subarray(offset, offset + chunk);
    await reserve(part.length);
    res.write(part);
  }
  res.end();
  if (logFile) {
    appendFileSync(
      logFile,
      `${JSON.stringify({ path, bytes: body.length, start, end: Date.now() })}\n`,
    );
  }
}

const reporter = `
setInterval(() => {
  const spike = window.spike;
  if (!spike) return;
  const values = {};
  for (const [key, value] of Object.entries(spike)) {
    if (typeof value !== 'function') values[key] = value;
  }
  values.visibility = document.visibilityState;
  values.performanceNow = performance.now();
  values.userAgent = navigator.userAgent;
  navigator.sendBeacon('/report', JSON.stringify(values));
}, 500);
`;

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/report') {
    let body = '';
    req.on('data', (part) => (body += part));
    req.on('end', () => {
      appendFileSync(reportFile, `${JSON.stringify({ at: Date.now(), ...JSON.parse(body) })}\n`);
      res.end();
    });
    return;
  }
  if (url.pathname === '/report.js') {
    await send(res, url.pathname, Buffer.from(reporter));
    return;
  }
  const path = normalize(url.pathname === '/' ? '/index.html' : url.pathname);
  const file = join(root, path);
  if (!file.startsWith(root) || !statSync(file, { throwIfNoEntry: false })?.isFile()) {
    res.writeHead(404).end();
    return;
  }
  let body = await readFile(file);
  if (path === '/spike.html' && url.searchParams.has('report')) {
    body = Buffer.from(
      body.toString().replace('</body>', '<script src="/report.js"></script></body>'),
    );
  }
  await send(res, path, body);
}).listen(port, () => {
  console.log(`Serving ${root} on http://localhost:${port} (${mbps || 'no'} Mbit/s limit).`);
});
