/** Prints the faces of the seam of the rabbit: the faces of the cuts of both sides and each face
 * that shares a welded vertex with them, as JSON. */
import { STUDIO_RABBIT } from '../src/models/studio/rabbit.ts';
import { unpackStudioMesh } from '../src/models/studio-format.ts';
const m = unpackStudioMesh(STUDIO_RABBIT.mesh);
const P = m.positions;
const key = (v: number): string => `${P[v * 3]!.toFixed(5)} ${P[v * 3 + 1]!.toFixed(5)} ${P[v * 3 + 2]!.toFixed(5)}`;
const cut = new Set<number>([...(STUDIO_RABBIT.caps ?? []), 1822, 1299, 1298, 1297, 1826, 1825, 1044, 1824, 1045, 1046, 1035, 1036]);
const verts = new Set<string>();
for (const f of cut) for (let k = 0; k < 3; k++) verts.add(key(m.corners[f * 3 + k]!));
const seam: number[] = [];
for (let f = 0; f < m.corners.length / 3; f++) {
  if ([0, 1, 2].some((k) => verts.has(key(m.corners[f * 3 + k]!)))) seam.push(f);
}
console.log(JSON.stringify(seam));
