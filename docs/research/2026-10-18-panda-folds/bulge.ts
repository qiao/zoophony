/**
 * Compares the posed skin of the panda trombonist with the left shoulder turn of the hold and with
 * a set hold, in the play samples of boulanger-matin at a step of 10 s: the vertices of the chest
 * with the largest move. node docs/research/2026-10-18-panda-folds/bulge.ts '<set>'
 */
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { FOLD_ROLES, probeFolds } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const role = FOLD_ROLES.get('trombonist');
if (!role) throw new Error('no role');
const demos = (await patchedDemos()).filter((d) => d.file.startsWith('boulanger'));
const run = (): { bind: Float32Array; w: (v: number, b: string) => number; posed: Float32Array[] } => {
  const posed: Float32Array[] = [];
  let mesh: any = null;
  probeFolds(role, demos, 10, (rig, _s, p, _f, set) => {
    if (set !== 'play') return;
    mesh = rig.mesh;
    posed.push(new Float32Array(p));
  }, ['play']);
  const w = (v: number, b: string): number => {
    let s = 0;
    for (let k = 0; k < 4; k++) if (STUDIO_BONES[mesh.joints[4 * v + k]] === b) s += mesh.weights[4 * v + k];
    return s;
  };
  return { bind: mesh.positions, w, posed };
};
const a = run();
setHolds(process.argv[2] ?? 'trombone@panda.reachL=0');
const b = run();
const n = a.bind.length / 3;
const rows: [number, number, string][] = [];
for (let v = 0; v < n; v++) {
  let most = 0;
  for (let s = 0; s < a.posed.length; s++) {
    const pa = a.posed[s]!, pb = b.posed[s]!;
    most = Math.max(most, Math.hypot(pa[3 * v]! - pb[3 * v]!, pa[3 * v + 1]! - pb[3 * v + 1]!, pa[3 * v + 2]! - pb[3 * v + 2]!));
  }
  if (a.w(v, 'upper_arm_L') + a.w(v, 'forearm_L') + a.w(v, 'hand_L') + a.w(v, 'fingers_L') + a.w(v, 'forearm_twist_L') < 0.5) {
    rows.push([most, v, `bind ${[0, 1, 2].map((k) => a.bind[3 * v + k]!.toFixed(3)).join(', ')} clav ${a.w(v, 'clavicle_L').toFixed(2)} ua ${a.w(v, 'upper_arm_L').toFixed(2)} chest ${a.w(v, 'chest').toFixed(2)}`]);
  }
}
rows.sort((x, y) => y[0] - x[0]);
console.log(`samples ${a.posed.length}; the trunk vertices (arm weight below 0.5) with the largest move:`);
for (const [m, v, t] of rows.slice(0, 25)) console.log(`${v}: ${(m * 100).toFixed(1)} cm, ${t}`);
