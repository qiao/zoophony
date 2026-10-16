// Writes the faces near each old eye of a rig, seen along the normal of its fan, with their colors.
// Usage: node docs/research/2026-10-16-pea-eyes/eye-rim.ts <animal> [<glb>] [<out.json>], then
// uv run --no-project --with pillow python -I docs/research/2026-10-16-pea-eyes/draw.py <animal> <json> <png>
import { readFile, writeFile } from 'node:fs/promises';
import { Vector3 } from 'three';
import { ANIMALS, eyeVertices, readGlb, studioGlbPath, weldMesh } from '../../../tools/studio-body.ts';

const animal = process.argv[2] ?? 'fox';
const glbPath = process.argv[3] ?? studioGlbPath(animal, ANIMALS.get(animal));
const mesh = weldMesh(readGlb(await readFile(glbPath)), []);
const eyes = eyeVertices(mesh);
const out: Record<string, unknown> = {};
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
  const faces = [];
  for (const [i, f] of mesh.faces.entries()) {
    if (f.corners.every((k) => set.has(k))) continue;
    const ps = f.corners.map((k) => mesh.vertices[k]!.position.clone().sub(c));
    const mid = ps.reduce((s, p) => s.add(p), new Vector3()).divideScalar(3);
    if (mid.clone().projectOnPlane(n).length() > 2.2 * radius || Math.abs(mid.dot(n)) > 0.03) continue;
    const toward = mesh.vertices[f.corners[0]]!.material;
    faces.push({ i, material: toward, color: f.color, pts: ps.map((p) => [p.dot(w) / radius, p.dot(u) / radius]), depth: mid.dot(n) });
  }
  out[side] = { radius, faces, fan: fan.map((f) => f.corners.map((k) => { const p = mesh.vertices[k]!.position.clone().sub(c); return [p.dot(w) / radius, p.dot(u) / radius]; })) };
}
await writeFile(process.argv[4] ?? `${animal}-eyes.json`, JSON.stringify(out));
console.log('wrote', animal);
