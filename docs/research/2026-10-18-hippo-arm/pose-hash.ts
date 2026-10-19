/**
 * Prints a hash of the poses of the players of each species over the demos, at each step of the
 * play and in the lift, so that two trees can show which species a change of the pose code moves.
 *
 * Usage, from the root of the tree:
 *
 *     node docs/research/2026-10-18-hippo-arm/pose-hash.ts [--step <s>]
 */
import { createHash } from 'node:crypto';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { allAudible, PLAYING, sceneOf } from '../../../src/pose/test-scene.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const args = process.argv.slice(2);
const step = Number(args.includes('--step') ? args[args.indexOf('--step') + 1] : '0.5');
const hashes = new Map<string, ReturnType<typeof createHash>>();
for (const demo of await patchedDemos()) {
  const scene = sceneOf(demo.bytes);
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const lift = { ...PLAYING, changedAtWall: 10 };
  const times: [number, number, typeof PLAYING][] = [];
  for (let wall = 10; wall < 13; wall += 0.1) {
    times.push([Math.min(0, start + wall - 10), wall, lift]);
  }
  for (let song = start; song <= scene.score.durationSec; song += step) {
    times.push([song, 10 + song - start, PLAYING]);
  }
  for (const [song, wall, transport] of times) {
    const frame = poseAt(scene.plan, song, wall, transport, audible, buffer);
    for (const [i, pose] of frame.players.entries()) {
      const species = scene.layout.players[i]?.cast.species ?? 'none';
      const hash = hashes.get(species) ?? createHash('sha256');
      hash.update(new Uint8Array(pose.rotations.buffer, pose.rotations.byteOffset, pose.rotations.byteLength));
      hashes.set(species, hash);
    }
  }
}
for (const [species, hash] of [...hashes].toSorted((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`${species} ${hash.digest('hex').slice(0, 16)}`);
}
