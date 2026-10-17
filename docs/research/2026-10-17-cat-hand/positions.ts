/**
 * Counts the positions of the left hand of the violas in the demos (research of 2026-10-17, round
 * `cat-hand`): `buildStrokes()` of `src/pose/strokes.ts` on the part of the first player of each
 * viola seat of each demo, as `docs/research/2026-10-17-left-hand/hand-moves.ts` does. For each
 * demo, it prints the strokes, the strokes above the second position (`HandStep.position` above
 * 3), where the left hand of the cat tilts further over the neck, the highest position, and the
 * share of that tilt (`leftTilt()` of `src/pose/bowed.ts` with a `highTilt` of 1) at the highest
 * position.
 *
 * Usage, from the root of the tree:
 *
 *     node docs/research/2026-10-17-cat-hand/positions.ts
 */
import { BOWED_HOLDS } from '../../../src/pose/bowed-rig.ts';
import { leftTilt } from '../../../src/pose/bowed.ts';
import { buildStrokes, vibratoRate } from '../../../src/pose/strokes.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

// The plan of the hand does not read the beats. With no beats, the bow has no slur.
const NO_BEATS = new Float64Array();

const UNIT_TILT = { ...BOWED_HOLDS.viola, highTilt: 1 };

console.log('| Demo | Seat | Strokes | Strokes above the second position | Highest position | Tilt share at the highest place |');
console.log('|---|---|---|---|---|---|');
for (const demo of await patchedDemos()) {
  const id = demo.file.replace(/\.mid$/, '');
  const score = scoreOf(demo.bytes);
  for (const [seatIndex, seat] of score.seats.entries()) {
    if (seat.section !== 'viola') {
      continue;
    }
    const notes = score.notes.filter((n) => n.seatIndex === seatIndex && n.player === 0);
    if (notes.length === 0) {
      continue;
    }
    const strokes = buildStrokes(notes, [], [0.03, 0.6], 1, 'viola', vibratoRate('viola', 0.5), NO_BEATS);
    let high = 0;
    let top = 0;
    let topPlace = 0;
    for (const stroke of strokes) {
      if (stroke.hand.position > 3) {
        high += 1;
      }
      if (stroke.hand.position > top) {
        top = stroke.hand.position;
        topPlace = stroke.hand.place;
      }
    }
    console.log(
      `| ${id} | viola ${seat.indexInSection} | ${strokes.length} | ${high} | ${top} | ${leftTilt(UNIT_TILT, topPlace).toFixed(2)} |`,
    );
  }
}
