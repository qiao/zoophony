import { describe, expect, it } from 'vitest';

import { prepareShots } from './prepare.ts';
import { TEST_SEED, demoShotScenes, movePlayers } from './test-shots.ts';
import type { Shot } from './types.ts';

// A paused test (`PAUSED_TESTS` of `vite.config.ts`): the share of the kept cuts comes from the
// plans that the footprints of the bodies decide. The longer legs of the polar bear of 2026-10-14
// put one choice of the plan of `bach-bwv1048.mid` at 85.5 s at the edge of a blocked sight line
// (`docs/decisions/2026-10-14-polar-fix.md`).
const SCENES = await demoShotScenes();

/** The move of each player, in meters. */
const MOVE = 0.02;

/** The seeds of the directions of the moves. */
const MOVES = [1, 2, 3, 4];

/**
 * Gives the start of a shot as a key, in 0.01 s.
 *
 * @param shot The shot.
 * @returns The key.
 */
const startOf = (shot: Shot): string => shot.startSec.toFixed(2);

/**
 * Gives the start, the kind, and the seats of a shot as a key.
 *
 * @param shot The shot.
 * @returns The key.
 */
const labelOf = (shot: Shot): string =>
  `${startOf(shot)} ${shot.kind} ${shot.seats.toSorted((a, b) => a - b).join('+')}`;

describe('the stability of the shot plans of the demos against small moves (design 5.6)', () => {
  it('keeps most cuts and shots of the demos when each player moves by 2 cm', () => {
    // With one seeded generator for the full plan, the demos kept 61% to 63% of their shots and
    // 75% to 78% of their cuts. The cast branch changed 30 of 31 shots of the Boulanger demo. Now
    // they keep 80% to 87% of their shots and 92% to 97% of their cuts, for 5 sets of 4 moves.
    // One changed choice can still shift the later cuts of one demo, for example in 6 of 20 moves
    // of the Bach demo, so the bounds hold for all demos together.
    let shots = 0;
    let keptShots = 0;
    let keptCuts = 0;
    for (const scene of SCENES) {
      const base = scene.plan.shots.slice(1, -1);
      for (const seed of MOVES) {
        const layout = movePlayers(scene.layout, seed, MOVE);
        const moved = prepareShots(scene.score, layout, TEST_SEED, scene.models).shots.slice(1, -1);
        const labels = new Set(moved.map(labelOf));
        const starts = new Set(moved.map(startOf));
        shots += base.length;
        keptShots += base.filter((shot) => labels.has(labelOf(shot))).length;
        keptCuts += base.filter((shot) => starts.has(startOf(shot))).length;
      }
    }
    expect(keptCuts / shots).toBeGreaterThanOrEqual(0.9);
    expect(keptShots / shots).toBeGreaterThanOrEqual(0.75);
  });
});
