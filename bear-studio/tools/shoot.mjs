// Renders images of the bear GLB in headless Chromium, with a Vite server in this process.
//
//   node tools/shoot.mjs compare [--glb /out/bear.glb] [--clip reference]
//       Renders the four sheet views beside the reference, prints the IoU of each view, and
//       writes out/compare/compare.png and out/compare/iou.json.
//   node tools/shoot.mjs frames [--glb /out/bear.glb] [--only <clip>]
//       Renders the motion frames into out/frames/*.png.
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
const glb = flags.glb ?? '/out/bear.glb';

/** The motion proof: key frames of each clip from the front, the side, and a 3/4 view. */
function motionShots() {
  const F = { az: 0, el: 6, d: 3.4 };
  const S = { az: 90, el: 6, d: 3.4 };
  const Q = { az: 35, el: 10, d: 3.4 };
  const L = { az: -40, el: 8, d: 3.4 };
  const beatTrail = { trail: [0, 4], ictus: [0, 1, 2, 3] };
  return {
    ready: [
      { clip: 'ready', t: 1, ...F, label: 'ready, front' },
      { clip: 'ready', t: 1, ...S, label: 'ready, side' },
      { clip: 'ready', t: 1, ...Q, label: 'ready, 3/4' },
      { clip: 'ready', t: 1, ...Q, bones: true, label: 'ready, bones' },
    ],
    beat_4_4: [
      { clip: 'beat_4_4', t: 0, ...F, ...beatTrail, label: 'beat 1 ictus (path of 1 bar)' },
      { clip: 'beat_4_4', t: 0.35, ...F, label: 'beat 1 rebound' },
      { clip: 'beat_4_4', t: 1, ...F, label: 'beat 2 ictus (in)' },
      { clip: 'beat_4_4', t: 2, ...F, label: 'beat 3 ictus (out)' },
      { clip: 'beat_4_4', t: 3, ...F, label: 'beat 4 ictus (up)' },
      { clip: 'beat_4_4', t: 3.6, ...F, label: 'preparation to 1' },
      { clip: 'beat_4_4', t: 0, ...S, ...beatTrail, label: 'beat 1, side' },
      { clip: 'beat_4_4', t: 2, ...S, label: 'beat 3, side' },
    ],
    cue_left: [
      { clip: 'cue_left', t: 1.2, ...F, label: 'cue: prepare' },
      { clip: 'cue_left', t: 2.0, ...F, label: 'cue: the left paw points' },
      { clip: 'cue_left', t: 2.0, ...L, label: 'cue, seen from the players' },
      { clip: 'cue_left', t: 2.0, ...S, label: 'cue, side' },
    ],
    crescendo: [
      { clip: 'crescendo', t: 0.2, ...F, label: 'crescendo: palm up, low' },
      { clip: 'crescendo', t: 2.0, ...F, label: 'crescendo: lift' },
      { clip: 'crescendo', t: 3.8, ...F, label: 'crescendo: high' },
      { clip: 'crescendo', t: 3.8, ...S, label: 'crescendo, side' },
    ],
    hush: [
      { clip: 'hush', t: 0.3, ...F, label: 'hush: palm down, high' },
      { clip: 'hush', t: 2.5, ...F, label: 'hush: press down' },
      { clip: 'hush', t: 3.8, ...S, label: 'hush, side' },
      { clip: 'hush', t: 3.8, ...Q, label: 'hush, 3/4' },
    ],
    cutoff: [
      { clip: 'cutoff', t: 0.4, ...F, label: 'cutoff: lift' },
      { clip: 'cutoff', t: 1.0, ...F, label: 'cutoff: loop' },
      { clip: 'cutoff', t: 1.5, ...F, label: 'cutoff: click' },
      { clip: 'cutoff', t: 2.6, ...S, label: 'cutoff: hold, side' },
    ],
    nod_turn: [
      { clip: 'nod_turn', t: 0.5, ...F, label: 'nod down' },
      { clip: 'nod_turn', t: 1.6, ...F, label: 'turn to the left section' },
      { clip: 'nod_turn', t: 3.1, ...F, label: 'turn to the right section' },
      { clip: 'nod_turn', t: 1.6, ...Q, label: 'turn, 3/4' },
    ],
    sway_dip: [
      { clip: 'sway_dip', t: 0, ...F, label: 'dip on beat 1' },
      { clip: 'sway_dip', t: 1, ...F, label: 'sway left' },
      { clip: 'sway_dip', t: 3, ...F, label: 'sway right' },
      { clip: 'sway_dip', t: 0, ...S, label: 'knee dip, side' },
    ],
    bow: [
      { clip: 'bow', t: 0.6, ...Q, label: 'bow: arms down' },
      { clip: 'bow', t: 2.0, ...S, label: 'bow: deepest, side' },
      { clip: 'bow', t: 2.0, ...F, label: 'bow: deepest, front' },
      { clip: 'bow', t: 3.6, ...Q, label: 'bow: rise' },
    ],
  };
}

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
    page.on('pageerror', (e) => console.error('page error:', e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') {
        console.error(`console ${m.type()}:`, m.text());
      }
    });
    if (cmd === 'compare') {
      const clip = flags.clip ?? 'reference';
      await page.goto(`${base}viewer/compare.html?glb=${glb}&clip=${clip}`);
      await page.waitForFunction(() => window.__compare, null, { timeout: 120000 });
      const res = await page.evaluate(() => window.__compare);
      const dir = path.join(ROOT, 'out', 'compare');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'compare.png'), Buffer.from(res.png.split(',')[1], 'base64'));
      fs.writeFileSync(path.join(dir, 'iou.json'), `${JSON.stringify({ clip: res.clip, posed: res.posed, views: res.results }, null, 2)}\n`);
      if (!res.posed) {
        console.log(`(no clip "${clip}": the rest pose was rendered)`);
      }
      for (const [name, r] of Object.entries(res.results)) {
        console.log(`${name.padEnd(14)} IoU ${r.iou.toFixed(4)}  x shift ${String(r.dx).padStart(3)} px  mean RGB ref ${r.refMeanRGB} model ${r.modelMeanRGB}`);
      }
      console.log(`wrote ${path.join(dir, 'compare.png')}`);
    } else if (cmd === 'frames') {
      await page.goto(`${base}viewer/frames.html?glb=${glb}`);
      await page.waitForFunction(() => window.__framesReady, null, { timeout: 120000 });
      const clips = await page.evaluate(() => window.__clips.map((c) => c.name));
      const dir = path.join(ROOT, 'out', 'frames');
      fs.mkdirSync(dir, { recursive: true });
      for (const [name, shots] of Object.entries(motionShots())) {
        if (flags.only && flags.only !== name) {
          continue;
        }
        if (!clips.includes(name)) {
          console.log(`skip ${name}: the GLB has no such clip`);
          continue;
        }
        const png = await page.evaluate(([s]) => window.renderSheet(s, { cols: 4, w: 340, h: 400 }), [shots]);
        const file = path.join(dir, `${name}.png`);
        fs.writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
        console.log(`wrote ${file}`);
      }
    } else if (cmd === 'shots') {
      // Custom shots: --json '[{"clip":"ready","t":1,"az":0}]' --name file
      await page.goto(`${base}viewer/frames.html?glb=${glb}`);
      await page.waitForFunction(() => window.__framesReady, null, { timeout: 120000 });
      const shots = JSON.parse(flags.json);
      const cols = Number(flags.cols ?? 4);
      const png = await page.evaluate(([s, c]) => window.renderSheet(s, { cols: c, w: Number(340), h: Number(400) }), [shots, cols]);
      const file = path.join(ROOT, 'out', 'frames', `${flags.name ?? 'shots'}.png`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
      console.log(`wrote ${file}`);
    } else {
      console.error('usage: node tools/shoot.mjs compare|frames|shots [--glb /out/bear.glb]');
      process.exitCode = 2;
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

await main();
