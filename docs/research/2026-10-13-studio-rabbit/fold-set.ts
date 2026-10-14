// Counts the folds of the violinist with hold changes in memory. Usage:
// node docs/research/2026-10-13-studio-rabbit/fold-set.ts '<set>' ['<set>']...
import { FOLD_ROLES, foldLines, probeFolds } from '../../../tools/fold-probe.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const role = FOLD_ROLES.get('violinist');
if (!role) {
  throw new Error('no role');
}
const demos = await patchedDemos();
for (const set of process.argv.slice(2)) {
  const changes = setHolds(set);
  console.log(`== ${changes.text || 'base'}`);
  console.log(foldLines('violinist', probeFolds(role, demos, 0.25), 0.25).slice(-7).join('\n'));
  changes.undo();
}
