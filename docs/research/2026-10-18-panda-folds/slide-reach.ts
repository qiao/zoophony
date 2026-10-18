/** Prints the slide reach of the panda trombonist and the posed left shoulder joint: node docs/research/2026-10-18-panda-folds/slide-reach.ts */
import { buildPlayer } from '../../../src/models/player.ts';
import { windGrips, windHoldOf, windRig } from '../../../src/pose/winds.ts';

const model = buildPlayer('panda', 'trombone');
const rig = windRig(model, 'trombone', windHoldOf('panda', 'trombone'));
const g = windGrips(rig, 1);
const d = (a: readonly number[], b: readonly number[]): number => Math.hypot(...a.map((v, i) => v - (b[i] ?? 0)));
console.log(`slideReach ${rig.slideReach.toFixed(3)} m; left joint ${g.L.joint.map((v) => v.toFixed(4)).join(', ')}, grip L distance ${d(g.L.joint, g.L.grip).toFixed(4)} m; right joint ${g.R.joint.map((v) => v.toFixed(4)).join(', ')}, grip R distance ${d(g.R.joint, g.R.grip).toFixed(4)} m`);
