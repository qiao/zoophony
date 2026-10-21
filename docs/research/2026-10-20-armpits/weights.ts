/** Prints the corner weights and bind places of faces of a studio body: weights.ts <body> <face>... */
import { studioRigOf } from '../../../src/models/studio-body.ts';
import type { StudioBodyName } from '../../../src/models/studio-body.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
const [name, ...faces] = process.argv.slice(2);
const rig = studioRigOf(name as StudioBodyName, false);
const m = rig.mesh;
const nameOf = (j: number): string => STUDIO_BONES[j] ?? (j === STUDIO_BONES.length + 23 ? 'twist_L' : `#${j}`);
for (const f of faces.map(Number)) {
  const vs = [0, 1, 2].map((k) => m.corners[f * 3 + k] ?? 0);
  console.log(`face ${f}: corners ${vs.join(', ')}`);
  for (const v of vs) {
    const p = [0, 1, 2].map((k) => (m.positions[v * 3 + k] ?? 0).toFixed(3)).join(', ');
    const w = [0, 1, 2, 3]
      .filter((k) => (m.weights[v * 4 + k] ?? 0) > 0)
      .map((k) => `${nameOf(m.joints[v * 4 + k] ?? 0)} ${(m.weights[v * 4 + k] ?? 0).toFixed(2)}`)
      .join(', ');
    console.log(`  v${v} (${p}): ${w}`);
  }
}
