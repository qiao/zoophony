/**
 * Prints the triangles of the scene of `perf-60.mid`, as `sceneTriangles()` of
 * `models/budget.test.ts`, with the players of each fox species, and the triangles of the scene
 * when the foxes get a studio body of the given triangles in place of the parametric body. The
 * body of a parametric fox is the triangles of its player less the triangles of the instrument,
 * which the rabbit player gives: the rabbit violinist less its studio body of 3,100 triangles
 * (`docs/decisions/2026-10-13-mesh-rabbit.md`). Usage:
 *
 *     node docs/research/2026-10-14-fox-mesh/scene-triangles.ts [triangles of the fox body]...
 */
import { CONDUCTOR } from '../../../src/models/cast.ts';
import { layoutScene } from '../../../src/models/layout-scene.ts';
import type { MeshData } from '../../../src/models/mesh.ts';
import { ModelCache } from '../../../src/models/model-cache.ts';
import {
  buildMusicStand,
  buildRisers,
  buildSupport,
  seatHeights,
} from '../../../src/models/props.ts';
import { SPECIES } from '../../../src/models/species.ts';
import { buildStage } from '../../../src/models/stage.ts';
import { perf60File } from '../../../src/models/test-perf-60.ts';
import { scoreOf } from '../../../src/score/test-score.ts';

const models = new ModelCache();
const layout = layoutScene(scoreOf(perf60File(), 'one-per-part'), models);
const count = (mesh: MeshData | null): number => (mesh ? mesh.positions.length / 9 : 0);
let total = count(buildStage(layout.stageSide, layout.podium));
total += count(buildRisers(layout.risers, layout.podium));
const players = new Map<string, number>();
const playerTriangles = new Map<string, number>();
for (const { cast } of layout.players) {
  const key = `${cast.species} ${cast.instrument} ${cast.support}`;
  const n = count(models.get(cast.species, cast.instrument, cast.kettles, cast.support).mesh);
  players.set(key, (players.get(key) ?? 0) + 1);
  playerTriangles.set(key, n);
  total += n;
  total += count(buildSupport(cast.support, seatHeights(cast.support, SPECIES[cast.species])));
}
total += layout.stands.length * count(buildMusicStand());
total += count(models.get(CONDUCTOR.species, CONDUCTOR.instrument).mesh);
console.log(`players ${layout.players.length}, triangles ${total} of 200000`);
for (const [key, n] of [...players].toSorted()) {
  if (key.startsWith('fox') || key.startsWith('rabbit')) {
    console.log(`  ${key}: ${n} players, ${playerTriangles.get(key)} triangles each`);
  }
}

const rabbitBody = 3100;
const rabbitPlayer = count(models.get('rabbit', 'violin', 0, 'chair').mesh);
const violin = rabbitPlayer - rabbitBody;
console.log(`rabbit violinist ${rabbitPlayer} = body ${rabbitBody} + violin ${violin}`);
const fluteFox = count(models.get('fox-tan', 'flute', 0, 'chair').mesh);
const violinFox = count(models.get('fox-red', 'violin', 0, 'chair').mesh);
const foxBody = violinFox - violin;
console.log(`fox-red violinist ${violinFox} = parametric body ${foxBody} + violin ${violin}`);
console.log(`fox-tan flutist ${fluteFox} = parametric body ${foxBody} + flute ${fluteFox - foxBody}`);

const reds = [...players].filter(([k]) => k.startsWith('fox-red')).reduce((a, [, n]) => a + n, 0);
const tans = [...players].filter(([k]) => k.startsWith('fox-tan')).reduce((a, [, n]) => a + n, 0);
for (const arg of process.argv.slice(2)) {
  const body = Number(arg);
  const step = body - foxBody;
  console.log(
    `fox body ${body}: red foxes only ${total + reds * step}, red and tan foxes ${total + (reds + tans) * step} of 200000`,
  );
}
