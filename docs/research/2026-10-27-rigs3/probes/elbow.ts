// Probe of the fold of face 509 at the right inner elbow of the deer harpist.
// Caches the studio poses of each sample (rest, play, lift, lowering), then counts the folds of
// mesh variants in memory: a flip of a diagonal, or new weights of named vertices.
//   node scratch/a/elbow.ts [face] [--main]   (--main: the triangles of main, scratch/a/deer-main.ts)
import { FOLD_ROLES, foldedFaces, roleBodies } from '../../tools/fold-probe.ts';
import { demoMoves } from '../../tools/arm-check.ts';
import { probeDemos } from '../../tools/probe-demos.ts';
import { STUDIO_BONES } from '../../src/models/studio-format.ts';
import type { StudioMesh } from '../../src/models/studio-format.ts';
import {
  createStudioPose,
  poseStudioBones,
  skinStudioMesh,
  studioOffsets,
} from '../../src/models/studio-rig.ts';
import { countInAt } from '../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../src/pose/pose-at.ts';
import { LIFT_FIT_SEC, LOWER_MAX_SEC } from '../../src/pose/rest.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from '../../src/pose/test-scene.ts';
import type { Transport } from '../../src/pose/types.ts';

export type Set = 'rest' | 'play' | 'lift' | 'lower';
export interface Sample {
  set: Set;
  label: string;
  matrices: Float32Array;
  correctives: Float32Array;
}

const role = FOLD_ROLES.get('harpist');
if (!role) throw new Error('no role');

export async function load(): Promise<{ mesh: StudioMesh; samples: Sample[] }> {
  const demos = (await probeDemos()).filter((d) => d.file === 'boulanger-matin.mid');
  const samples: Sample[] = [];
  let mesh: StudioMesh | null = null;
  for (const demo of demos) {
    const scene = sceneOf(demo.bytes);
    const [body] = roleBodies(role!, scene);
    if (!body || !body.model.studio) continue;
    const rig = body.model.studio;
    mesh = rig.mesh;
    const audible = allAudible(scene.score);
    const buffer = createScenePose(scene.plan);
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    const list: [Set, number, number, Transport, string][] = [
      ['rest', start, 10, NOT_STARTED, 'rest'],
    ];
    for (let song = start; song <= scene.score.durationSec; song += 0.25) {
      list.push(['play', song, 10 + song - start, PLAYING, `${song.toFixed(2)} s`]);
    }
    const lift: Transport = { ...PLAYING, changedAtWall: 10 };
    for (let wall = 10; wall < 13; wall += 0.1) {
      list.push(['lift', Math.min(0, start + wall - 10), wall, lift, `lift ${(wall - 10).toFixed(1)}`]);
    }
    for (const move of demoMoves(scene.score.durationSec)) {
      const lead = countInAt(scene.plan.beats, move.at).lengthSec;
      const transport: Transport =
        move.kind === 'lift'
          ? { ...PLAYING, changedAtWall: 10, startSec: move.at }
          : { ...PLAYING, playing: false, changedAtWall: 10, before: PLAYING };
      const span = move.kind === 'lift' ? LIFT_FIT_SEC : transport.holdSec + LOWER_MAX_SEC;
      const from = move.kind === 'lift' ? 0 : transport.holdSec;
      for (let wall = from; wall <= span; wall += 0.05) {
        const song = move.kind === 'lift' ? Math.min(move.at, move.at - lead + wall) : move.at;
        list.push([
          move.kind === 'lift' ? 'lift' : 'lower',
          song,
          10 + wall,
          transport,
          `${move.kind} ${move.at.toFixed(1)} wall ${wall.toFixed(2)}`,
        ]);
      }
    }
    for (const [set, song, wall, transport, label] of list) {
      const frame = poseAt(scene.plan, song, wall, transport, audible, buffer);
      const pose = frame.players[body.index ?? 0];
      if (!pose) continue;
      const studio = poseStudioBones(
        rig,
        body.model.skeleton,
        pose.rotations,
        studioOffsets(pose),
        1,
        createStudioPose(),
      );
      samples.push({
        set,
        label,
        matrices: studio.matrices.slice(),
        correctives: studio.correctives.slice(),
      });
    }
  }
  if (!mesh) throw new Error('no mesh');
  return { mesh, samples };
}

export interface Count {
  samples: Record<Set, number>;
  withFold: Record<Set, number>;
  faces: Map<number, Record<Set, number>>;
}

export function count(mesh: StudioMesh, samples: readonly Sample[]): Count {
  const out: Count = {
    samples: { rest: 0, play: 0, lift: 0, lower: 0 },
    withFold: { rest: 0, play: 0, lift: 0, lower: 0 },
    faces: new Map(),
  };
  const posed = new Float32Array(mesh.positions.length);
  for (const s of samples) {
    skinStudioMesh(mesh, s, posed);
    const folded = foldedFaces(mesh, s.matrices, posed);
    out.samples[s.set] += 1;
    if (folded.length > 0) out.withFold[s.set] += 1;
    for (const f of folded) {
      const r = out.faces.get(f) ?? { rest: 0, play: 0, lift: 0, lower: 0 };
      r[s.set] += 1;
      out.faces.set(f, r);
    }
  }
  return out;
}

export function countText(name: string, c: Count): string {
  const sets: Set[] = ['rest', 'play', 'lift', 'lower'];
  const share = sets
    .map((s) => `${s} ${((100 * c.withFold[s]) / Math.max(1, c.samples[s])).toFixed(1)}%`)
    .join(', ');
  const faces = [...c.faces.entries()]
    .sort((a, b) => sets.reduce((t, s) => t + b[1][s] - a[1][s], 0))
    .slice(0, 8)
    .map(([f, r]) => `${f} (${sets.map((s) => r[s]).join('/')})`)
    .join(', ');
  return `${name}: ${share}; faces (rest/play/lift/lower): ${faces || 'none'}`;
}

export function vec(mesh: StudioMesh, v: number): [number, number, number] {
  return [mesh.positions[v * 3] ?? 0, mesh.positions[v * 3 + 1] ?? 0, mesh.positions[v * 3 + 2] ?? 0];
}

export function weightsText(mesh: StudioMesh, v: number): string {
  const parts: string[] = [];
  for (let k = 0; k < 4; k++) {
    const w = mesh.weights[v * 4 + k] ?? 0;
    if (w > 0) parts.push(`${STUDIO_BONES[mesh.joints[v * 4 + k] ?? 0]} ${w.toFixed(2)}`);
  }
  return parts.join(' ');
}

export function tri(mesh: StudioMesh, f: number): [number, number, number] {
  return [mesh.corners[f * 3] ?? 0, mesh.corners[f * 3 + 1] ?? 0, mesh.corners[f * 3 + 2] ?? 0];
}

function sub(a: number[], b: number[]): number[] {
  return [a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!];
}
function dot(a: number[], b: number[]): number {
  return a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
}
export function angle(mesh: StudioMesh, p: number, a: number, b: number): number {
  const u = sub(vec(mesh, a), vec(mesh, p));
  const w = sub(vec(mesh, b), vec(mesh, p));
  return (Math.acos(dot(u, w) / Math.sqrt(dot(u, u) * dot(w, w))) * 180) / Math.PI;
}

/** Gives the faces that share an edge with face f, with the shared pair. */
export function neighbors(mesh: StudioMesh, f: number): [number, number, number][] {
  const t = tri(mesh, f);
  const out: [number, number, number][] = [];
  const n = mesh.corners.length / 3;
  for (let g = 0; g < n; g++) {
    if (g === f) continue;
    const u = tri(mesh, g);
    const shared = t.filter((v) => u.includes(v));
    if (shared.length === 2) out.push([g, shared[0]!, shared[1]!]);
  }
  return out;
}

/** Gives a copy of the mesh with the shared edge of faces f and g flipped. */
export function flipped(mesh: StudioMesh, f: number, g: number): StudioMesh {
  const corners = mesh.corners.slice();
  const t = tri(mesh, f);
  const u = tri(mesh, g);
  const m = t.find((v) => !u.includes(v))!;
  const n = u.find((v) => !t.includes(v))!;
  const i = t.indexOf(m);
  const a = t[(i + 1) % 3]!;
  const b = t[(i + 2) % 3]!;
  corners.set([m, a, n], f * 3);
  corners.set([m, n, b], g * 3);
  return { ...mesh, corners };
}

async function main(): Promise<void> {
  const face = Number(process.argv[2] ?? 509);
  const loaded = await load();
  const samples = loaded.samples;
  let mesh = loaded.mesh;
  if (process.argv.includes('--main')) {
    const { unpackStudioMesh } = await import('../../src/models/studio-format.ts');
    const { STUDIO_DEER } = await import('./deer-main.ts');
    mesh = { ...mesh, corners: unpackStudioMesh(STUDIO_DEER.mesh).corners };
  }
  console.log(`samples: ${samples.length}`);
  const t = tri(mesh, face);
  console.log(`face ${face}: corners ${t.join(', ')}`);
  for (const v of t) console.log(`  v${v} ${vec(mesh, v).map((x) => x.toFixed(4)).join(', ')}  ${weightsText(mesh, v)}`);
  for (const [g, a, b] of neighbors(mesh, face)) {
    const u = tri(mesh, g);
    const n = u.find((v) => v !== a && v !== b)!;
    const m = t.find((v) => v !== a && v !== b)!;
    const across = angle(mesh, m, a, b) + angle(mesh, n, a, b);
    console.log(
      `  neighbor ${g} over ${a}-${b}: far v${n} ${vec(mesh, n).map((x) => x.toFixed(4)).join(', ')} ${weightsText(mesh, n)}; corners across ${across.toFixed(1)}°`,
    );
  }
  console.log(countText('base', count(mesh, samples)));
  for (const [g] of neighbors(mesh, face)) {
    console.log(countText(`flip ${face}/${g}`, count(flipped(mesh, face, g), samples)));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
