// Measures how far the corrective shapes turn the smooth normals of each studio body.
import { STUDIO_BODIES } from '../../../src/models/studio-body.ts';
import { studioRig } from '../../../src/models/studio-rig.ts';
import { studioNormals } from '../../../src/models/studio-normals.ts';
const crease = Number(process.argv[2] ?? 40);
for (const [name, body] of Object.entries(STUDIO_BODIES)) {
  for (const stands of [false, true]) {
    if (stands && !body.standing) continue;
    const rig = studioRig(body, stands);
    const base = studioNormals(rig.mesh, crease);
    for (const [s, move] of rig.mesh.correctives.entries()) {
      const moved = rig.mesh.positions.map((p, i) => p + (move[i] ?? 0));
      const after = studioNormals({ ...rig.mesh, positions: moved }, crease);
      const turns: number[] = [];
      let maxMove = 0;
      for (let v = 0; v < move.length / 3; v++) maxMove = Math.max(maxMove, Math.hypot(move[v * 3] ?? 0, move[v * 3 + 1] ?? 0, move[v * 3 + 2] ?? 0));
      for (let c = 0; c < rig.mesh.corners.length; c++) {
        const d = (base[c * 3] ?? 0) * (after[c * 3] ?? 0) + (base[c * 3 + 1] ?? 0) * (after[c * 3 + 1] ?? 0) + (base[c * 3 + 2] ?? 0) * (after[c * 3 + 2] ?? 0);
        turns.push((Math.acos(Math.min(1, d)) * 180) / Math.PI);
      }
      const moved1 = turns.filter((t) => t > 1).length;
      const sorted = turns.filter((t) => t > 1e-3).toSorted((a, b) => a - b);
      const q = (f: number) => (sorted[Math.floor(f * (sorted.length - 1))] ?? 0).toFixed(1);
      console.log(`${name} ${stands ? 'standing' : 'bind'} shape ${s}: max move ${(maxMove * 100).toFixed(1)} cm, corners turned >1deg ${moved1} of ${turns.length}, >10deg ${turns.filter((t) => t > 10).length}, >20deg ${turns.filter((t) => t > 20).length}, turned corners p50/p90/max ${q(0.5)}/${q(0.9)}/${q(1)} deg`);
    }
  }
}
