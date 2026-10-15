// Rest and lift folds of the flutist for in-memory holds: main and the working tree. Play step 1000 s
// (one play sample), since the play folds do not change.
import { FOLD_ROLES, probeFolds } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { SPECIES_WIND_HOLDS, fluteTurn } from '../../../src/pose/winds.ts';
import type { WindHold } from '../../../src/pose/winds.ts';
const tree = SPECIES_WIND_HOLDS['fox-tan']!.flute!;
const main: WindHold = { ...tree, rest: fluteTurn(-22, 59, [0, 0, -1]), restShift: [0, -0.5, -0.19], restPoleL: [-1, -0.5, -0.5], restPoleR: [1, -0.5, 0.5], restFreeL: null };
const role = FOLD_ROLES.get('flutist')!;
const demos = await patchedDemos();
for (const [name, hold] of [['main', main], ['tree', tree]] as const) {
  SPECIES_WIND_HOLDS['fox-tan'] = { flute: hold };
  const r = probeFolds(role, demos, 1000);
  const s = r.sets;
  const faces = [...s.rest.byFace.keys()].toSorted((a, b) => a - b);
  console.log(name, `rest ${s.rest.withFold}/${s.rest.samples} most ${s.rest.most} distinct ${faces.length}`, `lift ${s.lift.withFold}/${s.lift.samples} most ${s.lift.most}`, `faces ${faces.join(' ')}`);
}
