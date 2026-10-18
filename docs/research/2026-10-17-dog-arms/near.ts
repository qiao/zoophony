// Lists the cello strokes of the first player of each cello seat of a demo within 2 s of a time:
// node docs/research/2026-10-17-dog-arms/near.ts <demo> <time>
import { buildStrokes, vibratoRate } from '../../../src/pose/strokes.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
const [want, t0] = [process.argv[2] ?? '', Number(process.argv[3])];
for (const demo of await patchedDemos()) {
  if (!demo.file.startsWith(want)) continue;
  const score = scoreOf(demo.bytes);
  for (const [seatIndex, seat] of score.seats.entries()) {
    if (seat.section !== 'cello') continue;
    const notes = score.notes.filter((n) => n.seatIndex === seatIndex && n.player === 0);
    const strokes = buildStrokes(notes, [], [0.03, 0.5], 1, 'cello', vibratoRate('cello', 0.5), new Float64Array());
    for (const s of strokes) if (Math.abs(s.start - t0) < 2) console.log(`${s.start.toFixed(2)}-${s.end.toFixed(2)} ${s.technique} string ${s.string}`);
  }
}
