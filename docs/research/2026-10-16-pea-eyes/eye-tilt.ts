// For a studio body: for tilts of the eye axis from the direction out of the middle of the head
// toward the mean normal of the head surface, the push along the axis that clears the front
// corners of the oval, the float of its rim, and the float of its back corners.
// Usage: ZMIN=<H> node docs/research/2026-10-16-pea-eyes/eye-tilt.ts <studio body> <L|R> [<src root>]
// ZMIN is the least depth in front of the middle, in H, of a front corner (0 by default). The
// numbers of the report come from the tree of 170d28f8, before eyePush().
import { Triangle, Vector3 } from 'three';

const root = process.argv[4] ?? '../../../src';
const { addEye, eyeMiddle } = await import(`${root}/models/eyes.ts`);
const { MeshBuilder } = await import(`${root}/models/mesh.ts`);
const { buildStudioBody, studioRigOf } = await import(`${root}/models/studio-body.ts`);
type Vec3 = [number, number, number];
type StudioBodyName = 'studio-bear' | 'studio-fox' | 'studio-polar-bear' | 'studio-rabbit';

const name = (process.argv[2] ?? 'studio-bear') as StudioBodyName;
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
const nearest = (p: Vector3) => {
  let best = Infinity, sign = 1; const near = new Vector3(), n = new Vector3(), at = new Vector3(), nn = new Vector3();
  for (const tri of tris) { tri.closestPointToPoint(p, near); const d = near.distanceTo(p); if (d < best - 1e-12) { best = d; tri.getNormal(n); nn.copy(n); at.copy(near); sign = Math.sign(p.clone().sub(near).dot(n)) || 1; } }
  return { d: sign * best, at, n: nn };
};
const side = (process.argv[3] ?? 'L') as 'L' | 'R';
const radial = new Vector3(...rig.body.eyes.directions[side]);
const surface = new Vector3(...rig.body.heads[`eye_${side}`]).addScaledVector(radial, 0.01 * h);
// The mean normal of the faces within half the eye height.
const normal = new Vector3();
const near = new Vector3();
for (const tri of tris) {
  if (tri.closestPointToPoint(surface, near).distanceTo(surface) <= 0.09 * h) {
    const n = new Vector3(); tri.getNormal(n); normal.addScaledVector(n, tri.getArea());
  }
}
normal.normalize();
console.log(name, side, 'surface normal up', (Math.asin(normal.y) * 180 / Math.PI).toFixed(0), 'deg; radial up', (Math.asin(radial.y) * 180 / Math.PI).toFixed(0));
for (const t of [0, 0.25, 0.5, 0.75, 1]) {
  const facing = radial.clone().lerp(normal, t).normalize();
  const corners = (push: number) => {
    const b = new MeshBuilder();
    const mid = eyeMiddle({ point: surface.toArray() as Vec3, normal: facing.toArray() as Vec3 }, h, false);
    const point = new Vector3(...mid.point).addScaledVector(facing, push * h).toArray() as Vec3;
    addEye(b, { eye: [0, 0, 0], eyeLight: [1, 1, 1] }, { point, normal: facing.toArray() as Vec3 }, h, 0);
    const m = b.build();
    const out: { p: Vector3; z: number; light: boolean }[] = [];
    for (let c = 0; c < m.bones.length; c++) {
      const p = new Vector3().fromArray(m.positions, c * 3);
      out.push({ p, z: p.clone().sub(new Vector3(...point)).dot(facing), light: (m.colors[c * 3] ?? 0) > 0.5 });
    }
    return out;
  };
  const zmin = Number(process.env["ZMIN"] ?? "0") * h + 1e-9;
  let push = 0;
  for (; push < 0.2; push += 0.002) {
    if (corners(push).filter((c) => !c.light && c.z > zmin).every((c) => nearest(c.p).d >= 0)) break;
  }
  const cs = corners(push).filter((c) => !c.light);
  const rim = cs.filter((c) => Math.abs(c.z) < 0.012 * h);
  const float = Math.max(...rim.map((c) => nearest(c.p).d)) / h;
  const back = Math.max(...cs.filter((c) => c.z < -1e-9).map((c) => nearest(c.p).d)) / h;
  console.log(`  tilt ${t}: up ${(Math.asin(facing.y) * 180 / Math.PI).toFixed(0)} deg, push ${push.toFixed(3)} H, rim float up to ${float.toFixed(3)} H, back corners out up to ${back.toFixed(3)} H`);
}
