/**
 * Prints the places of the playing pose of a chin instrument: the tail end, the nut, the scroll,
 * the shoulder joints, the head center, and the nose, in meters in the frame of the model.
 * Usage: node scratch/viola-geo.ts <species> <instrument> [--set <changes>]
 */
import { Quaternion, Vector3 } from 'three';
import { placePoint } from '../src/models/instruments/hold.ts';
import { VIOLIN } from '../src/models/instruments/strings.ts';
import { buildPlayer } from '../src/models/player.ts';
import { bowedRig, holdOf, playingFrames } from '../src/pose/bowed-rig.ts';
import { createBowPlaces, instrumentAt } from '../src/pose/bowed.ts';
import { poseShoulder } from '../src/pose/ik.ts';
import { setHolds } from '../tools/hold-sets.ts';

const args = process.argv.slice(2);
const species = args[0] as 'cat';
const instrument = args[1] as 'viola';
if (args.includes('--set')) setHolds(args[args.indexOf('--set') + 1]!);
const model = buildPlayer(species, instrument, 4, 'chair');
const rig = bowedRig(model, instrument, holdOf(species, instrument));
const frames = playingFrames(rig);
const { place } = createBowPlaces();
instrumentAt(rig, frames, 1, place);
const posed = (at: readonly [number, number, number]): Vector3 =>
  new Vector3(...placePoint(model.pieces, { bone: 'instrument', at }))
    .sub(new Vector3(...rig.pivot))
    .applyQuaternion(place.rotation)
    .add(place.pivot);
const board = model.instrument.targets.find((t) => t.kind === 'fingerboard')!;
const size = board.from[0] / VIOLIN.nut;
const f = (v: Vector3): string => `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`;
const tail = posed([0, 0, 0]);
const nut = posed([VIOLIN.nut * size, VIOLIN.stringHeight * size, 0]);
const scroll = posed([VIOLIN.length * size, VIOLIN.stringHeight * size, 0]);
const sl = poseShoulder(rig.armL, frames.chest, rig.chestBind, new Quaternion()).position;
console.log('size', size.toFixed(3), 'H', model.headHeight?.toFixed?.(3));
console.log('tail  ', f(tail));
console.log('nut   ', f(nut), 'from L shoulder', nut.distanceTo(sl).toFixed(3));
console.log('scroll', f(scroll), 'from L shoulder', scroll.distanceTo(sl).toFixed(3));
console.log('L shoulder', f(sl), 'tail from L shoulder', tail.distanceTo(sl).toFixed(3));
const dir = scroll.clone().sub(tail).normalize();
console.log('axis', f(dir), 'tail-to-shoulder along axis', sl.clone().sub(tail).dot(dir).toFixed(3), 'across', sl.clone().sub(tail).sub(dir.clone().multiplyScalar(sl.clone().sub(tail).dot(dir))).length().toFixed(3));
