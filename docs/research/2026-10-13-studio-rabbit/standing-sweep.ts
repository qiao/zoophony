// Prints the deepest pair of each part and obstacle of the violinist sweep for the standing
// rabbit of a solo violin, in each set of samples. The file is the copy of `SOLO_VIOLIN` of
// `src/pose/test-violinist-clearance.ts`. Run it from the root of the worktree:
// node docs/research/2026-10-13-studio-rabbit/standing-sweep.ts
import { note, programChange, tempo, timeSignature, track } from '../../../src/midi/test-smf.ts';
import type { TestFile } from '../../../src/midi/test-smf.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { pairText, sweepDepths } from '../../../src/pose/test-sweep.ts';
import { VIOLINIST_SWEEP } from '../../../src/pose/test-sweep-roles.ts';

const keys = [55, 62, 69, 76, 88, 60, 79, 57];
const file: TestFile = {
  tracks: [
    [tempo(0, 120), timeSignature(0, 4, 4)],
    track(
      [programChange(0, 0, 40)],
      ...keys.map((key, i) => note(i * 480, 0, key)),
      ...[55, 62, 69, 76].map((key, i) => note(3840 + i * 1920, 0, key, 3840 + (i + 1) * 1920)),
      [programChange(11520, 0, 45)],
      ...keys.map((key, i) => note(11520 + i * 480, 0, key)),
    ),
  ],
};
const scene = sceneOf(file, 1, 'one-per-part');
for (const player of VIOLINIST_SWEEP.players(scene)) {
  console.log(`${player.name}, support ${player.model.support}`);
  for (const { name, samples } of VIOLINIST_SWEEP.sampleSets(scene)) {
    for (const pair of sweepDepths(VIOLINIST_SWEEP, player, samples)) {
      if (pair.depth > 0) {
        console.log(`${name}: ${pairText(pair)}`);
      }
    }
  }
}
