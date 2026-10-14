/**
 * Measures the rest pose of the rabbit violinist, seated and standing, as the test of
 * `pose/rest-clearance.test.ts` does: the smallest distance of the rested violin and bow from the
 * trunk and the head (up to 5 cm), at the wall times of the test. A hold change in memory gives a
 * variant. Usage:
 *
 *     node docs/research/2026-10-13-rabbit-mesh/rest-probe.ts ['violin@rabbit.<path>=<value>;...']
 */
import { galleryPlan } from '../../../src/gallery/plan.ts';
import type { GalleryAnimal } from '../../../src/gallery/plan.ts';
import { CONDUCTOR } from '../../../src/models/cast.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { HEAD_BONES, partDistance, posedPart } from '../../../src/pose/test-clearance.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED } from '../../../src/pose/test-scene.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const changes = setHolds(process.argv[2] ?? '');
console.log(`set: ${changes.text || 'none'}`);
const supports = ['chair', 'stand'] as const;
const players = supports.map((support, seatIndex): GalleryAnimal => ({
  model: buildPlayer('rabbit', 'violin', 4, support),
  place: {
    position: [seatIndex * 3, 0, 0],
    facing: Math.PI,
    cast: { species: 'rabbit', instrument: 'violin', support, seatIndex, player: 0, kettles: 4 },
  },
}));
const conductor: GalleryAnimal = {
  model: buildPlayer(CONDUCTOR.species, CONDUCTOR.instrument),
  place: {
    position: [6, 0, 0],
    facing: Math.PI,
    cast: { ...CONDUCTOR, support: 'stand', seatIndex: 2, player: 0, kettles: 4 },
  },
};
const plan = galleryPlan(players, conductor, []);
const buffer = createScenePose(plan);
for (const wall of [10, 13.7, 21.1, 29.3]) {
  const scene = poseAt(plan, 0, wall, NOT_STARTED, [], buffer);
  for (const [i, { model }] of players.entries()) {
    const pose = scene.players[i];
    if (!pose) {
      continue;
    }
    const posed = poseSkeleton(model, pose);
    const body = posedPart(posed, ['spine', 'chest', ...HEAD_BONES]);
    const gaps = (['instrument', 'bow'] as const).map(
      (bone) =>
        `${bone} ${(partDistance(posedPart(posed, [bone]), body, 0.05) * 100).toFixed(1)} cm`,
    );
    console.log(`${supports[i]} wall ${wall} s: ${gaps.join(', ')}`);
  }
}
changes.undo();
