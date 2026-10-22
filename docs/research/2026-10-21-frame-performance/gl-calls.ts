/**
 * Prints the WebGL calls of one frame of a demo during play (the report
 * `2026-10-21-frame-performance.md`, a copy of the probe of `2026-10-13-frame-time/` with a count
 * of each kind of call). Run from the repository root after `pnpm frame` wrote its files once:
 * `node docs/research/2026-10-21-frame-performance/gl-calls.ts [<demo>] [<play ms>]`.
 *
 * The probe wraps the methods of `WebGL2RenderingContext` before the page code runs, plays the
 * demo, and logs the calls of 100 ms. It prints the calls of the second whole frame in order: each
 * framebuffer bind, viewport, clear, and upload, with runs of the same call as one line with a
 * count. Draws count as one kind of call. Then it prints the count of each kind of call in the
 * mean frame of the log.
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
  for (const n of Object.getOwnPropertyNames(proto)) {
    if (n.startsWith('uniform') && !n.startsWith('uniformBlock')) wrap(n);
  }
  for (const n of ['bindTexture', 'bindVertexArray', 'enable', 'disable', 'depthMask', 'colorMask', 'blendFunc', 'blendFuncSeparate', 'cullFace', 'depthFunc', 'activeTexture', 'texParameteri', 'drawBuffers', 'readBuffer', 'pixelStorei']) wrap(n);
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
  const keep = /^(bindFramebuffer|viewport|clear|draw|texSubImage2D|texImage2D|bufferSubData|bufferData|generateMipmap|blitFramebuffer|invalidateFramebuffer|readPixels|getBufferSubData|copyTexSubImage2D|useProgram)/;
  const frame = log.slice((marks[1] ?? 0) + 1, marks[2] ?? log.length).filter((line) => keep.test(line));
  // One line for each bind of a framebuffer: its size, and the count of each call until the next
  // bind.
  const out: string[] = [];
  let head = '(start)';
  let size = '';
  let counts = new Map<string, number>();
  const flush = (): void => {
    const parts = [...counts].map(([name, count]) => `${name} ${count}`);
    if (parts.length > 0) out.push(`${head} ${size}: ${parts.join(', ')}`);
    counts = new Map();
  };
  for (const line of frame) {
    if (line.startsWith('bindFramebuffer')) {
      flush();
      head = line;
      size = '';
      continue;
    }
    if (line.startsWith('viewport')) {
      size = line.split(' ')[1] ?? '';
      continue;
    }
    const name = line.startsWith('draw') ? 'draw' : (line.split(' ')[0] ?? line);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  flush();
  console.log(out.join('\n'));
  // The order of the framebuffers of each frame of the log, with the draws of each bind.
  console.log('\nFramebuffers of each frame (draws):');
  for (let m = 0; m + 1 < marks.length; m++) {
    const lines = log.slice((marks[m] ?? 0) + 1, marks[m + 1]);
    const parts: string[] = [];
    for (const line of lines) {
      if (line.startsWith('bindFramebuffer')) parts.push(`${line.split(' ')[2] ?? ''}:0`);
      else if (line.startsWith('draw') && parts.length > 0) {
        const [fb, n] = (parts.pop() ?? ':0').split(':');
        parts.push(`${fb}:${Number(n) + 1}`);
      }
    }
    console.log(parts.join(' '));
  }
  const whole = Math.max(1, marks.length - 1);
  const span = log.slice((marks[0] ?? 0) + 1, marks.at(-1) ?? log.length);
  const totals = new Map<string, number>();
  for (const line of span) {
    if (line === '--- frame') continue;
    const name = line.split(' ')[0] ?? line;
    totals.set(name, (totals.get(name) ?? 0) + 1);
  }
  console.log(`\nCalls in each frame, mean of ${whole} frames:`);
  for (const [name, count] of [...totals].toSorted((a, b) => b[1] - a[1])) {
    console.log(`${(count / whole).toFixed(1)}  ${name}`);
  }
} finally {
  await browser.close();
  await server.close();
}
