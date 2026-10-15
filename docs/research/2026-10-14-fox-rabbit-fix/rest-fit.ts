// Fits the rest of a role in memory: ROLE=<sweep role> FOLD=<fold role> STEP=<s>
//   node docs/research/2026-10-14-fox-rabbit-fix/rest-fit.ts <species> [--set <changes>]...
// Prints the deepest pair of the rest, lift, and lower sets on the FIT demos, and the folds of
// the rest, the lift, and the play (at STEP) on all demos of the role.
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { speciesOf } from '../../../tools/pose-depth.ts';
import { FOLD_ROLES, probeFolds } from '../../../tools/fold-probe.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { sweepDepths } from '../../../src/pose/test-sweep.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';

const args = process.argv.slice(2);
const species = args[0];
const variants = [''];
for (let k = 1; k < args.length; k++) {
  if (args[k] === '--set') {
    variants.push(args[++k] ?? '');
  }
}
const demos = ['bach-bwv1050', 'beethoven-8', 'boulanger-matin', 'mozart-k525'];
const role = SWEEP_ROLES[(process.env['ROLE'] ?? 'violinist') as keyof typeof SWEEP_ROLES];
const foldRole = FOLD_ROLES.get(process.env['FOLD'] ?? 'violinist');
const step = Number(process.env['STEP'] ?? '0');
const all = await patchedDemos();
const loaded = all.filter((d) => demos.includes(d.file.replace(/\.mid$/, '')));
for (const variant of variants) {
  const { undo, text } = setHolds(variant);
  const worst = new Map<string, { depth: number; pair: string; where: string }>();
  let folds = '';
  try {
    for (const demo of loaded) {
      if (!role.hasRole(scoreOf(demo.bytes))) {
        continue;
      }
      const scene = sceneOf(demo.bytes);
      for (const player of role.players(scene)) {
        if (speciesOf(scene, player.model) !== species) {
          continue;
        }
        for (const set of role.sampleSets(scene)) {
          if (set.name === 'play') {
            continue;
          }
          for (const pair of sweepDepths(role, player, set.samples)) {
            const old = worst.get(set.name);
            if (!old || pair.depth > old.depth) {
              worst.set(set.name, {
                depth: pair.depth,
                pair: `${pair.part}>${pair.into}`,
                where: `${demo.file.replace('.mid', '')} w${pair.wall.toFixed(1)} ${pair.bone ?? ''}`,
              });
            }
          }
        }
      }
    }
    if (foldRole && step > 0) {
      const report = probeFolds(foldRole, all, step);
      const s = report.sets;
      const share = (k: 'rest' | 'play' | 'lift') =>
        `${k} ${((100 * s[k].withFold) / Math.max(1, s[k].samples)).toFixed(1)}%`;
      folds = `${share('rest')} ${share('lift')} ${share('play')}`;
    }
  } finally {
    undo();
  }
  const sets = ['rest', 'lift', 'lower']
    .map((name) => {
      const w = worst.get(name);
      return w ? `${name} ${(w.depth * 100).toFixed(1)} (${w.pair} ${w.where})` : `${name} -`;
    })
    .join(' | ');
  console.log(`${text || 'base'}\n  ${sets}\n  folds: ${folds}`);
}
