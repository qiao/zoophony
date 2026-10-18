// Measures the reach of the dog of the working tree with hold changes:
// node docs/research/2026-10-17-dog-arms/probe-main.ts ['<changes>']...
import { setHolds } from '../../../tools/hold-sets.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { bowedRig, holdOf } from '../../../src/pose/bowed-rig.ts';
const m = buildPlayer('dog', 'cello', 4, 'chair');
for (const changes of ['', ...process.argv.slice(2)]) {
  const undo = changes ? setHolds(changes) : null;
  const rig = bowedRig(m, 'cello', holdOf('dog', 'cello'));
  const usable = rig.hairLength - 2 * rig.hold.freeHair;
  console.log(`${changes || 'base'}: stopRange ${rig.stopRange.map((x) => x.toFixed(2))}, bowRange ${rig.bowRange.map((x) => x.toFixed(3))} of ${rig.hairLength.toFixed(3)} m, share ${((rig.bowRange[1] - rig.bowRange[0]) / usable).toFixed(2)}`);
  if (undo) undo.undo();
}
