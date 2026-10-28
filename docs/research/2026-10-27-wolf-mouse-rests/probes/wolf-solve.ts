// Solves the rest of the wolf clarinet for a bell point and a lean (diagnosis only).
// Usage: node docs/research/2026-10-27-wolf-mouse-rests/probes/wolf-solve.ts <bell x cm> <bell y above the seat cm> <bell z from the seat front cm> <fwd deg> <side deg> ['<more set changes>']
// Lean: fwd > 0 puts the top in front of the bell, side > 0 puts the top to the right (+x) of the bell.
// Prints the --set text of `rest` and `restShift`, then the measured bell.
import { MathUtils, Quaternion, Vector3 } from 'three';

import { setHolds } from '../../../../tools/hold-sets.ts';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { WOODWINDS } from '../../../../src/models/instruments/woodwinds.ts';
import { boneIndex } from '../../../../src/models/rig.ts';
import { CHAIR, seatHeights } from '../../../../src/models/props.ts';
import { SPECIES } from '../../../../src/models/species.ts';
import { posedPiecePoint, poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { createScenePose, poseAt } from '../../../../src/pose/pose-at.ts';
import { countInAt } from '../../../../src/pose/count-in.ts';
import { NOT_STARTED, allAudible, sceneOf } from '../../../../src/pose/test-scene.ts';
import { SPECIES_WIND_HOLDS, holdTurn } from '../../../../src/pose/winds.ts';

const specs = process.argv.slice(2).filter((a) => /^-?[0-9.]+(,-?[0-9.]+){4}$/.test(a));
const extra = process.argv.slice(2).find((a) => !/^-?[0-9.]+(,-?[0-9.]+){4}$/.test(a)) ?? '';
const demos = await probeDemos();
const demo = demos.find((d) => d.file === 'beethoven-1.mid');
if (!demo) {
  throw new Error('no demo');
}
const seat = seatHeights('chair', SPECIES.wolf);
if (!seat) {
  throw new Error('no seat');
}
const seatDepth = seat.seatDepth ?? CHAIR.seatDepth;
const seatFront = (CHAIR.seatDepth - seatDepth) / 2 - seatDepth / 2;
const toSeat = (p: Vector3): Vector3 => new Vector3(p.x, p.y - seat.seatHeight, p.z - seatFront);

/**
 * Poses the rest and gives the top, the bell, the world turn of the instrument, and H.
 *
 * @param changes The set changes.
 * @returns The values.
 */
function rest(changes: string): { top: Vector3; bell: Vector3; world: Quaternion; h: number; local: Quaternion } {
  const undo = changes ? setHolds(changes).undo : (): void => {};
  try {
    const scene = sceneOf(demo?.bytes ?? new Uint8Array());
    const index = scene.layout.players.findIndex(
      (p) => p.cast.species === 'wolf' && p.cast.instrument === 'clarinet' && p.cast.support === 'chair',
    );
    const place = scene.layout.players[index];
    if (!place) {
      throw new Error('no wolf');
    }
    const model = scene.models.get(place.cast.species, place.cast.instrument, place.cast.kettles, place.cast.support);
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    const pose = poseAt(scene.plan, start, 10, NOT_STARTED, allAudible(scene.score), createScenePose(scene.plan)).players[index];
    if (!pose) {
      throw new Error('no pose');
    }
    const posed = poseSkeleton(model, pose);
    const w = WOODWINDS.clarinet;
    const grip = model.instrument.grips.palmR;
    const length = grip ? (grip.at[0] / w.palmR) * w.length : w.length;
    const top = toSeat(new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: [0, 0, 0] })));
    const bell = toSeat(new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: [length, 0, 0] })));
    const world = posed.frames[boneIndex('instrument')]?.rotation.clone() ?? new Quaternion();
    const hold = SPECIES_WIND_HOLDS.wolf?.clarinet;
    const local = new Quaternion(...(hold?.rest ?? [0, 0, 0, 1]));
    return { top, bell, world, h: model.body.headHeight, local };
  } finally {
    undo();
  }
}

const base = rest(extra);
const chest = base.world.clone().multiply(base.local.clone().invert());
const offsetBind = base.bell.clone().sub(base.top).applyQuaternion(base.world.clone().invert());
for (const spec of specs) {
const [bx, by, bz, fwd, side] = spec.split(',').map(Number);
const f = (fwd ?? 0) * MathUtils.DEG2RAD;
const s = (side ?? 0) * MathUtils.DEG2RAD;
// The unit direction from the top down to the bell.
const want = new Vector3(-Math.tan(s), -1, Math.tan(f)).normalize();
let best = { x: 0, z: 0, err: Infinity };
for (let x = -120; x <= 60; x += 0.5) {
  for (let z = -60; z <= 60; z += 0.5) {
    const q = chest.clone().multiply(new Quaternion(...holdTurn(x, z)));
    const d = offsetBind.clone().applyQuaternion(q).normalize();
    const err = d.angleTo(want);
    if (err < best.err) {
      best = { x, z, err };
    }
  }
}
const turn = `clarinet@wolf.rest=holdTurn(${best.x},${best.z})`;
const turned = rest(`${extra ? `${extra};` : ''}${turn}`);
const target = new Vector3(bx ?? 0, by ?? 0, bz ?? 0).multiplyScalar(0.01);
// The bell bottom: the bell point is the end of the axis, and the rim lies 3.3 cm out.
const move = target.clone().sub(turned.bell).applyQuaternion(chest.clone().invert()).divideScalar(turned.h);
const hold = SPECIES_WIND_HOLDS.wolf?.clarinet;
const old = hold?.restShift ?? [0, 0, 0];
const shift = [old[0] + move.x, old[1] + move.y, old[2] + move.z].map((v) => Number(v.toFixed(3)));
// restShift is in the axes of the chest with z forward? Check by measure.
const text = `${turn};clarinet@wolf.restShift=[${shift.join(',')}]`;
const done = rest(`${extra ? `${extra};` : ''}${text}`);
const cm = (v: Vector3): string => `${(v.x * 100).toFixed(1)}, ${(v.y * 100).toFixed(1)}, ${(v.z * 100).toFixed(1)}`;
console.log(`${extra ? `${extra};` : ''}${text}`);
console.error(`${spec}: bell ${cm(done.bell)} top ${cm(done.top)} err ${(best.err * MathUtils.RAD2DEG).toFixed(1)}°`);
}
