/**
 * Scans the reach of the left paw over a grid of play holds of one species under the chin: the
 * turn of the instrument to the front (`yaw`, degrees from the hold), the forward turn of the left
 * shoulder bone (`reachL`, degrees), and the move of the instrument (`playShift`, head heights
 * added to the hold). Each row gives the angle of the middle line to the left of the front, the
 * reached part of the fingerboard (`stopRange`), and the gap of the nut from the reach of the arm.
 * It builds only the rig, with no sweep, so the depths need `angle-probe.ts`.
 *
 * Usage: node docs/research/2026-10-25-string-angle/reach-grid.ts <rabbit|fox-red|cat>
 *   [--set <changes>] [--yaw a:b:step] [--reach a:b:step] [--dx a:b:step] [--dz a:b:step]
 *   [--dy a:b:step]
 */
import { Quaternion, Vector3 } from 'three';
import { boneIndex } from '../../../src/models/rig.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { bowedRig, holdOf, playingFrames } from '../../../src/pose/bowed-rig.ts';
import type { BowedHold } from '../../../src/pose/bowed-rig.ts';
import {
  BOWED_HANDS,
  MIDDLE_FINGER,
  createBowPlaces,
  instrumentAt,
  shoulderTurnL,
  stopHandAt,
  stringsAt,
} from '../../../src/pose/bowed.ts';
import { poseShoulder } from '../../../src/pose/ik.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const args = process.argv.slice(2);
const species = (args[0] ?? 'cat') as SpeciesId;
const pick = (flag: string, fallback: string): string => {
  const i = args.indexOf(flag);
  return i >= 0 ? (args[i + 1] ?? fallback) : fallback;
};
const range = (text: string): number[] => {
  const [a = 0, b = a, step = 1] = text.split(':').map(Number);
  const out: number[] = [];
  for (let v = a; v <= b + 1e-9; v += step) {
    out.push(Number(v.toFixed(4)));
  }
  return out;
};
setHolds(pick('--set', ''));
const instrument = species === 'cat' ? 'viola' : 'violin';
const roleName = species === 'cat' ? 'violist' : 'violinist';
const demo = species === 'cat' ? 'mozart-k525' : 'beethoven-8';
const scene = sceneOf((await patchedDemo(`${demo}.mid`)).bytes);
const player = SWEEP_ROLES[roleName].players(scene).find((p) => {
  const index = Number(/(\d+)/.exec(p.name)?.[1] ?? -1);
  return scene.layout.players[index]?.cast.species === species && !p.name.includes('soloist');
});
if (!player) {
  throw new Error(`no ${species}`);
}
const model = player.model;
const base = holdOf(species, instrument);
const piece = model.pieces.find((p) => p.piece.bone === 'instrument');
const bodyLine = new Vector3(1, 0, 0).applyQuaternion(
  new Quaternion(...(piece?.at.rotation ?? [0, 0, 0, 1])),
);
const H = model.body.headHeight;
console.log(`${species} H ${H.toFixed(3)} m, hold playShift ${base.playShift.join(', ')}`);
console.log('| yaw | reachL | dx H | dy H | dz H | angle | stop | nut gap cm | shoulder z cm |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const yaw of range(pick('--yaw', '0'))) {
  for (const reach of range(pick('--reach', '0'))) {
    for (const dx of range(pick('--dx', '0'))) {
      for (const dy of range(pick('--dy', '0'))) {
        for (const dz of range(pick('--dz', '0'))) {
          const turn = new Quaternion()
            .setFromAxisAngle(new Vector3(0, 1, 0), (yaw * Math.PI) / 180)
            .multiply(new Quaternion(...base.playTurn));
          const hold: BowedHold = {
            ...base,
            playTurn: [turn.x, turn.y, turn.z, turn.w],
            playShift: [base.playShift[0] + dx, base.playShift[1] + dy, base.playShift[2] + dz],
            reachL: (reach * Math.PI) / 180,
          };
          const rig = bowedRig(model, instrument, hold);
          const frames = playingFrames(rig);
          const { place, strings } = createBowPlaces();
          instrumentAt(rig, frames, 1, place);
          stringsAt(rig, place, strings);
          const shoulder = poseShoulder(
            rig.armL,
            frames.chest,
            rig.chestBind,
            shoulderTurnL(rig, 1, new Quaternion()),
          ).position;
          const hand = { wrist: new Vector3(), rotation: new Quaternion() };
          const nut = stopHandAt(
            rig,
            place,
            strings,
            0,
            BOWED_HANDS.curlL,
            0,
            MIDDLE_FINGER,
            hand,
          ).wrist.distanceTo(shoulder);
          const line = bodyLine.clone().applyQuaternion(place.rotation);
          const angle = 180 + (Math.atan2(line.x, line.z) * 180) / Math.PI;
          const [low, high] = rig.stopRange;
          const bindShoulder = model.skeleton.positions[boneIndex(`upperArmL`)]?.[2] ?? 0;
          console.log(
            `| ${yaw} | ${reach} | ${dx} | ${dy} | ${dz} | ${angle.toFixed(0)}° | ${low.toFixed(2)}..${high.toFixed(2)} | ${((nut - rig.armL.reach) * 100).toFixed(1)} | ${((shoulder.z - bindShoulder) * 100).toFixed(1)} |`,
          );
        }
      }
    }
  }
}
