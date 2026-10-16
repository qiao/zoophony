// The old eyes of each studio GLB file: the faces of each material, the vertices and the faces of
// each eye, the middle and the box of each eye in the units of the studio, and the open edges of the
// fur. Usage: node docs/research/2026-10-16-pea-eyes/old-eyes.ts
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Vector3 } from 'three';
import {
  ANIMALS, eyeVertices, headFactorOf, keptCorrectives, readGlb, studioGlbPath, weldMesh,
} from '../../../tools/studio-body.ts';

const ROOT = join(import.meta.dirname, '..', '..', '..');
for (const [animal, settings] of ANIMALS) {
  const path = studioGlbPath(animal, settings);
  const bytes = await readFile(path);
  const glb = readGlb(bytes);
  const names = glb.json.meshes.flatMap((m) => m.extras?.targetNames ?? []);
  const mesh = weldMesh(glb, keptCorrectives(settings, names));
  const eyes = eyeVertices(mesh);
  const mats = new Map<string, number>();
  for (const f of mesh.faces) {
    const m = mesh.vertices[f.corners[0]]?.material ?? '';
    mats.set(m, (mats.get(m) ?? 0) + 1);
  }
  console.log(`== ${animal} ${path.replace(ROOT, '')} headFactor ${headFactorOf(glb)} faces`, Object.fromEntries(mats));
  for (const side of ['L', 'R'] as const) {
    const set = eyes[side];
    const faces = mesh.faces.filter((f) => f.corners.every((c) => set.has(c)));
    const center = new Vector3();
    for (const v of set) center.add(mesh.vertices[v]!.position);
    center.divideScalar(set.size);
    const colors = new Map<string, number>();
    for (const f of faces) {
      const k = f.color.map((c) => c.toFixed(3)).join(',');
      colors.set(k, (colors.get(k) ?? 0) + 1);
    }
    // nearest fur vertex
    let best = Infinity;
    for (const v of mesh.vertices) {
      if (v.material === 'fur') best = Math.min(best, v.position.distanceTo(center));
    }
    const box = { min: new Vector3(Infinity, Infinity, Infinity), max: new Vector3(-Infinity, -Infinity, -Infinity) };
    for (const v of set) { box.min.min(mesh.vertices[v]!.position); box.max.max(mesh.vertices[v]!.position); }
    console.log(side, 'verts', set.size, 'faces', faces.length, 'center', center.toArray().map((x) => x.toFixed(4)),
      'size', box.max.clone().sub(box.min).toArray().map((x) => x.toFixed(4)), 'nearest fur vertex', best.toFixed(4), 'colors', Object.fromEntries(colors));
  }
  // open edges of the fur faces
  const count = new Map<string, number>();
  for (const f of mesh.faces) {
    if (mesh.vertices[f.corners[0]]?.material !== 'fur') continue;
    for (let k = 0; k < 3; k++) {
      const a = f.corners[k]!, b = f.corners[(k + 1) % 3]!;
      const key = a < b ? `${a} ${b}` : `${b} ${a}`;
      count.set(key, (count.get(key) ?? 0) + 1);
    }
  }
  const open = [...count].filter(([, n]) => n === 1).map(([k]) => k.split(' ').map(Number));
  const head = open.filter(([a]) => (mesh.vertices[a!]?.skin.find(([b]) => b === 'head')?.[1] ?? 0) > 0.5);
  console.log('open fur edges', open.length, 'on the head', head.length);
}
