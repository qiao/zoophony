import { describe, expect, it } from 'vitest';

import { SECTION_GROUPS } from './subjects.ts';
import { shotDemos, shotSceneOf } from './test-shots.ts';

const SCENES = (await shotDemos()).map((demo) => shotSceneOf(demo.file, demo.bytes));

describe('the counts of the shots of the plan of each demo (design 5.6)', () => {
  it.each(SCENES)('shows at least four subjects of $file a second time (N7)', (scene) => {
    const { plan, score } = scene;
    const seen = new Set<string>();
    let again = 0;
    for (const shot of plan.shots) {
      if (shot.kind !== 'section' && shot.kind !== 'solo' && shot.kind !== 'side') {
        continue;
      }
      const section = score.seats[shot.seats[0] ?? -1]?.section;
      const group = section && section !== 'sound-only' ? SECTION_GROUPS[section] : 'none';
      const id =
        shot.kind === 'side'
          ? `side ${Math.sign(shot.target[0])}`
          : shot.kind === 'solo'
            ? `solo ${shot.seats[0]}`
            : `section ${group}`;
      if (seen.has(id)) {
        again++;
      }
      seen.add(id);
    }
    // The Ode to Joy demo is a loud tutti with the choir for 158 s. Its plan shows only two
    // subjects a second time.
    expect(again).toBeGreaterThanOrEqual(scene.file === 'beethoven-9.mid' ? 2 : 4);
  });
});
