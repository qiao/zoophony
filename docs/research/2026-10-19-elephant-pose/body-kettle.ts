/**
 * Prints the depth of the bind body of the elephant timpanist in each kettle cylinder (radius of
 * the head, below the head plane), per bone, for a --set.
 * Usage: node docs/research/2026-10-19-elephant-pose/body-kettle.ts [--set <changes>]
 */
import { setHolds } from '../../../tools/hold-sets.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { BONE_NAMES } from '../../../src/models/rig.ts';
import { placePoint } from '../../../src/models/instruments/hold.ts';
import { TIMPANI, kettleHeadRadius } from '../../../src/models/instruments/percussion.ts';

const i = process.argv.indexOf('--set');
const changes = i > 0 ? setHolds(process.argv[i + 1] ?? '') : null;
for (const count of [2, 3, 4] as const) {
  const model = buildPlayer('elephant', 'timpani', count);
  const heads = model.instrument.targets.filter((t) => t.kind === 'head').map((t, k) => ({ c: placePoint(model.pieces, { bone: t.bone, at: t.from }), r: kettleHeadRadius(k) }));
  const p = model.mesh.positions;
  const worst = new Map<string, number>();
  for (let v = 0; v < p.length / 3; v++) {
    const bone = BONE_NAMES[model.mesh.bones[v] ?? 0] ?? '';
    if (['instrument', 'malletL', 'malletR'].includes(bone)) continue;
    const x = p[3 * v]!, y = p[3 * v + 1]!, z = p[3 * v + 2]!;
    if (y > TIMPANI.headHeight) continue;
    for (const [k, { c, r }] of heads.entries()) {
      const d = r - Math.hypot(x - c[0], z - c[2]);
      const key = `k${k} ${bone}`;
      if (d > (worst.get(key) ?? 0)) worst.set(key, d);
    }
  }
  const angles = heads.map(({ c }, k) => `k${k} ${((Math.atan2(c[0], -c[2]) * 180) / Math.PI).toFixed(0)}°`);
  console.log(`${count} kettles (${angles.join(', ')}): ${[...worst].map(([k, d]) => `${k} ${(d * 100).toFixed(1)} cm`).join(', ') || 'clear'}`);
}
changes?.undo();
