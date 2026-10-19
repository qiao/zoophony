/**
 * Bins the play samples of the bassist by the turns of some bones, and gives the share of the
 * samples in which a face folds in each bin. Usage:
 * node docs/research/2026-10-19-hippo-arms/step2/probe-keys.ts <face> [step] [demo...]
 */
import { FOLD_ROLES, probeFolds, relativeTurn, turnAngle } from '../../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../../tools/patch-demos.ts';
import { STUDIO_BONES } from '../../../../src/models/studio-format.ts';
import type { Quat } from '../../../../src/models/tuples.ts';

const face = Number(process.argv[2] ?? 116);
const step = Number(process.argv[3] ?? 1);
const only = process.argv.slice(4);
const role = FOLD_ROLES.get('bassist');
if (!role) throw new Error('no role');
const all = await patchedDemos();
const demos = only.length > 0 ? all.filter((d) => only.includes(d.file)) : all;
const bone = (name: string): number => STUDIO_BONES.indexOf(name);
const ID: Quat = [0, 0, 0, 1];
interface Row {
  folded: boolean;
  keys: Record<string, number>;
}
const rows: Row[] = [];
const bind = new Map<string, Quat>();
probeFolds(
  role,
  demos,
  step,
  (...[, studio, , folded, set]) => {
    if (set !== 'play') return;
    const m = studio.matrices;
    const rel = (b: string, f: string): Quat => relativeTurn(m, bone(b), bone(f));
    const keys: Record<string, number> = {
      neck: turnAngle(rel('neck', 'chest'), ID),
      head: turnAngle(rel('head', 'neck'), ID),
      headChest: turnAngle(rel('head', 'chest'), ID),
      clav: turnAngle(rel('clavicle_R', 'chest'), ID),
      upper: turnAngle(rel('upper_arm_R', 'chest'), ID),
      upperClav: turnAngle(rel('upper_arm_R', 'clavicle_R'), ID),
      elbow: turnAngle(rel('forearm_R', 'upper_arm_R'), ID),
      wrist: turnAngle(rel('hand_R', 'forearm_twist_R'), ID),
      fingers: turnAngle(rel('fingers_R', 'hand_R'), ID),
      twist: turnAngle(rel('forearm_twist_R', 'forearm_R'), ID),
      chest: turnAngle(rel('chest', 'hips'), ID),
    };
    rows.push({ folded: folded.includes(face), keys });
  },
  ['play'],
);
void bind;
const total = rows.length;
const folds = rows.filter((r) => r.folded).length;
console.log(`face ${face}: ${folds} of ${total} play samples fold (${((100 * folds) / total).toFixed(1)}%)`);
for (const key of Object.keys(rows[0]?.keys ?? {})) {
  const values = rows.map((r) => r.keys[key] ?? 0);
  const lo = Math.floor(Math.min(...values) / 10) * 10;
  const hi = Math.ceil(Math.max(...values) / 10) * 10;
  const width = Math.max(5, Math.ceil((hi - lo) / 8 / 5) * 5);
  const cells: string[] = [];
  for (let a = lo; a < hi; a += width) {
    const bin = rows.filter((r) => (r.keys[key] ?? 0) >= a && (r.keys[key] ?? 0) < a + width);
    if (bin.length === 0) continue;
    const f = bin.filter((r) => r.folded).length;
    cells.push(`${a}-${a + width}: ${f}/${bin.length} (${((100 * f) / bin.length).toFixed(0)}%)`);
  }
  const mf = rows.filter((r) => r.folded).map((r) => r.keys[key] ?? 0);
  const mu = rows.filter((r) => !r.folded).map((r) => r.keys[key] ?? 0);
  const mean = (v: number[]): number => v.reduce((s, x) => s + x, 0) / Math.max(1, v.length);
  console.log(`${key}: mean folded ${mean(mf).toFixed(1)}, unfolded ${mean(mu).toFixed(1)} | ${cells.join(' | ')}`);
}
