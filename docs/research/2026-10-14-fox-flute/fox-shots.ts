// Renders the red fox and the tan fox of the gallery from the front and the right side, at a
// note and in the rest pose, into scratch/shots, from the built site of `pnpm build`.
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { chromiumArgs } from '../../../tools/chromium-args.ts';

const server = await preview({ root: process.cwd(), preview: { port: 4310, strictPort: false, open: false } });
const base = server.resolvedUrls?.local[0] ?? '';
const browser = await chromium.launch({ args: chromiumArgs(process.platform) });
try {
  for (const species of ['fox-red', 'fox-tan']) {
    for (const [view, azimuth] of [['front', 0], ['right', 90], ['left', -90]] as const) {
      for (const rest of [false, true]) {
        const q = new URLSearchParams({ page: 'species', only: species, zoom: '1', azimuth: String(azimuth), elevation: '20' });
        q.set('body', '');
        if (rest) q.set('rest', '');
        const page = await browser.newPage({ viewport: { width: 360, height: 450 } });
        await page.goto(`${base}gallery.html?${q.toString()}`);
        await page.waitForSelector('canvas[data-ready="species"]', { timeout: 60000 });
        await page.addStyleTag({ content: '#controls, #labels { display: none; }' });
        await page.evaluate(() => {
          const slider = document.querySelector('#time');
          if (slider instanceof HTMLInputElement) { slider.value = '0.55'; slider.dispatchEvent(new Event('input')); }
        });
        await page.waitForTimeout(300);
        await writeFile(`docs/research/2026-10-14-fox-flute/shots/${species}-${rest ? 'rest' : 'play'}-${view}.png`, await page.screenshot({ type: 'png' }));
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  await server.close();
}
