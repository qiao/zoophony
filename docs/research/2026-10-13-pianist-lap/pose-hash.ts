/**
 * Prints a hash of the pose of each player and of the conductor of each demo (the report
 * `2026-10-13-pianist-lap.md`, section 6): at rest, in the lift of the first 3 s after the
 * start, and in a play of the first 20 s at each 0.25 s. It has no set of the lowering after a
 * stop. Two trees with the same pose of a player print the same hash. A quaternion and its
 * negative are the same rotation, and they give different hashes. `pnpm body-probe --base main`
 * now hashes the poses of each player, with the lowering. Run from the repository root of each
 * tree:
 * `node docs/research/2026-10-13-pianist-lap/pose-hash.ts > <file>`, then compare the files.
 */
import { createHash } from 'node:crypto';

import { patchedDemos } from '../../../tools/patch-demos.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import type { AnimalPose, Transport } from '../../../src/pose/types.ts';

/** The sample sets: the rest pose, the lift, and the play. */
type SetName = 'rest' | 'lift' | 'play';

/** Adds a pose to a hash, with 5 decimals so that the last bit of a float does not count. */
function addPose(hash: ReturnType<typeof createHash>, pose: AnimalPose): void {
  const values = [...pose.rotations, ...pose.instrumentOffset].map((v) => v.toFixed(5));
  hash.update(values.join(','));
}

const result: Record<string, Record<SetName, string>> = {};
for (const demo of await patchedDemos()) {
  const scene = sceneOf(demo.bytes);
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const lift: Transport = { ...PLAYING, changedAtWall: 10 };
  const samples: [SetName, number, number, Transport][] = [['rest', start, 10, NOT_STARTED]];
  for (let wall = 10; wall < 13; wall += 0.1) {
    samples.push(['lift', Math.min(0, start + wall - 10), wall, lift]);
  }
  for (let song = start; song < 20; song += 0.25) {
    samples.push(['play', song, 10 + song - start, PLAYING]);
  }
  const hashes = new Map<string, Record<SetName, ReturnType<typeof createHash>>>();
  const of = (who: string): Record<SetName, ReturnType<typeof createHash>> => {
    const known = hashes.get(who);
    if (known) {
      return known;
    }
    const made = { rest: createHash('sha1'), lift: createHash('sha1'), play: createHash('sha1') };
    hashes.set(who, made);
    return made;
  };
  for (const [set, song, wall, transport] of samples) {
    const frame = poseAt(scene.plan, song, wall, transport, audible, buffer);
    for (const [index, pose] of frame.players.entries()) {
      const place = scene.layout.players[index];
      const who = `${demo.file} ${index} ${place?.cast.species ?? ''} ${place?.cast.instrument ?? ''}`;
      addPose(of(who)[set], pose);
    }
    if (frame.conductor) {
      addPose(of(`${demo.file} conductor`)[set], frame.conductor);
    }
  }
  for (const [who, sets] of hashes) {
    result[who] = {
      rest: sets.rest.digest('hex').slice(0, 12),
      lift: sets.lift.digest('hex').slice(0, 12),
      play: sets.play.digest('hex').slice(0, 12),
    };
  }
}
console.log(JSON.stringify(result, null, 1));
