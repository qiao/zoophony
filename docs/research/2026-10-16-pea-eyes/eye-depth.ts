// For each studio body: the corners of each pea eye in front of a quarter of its half depth that
// lie inside the head (the sign of the nearest face of the body), the deepest of them, and the
// corners of the light inside the head.
// Usage: node docs/research/2026-10-16-pea-eyes/eye-depth.ts [<absolute src root>]
import { Triangle, Vector3 } from 'three';

const root = process.argv[2] ?? '../../../src';
const { MeshBuilder } = await import(`${root}/models/mesh.ts`);
const { boneIndex } = await import(`${root}/models/rig.ts`);
const { buildStudioBody, studioRigOf } = await import(`${root}/models/studio-body.ts`);

for (const name of ['studio-bear', 'studio-polar-bear', 'studio-rabbit', 'studio-fox']) {
  const builder = new MeshBuilder();
  buildStudioBody(builder, name, false);
  const mesh = builder.build();
  const rig = studioRigOf(name, false);
  const faces = rig.mesh.corners.length / 3;
  const tris: Triangle[] = [];
  for (let t = 0; t < faces; t++) {
    const p = (k: number) => new Vector3().fromArray(mesh.positions, (t * 3 + k) * 3);
    tris.push(new Triangle(p(0), p(1), p(2)));
  }
  const h = rig.body.eyes.headHeight;
  const inside = (p: Vector3): number => {
    let best = Infinity;
    let sign = 1;
    const near = new Vector3();
    const n = new Vector3();
    for (const tri of tris) {
      tri.closestPointToPoint(p, near);
      const d = near.distanceTo(p);
      if (d < best - 1e-9) {
        best = d;
        tri.getNormal(n);
        sign = Math.sign(p.clone().sub(near).dot(n)) || 1;
      }
    }
    return sign * best; // negative inside
  };
  for (const side of ['L', 'R'] as const) {
    const bone = boneIndex(`eye${side}`);
    const eye = new Vector3(...rig.body.heads[`eye_${side}`]);
    const normal = new Vector3(...(rig.body.eyes.directions ?? rig.body.eyes.normals)[side]);
    let ovalFront = 0, ovalFrontIn = 0, light = 0, lightIn = 0, deepest = 0;
    const seen = new Set<string>();
    for (let c = faces * 3; c < mesh.bones.length; c++) {
      if (mesh.bones[c] !== bone) continue;
      const p = new Vector3().fromArray(mesh.positions, c * 3);
      const key = p.toArray().map((x) => x.toFixed(6)).join();
      if (seen.has(key)) continue;
      seen.add(key);
      const isLight = (mesh.colors[c * 3] ?? 0) > 0.5;
      const d = inside(p);
      if (isLight) { light++; if (d < 0) lightIn++; }
      else if (p.clone().sub(eye).dot(normal) > 0.25 * 0.03 * h) { ovalFront++; if (d < 0) { ovalFrontIn++; deepest = Math.min(deepest, d); } }
    }
    console.log(`${name} ${side}: front oval corners inside ${ovalFrontIn}/${ovalFront}, deepest ${(deepest / h).toFixed(3)} H; light corners inside ${lightIn}/${light}; normal ${normal.toArray().map((x) => x.toFixed(2))}`);
  }
}
