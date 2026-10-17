/**
 * Scans variants of the bow grip and of the hold for the folds of a role (probeFolds() of
 * tools/fold-probe.ts) and the grip gap (stickGrip()). Each variant is
 * `<grip x,y,z,deg or tree>|<hold changes or ->`.
 *
 * Usage: node docs/research/2026-10-17-grip-all/fold-scan.ts <role> <species> [--step <s>] [--demo <id>]... <variant>...
 */
import { SPECIES } from '../../../src/models/species.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { FOLD_ROLES, probeFolds } from '../../../tools/fold-probe.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemo, patchedDemos } from '../../../tools/patch-demos.ts';

const args = process.argv.slice(2);
const [roleName, species] = args as [string, SpeciesId];
const pick = (flag: string): string[] =>
  args.flatMap((arg, i) => (args[i - 1] === flag ? [arg] : []));
const step = Number(pick('--step')[0] ?? 1);
const asked = pick('--demo');
const flagged = new Set(args.flatMap((a, i) => (a.startsWith('--') ? [i, i + 1] : [])));
const variants = args.slice(2).filter((_, i) => !flagged.has(i + 2));
const role = FOLD_ROLES.get(roleName)!;
const demos =
  asked.length > 0
    ? await Promise.all(asked.map((d) => patchedDemo(`${d}.mid`)))
    : await patchedDemos();
// SAFETY: a probe changes the table in memory.
const entry = (SPECIES as unknown as Record<string, { bowGrip?: unknown }>)[species]!;
const treeGrip = entry.bowGrip;
for (const variant of variants) {
  const [grip, holds] = variant.split('|');
  if (grip && grip !== 'tree') {
    const [x, y, z, deg] = grip.split(',').map(Number);
    entry.bowGrip = { at: [x, y, z], turn: ((deg ?? 0) * Math.PI) / 180 };
  } else {
    entry.bowGrip = treeGrip;
  }
  const undo = holds && holds !== '-' ? setHolds(holds).undo : null;
  const only = pick('--sets');
  const report = probeFolds(
    role,
    demos,
    step,
    undefined,
    only.length > 0 ? (only[0]!.split(',') as ('rest' | 'play' | 'lift')[]) : undefined,
  );
  const cells = (['rest', 'play', 'lift'] as const).map((set) => {
    const c = report.sets[set];
    const top = [...c.byFace.entries()]
      .toSorted((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([f, n]) => `${f}:${((100 * n) / c.samples).toFixed(0)}`)
      .join(',');
    if (c.samples === 0) {
      return `${set} -`;
    }
    return `${set} ${((100 * c.withFold) / c.samples).toFixed(1)}% [${top}]`;
  });
  console.log(`${variant} :: ${cells.join(' | ')}`);
  undo?.();
}
