/**
 * Renders zoomed views of the gallery rabbit in the rest from a running site, such as
 * `pnpm exec vite preview --port <port>` after `pnpm build`. Each view is
 * `<name>:<azimuth>:<elevation>:<zoom>`, and the tool writes `<dir>/<name>.png` at 600 x 750 CSS
 * pixels and the device scale 2.
 *
 * Usage: node docs/research/2026-10-16-rabbit-arm/zoom-shot.ts <url> <dir> <view>...
 */
import { chromium } from '@playwright/test';
import { chromiumArgs } from '../../../tools/chromium-args.ts';
const [base, out, ...specs] = process.argv.slice(2);
const browser = await chromium.launch({ args: chromiumArgs(process.platform) });
try {
  for (const spec of specs) {
    const [name, azimuth, elevation, zoom] = spec.split(':');
    const q = new URLSearchParams({ page: 'species', only: 'rabbit', zoom: zoom!, azimuth: azimuth!, elevation: elevation!, body: '', rest: '' });
    const page = await browser.newPage({ viewport: { width: 600, height: 750 }, deviceScaleFactor: 2 });
    await page.goto(`${base}/gallery.html?${q}`);
    await page.waitForSelector('canvas[data-ready="species"]', { timeout: 60000 });
    await page.addStyleTag({ content: '#controls, #labels { display: none; }' });
    await page.evaluate(() => { const s = document.querySelector('#time'); if (s instanceof HTMLInputElement) { s.value = '0'; s.dispatchEvent(new Event('input')); } });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${name}.png` });
    await page.close();
  }
} finally {
  await browser.close();
}
