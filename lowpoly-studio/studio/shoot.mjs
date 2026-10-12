// Renders images of the GLB of an animal in headless Chromium, with a Vite server in this
// process. <out> is the output folder of the animal (it holds viewer.json, which the CLI writes).
//
//   node studio/shoot.mjs compare --out <out> [--glb <url>] [--compare-glb <url>] [--clip reference]
//       Renders the sheet views beside the sheet, prints the IoU of each view, and writes
//       <out>/compare/compare.png, the renders, the crops, and <out>/compare/iou.json.
//       --compare-glb renders another GLB in this command only (the CLI gives the GLB of the
//       model build, so the look checks do not depend on the role).
//   node studio/shoot.mjs frames --out <out> [--only <name>]
//       Renders the review frames of the role (role.toml [review] shots) into <out>/frames/.
//   node studio/shoot.mjs viewer --out <out> [--wait 6000]
//       Opens the viewer page, lets it play, and writes <out>/frames/viewer.png.
//   node studio/shoot.mjs shots --out <out> --json '[{"clip":"ready","t":1,"az":0}]' [--name f]
//       Renders custom shots into <out>/frames/<name>.png.
//   node studio/shoot.mjs compare,frames,viewer --out <out>
//       Runs several commands with one server and one browser (a new page for each command).
//
// Each command stops at the first page error, failed request, or HTTP error (status 400 or
// more), with a message that names it, and exits 1. A wait for a page stops after --timeout ms
// (default 60000). The server and the browser stop at the end, also after an error. Each part
// prints its time.

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const ROOT = path.resolve(import.meta.dirname, '..');
const COMMANDS = ['compare', 'frames', 'viewer', 'shots'];
const USAGE = `usage: node studio/shoot.mjs ${COMMANDS.join('|')}[,...] --out <output folder>`;
const [cmdList = '', ...rest] = process.argv.slice(2);
const flags = {};
for (let i = 0; i < rest.length; i += 2) {
  flags[rest[i].replace(/^--/, '')] = rest[i + 1];
}
const commands = cmdList.split(',').filter(Boolean);
if (!flags.out || commands.length === 0 || commands.some((c) => !COMMANDS.includes(c))) {
  console.error(USAGE);
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
const TIMEOUT = Number(flags.timeout ?? 60000);

// The requests that a page may fail with no harm.
const IGNORED = [/\/favicon\.ico$/];

/** The time since the last lap, for the time of each part. */
let last = performance.now();
function lap(label) {
  const now = performance.now();
  console.log(`[shots] ${label}: ${((now - last) / 1000).toFixed(1)} s`);
  last = now;
}

/**
 * Opens a page that fails at once: a page error, a failed request, or an HTTP error rejects
 * the promise `failed`. Each wait of a command races this promise, so no wait hangs on a page
 * that cannot load (for example a missing GLB).
 */
async function failFastPage(browser, viewport) {
  const page = await browser.newPage({ viewport });
  let reject;
  const failed = new Promise((_, r) => {
    reject = r;
  });
  failed.catch(() => {});
  const stop = (message) => reject(new Error(message));
  page.on('pageerror', (e) => stop(`page error: ${e.message}`));
  page.on('requestfailed', (req) => {
    if (!IGNORED.some((re) => re.test(req.url()))) {
      stop(`failed request: ${req.method()} ${req.url()} (${req.failure()?.errorText ?? 'no reason'})`);
    }
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && !IGNORED.some((re) => re.test(res.url()))) {
      stop(`HTTP ${res.status()} ${res.statusText()}: ${res.request().method()} ${res.url()}`);
    }
  });
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      console.error(`console ${m.type()}:`, m.text());
    }
  });
  const race = (promise) => Promise.race([promise, failed]);
  const ready = (fn) => race(page.waitForFunction(fn, null, { timeout: TIMEOUT }));
  return { page, race, ready };
}

/** Renders the sheet views beside the sheet and writes the compare images and the IoU. */
async function compare({ page, race, ready }, base) {
  const clip = flags.clip ?? 'reference';
  const compareQuery = flags['compare-glb'] ? query.replace(`glb=${glb}`, `glb=${flags['compare-glb']}`) : query;
  await race(page.goto(`${base}viewer/compare.html?${compareQuery}&clip=${clip}`));
  await ready(() => window.__compare);
  const res = await race(page.evaluate(() => window.__compare));
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
    if (r.headTurn !== undefined) {
      console.log(`${''.padEnd(14)} head turn ${r.headTurn} deg (IoU ${r.iouNoTurn.toFixed(4)} with no turn)`);
    }
    const f = (c) => `H ${c.hue} S ${c.sat} V ${c.val} (lit quarter H ${c.litHue} S ${c.litSat})`;
    console.log(`${''.padEnd(14)} fur median ref ${f(r.refFurHSV)}  model ${f(r.modelFurHSV)}`);
  }
  console.log(`wrote ${path.join(dir, 'compare.png')}`);
}

/** Renders the review frames of the role. */
async function frames({ page, race, ready }, base) {
  await race(page.goto(`${base}viewer/frames.html?${query}`));
  await ready(() => window.__framesReady);
  const clips = await race(page.evaluate(() => window.__clips.map((c) => c.name)));
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
    const png = await race(page.evaluate(([s]) => window.renderSheet(s, { cols: 4, w: 340, h: 400 }), [shots]));
    if (shots.length % 4 !== 0) {
      console.log(`note: ${name} has ${shots.length} shots, the grid has empty cells`);
    }
    const file = path.join(dir, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
    console.log(`wrote ${file}`);
  }
}

/** Writes a screenshot of the viewer page while it plays the performance. */
async function viewer({ page, race }, base) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await race(page.goto(`${base}viewer/index.html?${query}`));
  await race(page.waitForSelector('#clips button', { timeout: TIMEOUT }));
  await race(page.waitForTimeout(Number(flags.wait ?? 6000)));
  const file = path.join(OUT, 'frames', 'viewer.png');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file });
  console.log(`wrote ${file}`);
}

/** Renders custom shots: --json '[{"clip":"ready","t":1,"az":0}]' --name file. */
async function shots({ page, race, ready }, base) {
  await race(page.goto(`${base}viewer/frames.html?${query}`));
  await ready(() => window.__framesReady);
  const list = JSON.parse(flags.json);
  const cols = Number(flags.cols ?? 4);
  const png = await race(page.evaluate(([s, c]) => window.renderSheet(s, { cols: c, w: Number(340), h: Number(400) }), [list, cols]));
  const file = path.join(OUT, 'frames', `${flags.name ?? 'shots'}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`wrote ${file}`);
}

const RUN = { compare, frames, viewer, shots };

/** Starts the server and the browser, runs each command on a new page, and stops both. */
async function main() {
  const server = await createServer({
    configFile: path.join(ROOT, 'vite.config.js'),
    root: ROOT,
    logLevel: 'error',
    server: { port: 0 },
  });
  let browser;
  try {
    await server.listen();
    const base = server.resolvedUrls.local[0];
    lap('vite server');
    browser = await chromium.launch({
      args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
    });
    lap('browser');
    for (const cmd of commands) {
      const fp = await failFastPage(browser, { width: 1200, height: 900 });
      try {
        await RUN[cmd](fp, base);
      } catch (e) {
        throw new Error(`${cmd}: ${e.message.split('\n')[0]}`);
      } finally {
        await fp.page.close();
      }
      lap(cmd);
    }
  } finally {
    await browser?.close();
    await server.close();
  }
}

try {
  await main();
} catch (e) {
  console.error(`shoot.mjs stopped at the first failure: ${e.message}`);
  process.exitCode = 1;
}
