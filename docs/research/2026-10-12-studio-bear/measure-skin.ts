/**
 * Measures the skin of the studio bear in the conductor poses of all demos, for two routes:
 *
 * - A: the old route of 2026-10-10: the bind mesh of the player (arms down), two bones of the
 *   player for each vertex, no twist bone, no corrective shapes.
 * - B: the skin of the studio: the bind pose of the studio, four bones for each vertex, the
 *   twist bone, and the corrective shapes, driven by `poseStudioBones()`.
 *
 * Run from the repository root: `node docs/research/2026-10-12-studio-bear/measure-skin.ts`.
 * It prints the counts of folded faces, of collapsed faces, and the depth of the paws and the
 * baton in the trunk and the head, for each demo and each route.
 */
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { CONDUCTOR } from '../../../src/models/cast.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh } from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, ofConductor, sceneOf } from '../../../src/pose/test-scene.ts';
import type { Transport } from '../../../src/pose/types.ts';

const STEP = Number(process.env['STEP'] ?? 0.25);
const ARM_STEP = 0.05;
const CLOSED_EYE = 0.05;

type Tri = [number, number, number];

/** Face normal (not normalized) of three points in a flat array. */
function normal(p: ArrayLike<number>, a: number, b: number, c: number, out: number[]): number[] {
  const ux = p[b * 3]! - p[a * 3]!, uy = p[b * 3 + 1]! - p[a * 3 + 1]!, uz = p[b * 3 + 2]! - p[a * 3 + 2]!;
  const vx = p[c * 3]! - p[a * 3]!, vy = p[c * 3 + 1]! - p[a * 3 + 1]!, vz = p[c * 3 + 2]! - p[a * 3 + 2]!;
  out[0] = uy * vz - uz * vy; out[1] = uz * vx - ux * vz; out[2] = ux * vy - uy * vx;
  return out;
}

/** Applies the cofactor of a 3x3 linear part (the normal map) to a vector. */
function cofactor(m: number[], v: number[]): number[] {
  // m is column-major 3x3 as [m00 m10 m20 m01 m11 m21 m02 m12 m22]
  const a = m[0]!, b = m[3]!, c = m[6]!, d = m[1]!, e = m[4]!, f = m[7]!, g = m[2]!, h = m[5]!, i = m[8]!;
  const c00 = e * i - f * h, c01 = -(d * i - f * g), c02 = d * h - e * g;
  const c10 = -(b * i - c * h), c11 = a * i - c * g, c12 = -(a * h - b * g);
  const c20 = b * f - c * e, c21 = -(a * f - c * d), c22 = a * e - b * d;
  return [c00 * v[0]! + c01 * v[1]! + c02 * v[2]!, c10 * v[0]! + c11 * v[1]! + c12 * v[2]!, c20 * v[0]! + c21 * v[1]! + c22 * v[2]!];
}

interface Stats { collapseLabel: string; folded: number; foldedSamples: number; collapsed: number; collapsedSamples: number; minArea: number; worst: string; samples: number; depth: number; depthLabel: string }

function newStats(): Stats {
  return { collapseLabel: '', folded: 0, foldedSamples: 0, collapsed: 0, collapsedSamples: 0, minArea: Infinity, worst: '', samples: 0, depth: 0, depthLabel: '' };
}

/** Point to triangle squared distance and the closest point (Ericson). */
function closest(px: number, py: number, pz: number, p: ArrayLike<number>, a: number, b: number, c: number, out: number[]): number {
  const ax = p[a * 3]!, ay = p[a * 3 + 1]!, az = p[a * 3 + 2]!;
  const bx = p[b * 3]!, by = p[b * 3 + 1]!, bz = p[b * 3 + 2]!;
  const cx = p[c * 3]!, cy = p[c * 3 + 1]!, cz = p[c * 3 + 2]!;
  const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  let qx: number, qy: number, qz: number;
  if (d1 <= 0 && d2 <= 0) { qx = ax; qy = ay; qz = az; } else {
    const bpx = px - bx, bpy = py - by, bpz = pz - bz;
    const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
    if (d3 >= 0 && d4 <= d3) { qx = bx; qy = by; qz = bz; } else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); qx = ax + v * abx; qy = ay + v * aby; qz = az + v * abz; } else {
        const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
        const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
        if (d6 >= 0 && d5 <= d6) { qx = cx; qy = cy; qz = cz; } else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); qx = ax + w * acx; qy = ay + w * acy; qz = az + w * acz; } else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); qx = bx + w * (cx - bx); qy = by + w * (cy - by); qz = bz + w * (cz - bz); } else {
              const denom = 1 / (va + vb + vc); const v = vb * denom, w = vc * denom;
              qx = ax + abx * v + acx * w; qy = ay + aby * v + acy * w; qz = az + abz * v + acz * w;
            }
          }
        }
      }
    }
  }
  out[0] = qx; out[1] = qy; out[2] = qz;
  return (px - qx) ** 2 + (py - qy) ** 2 + (pz - qz) ** 2;
}

const demos = await patchedDemos();
const foldBones = { A: new Map<number, number>(), B: new Map<number, number>() };
const BONE_LIST = (await import('../../../src/models/rig.ts')).BONE_NAMES;
const totals = { A: newStats(), B: newStats() };
const rows: string[] = [];
for (const demo of demos) {
  const scene = sceneOf(demo.bytes);
  if (!scene.plan.conductor) continue;
  const bear = scene.models.get(CONDUCTOR.species, CONDUCTOR.instrument, 4);
  const rig = bear.studio!;
  const plan = { ...scene.plan, players: [] };
  const buffer = createScenePose(plan);
  const audible = allAudible(scene.score);
  const studioPose = createStudioPose();
  const nB = rig.mesh.positions.length / 3;
  const posedB = new Float32Array(nB * 3);
  const trisB: Tri[] = [];
  for (let t = 0; t < rig.mesh.corners.length; t += 3) trisB.push([rig.mesh.corners[t]!, rig.mesh.corners[t + 1]!, rig.mesh.corners[t + 2]!]);
  const bodyCorners = rig.mesh.corners.length;
  const mesh = bear.mesh;
  const posedA = new Float32Array(mesh.positions.length);
  // Bind normals of each route.
  const n0A: number[][] = [], n0B: number[][] = [], area0A: number[] = [], area0B: number[] = [];
  const tmp = [0, 0, 0];
  for (const [t, [a, b, c]] of trisB.entries()) {
    const nb = normal(rig.mesh.positions, a, b, c, [0, 0, 0]); n0B.push(nb); area0B.push(Math.hypot(...nb));
    const na = normal(mesh.positions, t * 3, t * 3 + 1, t * 3 + 2, [0, 0, 0]); n0A.push(na); area0A.push(Math.hypot(...na));
  }
  // Groups by the main bone of the player of the first corner.
  const trunk = new Set(['hips', 'spine', 'chest', 'neck', 'head'].map((b) => boneIndex(b as never)));
  const paw = new Set(['handL', 'fingersL', 'handR', 'fingersR'].map((b) => boneIndex(b as never)));
  const trunkTris: number[] = [];
  const pawCorners: number[] = [];
  for (let t = 0; t < trisB.length; t++) {
    if (trunk.has(mesh.bones[t * 3]!)) trunkTris.push(t);
  }
  for (let c = 0; c < mesh.bones.length; c++) {
    if (c >= bodyCorners || paw.has(mesh.bones[c]!)) pawCorners.push(c);
  }
  const local = { A: newStats(), B: newStats() };
  const eyes = new Set(['eyeL', 'eyeR'].map((b) => boneIndex(b as never)));
  const lin = new Array(9).fill(0);
  const measure = (label: string, route: 'A' | 'B') => {
    const st = local[route];
    st.samples++;
    let folded = 0, collapsed = 0;
    const m = studioPose.matrices;
    for (let t = 0; t < trisB.length; t++) {
      // Linear part averaged over the corners.
      lin.fill(0);
      const corners = route === 'B' ? trisB[t]! : [t * 3, t * 3 + 1, t * 3 + 2];
      for (const v of corners) {
        if (route === 'B') {
          for (let k = 0; k < 4; k++) {
            const w = rig.mesh.weights[v * 4 + k]!; if (!w) continue; const j = rig.mesh.joints[v * 4 + k]! * 16;
            for (let col = 0; col < 3; col++) for (let row = 0; row < 3; row++) lin[col * 3 + row] += (w / 3) * m[j + col * 4 + row]!;
          }
        } else {
          const w = mesh.blendWeights[v]!;
          for (const [bone, ww] of [[mesh.bones[v]!, 1 - w], [mesh.blendBones[v]!, w]] as const) {
            if (!ww) continue; const j = (STUDIO_BONES.length + bone) * 16;
            for (let col = 0; col < 3; col++) for (let row = 0; row < 3; row++) lin[col * 3 + row] += (ww / 3) * m[j + col * 4 + row]!;
          }
        }
      }
      const expected = cofactor(lin, route === 'B' ? n0B[t]! : n0A[t]!);
      const n1 = route === 'B' ? normal(posedB, trisB[t]![0], trisB[t]![1], trisB[t]![2], tmp) : normal(posedA, t * 3, t * 3 + 1, t * 3 + 2, tmp);
      const area = Math.hypot(n1[0]!, n1[1]!, n1[2]!);
      const dot = (n1[0]! * expected[0]! + n1[1]! * expected[1]! + n1[2]! * expected[2]!) / (area * Math.hypot(...expected) + 1e-20);
      if (dot < 0) { folded++; const bone = mesh.bones[t * 3]!; foldBones[route].set(bone, (foldBones[route].get(bone) ?? 0) + 1); }
      const ratio = area / ((route === 'B' ? area0B[t] : area0A[t])! + 1e-20);
      if (ratio < 0.25 && !eyes.has(mesh.bones[t * 3]!)) collapsed++;
      if (ratio < st.minArea && !eyes.has(mesh.bones[t * 3]!)) { st.minArea = ratio; }
    }
    st.folded = Math.max(st.folded, folded);
    if (folded > 0) { st.foldedSamples++; if (folded >= st.folded) st.worst = `${label} (${folded})`; }
    if (collapsed > st.collapsed) st.collapseLabel = `${label} (${collapsed})`;
    st.collapsed = Math.max(st.collapsed, collapsed);
    if (collapsed > 0) st.collapsedSamples++;
  };
  const depthOf = (label: string) => {
    // Paws and baton (route B places) against the trunk and the head (route B).
    const st = local.B;
    const q = [0, 0, 0];
    let worst = 0;
    for (const c of pawCorners) {
      let px: number, py: number, pz: number;
      if (c < bodyCorners) { const v = rig.mesh.corners[c]!; px = posedB[v * 3]!; py = posedB[v * 3 + 1]!; pz = posedB[v * 3 + 2]!; }
      else { const j = (STUDIO_BONES.length + mesh.bones[c]!) * 16; const m = studioPose.matrices; const x = mesh.positions[c * 3]!, y = mesh.positions[c * 3 + 1]!, z = mesh.positions[c * 3 + 2]!; px = m[j]! * x + m[j + 4]! * y + m[j + 8]! * z + m[j + 12]!; py = m[j + 1]! * x + m[j + 5]! * y + m[j + 9]! * z + m[j + 13]!; pz = m[j + 2]! * x + m[j + 6]! * y + m[j + 10]! * z + m[j + 14]!; }
      let best = Infinity, bestT = -1; const bq = [0, 0, 0];
      for (const t of trunkTris) {
        const [a, b, cc] = trisB[t]!;
        // quick reject
        const ax = posedB[a * 3]!, ay = posedB[a * 3 + 1]!, az = posedB[a * 3 + 2]!;
        if (Math.abs(ax - px) > 0.25 || Math.abs(ay - py) > 0.25 || Math.abs(az - pz) > 0.25) continue;
        const d = closest(px, py, pz, posedB, a, b, cc, q);
        if (d < best) { best = d; bestT = t; bq[0] = q[0]!; bq[1] = q[1]!; bq[2] = q[2]!; }
      }
      if (bestT < 0 || best > 0.03 ** 2) continue;
      const [a, b, cc] = trisB[bestT]!;
      const n = normal(posedB, a, b, cc, [0, 0, 0]);
      const s = (px - bq[0]!) * n[0]! + (py - bq[1]!) * n[1]! + (pz - bq[2]!) * n[2]!;
      if (s < 0) worst = Math.max(worst, Math.sqrt(best));
    }
    if (worst > st.depth) { st.depth = worst; st.depthLabel = label; }
  };
  const sample = (song: number, wall: number, transport: Transport, label: string, withDepth: boolean) => {
    const pose = ofConductor(poseAt(plan, song, wall, transport, audible, buffer).conductor);
    poseStudioBones(rig, bear.skeleton, pose.rotations, pose.rootOffset, Math.max(CLOSED_EYE, 1 - pose.blink), studioPose);
    skinStudioMesh(rig.mesh, studioPose, posedB);
    // Route A: two bones of the player.
    const m = studioPose.matrices;
    for (let c = 0; c < bodyCorners; c++) {
      const w = mesh.blendWeights[c]!;
      const x = mesh.positions[c * 3]!, y = mesh.positions[c * 3 + 1]!, z = mesh.positions[c * 3 + 2]!;
      let ox = 0, oy = 0, oz = 0;
      for (const [bone, ww] of [[mesh.bones[c]!, 1 - w], [mesh.blendBones[c]!, w]] as const) {
        if (!ww) continue; const j = (STUDIO_BONES.length + bone) * 16;
        ox += ww * (m[j]! * x + m[j + 4]! * y + m[j + 8]! * z + m[j + 12]!);
        oy += ww * (m[j + 1]! * x + m[j + 5]! * y + m[j + 9]! * z + m[j + 13]!);
        oz += ww * (m[j + 2]! * x + m[j + 6]! * y + m[j + 10]! * z + m[j + 14]!);
      }
      posedA[c * 3] = ox; posedA[c * 3 + 1] = oy; posedA[c * 3 + 2] = oz;
    }
    measure(label, 'A');
    measure(label, 'B');
    if (withDepth) depthOf(label);
  };
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  for (let song = start; song <= scene.score.durationSec; song += STEP) {
    sample(song, 10 + song - start, PLAYING, `play ${song.toFixed(2)} s`, true);
  }
  const play: Transport = { ...PLAYING, changedAtWall: 10 };
  const ended: Transport = { ...PLAYING, playing: false, changedAtWall: 10, before: PLAYING };
  for (let wall = 10; wall < 14; wall += ARM_STEP) {
    sample(Math.min(0, start + wall - 10), wall, play, `lift wall ${wall.toFixed(2)}`, true);
    sample(scene.score.durationSec, wall, ended, `end wall ${wall.toFixed(2)}`, true);
  }
  for (const route of ['A', 'B'] as const) {
    const s = local[route];
    rows.push(`| ${demo.file} | ${route} | ${s.samples} | ${s.folded} | ${((100 * s.foldedSamples) / s.samples).toFixed(1)}% | ${s.collapsed} | ${((100 * s.collapsedSamples) / s.samples).toFixed(1)}% | ${s.minArea.toFixed(3)} | ${route === 'B' ? (s.depth * 1000).toFixed(1) + ' mm (' + s.depthLabel + ')' : ''} | ${s.worst} | ${s.collapseLabel} |`);
    const T = totals[route];
    T.samples += s.samples; T.folded = Math.max(T.folded, s.folded); T.foldedSamples += s.foldedSamples; T.collapsed = Math.max(T.collapsed, s.collapsed); T.collapsedSamples += s.collapsedSamples; T.minArea = Math.min(T.minArea, s.minArea); T.depth = Math.max(T.depth, s.depth);
  }
  console.error(`done ${demo.file}`);
}
console.log('| Demo | Route | Samples | Most folded faces | Samples with a fold | Most collapsed faces | Samples with a collapse | Smallest area ratio | Deepest paw or baton point | Worst fold | Worst collapse |');
console.log('|---|---|---:|---:|---:|---:|---:|---:|---|---|---|');
for (const r of rows) console.log(r);
for (const route of ['A', 'B'] as const) {
  const T = totals[route];
  console.log(`| all | ${route} | ${T.samples} | ${T.folded} | ${((100 * T.foldedSamples) / T.samples).toFixed(1)}% | ${T.collapsed} | ${((100 * T.collapsedSamples) / T.samples).toFixed(1)}% | ${T.minArea.toFixed(3)} | ${route === 'B' ? (T.depth * 1000).toFixed(1) + ' mm' : ''} | |`);
}

for (const route of ['A', 'B'] as const) {
  console.log(`folded face samples by the main bone, route ${route}:`, [...foldBones[route]].toSorted((a, b) => b[1] - a[1]).map(([b, n]) => `${BONE_LIST[b]} ${n}`).join(', '));
}
