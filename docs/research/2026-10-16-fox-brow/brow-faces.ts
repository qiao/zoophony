// Finds the dark faces near each old eye of a rig: each face with an Oklab lightness below
// <lightness> (0.45), or with an Oklab distance below 0.25 from the color of the gloss fan of the
// eye (the mean color of the dark faces of the old eye), whose middle lies within <reach> radii (3)
// of the middle of the fan, seen along the normal of the fan, and within 1.5 radii of its plane.
// The radius is the largest distance of a corner of the fan from its middle. A face "in the old
// eye" has its middle within 1 radius and half a radius of the plane, as the rule of 2026-10-15.
// It also writes the faces near each eye with their colors for draw.py into <out.json>.
// Usage: node docs/research/2026-10-16-fox-brow/brow-faces.ts <animal> [<glb>] [<out.json>] [<reach>] [<lightness>]
// An empty <glb> ('') reads the rig file of the repository.
import { readFile, writeFile } from 'node:fs/promises';
import { Vector3 } from 'three';
import { ANIMALS, eyeVertices, readGlb, studioGlbPath, weldMesh } from '../../../tools/studio-body.ts';

const animal = process.argv[2] ?? 'fox';
const glbPath = process.argv[3] || studioGlbPath(animal, ANIMALS.get(animal));
const reach = Number(process.argv[5] ?? 3);
const lightness = Number(process.argv[6] ?? 0.45);
const mesh = weldMesh(readGlb(await readFile(glbPath)), []);
const eyes = eyeVertices(mesh);
const fans = new Set([...eyes.L, ...eyes.R]);

/** Converts a linear sRGB color to Oklab (Ottosson 2020). */
function oklab([r, g, b]: readonly number[]): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r! + 0.5363325363 * g! + 0.0514459929 * b!);
  const m = Math.cbrt(0.2119034982 * r! + 0.6806995451 * g! + 0.1073969566 * b!);
  const s = Math.cbrt(0.0883024619 * r! + 0.2817188376 * g! + 0.6299787005 * b!);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
const hex = (c: readonly number[]) =>
  '#' + c.map((x) => Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)).toString(16).padStart(2, '0')).join('');

const out: Record<string, unknown> = {};
console.log(`${animal}: ${glbPath}, ${mesh.faces.length} faces`);
for (const side of ['L', 'R'] as const) {
  const set = eyes[side];
  const fan = mesh.faces.filter((f) => f.corners.every((c) => set.has(c)));
  const n = new Vector3();
  const c = new Vector3();
  for (const v of set) c.add(mesh.vertices[v]!.position);
  c.divideScalar(set.size);
  for (const f of fan) {
    const [a, b, d] = f.corners.map((k) => mesh.vertices[k]!.position);
    n.add(b!.clone().sub(a!).cross(d!.clone().sub(a!)));
  }
  n.normalize();
  let radius = 0;
  for (const v of set) radius = Math.max(radius, mesh.vertices[v]!.position.clone().sub(c).projectOnPlane(n).length());
  const u = new Vector3(0, 1, 0).projectOnPlane(n).normalize();
  const w = new Vector3().crossVectors(u, n);
  const eyeLab = oklab(fan[0]!.color);

  // The old eye of the rule of 2026-10-15: each face within reach 1 and half a radius of the plane.
  const near = new Set<number>();
  const faces = [];
  const dark = [];
  for (const [i, f] of mesh.faces.entries()) {
    if (f.corners.every((k) => fans.has(k))) continue;
    const ps = f.corners.map((k) => mesh.vertices[k]!.position.clone().sub(c));
    const mid = ps.reduce((s, p) => s.add(p), new Vector3()).divideScalar(3);
    const across = mid.clone().projectOnPlane(n).length() / radius;
    const depth = mid.dot(n) / radius;
    if (across <= 1 && Math.abs(depth) <= 0.5) near.add(i);
    if (across > reach + 0.2 || Math.abs(depth) > 1.5) continue;
    const lab = oklab(f.color);
    faces.push({ i, color: f.color, pts: ps.map((p) => [p.dot(w) / radius, p.dot(u) / radius]), depth: mid.dot(n) });
    if (across <= reach && (lab[0] < lightness || dist(lab, eyeLab) < 0.25)) {
      dark.push({ i, across, depth, lab, hex: hex(f.color), x: (side === "L" ? -1 : 1) * mid.dot(w) / radius, at: mid.clone().add(c).toArray().map((v) => v.toFixed(3)).join(","), y: mid.dot(u) / radius });
    }
  }
  const nearCorners = new Set([...near].flatMap((i) => mesh.faces[i]!.corners));
  console.log(
    `eye ${side}: middle ${c.toArray().map((x) => x.toFixed(4))}, radius ${radius.toFixed(4)} u, ` +
      `fan color ${hex(fan[0]!.color)} (Oklab L ${eyeLab[0].toFixed(3)}), ${near.size} faces within reach 1`,
  );
  for (const d of dark.toSorted((a, b) => a.across - b.across)) {
    const touch = mesh.faces[d.i]!.corners.some((k) => nearCorners.has(k));
    console.log(
      `  face ${d.i}: ${d.hex}, L ${d.lab[0].toFixed(3)}, dE to eye ${dist(d.lab, eyeLab).toFixed(3)}, ` +
        `${d.across.toFixed(2)} radii across (in ${d.x.toFixed(2)}, up ${d.y.toFixed(2)}), ` +
        `${d.depth.toFixed(2)} radii along the normal, at ${d.at}, ${near.has(d.i) ? 'in the old eye' : touch ? 'touches the old eye' : 'apart'}`,
    );
  }
  out[side] = {
    radius,
    faces,
    dark: dark.map((d) => d.i),
    fan: fan.map((f) => f.corners.map((k) => {
      const p = mesh.vertices[k]!.position.clone().sub(c);
      return [p.dot(w) / radius, p.dot(u) / radius];
    })),
  };
}
await writeFile(process.argv[4] ?? `${animal}-brow.json`, JSON.stringify(out));
