/**
 * Measures the seated head top of the rabbit violinist above its seat against the head top of the
 * red fox beside it, as `docs/research/2026-10-13-studio-rabbit/height-probe.ts` does: the highest
 * corner of the head bone of each player model on its chair, less its seat height. The violin
 * section of `docs/reference/orchestra-latest.png` gives 0.76 to 0.83. Usage:
 *
 *     node docs/research/2026-10-13-rabbit-mesh/height-probe.ts
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';

/**
 * Gives the head top above the seat, and the seat, of a seated violinist.
 *
 * @param species The species.
 * @returns The head top above the seat and the seat height, in meters.
 */
function seatedHead(species: 'rabbit' | 'fox-red'): { top: number; seat: number } {
  const model = buildPlayer(species, 'violin', 4, 'chair');
  const head = boneIndex('head');
  let top = -Infinity;
  for (let c = 0; c < model.mesh.bones.length; c++) {
    if (model.mesh.bones[c] === head) {
      top = Math.max(top, model.mesh.positions[c * 3 + 1] ?? 0);
    }
  }
  const seat = model.seat?.seatHeight ?? 0;
  console.log(
    `${species}: seat ${seat.toFixed(3)} m, H ${model.body.headHeight.toFixed(3)} m, head top ` +
      `${top.toFixed(3)} m, head top above the seat ${(top - seat).toFixed(3)} m`,
  );
  return { top: top - seat, seat };
}

const rabbit = seatedHead('rabbit');
const fox = seatedHead('fox-red');
console.log(`ratio of the head tops above the seats: ${(rabbit.top / fox.top).toFixed(3)}`);
