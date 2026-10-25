// Measures the twist steps between the deform bones of each arm of a role, over the play, the
// rest, and the lift samples of the percussion test score and the pirates file of the user
// (diagnosis only), from twist-steps.ts of docs/research/2026-10-24-violin-arms/. Usage, from the
// root of the tree: node docs/research/2026-10-25-xylophone-reach/twist.ts <role> [step]
import { Matrix4, Quaternion, Vector3 } from 'three';

import { FOLD_ROLES, probeFolds } from '../../../tools/fold-probe.ts';
import { readFileSync } from 'node:fs';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { UPPER_TWIST_BONES, twistAngle } from '../../../src/models/studio-rig.ts';

const names: readonly string[] = STUDIO_BONES;
const at = (name: string): number => names.indexOf(name);
const roleName = process.argv[2] ?? 'violinist';
const step = Number(process.argv[3] ?? '0.25');
const role = FOLD_ROLES.get(roleName);
if (!role) {
  throw new Error(`no ${roleName}`);
}
const all = await probeDemos();
const demos = [...all.filter((d) => d.file === 'percussion-test.mid'), { ...all[0]!, file: 'pirates.mid', bytes: new Uint8Array(readFileSync(`${process.env['HOME']}/Downloads/Disney_Themes_-_Pirates_Of_The_Caribbean.mid`)) }];
type Link = { from: number; to: number; axis: 'upper' | 'fore'; label: string };
const stats = new Map<string, { max: number; sum: number; n: number; worst: string }>();
const totals = { L: { max: 0, sum: 0, n: 0 }, R: { max: 0, sum: 0, n: 0 } };
const m = new Matrix4();
const qa = new Quaternion();
const qb = new Quaternion();
const rel = new Quaternion();
probeFolds(role, demos, step, (rig, studio, _posed, _folded, set, label) => {
  for (const side of ['L', 'R'] as const) {
    const h = rig.body.heads;
    const upperAxis = new Vector3(...h[`forearm_${side}`])
      .sub(new Vector3(...h[`upper_arm_${side}`]))
      .normalize();
    const foreAxis = new Vector3(...h[`hand_${side}`])
      .sub(new Vector3(...h[`forearm_${side}`]))
      .normalize();
    const chain: [number, 'upper' | 'fore', string][] =
      at(`elbow_${side}`) >= 0 && 'elbow_L' in h
        ? [
            [at(`clavicle_${side}`), 'upper', 'clavicle'],
            ...[0, 1, 2, 3].map((k): [number, 'upper', string] => [
              at(`upper_arm_seg${k}_${side}`),
              'upper',
              `u${k}`,
            ]),
            [at(`elbow_${side}`), 'fore', 'elbow'],
            ...[0, 1, 2, 3].map((k): [number, 'fore', string] => [
              at(`forearm_seg${k}_${side}`),
              'fore',
              `f${k}`,
            ]),
            [at(`wrist_${side}`), 'fore', 'wrist'],
            [at(`hand_${side}`), 'fore', 'hand'],
          ]
        : [
            [at(`clavicle_${side}`), 'upper', 'clavicle'],
            ...(rig.body.upperTwist === undefined
              ? []
              : [[UPPER_TWIST_BONES[side], 'upper', 'utwist'] as [number, 'upper', string]]),
            [at(`upper_arm_${side}`), 'upper', 'upper'],
            [at(`forearm_${side}`), 'fore', 'fore'],
            [at(`forearm_twist_${side}`), 'fore', 'ftwist'],
            [at(`hand_${side}`), 'fore', 'hand'],
          ];
    const links: Link[] = chain.slice(1).map(([to, axis, lab], i) => ({
      from: chain[i]?.[0] ?? 0,
      to,
      axis,
      label: `${chain[i]?.[2] ?? ''}>${lab}`,
    }));
    let total = 0;
    for (const link of links) {
      qa.setFromRotationMatrix(m.fromArray(studio.matrices, link.from * 16));
      qb.setFromRotationMatrix(m.fromArray(studio.matrices, link.to * 16));
      rel.copy(qa).invert().multiply(qb);
      const deg =
        (Math.abs(twistAngle(rel, link.axis === 'upper' ? upperAxis : foreAxis)) * 180) / Math.PI;
      total += deg;
      const key = `${side} ${link.label}`;
      const s = stats.get(key) ?? { max: 0, sum: 0, n: 0, worst: '' };
      s.sum += deg;
      s.n += 1;
      if (deg > s.max) {
        s.max = deg;
        s.worst = `${set} ${label}`;
      }
      stats.set(key, s);
    }
    const t = totals[side];
    t.max = Math.max(t.max, total);
    t.sum += total;
    t.n += 1;
  }
});
console.log('| Link | Mean | Largest | Worst sample |');
console.log('|---|---:|---:|---|');
for (const [key, s] of stats) {
  console.log(`| ${key} | ${(s.sum / s.n).toFixed(1)} | ${s.max.toFixed(1)} | ${s.worst} |`);
}
for (const side of ['L', 'R'] as const) {
  const t = totals[side];
  console.log(`${side} total twist: mean ${(t.sum / t.n).toFixed(1)}, largest ${t.max.toFixed(1)}`);
}
