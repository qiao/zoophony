// Rest, play, and lift folds of the dog cellist with the skin of some vertices replaced in memory.
// node scratch/df/weight-try.ts <v>,<v>,... [mode] ; mode mean = the mean skin of the vertices.
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { probeFolds, roleBodies, FOLD_ROLES } from '../../../tools/fold-probe.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
const role = FOLD_ROLES.get('cellist')!;
const demos = await patchedDemos();
const scene = sceneOf(demos[0]!.bytes);
const mesh = roleBodies(role, scene)[0]!.model.studio!.mesh as { joints: Uint8Array; weights: Float32Array };
const ids = (process.argv[2] ?? '188,190,191').split(',').map(Number);
const mode = process.argv[3] ?? 'mean';
const skin = (v: number): Map<number, number> => {
  const m = new Map<number, number>();
  for (let k = 0; k < 4; k++) { const w = mesh.weights[v * 4 + k]!; if (w > 0) m.set(mesh.joints[v * 4 + k]!, w); }
  return m;
};
for (const v of ids) console.log(v, [...skin(v)].map(([j, w]) => `${STUDIO_BONES[j]} ${w.toFixed(2)}`).join(' '));
if (mode === 'mean') {
  const sum = new Map<number, number>();
  for (const v of ids) for (const [j, w] of skin(v)) sum.set(j, (sum.get(j) ?? 0) + w / ids.length);
  const top = [...sum].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const total = top.reduce((t, [, w]) => t + w, 0);
  for (const v of ids) for (let k = 0; k < 4; k++) { mesh.joints[v * 4 + k] = top[k]?.[0] ?? 0; mesh.weights[v * 4 + k] = (top[k]?.[1] ?? 0) / total; }
} else {
  const [from, to] = mode.split('>').map(Number) as [number, number];
  for (let k = 0; k < 4; k++) { mesh.joints[to * 4 + k] = mesh.joints[from * 4 + k]!; mesh.weights[to * 4 + k] = mesh.weights[from * 4 + k]!; }
}
const report = probeFolds(role, demos, Number(process.argv[4] ?? '1'));
for (const set of ['rest', 'play', 'lift'] as const) {
  const c = report.sets[set];
  const faces = [...c.byFace].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([f, n]) => `${f}:${n}`).join(' ');
  console.log(set, `${c.withFold}/${c.samples}`, ((100 * c.withFold) / c.samples).toFixed(1) + '%', faces);
}
