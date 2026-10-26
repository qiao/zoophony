// Probe: the turn from the direct instrument path to the path of the hold at each weight, split
// into the roll around the long axis of the instrument and the rest (the swing).
import { Quaternion, Vector3 } from 'three';
import { buildPlayer } from '../../../src/models/player.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { bowedRig, holdOf, playingFrames } from '../../../src/pose/bowed-rig.ts';
import { createBowPlaces, instrumentAt } from '../../../src/pose/bowed.ts';

const ROLES: [SpeciesId, 'violin' | 'viola'][] = [['rabbit', 'violin'], ['fox-red', 'violin'], ['cat', 'viola']];
for (const [species, instrument] of ROLES) {
  const hold = holdOf(species, instrument);
  const model = buildPlayer(species, instrument);
  const held = bowedRig(model, instrument, hold);
  const direct = bowedRig(model, instrument, { ...hold, liftTurn: null });
  const frames = playingFrames(held);
  const a = createBowPlaces().place;
  const b = createBowPlaces().place;
  const rows: string[] = [];
  for (const w of [0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9]) {
    instrumentAt(held, frames, w, a);
    instrumentAt(direct, frames, w, b);
    // The turn from the direct place to the held place, in the axes of the direct instrument.
    const dev = b.rotation.clone().invert().multiply(a.rotation);
    const axis = new Vector3(...held.axis).normalize();
    const twist = 2 * Math.atan2(dev.x * axis.x + dev.y * axis.y + dev.z * axis.z, dev.w);
    const twistQ = new Quaternion().setFromAxisAngle(axis, twist);
    const swing = twistQ.clone().invert().premultiply(dev);
    const total = (2 * Math.acos(Math.min(1, Math.abs(dev.w))) * 180) / Math.PI;
    const sw = (2 * Math.acos(Math.min(1, Math.abs(swing.w))) * 180) / Math.PI;
    rows.push(`w${w}: total ${total.toFixed(0)}° roll ${((twist * 180) / Math.PI).toFixed(0)}° swing ${sw.toFixed(0)}°`);
  }
  console.log(`${species}: ${rows.join(' | ')}`);
}
