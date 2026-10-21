import { readFileSync } from 'node:fs';
import { buildTimeline } from '../src/score/timeline.ts';
const [path, trackArg, fromArg, countArg] = process.argv.slice(2);
const r = buildTimeline(new Uint8Array(readFileSync(path!)));
if (!r.ok) throw new Error('bad');
const t = r.timeline;
const names = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const ns = t.notes.filter((n) => n.track === Number(trackArg)).filter((n) => n.startSec >= Number(fromArg ?? 0)).slice(0, Number(countArg ?? 40));
for (const n of ns) {
  const tick = t.tempoMap.toTicks ? (t.tempoMap as any).toTicks(n.startSec) : NaN;
  const q = n.startSec * 241 / 60;
  console.log(n.startSec.toFixed(2).padStart(7), 'q', q.toFixed(2).padStart(7), 'bar', (Math.floor(q / 4) + 1).toString().padStart(3), 'beat', (q % 4 + 1).toFixed(2), names[n.pitch % 12] + Math.floor(n.pitch / 12 - 1), 'len', ((n.endSec - n.startSec) * 241 / 60).toFixed(2));
}
