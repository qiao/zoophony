// Proves that the cache of the smooth normals of each studio rig (`rigSmoothNormals()` of
// `src/models/studio-body.ts`) gives the bytes of the normals of `0bd2e24a`: the probe calculates
// the normals with the code of `0bd2e24a` for each body and stance, and compares them with the
// normals of `studioRenderMesh()`.
//
// Usage: node docs/research/2026-10-21-load-performance/normals-probe.ts
import { STUDIO_BODIES, studioRenderMesh, studioRigOf } from '../../../src/models/studio-body.ts';
import type { StudioBodyName } from '../../../src/models/studio-body.ts';
import { studioNormals } from '../../../src/models/studio-normals.ts';
import type { StudioRig } from '../../../src/models/studio-rig.ts';

function oldNormals(rig: StudioRig, crease: number, total: number) {
  const { positions, correctives } = rig.mesh;
  const { caps, rim } = rig.body;
  const corners = studioNormals(rig.mesh, crease, caps, rim);
  const moves = correctives.map((corrective) => {
    const moved = positions.map((p, i) => p + (corrective[i] ?? 0));
    const after = studioNormals({ ...rig.mesh, positions: moved }, crease, caps, rim);
    const move = new Float32Array(total * 3);
    for (let i = 0; i < corners.length; i++) {
      move[i] = (after[i] ?? 0) - (corners[i] ?? 0);
    }
    return move;
  });
  return { corners, moves };
}

const same = (a: Float32Array, b: Float32Array): boolean =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).equals(Buffer.from(b.buffer, b.byteOffset, b.byteLength));

let failures = 0;
let checks = 0;
for (const name of Object.keys(STUDIO_BODIES) as StudioBodyName[]) {
  for (const stands of [false, true]) {
    const rig = studioRigOf(name, stands);
    const bodyCorners = rig.mesh.corners.length;
    // Two calls with an instrument of 300 corners: the second call reads the cache.
    for (const total of [bodyCorners + 300, bodyCorners + 300, bodyCorners]) {
      const mesh = { bones: new Uint8Array(total), positions: new Float32Array(total * 3), blendBones: new Uint8Array(total), blendWeights: new Float32Array(total) };
      const render = studioRenderMesh(rig, mesh as never);
      const old = oldNormals(rig, rig.body.crease, total);
      checks += 1;
      const ok =
        same(render.normals.corners, old.corners) &&
        render.normals.moves.length === old.moves.length &&
        render.normals.moves.every((m, i) => same(m, old.moves[i]!));
      if (!ok) {
        failures += 1;
        console.log(`differs: ${name} stands=${stands} total=${total}`);
      }
    }
  }
}
console.log(`${checks} checks, ${failures} differ`);
process.exit(failures === 0 ? 0 : 1);
