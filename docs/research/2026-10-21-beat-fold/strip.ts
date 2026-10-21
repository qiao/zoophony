// Renders a strip of frames of a MIDI file at frozen song times, in the default view and a close view.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { chromiumArgs } from '../tools/chromium-args.ts';
const [site, midi, out, fromArg, countArg, stepArg] = process.argv.slice(2);
const from = Number(fromArg), count = Number(countArg ?? 40), step = Number(stepArg ?? 0.05);
mkdirSync(out!, { recursive: true });
const browser = await chromium.launch({ args: chromiumArgs(process.platform) });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.goto(site!);
await page.waitForTimeout(2000);
await page.setInputFiles('input[type=file]', midi!);
await page.waitForTimeout(4000);
await page.evaluate((t) => { (window as any).frozenSong = t; }, from);
const close = page.locator('.close-drawer');
if (await close.count()) { await close.first().click().catch(() => {}); }
await page.getByRole('button', { name: 'Reset view' }).click();
await page.mouse.move(720, 450);
await page.waitForTimeout(3500);
for (const view of ['default', 'close']) {
  if (view === 'close') {
    await page.mouse.move(720, 520);
    for (let i = 0; i < 16; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(40); }
    await page.mouse.move(720, 450);
    await page.waitForTimeout(3500);
  }
  for (let i = 0; i < count; i++) {
    const t = from + i * step;
    await page.evaluate((v) => { (window as any).frozenSong = v; }, t);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: `${out}/${view}-${String(i).padStart(2, '0')}.png` });
  }
}
await browser.close();
