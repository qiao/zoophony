/**
 * Prints the strokes of the violas of a demo in a time range with their plan of the left hand, and
 * the place of the hand on `main` (`fingerboardPlace()` of the note on the highest open string at or
 * below it), for the research of 2026-10-17, round `left-hand`.
 *
 * Usage: `node docs/research/2026-10-17-left-hand/tail-strokes.ts <demo> <from s> <to s>`
 */
import { buildStrokes } from '../../../src/pose/strokes.ts';
import { fingerboardPlace, TUNINGS } from '../../../src/pose/fingering.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
const [demoId, from, to] = process.argv.slice(2);
const demo = (await patchedDemos()).find((d) => d.file === `${demoId}.mid`)!;
const score = scoreOf(demo.bytes);
for (const [seatIndex, seat] of score.seats.entries()) {
  if (seat.section !== 'viola') continue;
  const players = [...new Set(score.notes.filter((n) => n.seatIndex === seatIndex).map((n) => n.player))];
  for (const player of players) {
    const notes = score.notes.filter((n) => n.seatIndex === seatIndex && n.player === player);
    const strokes = buildStrokes(notes, [], [0.03, 0.6], 1, 'viola', 5.5);
    console.log('seat', seatIndex, 'player', player);
    for (const s of strokes) {
      if (s.start < Number(from) || s.start > Number(to)) continue;
      const ns = notes.filter((n) => Math.abs(n.startSec - s.start) < 0.06).map((n) => n.pitch);
      const top = Math.max(...ns);
      let st = 0; for (let k = 1; k < 4; k++) if (TUNINGS.viola[k]! <= top) st = k;
      const mainPlace = fingerboardPlace(top - TUNINGS.viola[st]!);
      console.log(s.start.toFixed(2), s.end.toFixed(2), ns.join('+'), 'str', s.string, 'pos', s.hand.position, 'place', s.hand.place.toFixed(3), 'main~', mainPlace.toFixed(3), 'reach', s.hand.reach.toFixed(2), 'stop', s.hand.stopString, s.technique);
    }
  }
}
