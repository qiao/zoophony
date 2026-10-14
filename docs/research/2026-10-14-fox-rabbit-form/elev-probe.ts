/**
 * Prints each close camera of the shot plans of the demos of the shot tests above 30°, with each
 * layout spread by a factor, as the check N4 of `src/shots/prepare.test.ts` spreads it. Usage,
 * from the root of the worktree:
 *
 *     node docs/research/2026-10-14-fox-rabbit-form/elev-probe.ts [<factor>]
 */
import { MathUtils } from 'three';

import { layoutScene } from '../../../src/models/layout-scene.ts';
import { ModelCache } from '../../../src/models/model-cache.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { prepareShots } from '../../../src/shots/prepare.ts';
import { TEST_SEED, shotDemos } from '../../../src/shots/test-shots.ts';
import type { Vec3 } from '../../../src/models/tuples.ts';

const factor = Number(process.argv[2] ?? 3);
for (const demo of await shotDemos()) {
  const score = scoreOf(demo.bytes);
  const models = new ModelCache();
  const layout = layoutScene(score, models);
  const away = (p: Vec3): Vec3 => [p[0] * factor, p[1], p[2] * factor];
  const spread = {
    ...layout,
    stageSide: layout.stageSide * factor,
    podium: away(layout.podium),
    conductor: layout.conductor
      ? { ...layout.conductor, position: away(layout.conductor.position) }
      : null,
    players: layout.players.map((p) => ({ ...p, position: away(p.position) })),
    stands: layout.stands.map((s) => ({ ...s, position: away(s.position) })),
    risers: layout.risers.map((r) => ({ ...r, radius: r.radius * factor })),
  };
  for (const shot of prepareShots(score, spread, TEST_SEED, models).shots) {
    const close = shot.kind === 'section' || shot.kind === 'solo';
    const piano = shot.seats.every((s) => score.seats[s]?.section === 'piano');
    const elevation = MathUtils.radToDeg(shot.from.elevation);
    if (close && !piano && elevation > 30) {
      const sections = shot.seats.map((s) => score.seats[s]?.section).join('+');
      console.log(`${demo.file} ${shot.kind} ${sections} ${shot.startSec.toFixed(1)} s ${elevation.toFixed(1)}°`);
    }
  }
}
