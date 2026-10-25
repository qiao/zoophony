/**
 * Measures the crease between face pairs of the bassist over the play samples of demos, with the
 * corrective shapes at their weights and with each shape off, and prints the mean weight of each
 * shape. Usage: node docs/research/2026-10-25-hippo-skin/probes/shapecrease.ts <demo>... -- <faceA:faceB>...
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { FOLD_ROLES, probeFolds } from '../../../../tools/fold-probe.ts';
import { withGlbBody } from '../../../../tools/glb-swap.ts';
import { patchedDemo } from '../../../../tools/patch-demos.ts';
import { skinStudioMesh } from '../../../../src/models/studio-rig.ts';

const raw = process.argv.slice(2);
const glbAt = raw.indexOf('--glb');
if (glbAt >= 0) {
  const file = raw[glbAt + 1] ?? '';
  const rest = raw.filter((_, i) => i !== glbAt && i !== glbAt + 1);
  await withGlbBody('hippo', file, async (dir) => {
    mkdirSync(join(dir, 'docs', 'research', '2026-10-25-hippo-skin', 'probes'), { recursive: true });
    cpSync(import.meta.filename, join(dir, 'docs', 'research', '2026-10-25-hippo-skin', 'probes', 'shapecrease.ts'));
    spawnSync(process.execPath, [join(dir, 'docs', 'research', '2026-10-25-hippo-skin', 'probes', 'shapecrease.ts'), ...rest], {
      stdio: 'inherit',
    });
  });
  process.exit(0);
}
const argv = raw;
const dash = argv.indexOf('--');
const demos = argv.slice(0, dash);
const pairs = argv.slice(dash + 1).map((p) => p.split(':').map(Number) as [number, number]);
const role = FOLD_ROLES.get('bassist')!;

const normal = (pos: Float32Array, corners: ArrayLike<number>, f: number): number[] => {
  const v = [0, 1, 2].map((k) => corners[f * 3 + k] ?? 0);
  const p = v.map((i) => [pos[i * 3] ?? 0, pos[i * 3 + 1] ?? 0, pos[i * 3 + 2] ?? 0]);
  const u = [0, 1, 2].map((k) => (p[1]![k] ?? 0) - (p[0]![k] ?? 0));
  const w = [0, 1, 2].map((k) => (p[2]![k] ?? 0) - (p[0]![k] ?? 0));
  const n = [u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!];
  const l = Math.hypot(...n) || 1;
  return n.map((x) => x / l);
};
const angle = (a: number[], b: number[]): number =>
  (Math.acos(Math.max(-1, Math.min(1, a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!))) * 180) / Math.PI;

const sums: number[][] = [];
const weights: number[] = [];
let count = 0;
for (const demo of demos) {
  probeFolds(
    role,
    [await patchedDemo(`${demo}.mid`)],
    0.5,
    (rig, studio, posed) => {
      const { mesh } = rig;
      count += 1;
      const n = mesh.correctives.length;
      const rows: number[] = [];
      for (const [a, b] of pairs) {
        rows.push(angle(normal(posed, mesh.corners, a), normal(posed, mesh.corners, b)));
      }
      const saved = Array.from(studio.correctives.subarray(0, n));
      for (let s = 0; s < n; s++) {
        weights[s] = (weights[s] ?? 0) + (saved[s] ?? 0);
        studio.correctives[s] = 0;
        const off = skinStudioMesh(mesh, studio);
        studio.correctives[s] = saved[s] ?? 0;
        for (const [a, b] of pairs) {
          rows.push(angle(normal(off, mesh.corners, a), normal(off, mesh.corners, b)));
        }
      }
      rows.forEach((x, i) => {
        (sums[i] ??= [0])[0]! += x;
      });
    },
    ['play'],
  );
}
console.log(`samples ${count}, mean shape weights ${weights.map((w) => (w / count).toFixed(2)).join(', ')}`);
const k = pairs.length;
sums.forEach((s, i) => {
  const variant = Math.floor(i / k) === 0 ? 'all shapes' : `shape ${Math.floor(i / k) - 1} off`;
  console.log(`${variant} ${pairs[i % k]?.join(':')}: mean crease ${((s[0] ?? 0) / count).toFixed(1)}°`);
});
