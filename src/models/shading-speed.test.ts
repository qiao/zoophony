import { describe, expect, it } from 'vitest';

import { scoreOf } from '../score/test-score.ts';
import { timeRatio } from '../test-speed.ts';
import { layoutScene } from './layout-scene.ts';
import type { MeshData } from './mesh.ts';
import { ModelCache } from './model-cache.ts';
import { buildSceneProps } from './props.ts';
import { shadeMesh } from './shading.ts';
import { perf60File } from './test-perf-60.ts';

/**
 * The most time of the shading of the models of `perf-60.mid`, as a multiple of the time of the
 * reference work of {@link timeRatio}: 2 times the ratio of 17.5 on the development Mac (about
 * 45 ms, with the crease normals and the baked occlusion). Thus a change that is 3
 * times slower fails, and a loaded or a slower machine passes, because its reference work is
 * slower too.
 */
const LIMIT = 35;

/** The rounds of the measurement. */
const ROUNDS = 7;

describe('the time of the shading (design 4.5, 9.7)', () => {
  it('shades the player models and the props of perf-60.mid in at most 2 times the time on the development Mac', () => {
    const models = new ModelCache();
    const layout = layoutScene(scoreOf(perf60File(), 'one-per-part'), models);
    const players = new Map<MeshData, readonly number[]>();
    for (const { cast } of layout.players) {
      const model = models.get(cast.species, cast.instrument, cast.kettles, cast.support);
      players.set(model.mesh, model.skeleton.parents);
    }
    const props = buildSceneProps(layout);
    const ratio = timeRatio(() => {
      for (const [mesh, parents] of players) {
        shadeMesh(mesh, parents);
      }
      shadeMesh(props, null);
    }, ROUNDS);
    expect(players.size).toBeGreaterThan(15);
    expect(ratio).toBeLessThan(LIMIT);
  });
});
