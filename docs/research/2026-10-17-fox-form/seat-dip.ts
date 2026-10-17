/**
 * Finds the lowest point of the triangles of the seated red fox and rabbit over the seat of the
 * app, in the model axes: a point at each 1/20 of each edge of each triangle, inside the width of
 * the seat and from its front edge to its back edge. It prints the gap of that point to the seat
 * top (negative into the seat), its x and z, the main bones of the corners, and the corners in cm.
 * The arms of the bind pose count too, so the right paw of the rabbit gives its lowest point: read
 * the bones of the line.
 *
 * Usage, from the root of the worktree: node docs/research/2026-10-17-fox-form/seat-dip.ts. The
 * files seat-dip-main.txt (7d7fca49) and seat-dip-branch.txt hold its output.
 */
import { CHAIR } from '../../../src/models/props.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { BONE_NAMES } from '../../../src/models/rig.ts';

for (const species of ['fox-red', 'rabbit'] as const) {
  const model = buildPlayer(species, 'violin', 4, 'chair');
  const seat = model.seat;
  if (!seat) {
    throw new Error(`${species} has no seat`);
  }
  const back = CHAIR.seatDepth / 2;
  const front = back - (seat.seatDepth ?? CHAIR.seatDepth);
  const top = seat.seatHeight;
  const { positions, bones } = model.mesh;
  let low = { gap: Infinity, x: 0, z: 0, bones: '', corners: '' };
  for (let t = 0; t < bones.length; t += 3) {
    const corners = [0, 1, 2].map((k) => [0, 1, 2].map((a) => positions[(t + k) * 3 + a] ?? 0));
    for (let i = 0; i <= 20; i++) {
      for (let j = 0; i + j <= 20; j++) {
        const u = i / 20;
        const v = j / 20;
        const w = 1 - u - v;
        const q = [0, 1, 2].map(
          (a) =>
            w * (corners[0]?.[a] ?? 0) + u * (corners[1]?.[a] ?? 0) + v * (corners[2]?.[a] ?? 0),
        );
        const [x, y, z] = [q[0] ?? 0, q[1] ?? 0, q[2] ?? 0];
        if (Math.abs(x) > CHAIR.seatWidth / 2 || z < front || z > back || y - top >= low.gap) {
          continue;
        }
        low = {
          gap: y - top,
          x,
          z,
          bones: [0, 1, 2].map((k) => BONE_NAMES[bones[t + k] ?? 0]).join(','),
          corners: corners.map((c) => c.map((n) => (n * 100).toFixed(1)).join('/')).join(' '),
        };
      }
    }
  }
  console.log(
    `${species}: seat top ${(top * 100).toFixed(1)} cm, front edge z ${(front * 100).toFixed(1)} cm; lowest point ${(low.gap * 100).toFixed(1)} cm from the seat top at x ${(low.x * 100).toFixed(1)}, z ${(low.z * 100).toFixed(1)} cm, bones ${low.bones}, corners (x/y/z cm) ${low.corners}`,
  );
}
