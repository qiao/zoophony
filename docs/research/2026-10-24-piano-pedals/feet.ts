// Measures the feet of the polar bear pianist against the pedals and the lyre box over the rest
// and the play samples of all demos (diagnosis only). Usage, from the root of the tree:
// node docs/research/2026-10-24-piano-pedals/feet.ts [step] [file.mid]
// A MIDI file in place of the demos, such as the pedal test file of `pedal-midi.ts`.
import { readFileSync } from 'node:fs';

import { FOLD_ROLES, probeFolds } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { PIANO_PEDALS, PIANO_SCALE } from '../../../src/models/instruments/piano.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';

const names: readonly string[] = STUDIO_BONES;
const step = Number(process.argv[2] ?? '0.5');
const role = FOLD_ROLES.get('pianist');
if (!role) {
  throw new Error('no pianist');
}
const midi = process.argv[3];
const demos = midi
  ? [{ file: midi, bytes: new Uint8Array(readFileSync(midi)), source: new Uint8Array(0) }]
  : await patchedDemos();
const s = PIANO_SCALE;
const P = PIANO_PEDALS;
// The piano origin in the model axes of the pianist (the front edge of the keys on the floor).
const keysZ = -0.642;
const tipZ = keysZ + P.tipZ * s;
const boxFront = keysZ + (P.tipZ - P.length) * s;
const boxBack = boxFront - P.box.depth * s;
const half = (P.plateWidth * s) / 2;
const top = P.top * s;
const boxTop = P.box.top * s;
const boxHalf = (P.box.width * s) / 2;

type Row = Record<string, number>;
const rows: { set: string; label: string; row: Row }[] = [];
probeFolds(role, demos, step, (rig, _studio, posed, _folded, set, label) => {
  const mesh = rig.mesh;
  const row: Row = {};
  for (const side of ['L', 'R'] as const) {
    // The heel of the skin follows the shin by about half, so the shin counts too, below 15 cm.
    const foot = new Set([
      names.indexOf(`foot_${side}`),
      names.indexOf(`toes_${side}`),
      names.indexOf(`shin_${side}`),
    ]);
    let lowest = Infinity;
    let onPedal = Infinity;
    let overSostenuto = Infinity;
    let inBox = -Infinity;
    let toeZ = Infinity;
    let heel = Infinity;
    for (let v = 0; v < mesh.positions.length / 3; v++) {
      let w = 0;
      for (let k = 0; k < 4; k++) {
        if (foot.has(mesh.joints[v * 4 + k] ?? 0)) {
          w += mesh.weights[v * 4 + k] ?? 0;
        }
      }
      const x = posed[v * 3] ?? 0;
      const y = posed[v * 3 + 1] ?? 0;
      const z = posed[v * 3 + 2] ?? 0;
      if (w < 0.5 || y > 0.15) {
        continue;
      }
      lowest = Math.min(lowest, y);
      toeZ = Math.min(toeZ, z);
      if (z > -0.6) {
        heel = Math.min(heel, y);
      }
      const inZ = z <= tipZ && z >= boxFront;
      if (inZ && Math.abs(x - P.x.damper * s) <= half) {
        onPedal = Math.min(onPedal, y - top);
      }
      if (inZ && Math.abs(x - P.x.sostenuto * s) <= half) {
        overSostenuto = Math.min(overSostenuto, y - top);
      }
      if (z <= boxFront && z >= boxBack && Math.abs(x) <= boxHalf && y <= boxTop) {
        inBox = Math.max(inBox, boxFront - z);
      }
    }
    row[`lowest${side}`] = lowest * 100;
    row[`heel${side}`] = heel * 100;
    row[`toeZ${side}`] = toeZ * 100;
    row[`overDamper${side}`] = onPedal * 100;
    row[`overSostenuto${side}`] = overSostenuto * 100;
    row[`inBox${side}`] = inBox * 100;
  }
  rows.push({ set, label, row });
});

for (const set of ['rest', 'play', 'lift']) {
  const sel = rows.filter((r) => r.set === set).map((r) => r.row);
  console.log(`${set}: ${sel.length} samples`);
  for (const key of Object.keys(sel[0] ?? {})) {
    const v = sel.map((r) => r[key] ?? 0).filter(Number.isFinite);
    const min = Math.min(...v);
    const max = Math.max(...v);
    console.log(`  ${key.padEnd(16)} min ${min.toFixed(2)} max ${max.toFixed(2)} (cm)`);
  }
}
