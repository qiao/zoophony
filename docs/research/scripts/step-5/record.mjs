// Records each review demo as JPEG frames, with the screencast of Chrome DevTools.
// Run `pnpm build` first.
// Usage: node docs/research/scripts/step-5/record.mjs <output folder> [demo ids] [seconds]
// The demo ids are a list with commas. By default, the script records 10 s of play of
// beethoven-5 and boulanger-matin. The page plays from 0.5 s after the start of the recording.
// The script stops the server and the browser at the end.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium } from '@playwright/test';
import { preview } from 'vite';

const root = join(import.meta.dirname, '..', '..', '..', '..');
const out = process.argv[2];
const ids = process.argv[3]?.split(',') ?? ['beethoven-5', 'boulanger-matin'];
const playMs = Number(process.argv[4] ?? 10) * 1000;
const server = await preview({ root, preview: { port: 4182, strictPort: false, open: false } });
const base = server.resolvedUrls?.local[0] ?? 'http://localhost:4182/';
// The GPU flags of tools/screenshots.ts give the GPU of the Mac to headless Chromium.
const browser = await chromium.launch({
  args: [
    '--use-angle=metal',
    '--enable-gpu',
    '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
try {
  for (const id of ids) {
    const dir = join(out, id);
    await mkdir(dir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}?demo=${id}`);
    await page.waitForSelector('#play:enabled', { timeout: 120_000 });
    await page.addStyleTag({ content: '#play { visibility: hidden; }' });
    const cdp = await page.context().newCDPSession(page);
    const frames = [];
    cdp.on('Page.screencastFrame', (frame) => {
      frames.push({ t: frame.metadata.timestamp, data: frame.data });
      cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 92,
      maxWidth: 1440,
      maxHeight: 900,
      everyNthFrame: 1,
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector('#play')?.click());
    await page.waitForTimeout(playMs);
    await cdp.send('Page.stopScreencast');
    const list = [];
    for (const [i, frame] of frames.entries()) {
      const file = `${String(i).padStart(4, '0')}.jpg`;
      await writeFile(join(dir, file), Buffer.from(frame.data, 'base64'));
      list.push({ file, t: frame.t });
    }
    await writeFile(join(dir, 'frames.json'), JSON.stringify({ frames: list }));
    console.log(`${id}: ${frames.length} frames`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
