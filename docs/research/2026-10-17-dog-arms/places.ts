// The places of the left hand of the cello strokes of the demos (first player of each cello seat).
import { buildStrokes, vibratoRate } from '../src/pose/strokes.ts';
import { scoreOf } from '../src/score/test-score.ts';
import { patchedDemos } from '../tools/patch-demos.ts';
const bins = [0, 0.12, 0.15, 0.22, 0.28, 0.4, 0.6, 0.92, 0.98, 1.0001];
const counts = new Array(bins.length - 1).fill(0);
let open = 0; let total = 0; let demos = 0; let seats = 0;
for (const demo of await patchedDemos()) {
  const score = scoreOf(demo.bytes);
  let has = false;
  for (const [seatIndex, seat] of score.seats.entries()) {
    if (seat.section !== 'cello') continue;
    const notes = score.notes.filter((n) => n.seatIndex === seatIndex && n.player === 0);
    if (notes.length === 0) continue;
    has = true; seats += 1;
    for (const s of buildStrokes(notes, [], [0.03, 0.5], 1, 'cello', vibratoRate('cello', 0.5), new Float64Array())) {
      total += 1;
      if (s.hand.open) { open += 1; continue; }
      const k = bins.findIndex((b, i) => s.hand.place >= b && s.hand.place < (bins[i + 1] ?? 2));
      counts[k] += 1;
    }
  }
  if (has) demos += 1;
}
console.log(`${demos} demos, ${seats} cello seats, ${total} strokes, ${open} open (${(100 * open / total).toFixed(1)}%)`);
for (let i = 0; i < counts.length; i++) console.log(`place ${bins[i]} to ${bins[i + 1]}: ${counts[i]} (${(100 * counts[i] / total).toFixed(1)}%)`);
