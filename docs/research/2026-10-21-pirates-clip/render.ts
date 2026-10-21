// Renders frames of a MIDI file on the dev server:
// node docs/research/2026-10-21-pirates-clip/render.ts <out dir> <time,...> <aims JSON file or ''> [--default]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { chromiumArgs } from '../../../tools/chromium-args.ts';

const [out = 'scratch/out', timesText = '30', aimFile = '', withDefault = ''] = process.argv.slice(2);
const site = process.env['SITE'] ?? 'http://localhost:5291/';
const midi = process.env['MIDI'] ?? `${process.env['HOME']}/Downloads/Disney_Themes_-_Pirates_Of_The_Caribbean.mid`;
const times = timesText.split(',').map(Number);
const aims: { name: string; pose: unknown }[] = aimFile ? JSON.parse(await readFile(aimFile, 'utf8')) : [];
const views = [...(withDefault || !aimFile ? [{ name: 'default', pose: null }] : []), ...aims];
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: chromiumArgs(process.platform) });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.goto(site);
await page.waitForSelector('body[data-samples="ready"]', { timeout: 60000 });
await page.setInputFiles('input[type=file]', midi);
await page.waitForTimeout(1500);
await page.waitForSelector('body[data-samples="ready"]', { timeout: 60000 });
const play = await page.$('.first-screen .play');
if (play && (await play.isVisible())) await play.click();
await page.waitForTimeout(1000);
const close = await page.$('.close-drawer');
if (close && (await close.isVisible())) await close.click();
await page.getByRole('button', { name: 'Reset view' }).click().catch(() => {});
for (const v of views) {
  await page.evaluate(async (pose) => {
    const m = await import('/src/scene/camera.ts');
    const proto = m.StageCamera.prototype as unknown as Record<string, unknown> & { __f?: unknown; __u?: unknown };
    if (!proto.__f) { proto.__f = proto['follow']; proto.__u = proto['update']; }
    const f = proto.__f as (p: unknown) => void;
    if (pose) {
      proto['follow'] = function (this: unknown) { f.call(this, pose); };
      proto['update'] = function (this: unknown) { f.call(this, pose); };
    } else { proto['follow'] = proto.__f; proto['update'] = proto.__u; }
  }, v.pose);
  for (const t of times) {
    const whole = Math.floor(t);
    await page.$eval('.seek', (el, s) => {
      if (el instanceof HTMLInputElement) { el.value = String(s); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
    }, Math.max(0, whole - 2));
    await page.mouse.move(700, 300);
    await page.waitForFunction((s) => { const e = document.querySelector('.seek'); return e instanceof HTMLInputElement && Number(e.value) >= s; }, whole, { polling: 20, timeout: 60000 });
    await page.waitForTimeout((t - whole) * 1000);
    const png = await page.screenshot({ type: 'png' });
    const song = await page.evaluate(() => window.zoophony?.songTime ?? -1);
    await writeFile(join(out, `${v.name}-${t}.png`), png);
    console.log('wrote', v.name, t, song.toFixed(2));
  }
}
await browser.close();
