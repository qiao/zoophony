// Summarizes reports.jsonl, which serve.mjs writes for the pages opened with ?report=1.
// Use it for a browser that no driver controls (Safari). Each page load is one session.
//
// Usage: node summarize-report.mjs [reports.jsonl]

import { readFileSync, writeFileSync } from 'node:fs';
import { summarizeFullPlay } from './checks.mjs';

const file = process.argv[2] ?? new URL('reports.jsonl', import.meta.url);
const lines = readFileSync(file, 'utf8')
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line));

// A new page load starts performance.now() again at 0.
const sessions = [];
for (const line of lines) {
  const session = sessions.at(-1);
  if (!session || line.performanceNow < session.at(-1).performanceNow) {
    sessions.push([line]);
  } else {
    session.push(line);
  }
}

const results = sessions.map((samples) => {
  const ready = samples.find((s) => s.state === 'ready' || s.state === 'playing');
  const playStart = samples.findIndex((s) => s.state === 'playing');
  const result = {
    userAgent: samples[0].userAgent,
    loadMs: ready?.loadMs ?? null,
    // The state before the click: at "ready", or during the load if the click came fast.
    contextStateAtReady:
      (samples.find((s) => s.state === 'ready') ?? samples.find((s) => s.state !== 'playing'))
        ?.contextState ?? null,
    firstSoundMs: samples.findLast((s) => s.firstSoundMs !== null)?.firstSoundMs ?? null,
    firstSoundLatencyMs:
      samples.findLast((s) => s.firstSoundLatencyMs !== null)?.firstSoundLatencyMs ?? null,
  };
  if (playStart < 0) {
    return result;
  }
  const played = samples.slice(playStart).map((s) => ({
    ...s,
    wallSec: (s.performanceNow - samples[playStart].performanceNow) / 1000,
  }));
  const events = [{ event: 'ready', contextState: result.contextStateAtReady }];
  const hide = played.findIndex((s) => s.visibility === 'hidden');
  const show = hide < 0 ? -1 : played.findIndex((s, i) => i > hide && s.visibility === 'visible');
  if (hide > 0 && show > 0) {
    events.push({ event: 'hide', sample: hide - 1 }, { event: 'show', sample: show });
  }
  return { ...result, fullPlay: summarizeFullPlay({ samples: played, events }) };
});

writeFileSync(
  new URL('results/report-summary.json', import.meta.url),
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
