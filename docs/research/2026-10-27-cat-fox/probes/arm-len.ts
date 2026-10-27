/**
 * Measures the arms of a role over the samples of the fold probe: the posed lengths of the upper
 * arm and the forearm from the joints of the studio skeleton, the elbow angle, the reach from the
 * shoulder joint to the wrist and to the claw tips, and the bind lengths. Prints p5, p50, p95 for
 * each set and side.
 * Usage: node scratch/arm-len.ts <role> [<demo prefix>] [--step <s>]
 */
import { Matrix4, Vector3 } from 'three';

import { STUDIO_BONES } from '../src/models/studio-format.ts';
import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { probeDemos } from '../tools/probe-demos.ts';
import { setHolds } from '../tools/hold-sets.ts';

const args = process.argv.slice(2);
const role = FOLD_ROLES.get(args[0]!)!;
const prefix = args[1] && !args[1].startsWith('--') ? args[1] : '';
const step = args.includes('--step') ? Number(args[args.indexOf('--step') + 1]) : 1;
const demos = (await probeDemos()).filter((d) => d.file.startsWith(prefix));
if (args.includes('--set')) setHolds(args[args.indexOf('--set') + 1]!);
const idx = (name: string): number => STUDIO_BONES.findIndex((b) => b === name);
type Row = { set: string; side: string; upper: number; fore: number; elbow: number; reach: number; tip: number };
const rows: Row[] = [];
let bind: Record<string, number> = {};
const m = new Matrix4();
probeFolds(role, demos, step, (rig, studio, _posed, _folded, set) => {
  const heads = rig.body.heads as unknown as Record<string, readonly [number, number, number]>;
  const tips = rig.body.fingerTips;
  for (const side of ['L', 'R'] as const) {
    const at = (bone: string, p: readonly [number, number, number]): Vector3 => {
      m.fromArray(studio.matrices, idx(bone) * 16);
      return new Vector3(...p).applyMatrix4(m);
    };
    const s = at(`upper_arm_${side}`, heads[`upper_arm_${side}`]!);
    const e = at(`forearm_${side}`, heads[`forearm_${side}`]!);
    const w = at(`hand_${side}`, heads[`hand_${side}`]!);
    const t = at(`fingers_${side}`, tips[side]);
    const a = s.clone().sub(e).normalize();
    const b = w.clone().sub(e).normalize();
    rows.push({
      set,
      side,
      upper: s.distanceTo(e),
      fore: e.distanceTo(w),
      elbow: (Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * 180) / Math.PI,
      reach: s.distanceTo(w),
      tip: s.distanceTo(t),
    });
    if (!bind[`upper${side}`]) {
      const v = (p: readonly number[]): Vector3 => new Vector3(...p);
      bind = {
        ...bind,
        [`upper${side}`]: v(heads[`upper_arm_${side}`]!).distanceTo(v(heads[`forearm_${side}`]!)),
        [`fore${side}`]: v(heads[`forearm_${side}`]!).distanceTo(v(heads[`hand_${side}`]!)),
        [`tip${side}`]: v(heads[`upper_arm_${side}`]!).distanceTo(v(tips[side])),
        [`hand${side}`]: v(heads[`hand_${side}`]!).distanceTo(v(tips[side])),
      };
      console.log(`bind ${side}: shoulder joint ${heads[`upper_arm_${side}`]!.map((x) => x.toFixed(3)).join(', ')} m, H ${rig.body.headHeight.toFixed(3)} m`);
    }
  }
});
const q = (xs: number[], f: number): number => {
  const s = xs.toSorted((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(f * (s.length - 1)))] ?? NaN;
};
console.log('bind lengths (m):', Object.entries(bind).map(([k, v]) => `${k} ${v.toFixed(3)}`).join(', '));
console.log('| Set | Side | n | upper p50 | fore p50 | elbow p5 / p50 / p95 | reach p50 / p95 | tip p50 / p95 |');
for (const set of ['rest', 'play', 'lift']) {
  for (const side of ['L', 'R']) {
    const rs = rows.filter((r) => r.set === set && r.side === side);
    if (!rs.length) continue;
    const f = (k: keyof Row, p: number): string => q(rs.map((r) => r[k] as number), p).toFixed(3);
    const g = (k: keyof Row, p: number): string => q(rs.map((r) => r[k] as number), p).toFixed(0);
    console.log(`| ${set} | ${side} | ${rs.length} | ${f('upper', 0.5)} | ${f('fore', 0.5)} | ${g('elbow', 0.05)} / ${g('elbow', 0.5)} / ${g('elbow', 0.95)} | ${f('reach', 0.5)} / ${f('reach', 0.95)} | ${f('tip', 0.5)} / ${f('tip', 0.95)} |`);
  }
}
