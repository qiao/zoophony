/**
 * Searches rest places of the horn of the seated pig with both palms on their grips and the horn
 * low in front of the belly, the bell at the right: a fine grid of rest turns (y, x, z in degrees, as q.ts) and rest shifts (in H), with the play
 * hold of the --set changes of the first argument. It keeps the places whose bell mouth is low at
 * the right of the haunch, whose coil center lies in front of the belly or beside it, and whose
 * right palm reaches its grip in the bell with 3 cm to spare. The left paw leaves its grip.
 *
 * Usage: node docs/research/2026-10-19-pig-mesh/rest-grid.ts '<changes>'
 */
import { MathUtils, Quaternion, Vector3 } from 'three';

import { placePoint } from '../../../src/models/instruments/hold.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import type { Vec3 } from '../../../src/models/tuples.ts';
import { windGrips, windHoldOf, windRig } from '../../../src/pose/winds.ts';
import type { WindHold } from '../../../src/pose/winds.ts';
import { armLength } from '../../../tools/hold-reach.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const d = MathUtils.DEG2RAD;
const quat = (y: number, x: number, z: number): [number, number, number, number] => {
  const q = new Quaternion()
    .setFromAxisAngle(new Vector3(0, 1, 0), y * d)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), x * d))
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), z * d));
  return [q.x, q.y, q.z, q.w];
};

const { undo } = setHolds(process.argv[2] ?? '');
const model = buildPlayer('pig', 'horn', 4, 'chair');
const H = model.body.headHeight;
const base = windHoldOf('pig', 'horn');
const armR = armLength(model, 'R');
const armL = armLength(model, 'L');
const bellTarget = model.instrument.targets.find((t) => t.kind === 'bell');
const bell = bellTarget ? placePoint(model.pieces, { bone: 'instrument', at: bellTarget.from }) : null;
const coil = placePoint(model.pieces, { bone: 'instrument', at: [0.08, -0.3, -0.1] });
const rows: { score: number; text: string }[] = [];
for (let y = -10; y <= 30; y += 5) {
  for (let x = -50; x <= -15; x += 5) {
    for (let z = -35; z <= 0; z += 5) {
      for (const sy of [-0.35, -0.3, -0.25, -0.2, -0.15]) {
        for (const sz of [-0.3, -0.25, -0.2, -0.15, -0.1]) {
          for (const sx of [0, 0.05, 0.1]) {
            const hold: WindHold = { ...base, rest: quat(y, x, z), restShift: [sx, sy, sz] };
            const rig = windRig(model, 'horn', hold);
            const at = (p: Vec3): Vector3 =>
              new Vector3(...windGrips({ ...rig, left: { ...rig.left, grip: p } }, 0).L.grip);
            const g = windGrips(rig, 0);
            const spare = armR - new Vector3(...g.R.joint).distanceTo(new Vector3(...g.R.grip));
            const spareL = armL - new Vector3(...g.L.joint).distanceTo(new Vector3(...g.L.grip));
            if (!bell || spare < 0.03 || spareL < 0.03) {
              continue;
            }
            const b = at(bell);
            const c = at(coil);
            const m = at(rig.pivot);
            const bellOk = b.x > 0.26;
            const coilOk = c.z < -0.43;
            if (bellOk && coilOk) {
              rows.push({
                score: b.y + c.y,
                text: `rest ${y} ${x} ${z} shift ${sx},${sy},${sz}: L spare ${(spareL * 100).toFixed(1)} cm, R spare ${(spare * 100).toFixed(1)} cm, bell ${b.toArray().map((v) => v.toFixed(2)).join(' ')}, coil ${c.toArray().map((v) => v.toFixed(2)).join(' ')}, mouthpiece ${m.toArray().map((v) => v.toFixed(2)).join(' ')}`,
              });
            }
          }
        }
      }
    }
  }
}
undo();
rows.sort((a, b) => a.score - b.score);
console.log(`H ${H.toFixed(3)} m, ${rows.length} places`);
for (const r of rows.slice(0, 25)) {
  console.log(r.text);
}
