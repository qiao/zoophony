// Proves the fallback of the hall impulse response (`#loadHall()` of `src/audio/player.ts`): the
// probe serves `dist/`, opens the app in headless Chrome, and answers the request of the FLAC file
// with bytes that `decodeAudioData()` refuses. The app must fetch the WAV file and get ready to
// play with no failure message. A control run with the real FLAC file must fetch no WAV file.
//
// Usage, after pnpm build: node docs/research/2026-10-21-load-performance/hall-fallback-probe.ts
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium } from '@playwright/test';
import { chromiumArgs } from '../../../tools/chromium-args.ts';

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};
const server = createServer((request, response) => {
  let file = join('dist', normalize(new URL(request.url ?? '/', 'http://x').pathname));
  if (existsSync(file) && statSync(file).isDirectory()) {
    file = join(file, 'index.html');
  }
  if (!existsSync(file)) {
    response.statusCode = 404;
    response.end();
    return;
  }
  response.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream');
  response.end(readFileSync(file));
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const port = address instanceof Object ? address.port : 0;

const browser = await chromium.launch({ channel: 'chrome', args: chromiumArgs('darwin') });
let failures = 0;
for (const broken of [true, false]) {
  const page = await browser.newPage();
  const halls: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    const name = request.url().split('/').pop() ?? '';
    if (name.startsWith('st-pauls-hall')) {
      halls.push(name);
    }
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  if (broken) {
    await page.route('**/*.flac', (route) =>
      route.fulfill({ body: Buffer.from('These bytes are no FLAC file.'), contentType: 'audio/flac' }),
    );
  }
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(
    () => {
      const ring = document.querySelector<HTMLElement>('.first-screen:not(.boot) .ring');
      const canvas = document.querySelector<HTMLCanvasElement>('#stage');
      return Boolean(canvas?.dataset['demo']) && ring?.style.visibility === 'hidden';
    },
    null,
    { timeout: 60_000 },
  );
  const status = await page.$eval('.first-screen:not(.boot) .status', (element) => element.textContent);
  const wav = halls.some((name) => name.endsWith('.wav'));
  const ok = broken ? wav : !wav;
  console.log(
    `${broken ? 'broken FLAC' : 'real FLAC'}: ready, requests ${JSON.stringify(halls)}, status "${status ?? ''}", console errors ${errors.length}: ${ok ? 'pass' : 'FAIL'}`,
  );
  if (!ok || errors.length > 0) {
    failures += 1;
  }
  await page.close();
}
await browser.close();
server.close();
process.exit(failures === 0 ? 0 : 1);
