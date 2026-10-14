// Finds the folded face of the right upper arm of the studio rabbit in the side rest of Bach: its
// angle with and with no corrective shape, its place, its form, and its mirror face. Each
// argument is a variant: a hold change of `pnpm pose-depth --set`, or `HANG.<key>=<value>` for a
// constant of `src/pose/hang.ts`. From the review of round 4. Usage:
// node docs/research/2026-10-13-studio-rabbit/rest-fold.ts [<variant>]...
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { mainBone } from '../../../tools/fold-probe.ts';
import { HANG } from '../../../src/pose/hang.ts';
import {
  createStudioPose,
  poseStudioBones,
  skinStudioMesh,
  studioOffsets,
} from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import type { Transport } from '../../../src/pose/types.ts';

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (u: V, v: V): V => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const dot = (u: V, v: V) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const len = (u: V) => Math.hypot(...u);
const at = (p: ArrayLike<number>, i: number): V => [p[i * 3] ?? 0, p[i * 3 + 1] ?? 0, p[i * 3 + 2] ?? 0];

function cofactor(m: number[], n: V): V {
  const [a = 0, d = 0, g = 0, b = 0, e = 0, h = 0, c = 0, f = 0, i = 0] = m;
  const [x, y, z] = n;
  return [
    (e * i - f * h) * x - (d * i - f * g) * y + (d * h - e * g) * z,
    -(b * i - c * h) * x + (a * i - c * g) * y - (a * h - b * g) * z,
    (b * f - c * e) * x - (a * f - c * d) * y + (a * e - b * d) * z,
  ];
}

/** Angles in degrees of each face between the posed normal and the moved bind normal. */
function angles(mesh: any, matrices: ArrayLike<number>, posed: ArrayLike<number>): Float64Array {
  const out = new Float64Array(mesh.corners.length / 3);
  for (let t = 0; t < out.length; t++) {
    const cs = [0, 1, 2].map((k) => mesh.corners[t * 3 + k] ?? 0);
    const lin = Array.from({ length: 9 }, () => 0);
    for (const v of cs) {
      for (let k = 0; k < 4; k++) {
        const w = mesh.weights[v * 4 + k] ?? 0;
        const j = (mesh.joints[v * 4 + k] ?? 0) * 16;
        for (let col = 0; col < 3; col++) {
          for (let row = 0; row < 3; row++) {
            lin[col * 3 + row] += (w / 3) * (matrices[j + col * 4 + row] ?? 0);
          }
        }
      }
    }
    const [a = 0, b = 0, c = 0] = cs;
    const pa = at(mesh.positions, a);
    const expected = cofactor(lin, cross(sub(at(mesh.positions, b), pa), sub(at(mesh.positions, c), pa)));
    const qa = at(posed, a);
    const now = cross(sub(at(posed, b), qa), sub(at(posed, c), qa));
    out[t] = (Math.acos(Math.max(-1, Math.min(1, dot(now, expected) / (len(now) * len(expected) || 1)))) * 180) / Math.PI;
  }
  return out;
}

function faceInfo(mesh: any, t: number) {
  const cs = [0, 1, 2].map((k) => mesh.corners[t * 3 + k] ?? 0) as [number, number, number];
  const p = cs.map((v) => at(mesh.positions, v)) as [V, V, V];
  const centroid: V = [0, 1, 2].map((k) => (p[0][k]! + p[1][k]! + p[2][k]!) / 3) as V;
  const ang = (a: V, b: V, c: V) => (Math.acos(dot(sub(b, a), sub(c, a)) / (len(sub(b, a)) * len(sub(c, a)))) * 180) / Math.PI;
  const minAngle = Math.min(ang(p[0], p[1], p[2]), ang(p[1], p[2], p[0]), ang(p[2], p[0], p[1]));
  const area = len(cross(sub(p[1], p[0]), sub(p[2], p[0]))) / 2;
  return { cs, centroid, minAngle, area };
}

const demos = await patchedDemos();
const bach = demos.find((d) => d.file === 'bach-bwv1048.mid');
if (!bach) throw new Error('no bach');

function samplesOf(scene: ReturnType<typeof sceneOf>) {
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const list: [string, number, number, Transport][] = [['rest', start, 10, NOT_STARTED]];
  const lift: Transport = { ...PLAYING, changedAtWall: 10 };
  for (let wall = 10; wall < 13; wall += 0.1) {
    list.push([`lift ${(wall - 10).toFixed(1)}`, Math.min(0, start + wall - 10), wall, lift]);
  }
  return list;
}

function run(label: string, detail: boolean) {
  const scene = sceneOf(bach!.bytes);
  const index = scene.layout.players.findIndex((p) => p.cast.species === 'rabbit' && p.cast.instrument === 'violin');
  const place = scene.layout.players[index]!;
  const model = scene.models.get(place.cast.species, place.cast.instrument, place.cast.kettles, place.cast.support);
  const rig = model.studio!;
  const mesh = rig.mesh;
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  let restFolds: number[] = [];
  let liftFold = 0;
  let liftCount = 0;
  let worst = 0;
  const lines: string[] = [];
  for (const [name, song, wall, transport] of samplesOf(scene)) {
    const frame = poseAt(scene.plan, song, wall, transport, audible, buffer);
    const pose = frame.players[index]!;
    const studio = poseStudioBones(rig, model.skeleton, pose.rotations, studioOffsets(pose), 1, createStudioPose());
    const corr = [...studio.correctives];
    const posed = skinStudioMesh(mesh, studio);
    const a = angles(mesh, studio.matrices, posed);
    const folded = [...a.keys()].filter((t) => (a[t] ?? 0) > 90);
    // The same pose with no corrective shape.
    const saved = [...studio.correctives];
    studio.correctives.fill(0);
    const a0 = angles(mesh, studio.matrices, skinStudioMesh(mesh, studio));
    saved.forEach((w, i) => (studio.correctives[i] = w));
    const folded0 = [...a0.keys()].filter((t) => (a0[t] ?? 0) > 90);
    if (name === 'rest') {
      restFolds = folded;
      if (detail) {
        const top = [...a.keys()].toSorted((x, y) => (a[y] ?? 0) - (a[x] ?? 0)).slice(0, 5);
        lines.push(`rest: correctives ${corr.map((w) => w.toFixed(3)).join(', ')}`);
        lines.push(`rest: folded faces ${folded.join(', ') || 'none'}; with no corrective: ${folded0.join(', ') || 'none'}`);
        for (const t of top) {
          const info = faceInfo(mesh, t);
          lines.push(
            `  face ${t} ${mainBone(mesh, t)}: angle ${a[t]!.toFixed(1)}° (no corrective ${a0[t]!.toFixed(1)}°), bind centroid ${info.centroid.map((x) => x.toFixed(4)).join(', ')} m, smallest angle ${info.minAngle.toFixed(1)}°, area ${(info.area * 1e4).toFixed(2)} cm²`,
          );
        }
      }
    } else {
      liftCount += 1;
      if (folded.length > 0) liftFold += 1;
    }
    for (const t of restFolds) worst = Math.max(worst, a[t] ?? 0);
    if (detail && name !== 'rest' && folded.length > 0 && liftFold <= 40) {
      lines.push(`  ${name}: folded ${folded.join(', ')} angle ${folded.map((t) => a[t]!.toFixed(1)).join(', ')}, correctives ${corr.map((w) => w.toFixed(3)).join(', ')}`);
    }
  }
  console.log(`== ${label}: rest folds ${restFolds.length} (${restFolds.join(', ')}), lift ${liftFold} of ${liftCount}, worst angle of the rest faces ${worst.toFixed(1)}°`);
  if (lines.length) console.log(lines.join('\n'));
  if (detail) {
    // The mirror face of each rest face.
    for (const t of restFolds) {
      const info = faceInfo(mesh, t);
      const mirror: V = [-info.centroid[0], info.centroid[1], info.centroid[2]];
      let best = -1;
      let bestD = Infinity;
      for (let u = 0; u < mesh.corners.length / 3; u++) {
        const d = len(sub(faceInfo(mesh, u).centroid, mirror));
        if (d < bestD) {
          bestD = d;
          best = u;
        }
      }
      const m = faceInfo(mesh, best);
      console.log(`  mirror of ${t}: face ${best} ${mainBone(mesh, best)} at ${m.centroid.map((x) => x.toFixed(4)).join(', ')} (${(bestD * 1000).toFixed(1)} mm off), smallest angle ${m.minAngle.toFixed(1)}°, area ${(m.area * 1e4).toFixed(2)} cm²`);
    }
  }
}

run('base', true);
const variants = process.argv.slice(2);
for (const v of variants) {
  if (v.startsWith('HANG.')) {
    const [key, value] = v.slice(5).split('=');
    const old = (HANG as any)[key!];
    (HANG as any)[key!] = (Number(value!.replace('deg', '')) * (value!.endsWith('deg') ? Math.PI / 180 : 1));
    run(v, false);
    (HANG as any)[key!] = old;
  } else {
    const changes = setHolds(v);
    run(changes.text, false);
    changes.undo();
  }
}
