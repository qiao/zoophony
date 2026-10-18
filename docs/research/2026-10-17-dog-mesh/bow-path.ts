/**
 * Measures the bow of the seated dogs of the cellist sweep in the
 * lift, the rest, and the lowering (design 5.2), with a point at each 1 cm along each edge of the
 * bow (`bowPoints()` of `tools/lap-rest.ts`). The sweep of `pnpm pose-depth` measures the bow by
 * the corners of its boxes only, so the middle of the stick can go through a thigh or the head
 * unseen. For each player and sample set, it prints the deepest point of the bow in the body
 * (the obstacle `body` of the sweep), and the smallest distance from the bow to a music stand of
 * the layout: its post and its desk.
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-17-dog-mesh/bow-path.ts [--demo <id>]... [--set <changes>]
 */
import { Quaternion, Vector3 } from 'three';

import { MUSIC_STAND } from '../../../src/models/props.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { closedDepth } from '../../../src/pose/test-clearance.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { CELLIST_SWEEP } from '../../../src/pose/test-sweep-roles.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { bowPoints } from '../../../tools/lap-rest.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const args = process.argv.slice(2);
const pick = (flag: string): string[] =>
  args.flatMap((arg, i) => (args[i - 1] === flag ? [arg] : []));
const asked = pick('--demo');
const sets = pick('--set');
const restore = sets.length > 0 ? setHolds(sets.join(';')).undo : null;

const Y = new Vector3(0, 1, 0);
const cm = (v: number): string => (v * 100).toFixed(1);

/**
 * Gives the distance from a point to a music stand, in the axes of the stand: its post from the
 * floor to the desk, 0.02 m wide, and its desk, a plate tilted back by the tilt of the stand.
 */
function standDistance(p: Vector3, deskHeight: number): number {
  const s = MUSIC_STAND;
  const along = Math.min(Math.max(p.y, 0), deskHeight);
  const post = Math.max(0, Math.hypot(p.x, p.z) - 0.01, Math.abs(p.y - along));
  const untilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), s.tilt);
  const q = p
    .clone()
    .sub(new Vector3(0, deskHeight, 0))
    .applyQuaternion(untilt);
  const out = new Vector3(
    Math.max(0, Math.abs(q.x) - s.deskWidth / 2),
    Math.max(0, Math.abs(q.y) - s.deskDepth / 2),
    Math.max(0, Math.abs(q.z) - 0.006),
  );
  return Math.min(post, out.length());
}

const body = CELLIST_SWEEP.obstacles.find((o) => o.name === 'body');
if (!body) {
  throw new Error('The cellist sweep has no obstacle "body".');
}
const rows: string[] = [
  '| Demo | Player | Set | Bow in body cm (time) | Bow to stand cm |',
  '|---|---|---|---|---|',
];
for (const demo of await patchedDemos()) {
  const id = demo.file.replace(/\.mid$/, '');
  if (asked.length > 0 && !asked.includes(id)) {
    continue;
  }
  const scene = sceneOf(demo.bytes);
  if (!CELLIST_SWEEP.hasRole(scene.score)) {
    continue;
  }
  const players = CELLIST_SWEEP.players(scene);
  for (const player of players) {
    const index = Number(/cellist (\d+)/.exec(player.name)?.[1] ?? -1);
    const place = scene.layout.players[index];
    if (!place) {
      continue;
    }
    const turn = new Quaternion().setFromAxisAngle(Y, place.facing);
    const origin = new Vector3(...place.position);
    for (const set of CELLIST_SWEEP.sampleSets(scene)) {
      if (set.name === 'play') {
        continue;
      }
      let deepest = 0;
      let deepestWall = 0;
      let nearStand = Infinity;
      for (const sample of set.samples) {
        const posed = poseSkeleton(player.model, player.poseAt(sample));
        const points = bowPoints(posed);
        const depth = closedDepth(points, body.surface(posed)).depth;
        if (depth > deepest) {
          deepest = depth;
          deepestWall = sample[1];
        }
        for (const stand of scene.layout.stands) {
          const back = new Quaternion().setFromAxisAngle(Y, -stand.facing);
          const at = new Vector3(...stand.position);
          for (const p of points) {
            const world = p.clone().applyQuaternion(turn).add(origin);
            nearStand = Math.min(
              nearStand,
              standDistance(world.sub(at).applyQuaternion(back), stand.deskHeight),
            );
          }
        }
      }
      rows.push(
        `| ${id} | ${player.name} ${place.cast.species} | ${set.name} | ${cm(deepest)}${deepest > 0 ? ` (wall ${deepestWall.toFixed(2)} s)` : ''} | ${cm(nearStand)} |`,
      );
    }
  }
}
restore?.();
console.log(rows.join('\n'));
