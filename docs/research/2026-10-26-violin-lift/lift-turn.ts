// Probe: the turn of the violin or viola through the lift, from the rest (weight 0) to the play
// (weight 1). It prints, for each step of the weight, the angle from the rest, the step angle, the
// scroll direction, and the total path angle. The path angle against the direct angle shows a long
// turn.
import { Quaternion, Vector3 } from 'three';
import { buildPlayer } from '../../../src/models/player.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { bowedRig, holdOf, playingFrames } from '../../../src/pose/bowed-rig.ts';
import type { BowedHold } from '../../../src/pose/bowed-rig.ts';
import { createBowPlaces, instrumentAt } from '../../../src/pose/bowed.ts';

const ROLES: [SpeciesId, 'violin' | 'viola'][] = [
  ['rabbit', 'violin'],
  ['fox-red', 'violin'],
  ['cat', 'viola'],
];
const STEPS = 40;
const override = process.argv[2] === 'direct';

for (const [species, instrument] of ROLES) {
  const model = buildPlayer(species, instrument);
  const base = holdOf(species, instrument);
  const hold: BowedHold = base;
  const rig = bowedRig(model, instrument, hold);
  const frames = playingFrames(rig);
  const { place } = createBowPlaces();
  const rotations: Quaternion[] = [];
  const scrolls: string[] = [];
  for (let i = 0; i <= STEPS; i++) {
    instrumentAt(rig, frames, i / STEPS, place);
    rotations.push(place.rotation.clone());
    const s = new Vector3(...rig.axis).applyQuaternion(place.rotation);
    scrolls.push(`${s.x.toFixed(2)},${s.y.toFixed(2)},${s.z.toFixed(2)}`);
  }
  let path = 0;
  let maxStep = 0;
  for (let i = 1; i <= STEPS; i++) {
    const step = (rotations[i - 1]!.angleTo(rotations[i]!) * 180) / Math.PI;
    path += step;
    maxStep = Math.max(maxStep, step);
  }
  const direct = (rotations[0]!.angleTo(rotations[STEPS]!) * 180) / Math.PI;
  console.log(
    `${species} ${instrument}: direct ${direct.toFixed(0)}°, path ${path.toFixed(0)}°, largest step ${maxStep.toFixed(1)}°`,
  );
  console.log(
    `  scroll (x right, y up, z back) at 0, 0.25, 0.5, 0.75, 1: ${[0, 10, 20, 30, 40].map((i) => scrolls[i]).join('  ')}`,
  );
}
