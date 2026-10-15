// Counts the notes whose palm misses its keys, for hold variants (design 5.3).
// Usage: node docs/research/2026-10-14-polar-bench/reach-probe.ts [--detail] [<changes>]...  ('' is the base)
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { PIANIST_SWEEP } from '../../../src/pose/test-sweep-roles.ts';
import { Vector3 } from 'three';

const args = process.argv.slice(2);
const detail = args.includes('--detail');
const variants = args.filter((a) => a !== '--detail');
if (variants.length === 0) variants.push('');
const demos = (await patchedDemos()).filter((d) => ['bach-bwv1047', 'bach-bwv1048', 'bach-bwv1050', 'boulanger-matin'].includes(d.file.replace(/\.mid$/, '')));
const quant = (xs: number[], q: number) => {
  const s = xs.toSorted((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1) + 0.5))] ?? NaN;
};
for (const variant of variants) {
  const changes = setHolds(variant);
  try {
    const errs: number[] = [];
    const slopes: number[] = [];
    const elbows: number[] = [];
    const bins = new Map<string, [number, number]>();
    for (const demo of demos) {
      const scene = sceneOf(demo.bytes);
      const player = PIANIST_SWEEP.players(scene)[0];
      if (!player) continue;
      for (const target of player.targets()) {
        const posed = poseSkeleton(player.model, player.poseAt(target.sample));
        const e = target.error(posed);
        errs.push(e);
        const s = target.side;
        const elbow = posed.frames[boneIndex(`forearm${s}`)]!.position;
        const wrist = posed.frames[boneIndex(`hand${s}`)]!.position;
        elbows.push(elbow.y - 0.7);
        slopes.push((Math.atan2(elbow.y - wrist.y, Math.hypot(elbow.x - wrist.x, elbow.z - wrist.z)) * 180) / Math.PI);
        if (detail && e > 0.001 && Math.random() < 0.02) {
          const sh = posed.frames[boneIndex(`upperArm${s}`)]!.position;
          console.log(`  miss ${s} e ${(e*100).toFixed(1)} wrist-shoulder dx ${(wrist.x-sh.x).toFixed(3)} dy ${(wrist.y-sh.y).toFixed(3)} dz ${(wrist.z-sh.z).toFixed(3)} dist ${wrist.distanceTo(sh).toFixed(3)} shoulder ${sh.x.toFixed(3)},${sh.y.toFixed(3)},${sh.z.toFixed(3)}`);
        }
        if (detail) {
          const palm = new Vector3(...(s === 'L' ? player.model.body.palmL : player.model.body.palmR));
          void palm;
          const key = `${s} x${(Math.round(wrist.x * 10) / 10).toFixed(1)}`;
          const b = bins.get(key) ?? [0, 0];
          b[0]++;
          if (e > 0.001) b[1]++;
          bins.set(key, b);
        }
      }
    }
    const off = errs.filter((e) => e > 0.001).length / errs.length;
    console.log(`${JSON.stringify(variant)}: notes off ${(off * 100).toFixed(2)}% (n ${errs.length}), max ${(Math.max(...errs) * 100).toFixed(1)} cm, elbow-key p50 ${(quant(elbows, 0.5) * 100).toFixed(1)} cm, slope p50 ${quant(slopes, 0.5).toFixed(1)} deg`);
    if (detail) {
      for (const [k, [n, m]] of [...bins].toSorted()) if (m > 0) console.log(`  ${k}: ${m}/${n}`);
    }
  } finally {
    changes.undo();
  }
}
