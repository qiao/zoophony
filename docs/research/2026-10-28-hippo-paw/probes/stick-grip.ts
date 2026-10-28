// Measures the grip of the bow in the closed right paw of the hippo bassist (stickGrip() of
// tools/bow-grip.ts) over the sample sets of the bassist sweep of four demos: the gap from the
// middle of the paw to the axis of the stick, and the depth of the axis in the paw.
// Usage: node docs/research/2026-10-28-hippo-paw/probes/stick-grip.ts [--step <n>] [--set <changes>] [--grip hippo:x,y,z,deg]
import { poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../../src/pose/test-sweep-roles.ts';
import { patchedDemo } from '../../../../tools/patch-demos.ts';
import { stickGrip } from '../../../../tools/bow-grip.ts';
import { setHolds } from '../../../../tools/hold-sets.ts';
import { applyGrips } from '../../2026-10-17-grip-all/grip-set.ts';

const args = process.argv.slice(2);
const pick = (flag: string): string[] => args.flatMap((a, i) => (args[i - 1] === flag ? [a] : []));
const step = Number(pick('--step')[0] ?? 3);
const sets = pick('--set');
console.log('grips', applyGrips(args).join(' ') || 'tree', 'sets', sets.join(';') || 'none');
if (sets.length > 0) setHolds(sets.join(';'));
const rows: { set: string; gap: number; depth: number }[] = [];
for (const d of ['mozart-k525', 'bach-bwv1050', 'beethoven-8', 'boulanger-matin']) {
  const scene = sceneOf((await patchedDemo(`${d}.mid`)).bytes);
  if (!SWEEP_ROLES.bassist.hasRole(scene.score)) continue;
  for (const player of SWEEP_ROLES.bassist.players(scene)) {
    const index = Number(/(\d+)/.exec(player.name)?.[1] ?? -1);
    if (scene.layout.players[index]?.cast.species !== 'hippo') continue;
    for (const set of SWEEP_ROLES.bassist.sampleSets(scene)) {
      let k = 0;
      for (const sample of set.samples) {
        if (set.name === 'play' && k++ % step !== 0) continue;
        const g = stickGrip(poseSkeleton(player.model, player.poseAt(sample)));
        rows.push({ set: set.name, gap: g.gap, depth: g.depth });
      }
    }
  }
}
const pct = (v: number[], q: number): number => v.toSorted((a, b) => a - b)[Math.round(q * (v.length - 1))] ?? 0;
for (const name of ['all', 'play', 'lift', 'rest', 'lower']) {
  const r = rows.filter((x) => name === 'all' || x.set === name);
  if (r.length === 0) continue;
  const gaps = r.map((x) => x.gap * 100);
  const depths = r.map((x) => x.depth * 100);
  const out = r.filter((x) => x.depth <= 0).length;
  console.log(`${name} n=${r.length}: gap p50 ${pct(gaps, 0.5).toFixed(2)} p95 ${pct(gaps, 0.95).toFixed(2)} max ${Math.max(...gaps).toFixed(2)} cm; depth p5 ${pct(depths, 0.05).toFixed(2)} min ${Math.min(...depths).toFixed(2)} cm; axis out of the paw ${out}`);
}
