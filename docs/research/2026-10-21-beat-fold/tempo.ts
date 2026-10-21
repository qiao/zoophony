import { readFileSync } from 'node:fs';
import { buildTimeline } from '../src/score/timeline.ts';
const r = buildTimeline(new Uint8Array(readFileSync(process.argv[2]!)));
if (!r.ok) throw new Error('bad');
const t = r.timeline;
for (let tick = 0; tick < 200000; tick += 192 * 4) {
  const sec = t.tempoMap.toSeconds(tick);
  if (sec > t.durationSec) break;
  const bpm = 60_000_000 / t.tempoMap.tempoAt(tick);
  if (tick > 108000) console.log(tick, (tick/768+1).toFixed(0), sec.toFixed(2), bpm.toFixed(2));
}
console.log('dur', t.durationSec);
