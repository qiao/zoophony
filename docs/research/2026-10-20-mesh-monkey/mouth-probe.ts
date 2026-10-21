/**
 * Prints the mouthpiece of the trumpet of the seated monkey against its shoulder joints and its
 * trumpet grips in the playing pose, with the chest in its bind pose (`windRig()` and
 * `windGrips()` of `src/pose/winds.ts`). Usage:
 *
 *     node docs/research/2026-10-20-mesh-monkey/mouth-probe.ts
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { windGrips, windHoldOf, windRig } from '../../../src/pose/winds.ts';

const model = buildPlayer('monkey', 'trumpet', 4, 'chair');
const rig = windRig(model, 'trumpet', windHoldOf('monkey', 'trumpet'));
const play = windGrips(rig, 1);
const f = (v: readonly number[]): string => v.map((x) => x.toFixed(3)).join(', ');
console.log(`mouthpiece (bind): ${f(rig.pivot)} m`);
for (const side of ['L', 'R'] as const) {
  const { joint, grip } = play[side];
  console.log(`${side}: shoulder joint ${f(joint)} m, grip ${f(grip)} m`);
  console.log(`  mouthpiece above the joint: ${(rig.pivot[1] - joint[1]).toFixed(3)} m, grip above the joint: ${(grip[1] - joint[1]).toFixed(3)} m, grip in front of the joint: ${(joint[2] - grip[2]).toFixed(3)} m`);
}
