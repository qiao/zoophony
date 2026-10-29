// Reads the JSON of `pnpm load-probe --out <file>` and prints the timeline of each run of each site:
//
//   node docs/research/2026-10-29-network-load/timeline.ts <file.json>
//
// - the requests of the default demo: one request means that the fetch of the app took the
//   preload of `index.html`,
// - the idle link: from the end of the last response of the first download to the start of the
//   request of the audio chunk (`player-*.js`). The favicon does not count: Chrome asks for it
//   when the main thread is free, at a time that differs from run to run,
// - the preset files: their count, their bytes, the first start, and the last end,
// - the ready time of the run.
// The times are in ms from the request of the page.
import { readFileSync } from 'node:fs';

const DEMO = '/demos/boulanger-matin.mid';
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const site of data.sites) {
  for (const [i, run] of site.runs.entries()) {
    const rows = run.timeline;
    const demo = rows.filter((row) => row[0] === DEMO);
    const audio = rows.find((row) => /^\/assets\/player-.*\.js$/.test(row[0]));
    const before = rows.filter((row) => audio && row[1] < audio[1] && row[0] !== '/favicon.svg');
    const idleFrom = Math.max(...before.map((row) => row[2]));
    const presets = rows.filter((row) => row[0].endsWith('.sf3'));
    const bytes = presets.reduce((sum, row) => sum + row[3], 0);
    console.log(
      `${site.label} run ${i + 1}: demo requests ${demo.length} (${demo.map((row) => row[3]).join(', ')} B), ` +
        `idle link ${idleFrom} to ${audio?.[1]} ms (${(audio?.[1] ?? 0) - idleFrom} ms), ` +
        `${presets.length} presets ${bytes.toLocaleString('en-US')} B from ${Math.min(...presets.map((row) => row[1]))} ` +
        `to ${Math.max(...presets.map((row) => row[2]))} ms, ready ${Math.round(run.ready)} ms`,
    );
  }
}
