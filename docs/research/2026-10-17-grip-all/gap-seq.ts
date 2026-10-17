/**
 * Prints the grip gap of each sample of the lift, the lowering, and the play over 1 cm, for one
 * species of the violinist sweep in one demo or as the soloist.
 *
 * Usage: node docs/research/2026-10-17-grip-all/gap-seq.ts <species> <demo|solo> [--grip ...] [--set ...]
 */
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES, soloistScene } from '../../../src/pose/test-sweep-roles.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { stickGrip } from '../../../tools/bow-grip.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { applyGrips } from './grip-set.ts';

const args = process.argv.slice(2);
console.log('grips', applyGrips(args).join(' ') || 'tree');
const pick = (flag: string): string[] =>
  args.flatMap((arg, i) => (args[i - 1] === flag ? [arg] : []));
if (pick('--set').length > 0) {
  setHolds(pick('--set').join(';'));
}
const [species, where] = args as [SpeciesId, string];
const scene =
  where === 'solo'
    ? soloistScene('violinist', species)
    : sceneOf((await patchedDemo(`${where}.mid`)).bytes);
for (const player of SWEEP_ROLES.violinist.players(scene)) {
  const index = Number(/(\d+)/.exec(player.name)?.[1] ?? -1);
  if (scene.layout.players[index]?.cast.species !== species) {
    continue;
  }
  for (const set of SWEEP_ROLES.violinist.sampleSets(scene)) {
    const line: string[] = [];
    let k = 0;
    for (const sample of set.samples) {
      const g = stickGrip(poseSkeleton(player.model, player.poseAt(sample)));
      if (set.name !== 'play' || g.gap > 0.01) {
        line.push(`${k}:${(g.gap * 100).toFixed(1)}`);
      }
      k++;
    }
    console.log(`${set.name} (${set.samples.length}): ${line.slice(0, 80).join(' ')}`);
  }
}
