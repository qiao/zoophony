/**
 * Measures the crease where the belly meets the top of the thigh of the seated red fox and the
 * rabbit, in the seated bind of the studio body (model axes, meters, the body faces -z):
 *
 * - the seam: the edges that a face of the trunk (hips, spine, spine1) and a face of a thigh share
 *   in front of the hip joints, with the fold angle between their normals, and the edges whose
 *   fold is above the crease angle of the smooth normals (a hard edge);
 * - the luminance of the face colors at the seam, against the mean of the fur faces of the trunk
 *   and the thighs;
 * - the slits: a trunk face and a thigh face that share no vertex, face each other (normals with a
 *   dot below -0.3), and lie within 2 cm, with the smallest gap.
 *
 * Usage, from the root of the worktree: node docs/research/2026-10-16-hip-open/crease-probe.ts
 */
import { STUDIO_FOX } from '../../../src/models/studio/fox.ts';
import { STUDIO_RABBIT } from '../../../src/models/studio/rabbit.ts';
import { STUDIO_BONES, unpackStudioMesh } from '../../../src/models/studio-format.ts';
import type { StudioBody } from '../../../src/models/studio-format.ts';

const deg = (r: number): string => ((r * 180) / Math.PI).toFixed(1);

for (const [name, body] of [
  ['fox', STUDIO_FOX],
  ['rabbit', STUDIO_RABBIT],
] as [string, StudioBody][]) {
  const m = unpackStudioMesh(body.mesh);
  const p = m.positions;
  const bone = (n: string): number => STUDIO_BONES.indexOf(n as (typeof STUDIO_BONES)[number]);
  const trunk = new Set(['hips', 'spine', 'spine1'].map(bone));
  const thigh = new Set(['thigh_L', 'thigh_R'].map(bone));
  const faces = m.corners.length / 3;
  const main = new Int32Array(faces);
  const normal = new Float32Array(faces * 3);
  const mid = new Float32Array(faces * 3);
  const lum = new Float32Array(faces);
  for (let f = 0; f < faces; f++) {
    const w = new Map<number, number>();
    for (let k = 0; k < 3; k++) {
      const v = m.corners[f * 3 + k] ?? 0;
      for (let j = 0; j < 4; j++) {
        const b = m.joints[v * 4 + j] ?? 0;
        w.set(b, (w.get(b) ?? 0) + (m.weights[v * 4 + j] ?? 0));
      }
    }
    main[f] = [...w.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    const [a, b, c] = [0, 1, 2].map((k) => (m.corners[f * 3 + k] ?? 0) * 3);
    const u = [0, 1, 2].map((i) => (p[b! + i] ?? 0) - (p[a! + i] ?? 0));
    const s = [0, 1, 2].map((i) => (p[c! + i] ?? 0) - (p[a! + i] ?? 0));
    const n = [u[1]! * s[2]! - u[2]! * s[1]!, u[2]! * s[0]! - u[0]! * s[2]!, u[0]! * s[1]! - u[1]! * s[0]!];
    const len = Math.hypot(...n) || 1;
    for (let i = 0; i < 3; i++) {
      normal[f * 3 + i] = n[i]! / len;
      mid[f * 3 + i] = ((p[a! + i] ?? 0) + (p[b! + i] ?? 0) + (p[c! + i] ?? 0)) / 3;
    }
    const col = [0, 1, 2].map((i) => m.colors[f * 3 + i] ?? 0);
    lum[f] = 0.2126 * col[0]! + 0.7152 * col[1]! + 0.0722 * col[2]!;
  }
  const hips = body.heads.thigh_L;
  const hipZ = hips[2];
  const hipY = hips[1];
  // The seam edges.
  const edges = new Map<string, number[]>();
  for (let f = 0; f < faces; f++) {
    for (let k = 0; k < 3; k++) {
      const a = m.corners[f * 3 + k] ?? 0;
      const b = m.corners[f * 3 + ((k + 1) % 3)] ?? 0;
      const key = a < b ? `${a} ${b}` : `${b} ${a}`;
      edges.set(key, [...(edges.get(key) ?? []), f]);
    }
  }
  const folds: number[] = [];
  const seamFaces = new Set<number>();
  for (const [, fs] of edges) {
    if (fs.length !== 2) {
      continue;
    }
    const [f, g] = fs as [number, number];
    const pair = (trunk.has(main[f]!) && thigh.has(main[g]!)) || (trunk.has(main[g]!) && thigh.has(main[f]!));
    if (!pair) {
      continue;
    }
    const z = (mid[f * 3 + 2]! + mid[g * 3 + 2]!) / 2;
    const y = (mid[f * 3 + 1]! + mid[g * 3 + 1]!) / 2;
    // In front of the hip joints (the body faces -z) and not under the seat.
    if (z > hipZ + 0.02 || y < hipY - 0.06) {
      continue;
    }
    const dot = normal[f * 3]! * normal[g * 3]! + normal[f * 3 + 1]! * normal[g * 3 + 1]! + normal[f * 3 + 2]! * normal[g * 3 + 2]!;
    folds.push(Math.acos(Math.max(-1, Math.min(1, dot))));
    seamFaces.add(f);
    seamFaces.add(g);
  }
  folds.sort((a, b) => b - a);
  const hard = folds.filter((a) => a > (body.crease * Math.PI) / 180).length;
  let fur = 0;
  let furCount = 0;
  for (let f = 0; f < faces; f++) {
    if ((trunk.has(main[f]!) || thigh.has(main[f]!)) && m.finishes[f] === m.finishes[0]) {
      fur += lum[f]!;
      furCount++;
    }
  }
  let seam = 0;
  for (const f of seamFaces) {
    seam += lum[f]!;
  }
  // The slits: facing trunk and thigh faces in front of the hip joints, with no shared vertex.
  let gap = Infinity;
  let slits = 0;
  const front = [...Array(faces).keys()].filter(
    (f) => mid[f * 3 + 2]! < hipZ + 0.02 && mid[f * 3 + 1]! > hipY - 0.06 && mid[f * 3 + 1]! < hipY + 0.25,
  );
  for (const f of front) {
    if (!trunk.has(main[f]!)) {
      continue;
    }
    for (const g of front) {
      if (!thigh.has(main[g]!)) {
        continue;
      }
      const dot = normal[f * 3]! * normal[g * 3]! + normal[f * 3 + 1]! * normal[g * 3 + 1]! + normal[f * 3 + 2]! * normal[g * 3 + 2]!;
      if (dot > -0.3) {
        continue;
      }
      const d = Math.hypot(mid[f * 3]! - mid[g * 3]!, mid[f * 3 + 1]! - mid[g * 3 + 1]!, mid[f * 3 + 2]! - mid[g * 3 + 2]!);
      if (d < 0.02) {
        slits++;
      }
      gap = Math.min(gap, d);
    }
  }
  console.log(
    `${name}: crease ${body.crease} deg; seam edges ${folds.length}, fold angle max ${folds.length ? deg(folds[0]!) : '-'} deg, median ${folds.length ? deg(folds[Math.floor(folds.length / 2)]!) : '-'} deg, ${hard} above the crease angle; seam faces ${seamFaces.size}, luminance ${(seam / Math.max(1, seamFaces.size)).toFixed(3)} against the fur ${(fur / furCount).toFixed(3)}; facing trunk and thigh faces within 2 cm: ${slits}, nearest ${(gap * 100).toFixed(2)} cm`,
  );
}
