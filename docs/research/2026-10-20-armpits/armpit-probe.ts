/**
 * The copy of the probe of round `armpits`. Run it from the root of the tree. The option `--glb`
 * runs a copy in `tools/` of a temporary tree, so it needs the imports of `scratch/`: copy the file
 * to `scratch/` and set the imports to `../tools/` and `../src/` first.
 *
 * Measures the trunk faces under each armpit of the studio body of a role: the faces below the
 * shoulder joint with a part of their weight on the arm. For each face, the turn is the angle of
 * its posed normal from its bind normal moved by the chest alone, and the growth is the largest
 * growth of an edge from the bind. A spike of the armpit turns far from the trunk and grows.
 *
 * Usage: node scratch/armpit-probe.ts <role> [--step <s>] [--side L|R] [--demo <id>]...
 * [--glb <file>] [--top <n>] [--turn <deg>]
 */
import { cpSync } from 'node:fs';
import { join } from 'node:path';

import { FOLD_ROLES, foldAngle, probeFolds, roleAnimal } from '../../../tools/fold-probe.ts';
import type { SampleSet } from '../../../tools/fold-probe.ts';
import { runTool, takeGlb, withGlbBody } from '../../../tools/glb-swap.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { UPPER_TWIST_BONES } from '../../../src/models/studio-rig.ts';

const { glb, rest: args } = takeGlb(process.argv.slice(2));
const name = args[0] ?? '';
const role = FOLD_ROLES.get(name);
if (!role) {
  throw new Error(`Usage: armpit-probe <role>, one of ${[...FOLD_ROLES.keys()].join(', ')}`);
}
if (glb) {
  process.exitCode = await withGlbBody(roleAnimal(role), glb, (dir) => {
    cpSync(import.meta.filename, join(dir, 'tools', 'armpit-probe.ts'));
    return runTool(dir, 'armpit-probe.ts', args);
  });
} else {
  await main();
}

function opt(key: string, fallback: string): string {
  const at = args.indexOf(key);
  return at >= 0 ? (args[at + 1] ?? fallback) : fallback;
}

async function main(): Promise<void> {
  const step = Number(opt('--step', '0.5'));
  const top = Number(opt('--top', '12'));
  const limit = Number(opt('--turn', '60'));
  const maxArm = Number(opt('--max-arm', '0.98'));
  const rise = Number(opt('--rise', '0.0'));
  const sides = args.includes('--side') ? [opt('--side', 'R')] : ['L', 'R'];
  const chosen = args.flatMap((a, i) =>
    args[i - 1] === '--demo' ? [a.endsWith('.mid') ? a : `${a}.mid`] : [],
  );
  const all = await patchedDemos();
  const demos = chosen.length > 0 ? all.filter((d) => chosen.includes(d.file)) : all;

  const chest = STUDIO_BONES.indexOf('chest');
  type Stat = { folds: number[]; turns: number[]; over: number; grow: number; worst: number; label: string };
  const stats = new Map<string, Map<number, Stat>>();
  const counts = new Map<string, { n: number[]; worst: number; label: string }>();
  let region: Map<string, number[]> | null = null;

  probeFolds(role, demos, step, (rig, studio, posed, _folded, set: SampleSet, label) => {
    const mesh = rig.mesh;
    if (!region) {
      region = new Map();
      for (const side of sides) {
        const armBones = new Set<number>([
          STUDIO_BONES.indexOf(`clavicle_${side}` as never),
          STUDIO_BONES.indexOf(`upper_arm_${side}` as never),
          UPPER_TWIST_BONES[side as "L"],
        ]);
        const shoulder = rig.body.heads[`upper_arm_${side}` as 'upper_arm_L'];
        const sign = Math.sign(shoulder[0]);
        const faces: number[] = [];
        for (let t = 0; t < mesh.corners.length / 3; t++) {
          let armSum = 0;
          let armAny = false;
          let y = 0;
          let x = 0;
          for (let k = 0; k < 3; k++) {
            const v = mesh.corners[t * 3 + k] ?? 0;
            let w = 0;
            for (let s = 0; s < 4; s++) {
              if (armBones.has(mesh.joints[v * 4 + s] ?? -1)) {
                w += mesh.weights[v * 4 + s] ?? 0;
              }
            }
            armSum += w / 3;
            armAny ||= w >= 0.02;
            y += (mesh.positions[v * 3 + 1] ?? 0) / 3;
            x += (mesh.positions[v * 3] ?? 0) / 3;
          }
          if (armAny && armSum < maxArm && y < shoulder[1] + rise && x * sign > 0) {
            faces.push(t);
          }
        }
        region.set(side, faces);
        console.log(
          `region ${side}: ${faces.length} faces, shoulder joint ${shoulder.map((c) => c.toFixed(3)).join(', ')}`,
        );
      }
    }
    const m = studio.matrices;
    const c = chest * 16;
    for (const side of sides) {
      const key = `${set} ${side}`;
      const perFace = stats.get(key) ?? new Map<number, Stat>();
      stats.set(key, perFace);
      let n = 0;
      for (const t of region.get(side) ?? []) {
        const [a = 0, b = 0, d = 0] = [0, 1, 2].map((k) => mesh.corners[t * 3 + k] ?? 0);
        const nb = normal(mesh.positions, a, b, d);
        const moved: [number, number, number] = [0, 1, 2].map(
          (row) => (m[c + row] ?? 0) * nb[0] + (m[c + 4 + row] ?? 0) * nb[1] + (m[c + 8 + row] ?? 0) * nb[2],
        ) as [number, number, number];
        const np = normal(posed, a, b, d);
        const turn = angle(moved, np);
        const grow = Math.max(
          edge(posed, a, b) / edge(mesh.positions, a, b),
          edge(posed, b, d) / edge(mesh.positions, b, d),
          edge(posed, d, a) / edge(mesh.positions, d, a),
        );
        const st = perFace.get(t) ?? { folds: [], turns: [], over: 0, grow: 0, worst: 0, label: '' };
        st.turns.push(turn);
        const fold = foldAngle(mesh, m, posed, t);
        st.folds.push(fold);
        if (fold > limit) {
          st.over += 1;
          n += 1;
        }
        st.grow = Math.max(st.grow, grow);
        if (turn > st.worst) {
          st.worst = turn;
          st.label = label;
        }
        perFace.set(t, st);
      }
      const cnt = counts.get(key) ?? { n: [], worst: -1, label: '' };
      cnt.n.push(n);
      if (n > cnt.worst) {
        cnt.worst = n;
        cnt.label = label;
      }
      counts.set(key, cnt);
    }
  });

  console.log(`\nFaces under the armpit with a fold angle above ${limit}° (step ${step} s).`);
  console.log('| Set | Side | Samples | Mean faces over | p95 | Max | Worst sample |');
  console.log('|---|---|---:|---:|---:|---:|---|');
  for (const [key, cnt] of counts) {
    const sorted = cnt.n.toSorted((p, q) => p - q);
    const p95 = sorted[Math.floor(0.95 * (sorted.length - 1))] ?? 0;
    const mean = cnt.n.reduce((s, v) => s + v, 0) / Math.max(1, cnt.n.length);
    const [set, side] = key.split(' ');
    console.log(
      `| ${set} | ${side} | ${cnt.n.length} | ${mean.toFixed(2)} | ${p95} | ${cnt.worst} | ${cnt.label} |`,
    );
  }
  for (const [key, perFace] of stats) {
    const rows = [...perFace]
      .map(([t, st]) => {
        const sorted = st.turns.toSorted((p, q) => p - q);
        const fs = st.folds.toSorted((p, q) => p - q);
        return { t, st, p95: sorted[Math.floor(0.95 * (sorted.length - 1))] ?? 0, f95: fs[Math.floor(0.95 * (fs.length - 1))] ?? 0, fmax: fs.at(-1) ?? 0 };
      })
      .toSorted((p, q) => q.f95 - p.f95)
      .slice(0, top);
    console.log(`\n${key}: the faces with the largest p95 turn`);
    console.log('| Face | fold p95 | fold max | p95 turn | Worst turn | Share over | Max edge growth | Worst sample |');
    console.log('|---:|---:|---:|---:|---:|---:|---:|---|');
    for (const { t, st, p95, f95, fmax } of rows) {
      console.log(
        `| ${t} | ${f95.toFixed(0)} | ${fmax.toFixed(0)} | ${p95.toFixed(0)} | ${st.worst.toFixed(0)} | ${((100 * st.over) / st.turns.length).toFixed(1)}% | ${st.grow.toFixed(2)} | ${st.label} |`,
      );
    }
  }
}

function normal(p: ArrayLike<number>, a: number, b: number, c: number): [number, number, number] {
  const u = [0, 1, 2].map((k) => (p[b * 3 + k] ?? 0) - (p[a * 3 + k] ?? 0));
  const v = [0, 1, 2].map((k) => (p[c * 3 + k] ?? 0) - (p[a * 3 + k] ?? 0));
  const [ux = 0, uy = 0, uz = 0] = u;
  const [vx = 0, vy = 0, vz = 0] = v;
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

function angle(u: readonly number[], v: readonly number[]): number {
  const l = Math.hypot(...u) * Math.hypot(...v);
  if (l === 0) return 0;
  const cos = ((u[0] ?? 0) * (v[0] ?? 0) + (u[1] ?? 0) * (v[1] ?? 0) + (u[2] ?? 0) * (v[2] ?? 0)) / l;
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

function edge(p: ArrayLike<number>, a: number, b: number): number {
  return Math.hypot(
    (p[a * 3] ?? 0) - (p[b * 3] ?? 0),
    (p[a * 3 + 1] ?? 0) - (p[b * 3 + 1] ?? 0),
    (p[a * 3 + 2] ?? 0) - (p[b * 3 + 2] ?? 0),
  );
}
