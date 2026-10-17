/**
 * Prints the seat height, the seat width, and the seat depth of the chair under the seated red fox
 * and the seated tan fox (`PlayerModel.seat`). Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-17-tan-rest/seat-size.ts
 */
import { buildPlayer } from '../../../src/models/player.ts';
for (const [s, i] of [['fox-red', 'violin'], ['fox-tan', 'flute']] as const) {
  const m = buildPlayer(s, i, 4, 'chair');
  console.log(s, 'seat', m.seat?.seatHeight, 'width', m.seat?.seatWidth, 'depth', m.seat?.seatDepth);
}
