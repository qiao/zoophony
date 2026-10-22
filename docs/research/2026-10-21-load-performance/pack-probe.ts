// Proves that the dense pack of the studio meshes gives the geometry of `0bd2e24a`, byte for
// byte, and prints the sizes of the packed meshes after gzip.
//
// The probe needs the source tree of `0bd2e24a` in `scratch/base/`:
//   rm -rf scratch/base && mkdir -p scratch/base && git archive 0bd2e24a src | tar -x -C scratch/base
// Usage: node docs/research/2026-10-21-load-performance/pack-probe.ts
//
// For each of the 18 bodies and each stance, it compares the mesh of the studio rig (the places,
// the bones and the weights of the skin, the corners of the triangles, the colors, the finishes,
// and the corrective shapes), the colors of each other palette, and the smooth normals with their
// changes for the corrective shapes.
import { gzipSync } from 'node:zlib';
import * as now from '../../../src/models/studio-body.ts';
import * as nowFormat from '../../../src/models/studio-format.ts';
import type { StudioBodyName } from '../../../src/models/studio-body.ts';

const base = (await import('../../../scratch/base/src/models/studio-body.ts')) as typeof now;
const baseFormat = (await import('../../../scratch/base/src/models/studio-format.ts')) as typeof nowFormat;

type Typed = Float32Array | Uint8Array | Uint16Array | Uint32Array;
const bytes = (a: Typed): Buffer => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
const same = (a: Typed, b: Typed): boolean => a.constructor === b.constructor && bytes(a).equals(bytes(b));

let checks = 0;
let failures = 0;
const check = (label: string, ok: boolean): void => {
  checks += 1;
  if (!ok) {
    failures += 1;
    console.log(`differs: ${label}`);
  }
};
let gzBase = 0;
let gzNow = 0;
for (const name of Object.keys(now.STUDIO_BODIES) as StudioBodyName[]) {
  const bodyNow = now.STUDIO_BODIES[name];
  const bodyBase = base.STUDIO_BODIES[name];
  gzBase += gzipSync(Buffer.from(bodyBase.mesh)).length;
  gzNow += gzipSync(Buffer.from(bodyNow.mesh)).length;
  const meshNow = nowFormat.unpackStudioMesh(bodyNow.mesh);
  const meshBase = baseFormat.unpackStudioMesh(bodyBase.mesh);
  for (const key of ['positions', 'joints', 'weights', 'corners', 'colors', 'finishes'] as const) {
    check(`${name} ${key}`, same(meshNow[key], meshBase[key]));
  }
  check(`${name} corrective count`, meshNow.correctives.length === meshBase.correctives.length);
  meshNow.correctives.forEach((c, i) => check(`${name} corrective ${i}`, same(c, meshBase.correctives[i]!)));
  for (const [palette, packed] of Object.entries(bodyNow.palettes ?? {})) {
    const other = (bodyBase.palettes as Record<string, string>)[palette]!;
    check(
      `${name} palette ${palette}`,
      same(nowFormat.unpackStudioMesh(bodyNow.mesh, packed).colors, baseFormat.unpackStudioMesh(bodyBase.mesh, other).colors),
    );
  }
  const { mesh: _n, palettes: _p, ...restNow } = bodyNow as typeof bodyNow & { palettes?: unknown };
  const { mesh: _b, palettes: _q, ...restBase } = bodyBase as typeof bodyBase & { palettes?: unknown };
  check(`${name} other fields`, JSON.stringify(restNow) === JSON.stringify(restBase));
  for (const stands of [false, true]) {
    const rigNow = now.studioRigOf(name, stands);
    const rigBase = base.studioRigOf(name, stands);
    for (const key of ['positions', 'joints', 'weights', 'corners', 'colors', 'finishes'] as const) {
      check(`${name} stands=${stands} rig ${key}`, same(rigNow.mesh[key], rigBase.mesh[key]));
    }
    const total = rigNow.mesh.corners.length + 120;
    const stub = { bones: new Uint8Array(total), positions: new Float32Array(total * 3), blendBones: new Uint8Array(total), blendWeights: new Float32Array(total) };
    const renderNow = now.studioRenderMesh(rigNow, stub as never);
    const renderBase = base.studioRenderMesh(rigBase, stub as never);
    check(`${name} stands=${stands} normals`, same(renderNow.normals.corners, renderBase.normals.corners));
    check(
      `${name} stands=${stands} normal moves`,
      renderNow.normals.moves.length === renderBase.normals.moves.length &&
        renderNow.normals.moves.every((m, i) => same(m, renderBase.normals.moves[i]!)),
    );
    check(`${name} stands=${stands} render joints`, same(renderNow.joints, renderBase.joints));
    check(`${name} stands=${stands} render weights`, same(renderNow.weights, renderBase.weights));
    check(`${name} stands=${stands} render positions`, same(renderNow.data.positions, renderBase.data.positions));
  }
}
console.log(`${checks} checks, ${failures} differ`);
console.log(`packed meshes after gzip: 0bd2e24a ${gzBase} B, now ${gzNow} B, change ${gzNow - gzBase} B`);
process.exit(failures === 0 ? 0 : 1);
