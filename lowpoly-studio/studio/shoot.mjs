// Renders images of the GLB of an animal in headless Chromium, with a Vite server in this
// process. <out> is the output folder of the animal (it holds viewer.json, which the CLI writes).
//
//   node studio/shoot.mjs compare --out <out> [--glb <url>] [--clip reference]
//       Renders the sheet views beside the sheet, prints the IoU of each view, and writes
//       <out>/compare/compare.png, the renders, the crops, and <out>/compare/iou.json.
//   node studio/shoot.mjs frames --out <out> [--only <name>]
//       Renders the review frames of the role (role.toml [review] shots) into <out>/frames/.
//   node studio/shoot.mjs viewer --out <out> [--wait 6000]
//       Opens the viewer page, lets it play, and writes <out>/frames/viewer.png.
//   node studio/shoot.mjs shots --out <out> --json '[{"clip":"ready","t":1,"az":0}]' [--name f]
//       Renders custom shots into <out>/frames/<name>.png.
//
// The server and the browser stop at the end, also after an error.

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const ROOT = path.resolve(import.meta.dirname, '..');
const [cmd, ...rest] = process.argv.slice(2);
const flags = {};
for (let i = 0; i < rest.length; i += 2) {
  flags[rest[i].replace(/^--/, '')] = rest[i + 1];
}
if (!flags.out) {
  console.error('usage: node studio/shoot.mjs compare|frames|viewer|shots --out <output folder>');
  process.exit(2);
}
const OUT = path.resolve(flags.out);
const settingsFile = path.join(OUT, 'viewer.json');
if (!fs.existsSync(settingsFile)) {
  console.error(`${settingsFile} does not exist: run the CLI (python3 studio build or compare)`);
  process.exit(2);
}
const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
const configUrl = `/${path.relative(ROOT, settingsFile).split(path.sep).join('/')}`;
const glb = flags.glb ?? settings.glb;
const light = (flags.light ? `&light=${flags.light}` : '') + (flags.keydir ? `&keydir=${flags.keydir}` : '');
const query = `config=${configUrl}&glb=${glb}${light}`;

/** The motion proof: key frames of each clip from the front, the side, and a 3/4 view. */
async function main() {
  const server = await createServer({
    configFile: path.join(ROOT, 'vite.config.js'),
    root: ROOT,
    logLevel: 'error',
    server: { port: 0 },
  });
  await server.listen();
  const base = server.resolvedUrls.local[0];
  const browser = await chromium.launch({
    args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    // A page error stops the wait at once: each wait races this promise.
    let failPage;
    const pageFailed = new Promise((_, reject) => {
      failPage = reject;
    });
    pageFailed.catch(() => {});
    page.on('pageerror', (e) => {
      console.error('page error:', e.message);
      process.exitCode = 1;
      failPage(e);
    });
    const ready = (fn) => Promise.race([page.waitForFunction(fn, null, { timeout: 120000 }), pageFailed]);
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') {
        console.error(`console ${m.type()}:`, m.text());
      }
    });
    if (cmd === 'compare') {
      const clip = flags.clip ?? 'reference';
      await page.goto(`${base}viewer/compare.html?${query}&clip=${clip}`);
      await ready(() => window.__compare);
      const res = await page.evaluate(() => window.__compare);
      const dir = path.join(OUT, 'compare');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'compare.png'), Buffer.from(res.png.split(',')[1], 'base64'));
      for (const [name, url] of Object.entries(res.renders)) {
        fs.writeFileSync(path.join(dir, `render_${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
      }
      for (const [name, url] of Object.entries(res.faces)) {
        const file = name.startsWith('facets_') ? `${name}.png` : `face_${name}.png`;
        fs.writeFileSync(path.join(dir, file), Buffer.from(url.split(',')[1], 'base64'));
      }
      fs.writeFileSync(path.join(dir, 'iou.json'), `${JSON.stringify({ clip: res.clip, posed: res.posed, views: res.results }, null, 2)}\n`);
      if (!res.posed) {
        console.log(`(no clip "${clip}": the rest pose was rendered)`);
      }
      for (const [name, r] of Object.entries(res.results)) {
        console.log(`${name.padEnd(14)} IoU ${r.iou.toFixed(4)}  x shift ${String(r.dx).padStart(3)} px  mean RGB ref ${r.refMeanRGB} model ${r.modelMeanRGB}  luma p10/50/90 ref ${r.refLuma10_50_90} model ${r.modelLuma10_50_90}`);
        const f = (c) => `H ${c.hue} S ${c.sat} V ${c.val} (lit quarter H ${c.litHue} S ${c.litSat})`;
        console.log(`${''.padEnd(14)} fur median ref ${f(r.refFurHSV)}  model ${f(r.modelFurHSV)}`);
      }
      console.log(`wrote ${path.join(dir, 'compare.png')}`);
    } else if (cmd === 'frames') {
      await page.goto(`${base}viewer/frames.html?${query}`);
      await ready(() => window.__framesReady);
      const clips = await page.evaluate(() => window.__clips.map((c) => c.name));
      const dir = path.join(OUT, 'frames');
      fs.mkdirSync(dir, { recursive: true });
      for (const [name, shots] of Object.entries(settings.shots)) {
        if (flags.only && flags.only !== name) {
          continue;
        }
        const clipOf = shots[0].clip;
        if (!clips.includes(clipOf)) {
          console.log(`skip ${name}: the GLB has no such clip`);
          continue;
        }
        const png = await page.evaluate(([s]) => window.renderSheet(s, { cols: 4, w: 340, h: 400 }), [shots]);
        if (shots.length % 4 !== 0) {
          console.log(`note: ${name} has ${shots.length} shots, the grid has empty cells`);
        }
        const file = path.join(dir, `${name}.png`);
        fs.writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
        console.log(`wrote ${file}`);
      }
    } else if (cmd === 'viewer') {
      // A screenshot of the viewer page while it plays the performance.
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${base}viewer/index.html?${query}`);
      await page.waitForSelector('#clips button');
      await page.waitForTimeout(Number(flags.wait ?? 6000));
      const file = path.join(OUT, 'frames', 'viewer.png');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      await page.screenshot({ path: file });
      console.log(`wrote ${file}`);
    } else if (cmd === 'shots') {
      // Custom shots: --json '[{"clip":"ready","t":1,"az":0}]' --name file
      await page.goto(`${base}viewer/frames.html?${query}`);
      await ready(() => window.__framesReady);
      const shots = JSON.parse(flags.json);
      const cols = Number(flags.cols ?? 4);
      const png = await page.evaluate(([s, c]) => window.renderSheet(s, { cols: c, w: Number(340), h: Number(400) }), [shots, cols]);
      const file = path.join(OUT, 'frames', `${flags.name ?? 'shots'}.png`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
      console.log(`wrote ${file}`);
    } else {
      console.error('usage: node studio/shoot.mjs compare|frames|viewer|shots --out <output folder>');
      process.exitCode = 2;
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

await main();
