/**
 * Measures the bow of the standing rest of a soloist (`BowedHold.standBow`): the rabbit of the
 * violin and piano duo, and a red fox and a cat in its place. It gives the depth of the bow (the
 * corners and a point at each 1 cm along each edge, `bowPoints()`) into the closed body with the
 * legs, into the arms, and the lowest point of the bow above the floor, over the rest before the
 * first play (wall 10 s to 15.5 s).
 *
 * Usage, from the root of the worktree: node docs/research/2026-10-16-cat-seat/stand-bow.ts
 */
import { Vector3 } from 'three';

import { bowPoints } from '../../../tools/lap-rest.ts';
import { layoutScene } from '../../../src/models/layout-scene.ts';
import { ModelCache } from '../../../src/models/model-cache.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { violinPianoDuoFile } from '../../../src/models/test-chamber.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { preparePoses } from '../../../src/pose/plan.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { closedDepth, closedPart, posedPart, signedDistance } from '../../../src/pose/test-clearance.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED, allAudible } from '../../../src/pose/test-scene.ts';
import { scoreOf } from '../../../src/score/test-score.ts';

const BODY = [
  'hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'eyeL', 'eyeR', 'earL', 'earR', 'tail1', 'tail2',
  'shoulderL', 'shoulderR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR',
] as const;
const ARMS = ['upperArmL', 'forearmL', 'handL', 'fingersL', 'upperArmR', 'forearmR', 'handR', 'fingersR'] as const;
const cm = (v: number): string => (v * 100).toFixed(1);

for (const [species, instrument] of [['rabbit', 'violin'], ['fox-red', 'violin'], ['cat', 'viola']] as const) {
  const score = scoreOf(violinPianoDuoFile());
  const models = new ModelCache();
  const layout = layoutScene(score, models);
  const place = layout.players[0];
  if (!place) {
    throw new Error('no player');
  }
  // SAFETY: a probe puts another species in the place of the soloist.
  (place.cast as { species: SpeciesId }).species = species;
  (place.cast as { instrument: string }).instrument = instrument;
  const plan = preparePoses(score, layout, 1, models);
  const model = models.get(species, instrument, place.cast.kettles, place.cast.support);
  const buffer = createScenePose(plan);
  const audible = allAudible(score);
  const start = -countInAt(plan.beats, 0).lengthSec;
  let body = 0;
  let arms = 0;
  let floor = Infinity;
  let loops = 0;
  for (let wall = 10; wall <= 15.5; wall += 0.5) {
    const pose = poseAt(plan, start, wall, NOT_STARTED, audible, buffer).players[0];
    if (!pose) {
      throw new Error('no pose');
    }
    const posed = poseSkeleton(model, pose);
    const points = bowPoints(posed);
    let surface = null;
    for (let k = loops || 1; k < 12 && !surface; k++) {
      try {
        surface = closedPart(posed, BODY, k);
        loops = k;
      } catch {
        surface = null;
      }
    }
    if (surface) {
      body = Math.max(body, closedDepth(points, surface).depth);
    }
    const part = posedPart(posed, ARMS);
    for (const p of points) {
      arms = Math.max(arms, -signedDistance(part, p));
      floor = Math.min(floor, p.y);
    }
  }
  console.log(`${species} ${model.support ?? place.cast.support}: bow in the body and the legs ${cm(body)} cm, in the arms ${cm(arms)} cm, lowest point of the bow ${cm(floor)} cm above the floor (${loops} open loops)`);
}
