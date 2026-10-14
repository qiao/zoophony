// Prints the stage side of each demo with the layout of a source tree.
const root = process.argv[2] ?? '../../..';
const { patchedDemos } = await import(`${root}/tools/patch-demos.ts`);
const { scoreOf } = await import(`${root}/src/score/test-score.ts`);
const { layoutScene } = await import(`${root}/src/models/layout-scene.ts`);
const { ModelCache } = await import(`${root}/src/models/model-cache.ts`);
for (const demo of await patchedDemos()) {
  const layout = layoutScene(scoreOf(demo.bytes), new ModelCache());
  console.log(demo.file, layout.stageSide.toFixed(3));
}
