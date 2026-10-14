// Prints the triangles of the scene of perf-60.mid, as sceneTriangles() of models/budget.test.ts.
// node docs/research/2026-10-13-rabbit-mesh/scene-triangles.ts (a copy of
// docs/research/2026-10-13-studio-rabbit/scene-triangles.ts)
import { scoreOf } from '../../../src/score/test-score.ts';
import { CONDUCTOR } from '../../../src/models/cast.ts';
import { layoutScene } from '../../../src/models/layout-scene.ts';
import { ModelCache } from '../../../src/models/model-cache.ts';
import type { MeshData } from '../../../src/models/mesh.ts';
import {
  buildMusicStand,
  buildRisers,
  buildSupport,
  seatHeights,
} from '../../../src/models/props.ts';
import { SPECIES } from '../../../src/models/species.ts';
import { buildStage } from '../../../src/models/stage.ts';
import { perf60File } from '../../../src/models/test-perf-60.ts';
const models = new ModelCache();
const layout = layoutScene(scoreOf(perf60File(), 'one-per-part'), models);
const count = (mesh: MeshData | null): number => (mesh ? mesh.positions.length / 9 : 0);
let total = count(buildStage(layout.stageSide, layout.podium));
total += count(buildRisers(layout.risers, layout.podium));
for (const { cast } of layout.players) {
  total += count(models.get(cast.species, cast.instrument, cast.kettles, cast.support).mesh);
  total += count(buildSupport(cast.support, seatHeights(cast.support, SPECIES[cast.species])));
}
total += layout.stands.length * count(buildMusicStand());
total += count(models.get(CONDUCTOR.species, CONDUCTOR.instrument).mesh);
console.log(`players ${layout.players.length}, triangles ${total}`);
