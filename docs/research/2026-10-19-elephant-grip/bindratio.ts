/**
 * Prints the largest growth of an edge of the forearm and the paw of the elephant timpanist from
 * the bind, as a share of the upper arm, for the rest sample and for the worst sample of the
 * lift and of the play of one demo. Usage: node docs/research/2026-10-19-elephant-grip/bindratio.ts <demo> <side>
 */
import { Vector3 } from 'three';
import { armFaces } from '../../../tools/arm-check.ts';
import { FOLD_ROLES, probeFolds } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';

const [demoId = 'beethoven-1', side = 'L'] = process.argv.slice(2);
const demo = (await patchedDemos()).find((d) => d.file.startsWith(demoId));
const role = FOLD_ROLES.get('timpanist');
if (!demo || !role) throw new Error('no demo');
let corners: number[] = [];
let upper = 1;
const best: Record<string, { v: number; label: string; values: number[] }> = {};
probeFolds(role, [demo], 1, (rig, _s, posed, _f, set, label) => {
  const m = rig.mesh;
  if (corners.length === 0) {
    const joints = ['forearm', 'forearm_twist', 'hand', 'fingers'].map((b) => STUDIO_BONES.indexOf(`${b}_${side}` as never));
    corners = [...armFaces(m, joints)].flatMap((f) => [0, 1, 2].map((c) => m.corners[f * 3 + c] ?? 0));
    const s = rig.body.heads[`upper_arm_${side}` as keyof typeof rig.body.heads];
    const e = rig.body.heads[`forearm_${side}` as keyof typeof rig.body.heads];
    upper = new Vector3(...s).distanceTo(new Vector3(...e));
  }
  let v = 0;
  for (let f = 0; f < corners.length / 3; f++) for (let c = 0; c < 3; c++) {
    const a = corners[f * 3 + c]!, b = corners[f * 3 + ((c + 1) % 3)]!;
    const d = (arr: ArrayLike<number>) => new Vector3().fromArray(arr, a * 3).distanceTo(new Vector3().fromArray(arr, b * 3));
    v = Math.max(v, (d(posed) - d(m.positions)) / upper);
  }
  const slot = (best[set] ??= { v: -1, label: '', values: [] });
  slot.values.push(v);
  if (v > slot.v) { slot.v = v; slot.label = label; }
});
for (const [set, { v, label, values }] of Object.entries(best)) {
  const sorted = values.toSorted((a, b) => a - b);
  const p95 = sorted[Math.floor(0.95 * (sorted.length - 1))] ?? 0;
  console.log(`${set}: p95 ${p95.toFixed(3)}, worst ${v.toFixed(3)} at ${label}`);
}
