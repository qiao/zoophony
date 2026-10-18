/**
 * Finds where the head of the first seated dog cellist of a demo meets the cello in each sample
 * set of the sweep of `pnpm pose-depth cellist` (`sweepDepths()` of `pose/test-sweep.ts`): the
 * deepest corner of the head part (`HEAD_PART`, with the ears) in the closed cello, and the
 * smallest gap of the triangles of the head part to the cello (`surfaceGap()`, 0 for a touch), with
 * the bone and the bind place of the nearest triangle, its posed place, and the count of the
 * samples with a gap below 0.5 cm. With hold changes, it prints one block for each variant.
 *
 * Usage, from the root of the tree:
 *
 *     node docs/research/2026-10-17-dog-folds/ear.ts <demo> ['<changes>'|-]...
 */
import { Triangle, Vector3 } from 'three';
import { BONE_NAMES, boneIndex } from '../../../src/models/rig.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { HEAD_PART, sweepDepths } from '../../../src/pose/test-sweep.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';
import { closedDepth, surfaceGap } from '../../../src/pose/test-clearance.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const [demoName = 'mozart-k525', ...variants] = process.argv.slice(2);
const demo = (await patchedDemos()).find((d) => d.file === `${demoName}.mid`);
if (!demo) {
  throw new Error(`No demo ${demoName}.`);
}
const role = SWEEP_ROLES.cellist;
const wanted = new Set(HEAD_PART.bones.map(boneIndex));
for (const changes of variants.length > 0 ? variants : ['-']) {
  const undo = changes === '-' ? null : setHolds(changes);
  const scene = sceneOf(demo.bytes);
  const player = role.players(scene)[0];
  if (!player) {
    throw new Error('No cellist.');
  }
  const corners: number[] = [];
  const { mesh } = player.model;
  for (let c = 0; c < mesh.bones.length; c++) {
    if (wanted.has(mesh.bones[c] ?? -1)) {
      corners.push(c);
    }
  }
  console.log(`variant ${changes}`);
  for (const { name, samples } of role.sampleSets(scene)) {
    let best = { depth: 0, corner: -1, song: 0, wall: 0, place: [0, 0, 0] as number[], count: 0, n: 0 };
    let near = { gap: Infinity, first: -1, song: 0, wall: 0, posed: [0, 0, 0] as number[], close: 0 };
    const firsts = corners.filter((c) => c % 3 === 0);
    sweepDepths({ ...role, parts: [] }, player, samples, (posed, [song, wall], surfaces) => {
      const cello = surfaces.get('cello');
      if (!cello) {
        return;
      }
      const triangles = firsts.map(
        (c) =>
          new Triangle(
            new Vector3(...posedCorner(posed, c)),
            new Vector3(...posedCorner(posed, c + 1)),
            new Vector3(...posedCorner(posed, c + 2)),
          ),
      );
      const { gap, index: t } = surfaceGap(triangles, cello, 0.05);
      if (gap < 0.005) {
        near.close += 1;
      }
      if (gap < near.gap && t >= 0) {
        const mid = triangles[t]?.getMidpoint(new Vector3()) ?? new Vector3();
        near = { ...near, gap, first: firsts[t] ?? -1, song, wall, posed: [mid.x, mid.y, mid.z] };
      }
      const points = corners.map((c) => new Vector3(...posedCorner(posed, c)));
      const { depth, index } = closedDepth(points, cello);
      best.n += 1;
      if (depth > 0) {
        best.count += 1;
      }
      if (depth > best.depth) {
        const c = corners[index] ?? 0;
        best = { ...best, depth, corner: c, song, wall, place: [mesh.positions[c * 3] ?? 0, mesh.positions[c * 3 + 1] ?? 0, mesh.positions[c * 3 + 2] ?? 0] };
      }
    });
    const bone = best.corner >= 0 ? BONE_NAMES[mesh.bones[best.corner] ?? 0] : '-';
    const f = near.first;
    const bind = f >= 0 ? [0, 1, 2].map((k) => ((mesh.positions[f * 3 + k] ?? 0) + (mesh.positions[f * 3 + 3 + k] ?? 0) + (mesh.positions[f * 3 + 6 + k] ?? 0)) / 3) : [0, 0, 0];
    console.log(
      `  ${name}: smallest gap ${(near.gap * 100).toFixed(2)} cm, ${f >= 0 ? BONE_NAMES[mesh.bones[f] ?? 0] : '-'} triangle at bind ${bind.map((v) => v.toFixed(3)).join(', ')} m, posed ${near.posed.map((v) => v.toFixed(3)).join(', ')} m, song ${near.song.toFixed(2)} s, wall ${near.wall.toFixed(2)} s; ${near.close} samples below 0.5 cm`,
    );
    console.log(
      `  ${name}: ${best.count} of ${best.n} samples with a head corner in the cello; deepest ${(best.depth * 100).toFixed(2)} cm, ${bone}, bind place ${best.place.map((v) => v.toFixed(3)).join(', ')} m, song ${best.song.toFixed(2)} s, wall ${best.wall.toFixed(2)} s`,
    );
  }
  undo?.undo();
}
