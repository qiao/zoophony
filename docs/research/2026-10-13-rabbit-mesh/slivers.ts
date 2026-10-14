/**
 * Counts the thin faces of an OBJ mesh by the smallest corner angle, such as the long-armed source
 * that `pnpm rig-mesh rabbit --preview <dir>` writes. Usage:
 *
 *     node docs/research/2026-10-13-rabbit-mesh/slivers.ts <dir>/source-long-arms.obj
 */
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
const v: Vector3[] = [];
const f: number[][] = [];
for (const line of readFileSync(process.argv[2]!, 'utf8').split('\n')) {
  const p = line.split(' ');
  if (p[0] === 'v') v.push(new Vector3(+p[1]!, +p[2]!, +p[3]!));
  if (p[0] === 'f') f.push(p.slice(1, 4).map((x) => +x - 1));
}
const mins = f.map((t) =>
  Math.min(
    ...[0, 1, 2].map((i) => {
      const a = v[t[i]!]!,
        b = v[t[(i + 1) % 3]!]!,
        c = v[t[(i + 2) % 3]!]!;
      return (b.clone().sub(a).angleTo(c.clone().sub(a)) * 180) / Math.PI;
    }),
  ),
);
for (const t of [2, 5, 8, 10, 15])
  console.log(`min angle < ${t}: ${mins.filter((m) => m < t).length} faces`);
