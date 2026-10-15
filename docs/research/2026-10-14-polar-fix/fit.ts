// Fast fit of the piano hold in memory: play and lift folds, notes off, and the head-to-case gap.
// Usage: node scratch/fit.ts [--step <s>] [--no-gap] [<changes>]...   ('' is the base)
import { Vector3 } from 'three';
import { FOLD_ROLES, probeFolds } from '../../../tools/fold-probe.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { sweepDemos } from '../../../tools/pose-depth.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { PIANIST_SWEEP } from '../../../src/pose/test-sweep-roles.ts';

const args = process.argv.slice(2);
let step = 1;
let gap = true;
const variants: string[] = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i] ?? '';
  if (a === '--step') {
    step = Number(args[++i]);
  } else if (a === '--no-gap') {
    gap = false;
  } else {
    variants.push(a);
  }
}
if (variants.length === 0) {
  variants.push('');
}
const PIANO_DEMOS = ['bach-bwv1047', 'bach-bwv1048', 'bach-bwv1050', 'boulanger-matin'];
const demos = (await patchedDemos()).filter((d) => PIANO_DEMOS.includes(d.file.replace(/\.mid$/, '')));
const role = FOLD_ROLES.get('pianist')!;
const caseRole = {
  ...PIANIST_SWEEP,
  parts: [],
  obstacles: PIANIST_SWEEP.obstacles.filter((o) => o.name === 'case'),
};
const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;

for (const variant of variants) {
  const change = variant ? setHolds(variant) : null;
  try {
    const t0 = Date.now();
    const f = probeFolds(role, demos, step).sets;
    const bones = [...f.play.bones]
      .toSorted((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([b, n]) => `${b} ${n}`)
      .join(', ');

    const errs: number[] = [];
    const elbows: number[] = [];
    for (const demo of demos) {
      const scene = sceneOf(demo.bytes);
      const player = PIANIST_SWEEP.players(scene)[0];
      if (!player) {
        continue;
      }
      for (const target of player.targets()) {
        const posed = poseSkeleton(player.model, player.poseAt(target.sample));
        errs.push(target.error(posed));
        const elbow = posed.frames[boneIndex(`forearm${target.side}`)]!.position;
        elbows.push(elbow.y - 0.7);
      }
    }
    const off = errs.filter((e) => e > 0.001).length;

    let gapText = '';
    if (gap) {
      const results = await sweepDemos({ demos: PIANO_DEMOS, times: null, gaps: true }, caseRole);
      const smallest = new Map<string, number>();
      for (const r of results) {
        for (const s of r.sets) {
          for (const g of s.gaps) {
            smallest.set(s.name, Math.min(smallest.get(s.name) ?? Infinity, g.gap));
          }
        }
      }
      gapText = [...smallest].map(([k, v]) => `${k} ${(v * 100).toFixed(1)}`).join(' ');
    }
    const sortedElbows = elbows.toSorted((a, b) => a - b);
    const p50 = sortedElbows[Math.floor(sortedElbows.length / 2)] ?? NaN;
    console.log(
      `${JSON.stringify(variant || 'base')}: play ${pct(f.play.withFold, f.play.samples)} lift ${pct(f.lift.withFold, f.lift.samples)} rest ${pct(f.rest.withFold, f.rest.samples)} | off ${pct(off, errs.length)} max ${(Math.max(...errs) * 1000).toFixed(2)} mm | elbow-key p50 ${(p50 * 100).toFixed(1)} cm | head gap cm: ${gapText} | ${((Date.now() - t0) / 1000).toFixed(0)} s | ${bones}`,
    );
  } finally {
    change?.undo();
  }
}
