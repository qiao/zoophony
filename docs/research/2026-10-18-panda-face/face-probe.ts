/**
 * Measures the face of the studio panda: the size of each eye patch, the light holes in the
 * patches, and the smile line, with the faces that it shares a corner with.
 * Usage: node docs/research/2026-10-18-panda-face/face-probe.ts [<module.ts>]
 *
 * The module is `src/models/studio/panda.ts` by default. The places are in the axes of the model
 * (meters, the panda faces -z, its left eye at -x). The patch region is the front of the head
 * beside the muzzle, above the mouth, as in the mock of phase 1 (`variants.py`).
 */
import { resolve } from 'node:path';

import { FINISH_ORDER } from '../../../src/models/mesh.ts';
import {
  STUDIO_BONES,
  STUDIO_INFLUENCES,
  unpackStudioMesh,
} from '../../../src/models/studio-format.ts';

const path = resolve(process.argv[2] ?? 'src/models/studio/panda.ts');
const { STUDIO_PANDA } = (await import(path)) as typeof import('../../../src/models/studio/panda.ts');
const mesh = unpackStudioMesh(STUDIO_PANDA.mesh);
const head = STUDIO_BONES.indexOf('head');
const at = (v: number): [number, number, number] => [
  mesh.positions[v * 3] ?? 0,
  mesh.positions[v * 3 + 1] ?? 0,
  mesh.positions[v * 3 + 2] ?? 0,
];
const onHead = (v: number): boolean => {
  let share = 0;
  for (let k = 0; k < STUDIO_INFLUENCES; k++) {
    if (mesh.joints[v * STUDIO_INFLUENCES + k] === head) {
      share += mesh.weights[v * STUDIO_INFLUENCES + k] ?? 0;
    }
  }
  return share > 0.5;
};
/** Gives the Oklab lightness of a linear color. */
const lightness = (r: number, g: number, b: number): number => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
};

interface Face {
  readonly t: number;
  readonly corners: readonly number[];
  readonly points: readonly (readonly [number, number, number])[];
  readonly center: readonly [number, number, number];
  readonly normalZ: number;
  readonly area: number;
  readonly dark: boolean;
  readonly finish: string;
}
const faces: Face[] = [];
for (let t = 0; t < mesh.corners.length / 3; t++) {
  const corners = [0, 1, 2].map((k) => mesh.corners[t * 3 + k] ?? 0);
  if (!corners.every(onHead)) {
    continue;
  }
  const points = corners.map(at);
  const [a, b, c] = points as [[number, number, number], [number, number, number], [number, number, number]];
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!];
  const length = Math.hypot(n[0]!, n[1]!, n[2]!);
  faces.push({
    t,
    corners,
    points,
    center: [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3],
    normalZ: n[2]! / length,
    area: length / 2,
    dark: lightness(mesh.colors[t * 3]!, mesh.colors[t * 3 + 1]!, mesh.colors[t * 3 + 2]!) < 0.5,
    finish: FINISH_ORDER[mesh.finishes[t] ?? 0] ?? 'matte',
  });
}

const eyeY = (STUDIO_PANDA.heads.eye_L[1] + STUDIO_PANDA.heads.eye_R[1]) / 2;
const band = faces.flatMap((f) => f.points).filter((p) => Math.abs(p[1] - eyeY) < 0.03);
const headWidth = Math.max(...band.map((p) => p[0])) - Math.min(...band.map((p) => p[0]));
const inRegion = (f: Face): boolean =>
  f.finish === 'matte' &&
  f.center[2] < -0.3 &&
  Math.abs(f.center[0]) > 0.035 &&
  Math.abs(f.center[0]) < 0.2 &&
  f.center[1] > 1.215 &&
  f.center[1] < 1.46;
const percent = (x: number): string => `${((x / headWidth) * 100).toFixed(1)}%`;
console.log(`module ${path}`);
console.log(`head faces ${faces.length}, head width at the eye height ${headWidth.toFixed(3)} m`);
for (const [side, sign] of [['left', -1], ['right', 1]] as const) {
  const patch = faces.filter((f) => inRegion(f) && f.dark && f.center[0] * sign > 0);
  const xs = patch.flatMap((f) => f.points.map((p) => p[0]));
  const ys = patch.flatMap((f) => f.points.map((p) => p[1]));
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  const front = patch.reduce((sum, f) => sum + f.area * Math.abs(f.normalZ), 0);
  console.log(
    `${side} patch: ${patch.length} faces, ${(w * 100).toFixed(1)} x ${(h * 100).toFixed(1)} cm (${percent(w)} x ${percent(h)} of the head width), front area ${(front * 1e4).toFixed(1)} cm2 (${((front / headWidth ** 2) * 100).toFixed(1)}% of the head width squared)`,
  );
}

// A light hole: a light face of the patch region whose neighbors over its three edges are dark.
const edgeFaces = new Map<string, Face[]>();
const key = (a: number, b: number): string => (a < b ? `${a},${b}` : `${b},${a}`);
for (const f of faces) {
  for (let k = 0; k < 3; k++) {
    const e = key(f.corners[k]!, f.corners[(k + 1) % 3]!);
    edgeFaces.set(e, [...(edgeFaces.get(e) ?? []), f]);
  }
}
const holes = faces.filter(
  (f) =>
    inRegion(f) &&
    !f.dark &&
    [0, 1, 2].every((k) =>
      (edgeFaces.get(key(f.corners[k]!, f.corners[(k + 1) % 3]!)) ?? [])
        .filter((g) => g !== f)
        .every((g) => g.dark),
    ),
);
console.log(`light holes in the patches: ${holes.length}`);

const smile = faces.filter(
  (f) =>
    f.finish === 'matte' &&
    f.dark &&
    Math.abs(f.center[0]) < 0.13 &&
    f.center[1] > 1.15 &&
    f.center[1] < 1.215 &&
    f.center[2] < -0.38,
);
const nose = faces.filter((f) => f.finish !== 'matte' && f.center[2] < -0.42);
const patches = faces.filter((f) => inRegion(f) && f.dark);
const touches = (set: readonly Face[]): number => {
  const corners = new Set(set.flatMap((f) => f.corners));
  return smile.filter((f) => f.corners.some((c) => corners.has(c))).length;
};
console.log(`smile: ${smile.length} dark faces under the nose`);
if (smile.length > 0) {
  const middle = smile.filter((f) => Math.abs(f.center[0]) < 0.03);
  const ends = smile.filter((f) => Math.abs(f.center[0]) > 0.08);
  const low = Math.min(...middle.flatMap((f) => f.points.map((p) => p[1])));
  const high = Math.max(...ends.flatMap((f) => f.points.map((p) => p[1])));
  const xs = smile.flatMap((f) => f.points.map((p) => p[0]));
  console.log(
    `smile: ${((Math.max(...xs) - Math.min(...xs)) * 100).toFixed(1)} cm wide (${percent(Math.max(...xs) - Math.min(...xs))} of the head width), the corners rise ${((high - low) * 100).toFixed(1)} cm above the lowest point of the middle`,
  );
  console.log(
    `smile: ${touches(nose)} faces share a corner with the nose, ${touches(patches)} with the eye patches`,
  );
}
