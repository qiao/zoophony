/**
 * Evaluates bow grip candidates of one species of the violinist sweep: for each candidate
 * `<x>,<y>,<z>,<deg>`, the largest gap of each set (play, lift, rest, lower) over the soloist and
 * the demos, the share over 1 cm, and the smallest depth (`stickGrip()`).
 *
 * Usage: node docs/research/2026-10-17-grip-all/grip-eval.ts <species> [--step <n>] [--demo <id>]... <candidate>...
 */
import { SPECIES } from '../../../src/models/species.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES, soloistScene } from '../../../src/pose/test-sweep-roles.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { stickGrip } from '../../../tools/bow-grip.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const args = process.argv.slice(2);
const species = args[0] as SpeciesId;
const pick = (flag: string): string[] =>
  args.flatMap((arg, i) => (args[i - 1] === flag ? [arg] : []));
const step = Number(pick('--step')[0] ?? 6);
const demos = pick('--demo');
const flagged = new Set(args.flatMap((a, i) => (a.startsWith('--') ? [i, i + 1] : [])));
const candidates = args.slice(1).filter((_, i) => !flagged.has(i + 1));
const holdSets = pick('--set');
if (holdSets.length > 0) {
  setHolds(holdSets.join(';'));
}
const bytes = await Promise.all(
  (demos.length > 0 ? demos : ['boulanger-matin', 'bach-bwv1050']).map(
    async (d) => (await patchedDemo(`${d}.mid`)).bytes,
  ),
);
// SAFETY: a probe changes the table in memory.
const entry = (SPECIES as unknown as Record<string, { bowGrip?: unknown }>)[species]!;
for (const cand of candidates) {
  if (cand === 'tree') {
    // keep the grip of the tree
  } else {
    const [x, y, z, deg] = cand.split(',').map(Number);
    entry.bowGrip = { at: [x, y, z], turn: ((deg ?? 0) * Math.PI) / 180 };
  }
  const scenes = [soloistScene('violinist', species), ...bytes.map((b) => sceneOf(b))];
  const sets = new Map<string, { gaps: number[]; depth: number }>();
  for (const [si, scene] of scenes.entries()) {
    for (const player of SWEEP_ROLES.violinist.players(scene)) {
      const index = Number(/(\d+)/.exec(player.name)?.[1] ?? -1);
      if (scene.layout.players[index]?.cast.species !== species) {
        continue;
      }
      for (const set of SWEEP_ROLES.violinist.sampleSets(scene)) {
        let k = 0;
        const key = `${si === 0 ? 'solo' : 'seat'}-${set.name}`;
        const s = sets.get(key) ?? { gaps: [], depth: Infinity };
        for (const sample of set.samples) {
          if (set.name === 'play' && k++ % step !== 0) {
            continue;
          }
          const g = stickGrip(poseSkeleton(player.model, player.poseAt(sample)));
          s.gaps.push(g.gap);
          s.depth = Math.min(s.depth, g.depth);
        }
        sets.set(key, s);
      }
    }
  }
  const cells = [...sets.entries()].map(([key, s]) => {
    const max = Math.max(...s.gaps);
    const over = s.gaps.filter((g) => g > 0.01).length / s.gaps.length;
    return `${key} ${(max * 100).toFixed(1)}/${(over * 100).toFixed(0)}%/d${(s.depth * 100).toFixed(1)}`;
  });
  const all = [...sets.values()].flatMap((s) => s.gaps);
  console.log(`${cand.padEnd(32)} max ${(Math.max(...all) * 100).toFixed(2)} | ${cells.join(' | ')}`);
}
