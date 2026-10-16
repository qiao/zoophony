// The triangles of the scene of perf-60.mid, as sceneTriangles() of src/models/budget.test.ts
// counts them, and of the body of each studio player.
// Usage: node docs/research/2026-10-16-pea-eyes/scene-tris.ts [<absolute src root>]
const root = process.argv[2] ?? '../../../src';
const { scoreOf } = await import(`${root}/score/test-score.ts`);
const { perf60File } = await import(`${root}/models/test-perf-60.ts`);
const { layoutScene } = await import(`${root}/models/layout-scene.ts`);
const { ModelCache } = await import(`${root}/models/model-cache.ts`);
const { buildStage } = await import(`${root}/models/stage.ts`);
const { buildMusicStand, buildRisers, buildSupport, seatHeights } = await import(`${root}/models/props.ts`);
const { SPECIES } = await import(`${root}/models/species.ts`);
const { CONDUCTOR } = await import(`${root}/models/cast.ts`);
const { buildPlayer } = await import(`${root}/models/player.ts`);
const { boneIndex } = await import(`${root}/models/rig.ts`);
const models = new ModelCache();
const layout = layoutScene(scoreOf(perf60File(), 'one-per-part'), models);
const count = (mesh: { positions: Float32Array } | null) => (mesh ? mesh.positions.length / 9 : 0);
let total = count(buildStage(layout.stageSide, layout.podium));
total += count(buildRisers(layout.risers, layout.podium));
const kinds = new Map<string, number>();
for (const { cast } of layout.players) {
  total += count(models.get(cast.species, cast.instrument, cast.kettles, cast.support).mesh);
  total += count(buildSupport(cast.support, seatHeights(cast.support, SPECIES[cast.species])));
  kinds.set(cast.species, (kinds.get(cast.species) ?? 0) + 1);
}
total += layout.stands.length * count(buildMusicStand());
total += count(models.get(CONDUCTOR.species, CONDUCTOR.instrument).mesh);
console.log('players', layout.players.length, 'scene triangles', total);
console.log('studio players', ['rabbit', 'fox-red', 'fox-tan', 'polar-bear'].map((s) => `${s} ${kinds.get(s) ?? 0}`).join(', '), '+ the bear conductor');
const inst = new Set(['instrument', 'slide', 'bow', 'malletL', 'malletR', 'baton'].map((b) => boneIndex(b)));
for (const [s, i] of [['rabbit', 'violin'], ['fox-red', 'violin'], ['fox-tan', 'flute'], ['polar-bear', 'piano'], ['bear', 'baton']]) {
  const { mesh } = buildPlayer(s, i);
  let n = 0;
  for (let t = 0; t < mesh.bones.length / 3; t++) if (!inst.has(mesh.bones[t * 3])) n++;
  console.log(`body ${s}: ${n}`);
}
