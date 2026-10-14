// Prints the open loops of the closed body of the sweep for the rabbit and the red fox.
import { ModelCache } from '../../../src/models/model-cache.ts';
import { closedPart } from '../../../src/pose/test-clearance.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { createScenePose } from '../../../src/pose/pose-at.ts';
const bones = ['hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'eyeL', 'eyeR', 'earL', 'earR', 'tail1', 'tail2', 'shoulderL', 'shoulderR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'] as const;
const models = new ModelCache();
for (const [species, support] of [['rabbit', 'chair'], ['fox-red', 'chair'], ['fox-red', 'stand']] as const) {
  const model = models.get(species, 'violin', 4, support);
  const pose = createScenePose({ players: [{}], conductor: null } as never).players[0]!;
  try {
    closedPart(poseSkeleton(model, pose), bones, 0);
  } catch (e) {
    console.log(species, support, (e as Error).message);
  }
}
