// Counts the folds of the red fox with hold changes in memory: node scratch/fold-set.ts <step> [<changes>]...
import { FOLD_ROLES, probeFolds } from '../../../tools/fold-probe.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
const [stepText = '0.5', ...variants] = process.argv.slice(2);
const role = FOLD_ROLES.get('fox-violinist')!;
const demos = await patchedDemos();
for (const variant of ['', ...variants]) {
  const change = variant ? setHolds(variant) : null;
  const report = probeFolds(role, demos, Number(stepText));
  const s = report.sets;
  const share = (k: 'rest' | 'play' | 'lift') => `${k} ${((100 * s[k].withFold) / s[k].samples).toFixed(1)}%`;
  const bones = [...s.play.bones].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([b, n]) => `${b} ${n}`).join(', ');
  console.log(`${variant || 'base'}: ${share('play')} ${share('lift')} ${share('rest')} | play bones ${bones}`);
  change?.undo();
}
