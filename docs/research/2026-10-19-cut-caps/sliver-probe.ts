// Measures the light slivers of the right shoulder of the hippo bassist: for each named face, the
// largest angle between its posed normal and the posed normal of a face across one of its edges
// (a face beyond the crease angle shades flat, as a streak), and the squeeze of its smallest
// height from the bind. Usage: node docs/research/2026-10-19-cut-caps/sliver-probe.ts [--faces <list>] [--demo <id>]...
// [--step <s>] [--set <changes>]...
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { FOLD_ROLES, probeFolds } from '../../../tools/fold-probe.ts';
import { withGlbBody } from '../../../tools/glb-swap.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const args = process.argv.slice(2);
const glbAt = args.indexOf('--glb');
if (glbAt >= 0) {
  const file = args[glbAt + 1] ?? '';
  const rest = args.filter((_, i) => i !== glbAt && i !== glbAt + 1);
  await withGlbBody('hippo', file, async (dir) => {
    mkdirSync(join(dir, 'docs', 'research', '2026-10-19-cut-caps'), { recursive: true });
    cpSync(import.meta.filename, join(dir, 'docs', 'research', '2026-10-19-cut-caps', 'sliver-probe.ts'));
    spawnSync(process.execPath, [join(dir, 'docs', 'research', '2026-10-19-cut-caps', 'sliver-probe.ts'), ...rest], { stdio: 'inherit' });
  });
  process.exit(0);
}
const all = (name: string): string[] => args.flatMap((a, i) => (a === name ? [args[i + 1] ?? ''] : []));
const faces = (all('--faces')[0] ?? '114,115,116,238').split(',').map(Number);
const step = Number(all('--step')[0] ?? '0.25');
const chosen = all('--demo').map((d) => (d.endsWith('.mid') ? d : `${d}.mid`));
const variants = ['', ...all('--set')];
const crease = 35;

const role = FOLD_ROLES.get('bassist');
if (!role) throw new Error('no role');
const demos = (await patchedDemos()).filter((d) => chosen.length === 0 || chosen.includes(d.file));

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V): number => Math.hypot(...a);
const at = (p: ArrayLike<number>, v: number): V => [p[v * 3] ?? 0, p[v * 3 + 1] ?? 0, p[v * 3 + 2] ?? 0];

for (const variant of variants) {
  const undo = variant ? setHolds(variant) : null;
  let neighbors: Map<number, number[]> | null = null;
  let bindHeight: Map<number, number> | null = null;
  const stats = new Map(faces.map((f) => [f, { n: 0, sum: 0, over: 0, squeeze: 0, worst: 0 }]));
  const normal = (p: ArrayLike<number>, corners: ArrayLike<number>, f: number): V => {
    const [a, b, c] = [corners[f * 3] ?? 0, corners[f * 3 + 1] ?? 0, corners[f * 3 + 2] ?? 0];
    const n = cross(sub(at(p, b), at(p, a)), sub(at(p, c), at(p, a)));
    const l = len(n) || 1;
    return [n[0] / l, n[1] / l, n[2] / l];
  };
  const height = (p: ArrayLike<number>, corners: ArrayLike<number>, f: number): number => {
    const v = [0, 1, 2].map((k) => at(p, corners[f * 3 + k] ?? 0));
    const area = len(cross(sub(v[1] as V, v[0] as V), sub(v[2] as V, v[0] as V)));
    const longest = Math.max(...[0, 1, 2].map((k) => len(sub(v[(k + 1) % 3] as V, v[k] as V))));
    return area / longest;
  };
  try {
    probeFolds(
      role,
      demos,
      step,
      (rig, _studio, posed) => {
        const { corners, positions } = rig.mesh;
        if (!neighbors) {
          const edges = new Map<string, number[]>();
          for (let f = 0; f < corners.length / 3; f++) {
            for (let k = 0; k < 3; k++) {
              const a = corners[f * 3 + k] ?? 0;
              const b = corners[f * 3 + ((k + 1) % 3)] ?? 0;
              const key = a < b ? `${a} ${b}` : `${b} ${a}`;
              edges.set(key, [...(edges.get(key) ?? []), f]);
            }
          }
          neighbors = new Map();
          bindHeight = new Map();
          for (const f of faces) {
            const list: number[] = [];
            for (let k = 0; k < 3; k++) {
              const a = corners[f * 3 + k] ?? 0;
              const b = corners[f * 3 + ((k + 1) % 3)] ?? 0;
              const key = a < b ? `${a} ${b}` : `${b} ${a}`;
              list.push(...(edges.get(key) ?? []).filter((g) => g !== f));
            }
            neighbors.set(f, list);
            bindHeight.set(f, height(positions, corners, f));
            const n = normal(positions, corners, f);
            const angles = list.map((g) => {
              const m = normal(positions, corners, g);
              return ((Math.acos(Math.min(1, Math.max(-1, n[0] * m[0] + n[1] * m[1] + n[2] * m[2]))) * 180) / Math.PI).toFixed(1);
            });
            console.log(`bind ${f}: neighbors ${list.join(', ')}, angles ${angles.join(', ')}`);
          }
        }
        for (const f of faces) {
          const n = normal(posed, corners, f);
          let worst = 0;
          for (const g of neighbors.get(f) ?? []) {
            const m = normal(posed, corners, g);
            const dot = Math.min(1, Math.max(-1, n[0] * m[0] + n[1] * m[1] + n[2] * m[2]));
            worst = Math.max(worst, (Math.acos(dot) * 180) / Math.PI);
          }
          const s = stats.get(f);
          if (!s) continue;
          s.n += 1;
          s.sum += worst;
          s.worst = Math.max(s.worst, worst);
          if (worst > crease) s.over += 1;
          s.squeeze += height(posed, corners, f) / (bindHeight?.get(f) ?? 1);
        }
      },
      ['play'],
    );
  } finally {
    undo?.undo();
  }
  const rows = faces.map((f) => {
    const s = stats.get(f);
    if (!s || s.n === 0) return `${f}: no sample`;
    return `${f}: crease to a neighbor mean ${(s.sum / s.n).toFixed(1)}°, max ${s.worst.toFixed(1)}°, over ${crease}° in ${((100 * s.over) / s.n).toFixed(1)}%, height kept ${((100 * s.squeeze) / s.n).toFixed(0)}%`;
  });
  console.log(`${variant || 'base'} (play, step ${step} s, ${demos.length} demos)\n  ${rows.join('\n  ')}`);
}
