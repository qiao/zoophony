// Lists the folded faces of the rabbit violinist in each sample set, with the bind center, the
// corner angles, and the edges of each face. Usage: node docs/research/2026-10-13-rabbit-mesh/fold-faces.ts [step]
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { foldedFaces, mainBone } from '../../../tools/fold-probe.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh, studioOffsets } from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { PLAYING, NOT_STARTED, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
const step = Number(process.argv[2] ?? '0.25');
const demos = await patchedDemos();
const counts = new Map<string, Map<number, number>>();
let meshRef: any = null;
const summary = new Map<string, { n: number; fold: number; most: number }>();
for (const demo of demos) {
  const scene = sceneOf(demo.bytes);
  let index = -1;
  let model: any = null;
  for (const [i, place] of scene.layout.players.entries()) {
    const { species, instrument, kettles, support } = place.cast;
    if (instrument !== 'violin') continue;
    model = scene.models.get(species, instrument, kettles, support);
    if (model.studio) { index = i; break; }
  }
  if (index < 0) continue;
  const rig = model.studio;
  meshRef = rig.mesh;
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const samples: [string, number, number, any][] = [['rest', start, 10, NOT_STARTED]];
  for (let song = start; song <= scene.score.durationSec; song += step) samples.push(['play', song, 10 + song - start, PLAYING]);
  const lift = { ...PLAYING, changedAtWall: 10 };
  for (let wall = 10; wall < 13; wall += 0.1) samples.push(['lift', Math.min(0, start + wall - 10), wall, lift]);
  for (const [set, song, wall, tr] of samples) {
    const frame = poseAt(scene.plan, song, wall, tr, audible, buffer);
    const pose = frame.players[index]!;
    const studio = poseStudioBones(rig, model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
    const faces = foldedFaces(rig.mesh, studio.matrices, skinStudioMesh(rig.mesh, studio));
    const m = counts.get(set) ?? new Map();
    counts.set(set, m);
    const sm = summary.get(set) ?? { n: 0, fold: 0, most: 0 };
    summary.set(set, sm);
    sm.n += 1; if (faces.length) sm.fold += 1; sm.most = Math.max(sm.most, faces.length);
    for (const f of faces) m.set(f, (m.get(f) ?? 0) + 1);
  }
}
const mesh = meshRef;
console.log(`faces ${mesh.corners.length / 3}`);
for (const [set, sm] of summary) console.log(`| ${set} | ${sm.n} | ${sm.fold} | ${(100 * sm.fold / sm.n).toFixed(1)}% | ${sm.most} |`);
const P = (v: number) => [0, 1, 2].map((k) => mesh.positions[v * 3 + k]);
for (const [set, m] of counts) {
  console.log(`== ${set}`);
  for (const [f, n] of [...m].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
    const c = [0, 1, 2].map((k) => mesh.corners[f * 3 + k]);
    const p = c.map(P);
    const ctr = [0, 1, 2].map((ax) => (p[0][ax] + p[1][ax] + p[2][ax]) / 3);
    const e = [0, 1, 2].map((k) => Math.hypot(...[0, 1, 2].map((ax) => p[(k + 1) % 3][ax] - p[k][ax])));
    const ang = [0, 1, 2].map((k) => {
      const u = [0, 1, 2].map((ax) => p[(k + 1) % 3][ax] - p[k][ax]);
      const v = [0, 1, 2].map((ax) => p[(k + 2) % 3][ax] - p[k][ax]);
      const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
      return (Math.acos(Math.max(-1, Math.min(1, d / Math.hypot(...u) / Math.hypot(...v)))) * 180) / Math.PI;
    });
    console.log(f, n, mainBone(mesh, f), 'ctr', ctr.map((x) => x.toFixed(3)).join(','), 'ang', ang.map((x) => x.toFixed(0)).join('/'), 'edges cm', e.map((x) => (x * 100).toFixed(1)).join('/'));
  }
}
