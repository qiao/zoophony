/**
 * Prints the WebGL calls of one frame of a demo during play (the report `2026-10-13-frame-time.md`,
 * section 10.2). Run from the repository root after `pnpm dev` wrote its files once:
 * `node docs/research/2026-10-13-frame-time/gl-calls.ts [<demo>] [<play ms>]`.
 *
 * The probe wraps the methods of `WebGL2RenderingContext` before the page code runs, plays the
 * demo, and logs the calls of 100 ms. It prints the calls of the second whole frame in order: each
 * framebuffer bind, viewport, clear, and upload, with runs of the same call as one line with a
 * count. Draws count as one kind of call.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

import { FIRST_PLAY, SAMPLES_READY } from '../../../src/app/dev-hook.ts';
import { chromiumArgs } from '../../../tools/chromium-args.ts';

const demo = process.argv[2] ?? 'perf-60';
const LOG = `(() => {
  const log = [];
  window.glLog = { on: false, log };
  const proto = WebGL2RenderingContext.prototype;
  const wrap = (name, describe) => {
    const original = proto[name];
    proto[name] = function (...args) {
      if (window.glLog.on) {
        log.push(name + (describe ? ' ' + describe(args, this) : ''));
      }
      return original.apply(this, args);
    };
  };
  const ids = new Map();
  const id = (o) => { if (!o) return 'null'; if (!ids.has(o)) ids.set(o, ids.size + 1); return 'fb' + ids.get(o); };
  wrap('bindFramebuffer', (a) => a[0] + ' ' + id(a[1]));
  wrap('viewport', (a) => a[2] + 'x' + a[3]);
  wrap('clear', (a) => String(a[0]));
  for (const n of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) wrap(n);
  wrap('texSubImage2D', (a) => a[4] + 'x' + a[5]);
  wrap('texImage2D', (a) => a[3] + 'x' + a[4]);
  wrap('bufferSubData', (a) => String(a[2]?.byteLength ?? a[2]));
  wrap('bufferData', (a) => String(a[1]?.byteLength ?? a[1]));
  wrap('generateMipmap');
  wrap('blitFramebuffer', (a) => a[2] + 'x' + a[3] + ' mask ' + a[8]);
  wrap('invalidateFramebuffer');
  wrap('readPixels');
  wrap('getBufferSubData');
  wrap('copyTexSubImage2D');
  wrap('useProgram');
  const request = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => request((t) => {
    if (window.glLog.on) log.push('--- frame');
    cb(t);
  });
})();`;

const server = await createServer({ root: '.', logLevel: 'error', server: { port: 4193, strictPort: false } });
await server.listen();
const base = server.resolvedUrls?.local[0] ?? '';
const browser = await chromium.launch({ channel: 'chrome', args: chromiumArgs('darwin') });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.addInitScript(LOG);
  await page.goto(`${base}#demo=${demo}`);
  await page.waitForSelector(SAMPLES_READY, { timeout: 120_000 });
  await page.click(FIRST_PLAY);
  await page.waitForTimeout(Number(process.argv[3] ?? 6000));
  await page.evaluate('window.glLog.on = true');
  await page.waitForTimeout(100);
  await page.evaluate('window.glLog.on = false');
  const log: string[] = await page.evaluate('window.glLog.log');
  // One whole frame: from the second frame mark to the third.
  const marks = log.flatMap((line, i) => (line === '--- frame' ? [i] : []));
  const frame = log.slice((marks[1] ?? 0) + 1, marks[2] ?? log.length);
  const out: string[] = [];
  let run = '';
  let count = 0;
  const flush = (): void => {
    if (count > 0) out.push(`${run} x${count}`);
    count = 0;
  };
  for (const line of frame) {
    const key = line.startsWith('draw') ? 'draw' : line.startsWith('useProgram') ? 'useProgram' : line;
    if (key === run && (key === 'draw' || key === 'useProgram' || key.startsWith('texSubImage2D') || key.startsWith('bufferSubData'))) {
      count += 1;
      continue;
    }
    flush();
    run = key;
    count = 1;
  }
  flush();
  console.log(out.filter((l) => !l.startsWith('useProgram')).join('\n'));
} finally {
  await browser.close();
  await server.close();
}
