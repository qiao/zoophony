// The time of the bake of each layout (docs/research/2026-10-18-cinematic-light.md, section 2.4).
// Apply bake-time.patch, run pnpm build, then run from the root:
// node docs/research/2026-10-18-cinematic-light/bake_time.ts
// It opens the default demo, selects each demo of the list, and prints the console warnings.
import { startSite } from '../../../tools/screenshots.ts';
const site = await startSite(process.cwd(), 4391);
try {
  const page = await site.browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text().slice(0, 300)); });
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto(site.base + '#demo=boulanger-matin');
  await page.waitForTimeout(5000);
  const demos = page.locator('button.demo');
  const count = await demos.count();
  console.log('demo buttons', count);
  for (let i = 0; i < count; i++) {
    await demos.nth(i).click({ force: true });
    await page.waitForTimeout(2500);
  }
} finally {
  await site.close();
}
