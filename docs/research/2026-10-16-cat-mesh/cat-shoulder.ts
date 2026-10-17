/**
 * Prints the standing shoulder joint of the parametric cat of `main` with 7 digits: the landmark
 * of the scale of the cat mesh. Usage: `node docs/research/2026-10-16-cat-mesh/cat-shoulder.ts`.
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';

const m = buildPlayer('cat', 'viola', 4, 'stand');
const at = m.skeleton.positions[boneIndex('upperArmL')] ?? [];
console.log(`cat viola stand: shoulder joint ${(at[1] ?? 0).toFixed(7)} m, H ${m.body.headHeight.toFixed(4)} m`);
