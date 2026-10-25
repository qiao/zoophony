// Prints, for each studio body, the share of the paw skin that the fingers bone moves.
import { STUDIO_BODIES } from '../src/models/studio-body.ts';
import { STUDIO_BONES, unpackStudioMesh } from '../src/models/studio-format.ts';

for (const [name, body] of Object.entries(STUDIO_BODIES)) {
  const mesh = unpackStudioMesh(body.mesh);
  const row: string[] = [];
  for (const side of ['L', 'R']) {
    const hand = STUDIO_BONES.indexOf(`hand_${side}` as never);
    const fingers = STUDIO_BONES.indexOf(`fingers_${side}` as never);
    let paw = 0;
    let fw = 0;
    let fmain = 0;
    const n = mesh.weights.length / 4;
    for (let v = 0; v < n; v++) {
      let h = 0;
      let f = 0;
      for (let k = 0; k < 4; k++) {
        const j = mesh.joints[v * 4 + k];
        const w = mesh.weights[v * 4 + k] ?? 0;
        if (j === hand) h += w;
        if (j === fingers) f += w;
      }
      if (h + f > 0.5) {
        paw++;
        fw += f;
        if (f > 0.5) fmain++;
      }
    }
    row.push(
      `${side}: paw ${paw}, fingers main ${fmain} (${((100 * fmain) / paw).toFixed(0)}%), mean w ${(fw / paw).toFixed(2)}`,
    );
  }
  console.log(name.padEnd(20), row.join(' | '));
}
