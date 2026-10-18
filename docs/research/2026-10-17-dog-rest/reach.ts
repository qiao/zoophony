// Prints the reached fingerboard and bow hair of the dog cellist for hold variants:
// node docs/research/2026-10-17-dog-rest/reach.ts '<changes>' ['<changes>'...]
import { buildPlayer } from '../../../src/models/player.ts';
import { bowedRig, holdOf } from '../../../src/pose/bowed-rig.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

for (const changes of process.argv.slice(2)) {
  const undo = changes === '-' ? null : setHolds(changes);
  const seated = buildPlayer('dog', 'cello', 4, 'chair');
  const rig = bowedRig(seated, 'cello', holdOf('dog', 'cello'));
  const [b0, b1] = rig.bowRange;
  const share = (b1 - b0) / (rig.hairLength - 2 * rig.hold.freeHair);
  console.log(
    `stop ${rig.stopRange.map((v) => v.toFixed(2)).join('..')} bow ${b0.toFixed(3)}..${b1.toFixed(3)} of ${rig.hairLength.toFixed(3)} share ${(share * 100).toFixed(0)}% | ${changes}`,
  );
  undo?.undo();
}
