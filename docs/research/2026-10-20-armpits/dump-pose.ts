/**
 * The copy of the probe of round `armpits`. Run it from the root of the tree. The option `--glb`
 * runs a copy in `tools/` of a temporary tree, so it needs the imports of `scratch/`: copy the file
 * to `scratch/` and set the imports to `../tools/` and `../src/` first.
 *
 * Writes the posed studio mesh of a role at some samples as JSON, with the fold angle of each
 * face, for the renders of `scratch/render.py`.
 *
 * Usage: node scratch/dump-pose.ts <role> <demo> <out.json> <label>... [--step <s>] [--glb <file>]
 * A label is the end of a sample label, such as `280.38 s`, `rest`, or `wall 0.6 s`.
 */
import { cpSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { FOLD_ROLES, foldAngle, probeFolds, roleAnimal } from '../../../tools/fold-probe.ts';
import { runTool, takeGlb, withGlbBody } from '../../../tools/glb-swap.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const { glb, rest: args } = takeGlb(process.argv.slice(2));
const role = FOLD_ROLES.get(args[0] ?? '');
if (!role) {
  throw new Error('Usage: dump-pose <role> <demo> <out.json> <label>...');
}
if (glb) {
  const out = resolve(args[2] ?? '');
  const fixed = args.map((a, i) => (i === 2 ? out : a));
  process.exitCode = await withGlbBody(roleAnimal(role), glb, (dir) => {
    cpSync(import.meta.filename, join(dir, 'tools', 'dump-pose.ts'));
    return runTool(dir, 'dump-pose.ts', fixed);
  });
} else {
  const demo = (args[1] ?? '').endsWith('.mid') ? (args[1] ?? '') : `${args[1] ?? ''}.mid`;
  const out = args[2] ?? 'pose.json';
  const stepAt = args.indexOf('--step');
  const step = stepAt >= 0 ? Number(args[stepAt + 1]) : 0.5;
  const labels = args.slice(3).filter((a, i, all) => a !== '--step' && all[i - 1] !== '--step');
  const demos = (await patchedDemos()).filter((d) => d.file === demo);
  const samples: unknown[] = [];
  let corners: number[] = [];
  let bind: number[] = [];
  probeFolds(role, demos, step, (rig, studio, posed, folded, set, label) => {
    if (!labels.some((l) => label.endsWith(` ${l}`))) {
      if (args.includes("--list") && set === "play") console.log(label);
      return;
    }
    const mesh = rig.mesh;
    corners = Array.from(mesh.corners);
    bind = Array.from(mesh.positions);
    const folds = [];
    for (let t = 0; t < mesh.corners.length / 3; t++) {
      folds.push(Math.round(foldAngle(mesh, studio.matrices, posed, t)));
    }
    samples.push({ set, label, posed: Array.from(posed, (v) => Math.round(v * 1e5) / 1e5), folds, folded });
  });
  writeFileSync(out, JSON.stringify({ corners, bind, samples }));
  console.log(`${samples.length} samples into ${out}`);
}
