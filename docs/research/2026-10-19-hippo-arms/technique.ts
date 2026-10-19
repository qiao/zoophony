// Prints the technique of the contrabass notes within 0.5 s of some times of a demo.
// Usage: node docs/research/2026-10-19-hippo-arms/technique.ts <demo> <seconds>...
import { scoreOf } from '../../../src/score/test-score.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const [id, ...times] = process.argv.slice(2);
const demo = (await patchedDemos()).find((d) => d.file.startsWith(id ?? ''));
if (!demo) throw new Error('no demo');
const score = scoreOf(demo.bytes);
const bassSeats = new Set(score.seats.flatMap((s, i) => (s.section === 'contrabass' ? [i] : [])));
const notes = score.notes.filter((n) => bassSeats.has(n.seatIndex));
const counts = new Map<string, number>();
for (const n of notes) counts.set(n.technique, (counts.get(n.technique) ?? 0) + 1);
console.log(demo.file, 'bass notes by technique', Object.fromEntries(counts));
for (const t of times.map(Number)) {
  const near = notes.filter((n) => n.startSec <= t + 0.5 && n.endSec >= t - 0.5);
  console.log(t, [...new Set(near.map((n) => n.technique))].join(','));
}
