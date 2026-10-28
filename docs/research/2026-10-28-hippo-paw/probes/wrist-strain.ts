// Measures the strain of the skin at the right wrist of the hippo bassist over the play samples:
// for each edge of the faces that touch the wrist helper or the paw and the forearm, the posed
// length over the bind length. A bend away from the bind compresses one side (a lump) and
// stretches the other side.
// Usage: node docs/research/2026-10-28-hippo-paw/probes/wrist-strain.ts [--step <s>] [--set <changes>]
import { roleBodies } from '../../../../tools/fold-probe.ts';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { setHolds } from '../../../../tools/hold-sets.ts';
import { applyGrips } from '../../2026-10-17-grip-all/grip-set.ts';
import { STUDIO_BONES } from '../../../../src/models/studio-format.ts';
import {
  createStudioPose,
  poseStudioBones,
  skinStudioMesh,
  studioOffsets,
} from '../../../../src/models/studio-rig.ts';
import { countInAt } from '../../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../../../../src/pose/test-scene.ts';

const args = process.argv.slice(2);
const step = Number(args[args.indexOf('--step') + 1] ?? 1) || 1;
const sets = args.flatMap((a, i) => (args[i - 1] === '--set' ? [a] : []));
if (sets.length > 0) setHolds(sets.join(';'));
console.log('grips', applyGrips(args).join(' ') || 'tree', 'sets', sets.join(';') || 'none');
const side = 'R';
const demos = await probeDemos();
const lows: number[] = [];
const highs: number[] = [];
let edges: [number, number, number][] | null = null;
for (const demo of demos) {
  const scene = sceneOf(demo.bytes);
  const [body] = roleBodies({ kind: 'player', instrument: 'contrabass', species: ['hippo'] }, scene);
  const rig = body?.model.studio;
  if (!body || body.index === null || !rig) continue;
  const { mesh } = rig;
  if (!edges) {
    const bone = (n: string): number => STUDIO_BONES.indexOf(n as never);
    const wrist = bone(`wrist_${side}`);
    const paw = new Set([bone(`hand_${side}`), bone(`fingers_${side}`)]);
    const share = (v: number, set: Set<number>): number => {
      let w = 0;
      for (let k = 0; k < 4; k++) if (set.has(mesh.joints[v * 4 + k] ?? -1)) w += mesh.weights[v * 4 + k] ?? 0;
      return w;
    };
    const ws = new Set([wrist]);
    const band = new Set<number>();
    for (let v = 0; v < mesh.positions.length / 3; v++) {
      if (share(v, ws) > 0.05 || (share(v, paw) > 0.05 && share(v, paw) < 0.95)) band.add(v);
    }
    const seen = new Set<string>();
    edges = [];
    const P = mesh.positions;
    const len = (a: number, b: number, p: ArrayLike<number>): number =>
      Math.hypot((p[a * 3] ?? 0) - (p[b * 3] ?? 0), (p[a * 3 + 1] ?? 0) - (p[b * 3 + 1] ?? 0), (p[a * 3 + 2] ?? 0) - (p[b * 3 + 2] ?? 0));
    for (let t = 0; t < mesh.corners.length / 3; t++) {
      const c = [0, 1, 2].map((k) => mesh.corners[t * 3 + k] ?? 0);
      if (!c.some((v) => band.has(v))) continue;
      for (const [a, b] of [[c[0], c[1]], [c[1], c[2]], [c[2], c[0]]] as [number, number][]) {
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([a, b, len(a, b, P)]);
        }
      }
    }
    console.log(`band vertices ${band.size}, edges ${edges.length}`);
  }
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  const studio = createStudioPose();
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  for (let song = 0; song <= scene.score.durationSec; song += step) {
    const frame = poseAt(scene.plan, song, 10 + song - start, PLAYING, audible, buffer);
    const pose = frame.players[body.index];
    if (!pose) continue;
    poseStudioBones(rig, body.model.skeleton, pose.rotations, studioOffsets(pose), 1, studio);
    const p = skinStudioMesh(mesh, studio);
    let lo = Infinity;
    let hi = 0;
    for (const [a, b, l0] of edges) {
      const l = Math.hypot((p[a * 3] ?? 0) - (p[b * 3] ?? 0), (p[a * 3 + 1] ?? 0) - (p[b * 3 + 1] ?? 0), (p[a * 3 + 2] ?? 0) - (p[b * 3 + 2] ?? 0));
      const r = l / Math.max(1e-6, l0);
      lo = Math.min(lo, r);
      hi = Math.max(hi, r);
    }
    lows.push(lo);
    highs.push(hi);
  }
}
const pct = (v: number[], q: number): number => v.toSorted((a, b) => a - b)[Math.round(q * (v.length - 1))] ?? 0;
console.log(`sets ${sets.join(';')}: samples ${lows.length}; shortest edge p50 ${pct(lows, 0.5).toFixed(2)} p5 ${pct(lows, 0.05).toFixed(2)} min ${Math.min(...lows).toFixed(2)}; longest edge p50 ${pct(highs, 0.5).toFixed(2)} p95 ${pct(highs, 0.95).toFixed(2)} max ${Math.max(...highs).toFixed(2)}`);
