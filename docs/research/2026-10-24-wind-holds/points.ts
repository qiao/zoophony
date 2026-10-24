// Probe: prints the bind joints and the posed grips and ends of a wind hold, in meters and in H.
// Usage: node docs/research/2026-10-24-wind-holds/points.ts <species> <instrument> [<set changes>]
import { Vector3 } from 'three';

import { WOODWINDS } from '../../../src/models/instruments/woodwinds.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { instrumentScale } from '../../../src/models/species.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { windGrips, windHoldOf, windRig } from '../../../src/pose/winds.ts';
import type { WindInstrument } from '../../../src/pose/winds.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const [species, instrument, sets] = process.argv.slice(2) as [SpeciesId, WindInstrument, string?];
if (sets) {
  setHolds(sets);
}
const model = buildPlayer(species, instrument);
const h = model.body.headHeight;
const f = (v: Vector3 | readonly number[]): string => {
  const a = Array.isArray(v) ? v : (v as Vector3).toArray();
  return `(${a.map((x: number) => x.toFixed(3)).join(', ')})`;
};
console.log(`${species} ${instrument} H=${h.toFixed(3)} support=${model.support}`);
const bones: BoneName[] = [
  'chest',
  'neck',
  'head',
  'shoulderL',
  'upperArmL',
  'shoulderR',
  'upperArmR',
  'thighL',
  'shinL',
  'thighR',
  'shinR',
  'footR',
  'instrument',
];
for (const b of bones) {
  console.log(`  ${b.padEnd(10)} ${f(model.skeleton.positions[boneIndex(b)] ?? [0, 0, 0])}`);
}
const rig = windRig(model, instrument, windHoldOf(species, instrument));
const w = instrument in WOODWINDS ? WOODWINDS[instrument as keyof typeof WOODWINDS] : null;
const scale = instrumentScale(species, instrument);
for (const weight of [1, 0]) {
  const g = windGrips(rig, weight);
  const l = new Vector3(...g.L.grip);
  const r = new Vector3(...g.R.grip);
  console.log(`weight ${weight}:`);
  console.log(`  joint L ${f(g.L.joint)} grip L ${f(l)} dist ${l.distanceTo(new Vector3(...g.L.joint)).toFixed(3)}`);
  console.log(`  joint R ${f(g.R.joint)} grip R ${f(r)} dist ${r.distanceTo(new Vector3(...g.R.joint)).toFixed(3)}`);
  if (w) {
    const dir = r.clone().sub(l).normalize();
    const top = l.clone().addScaledVector(dir, -w.palmL * scale);
    const end = l.clone().addScaledVector(dir, (w.length - w.palmL) * scale);
    const tilt = (Math.acos(Math.min(1, Math.abs(dir.y))) * 180) / Math.PI;
    console.log(`  mouth end ${f(top)} far end ${f(end)} dir ${f(dir)} from vertical ${tilt.toFixed(1)}°`);
  }
}
