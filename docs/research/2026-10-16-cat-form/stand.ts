/**
 * Renders the standing cat in the rest pose from the front and from its right side for each tree
 * of the arguments (each with a built dist/), into scratch/img/stand/<tree>-<view>.png.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { openShot, startSite } from '../../../tools/screenshots.ts';

const W = '/Users/xueqiaoxu/proj/zoophony/.claude/worktrees/cat-form';
await mkdir(`${W}/scratch/img/stand`, { recursive: true });
let port = 4460;
for (const tree of process.argv.slice(2)) {
  const root = tree === 'main' ? W : `${W}/scratch/trees/${tree}`;
  const site = await startSite(root, port++);
  try {
    for (const [view, azimuth] of [
      ['front', 0],
      ['side', 90],
    ] as const) {
      const path = `/gallery.html?page=species&only=cat&azimuth=${azimuth}&elevation=2&target=0.92&distance=3.9&rest&stand`;
      const page = await openShot(site.browser, new URL(path.slice(1), site.base).href, {
        file: '',
        path,
        width: 420,
        height: 600,
        ready: 'canvas[data-ready="species"]',
      });
      await page.addStyleTag({ content: '#controls, #labels { display: none; }' });
      await page.waitForTimeout(300);
      await writeFile(`${W}/scratch/img/stand/${tree}-${view}.png`, await page.screenshot({ type: 'png' }));
      await page.close();
    }
  } finally {
    await site.close();
  }
  console.log(tree);
}
