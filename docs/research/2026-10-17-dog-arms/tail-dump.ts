// Dumps the seated dog (bind pose of the player), its main bones, and the chair boxes as JSON:
// DOGV=<v> node scratch/tail-dump.ts <out.json>
import { writeFileSync } from 'node:fs';
import { buildPlayer } from '../src/models/player.ts';
import { BONE_NAMES } from '../src/models/rig.ts';
import { CHAIR, chairBack, seatHeights } from '../src/models/props.ts';
import { SPECIES } from '../src/models/species.ts';

const model = buildPlayer('dog', 'cello', 4, 'chair');
const seat = seatHeights('chair', SPECIES.dog);
if (!seat) throw new Error('no seat');
const depth = seat.seatDepth ?? CHAIR.seatDepth;
const width = seat.seatWidth ?? CHAIR.seatWidth;
const center = (CHAIR.seatDepth - depth) / 2;
writeFileSync(process.argv[2] ?? 'dump.json', JSON.stringify({
  positions: Array.from(model.mesh.positions),
  bones: Array.from(model.mesh.bones).map((b) => BONE_NAMES[b]),
  blendBones: Array.from(model.mesh.blendBones).map((b) => BONE_NAMES[b]),
  blendWeights: Array.from(model.mesh.blendWeights),
  seat: { top: seat.seatHeight, width, depth, center },
  back: chairBack(seat.seatHeight, width),
}));
console.log('seat', seat, 'depth', depth, 'width', width, 'center', center);
