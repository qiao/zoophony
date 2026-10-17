/**
 * Measures the grip of the bow in the right paw of the rabbits, the red foxes, and the cats of the
 * violinist and violist sweeps (`stickGrip()` of `tools/bow-grip.ts`): the gap from the middle of
 * the closed right paw to the axis of the stick, and the depth of the axis in the paw. For each
 * player and sample set of the sweep (play, lift, rest, and lower), it prints the samples, the
 * largest and the middle gap, the share of the samples with a gap above 1 cm, and the smallest
 * depth. `--soloist <species>` measures the standing soloist of the violin and piano duo.
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-17-cat-bow/grip-probe.ts [--demo <id>]... [--step <n>]
 *       [--soloist <species>]... [--set <changes>]
 */
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import type { TestScene } from '../../../src/pose/test-scene.ts';
import { SOLOIST_ROLES, SWEEP_ROLES, soloistScene } from '../../../src/pose/test-sweep-roles.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { GRIP_GAP, stickGrip } from '../../../tools/bow-grip.ts';
import type { StickGrip } from '../../../tools/bow-grip.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const args = process.argv.slice(2);
const pick = (flag: string): string[] =>
  args.flatMap((arg, i) => (args[i - 1] === flag ? [arg] : []));
const asked = pick('--demo');
const step = Number(pick('--step')[0] ?? 4);
const soloists = pick('--soloist');
const changes = pick('--set');
const restore = changes.length > 0 ? setHolds(changes.join(';')).undo : null;
const cm = (v: number): string => (v * 100).toFixed(1);

const scenes: { id: string; scene: TestScene; soloist: boolean }[] = [];
if (soloists.length > 0) {
  for (const species of soloists) {
    const role = species === 'cat' ? 'violist' : 'violinist';
    if (!SOLOIST_ROLES[role].species.has(species as SpeciesId)) {
      throw new Error(`The species ${species} is no soloist of the ${role}.`);
    }
    scenes.push({
      id: `soloist ${species}`,
      scene: soloistScene(role, species as SpeciesId),
      soloist: true,
    });
  }
} else {
  for (const demo of await patchedDemos()) {
    const id = demo.file.replace(/\.mid$/, '');
    if (asked.length === 0 || asked.includes(id)) {
      scenes.push({ id, scene: sceneOf(demo.bytes), soloist: false });
    }
  }
}

console.log(`Grip of the bow, each ${step}. play sample; gap goal ${cm(GRIP_GAP)} cm.`);
console.log('');
console.log('| Demo | Player | Set | Samples | Gap cm max (middle) | Gap over goal | Depth cm min |');
console.log('|---|---|---|---:|---:|---:|---:|');
for (const { id, scene, soloist } of scenes) {
  for (const sweep of [SWEEP_ROLES.violinist, SWEEP_ROLES.violist]) {
    // The soloist takes the seat of the violinist of the duo with the instrument of its role, so
    // the score of the duo has no viola section.
    if (!soloist && !sweep.hasRole(scene.score)) {
      continue;
    }
    for (const player of sweep.players(scene)) {
      const index = Number(/(\d+)/.exec(player.name)?.[1] ?? -1);
      const species = scene.layout.players[index]?.cast.species ?? '?';
      for (const set of sweep.sampleSets(scene)) {
        const grips: StickGrip[] = [];
        let k = 0;
        for (const sample of set.samples) {
          if (set.name === 'play' && k++ % step !== 0) {
            continue;
          }
          grips.push(stickGrip(poseSkeleton(player.model, player.poseAt(sample))));
        }
        const gaps = grips.map((g) => g.gap).toSorted((a, b) => a - b);
        const over = gaps.filter((g) => g > GRIP_GAP).length;
        const depth = Math.min(...grips.map((g) => g.depth));
        const middle = gaps[Math.floor(gaps.length / 2)] ?? 0;
        console.log(
          `| ${id} | ${player.name} ${species} | ${set.name} | ${grips.length} | ${cm(gaps.at(-1) ?? 0)} (${cm(middle)}) | ${((100 * over) / Math.max(1, grips.length)).toFixed(1)}% | ${cm(depth)} |`,
        );
      }
    }
  }
}
restore?.();
