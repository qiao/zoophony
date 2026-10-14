/**
 * Prints each pair of obstacles that touch in the layout of each demo with each section size and
 * of each chamber test file of a source tree, as the paused check "keeps all chairs, players,
 * instruments, stands, and risers apart" of `src/models/layout-scene.test.ts` finds them.  Usage, from
 * this folder:
 *
 *     node overlap-probe.ts [<root of a source tree>]
 */
const root = process.argv[2] ?? '../../..';
const { patchedDemos } = await import(`${root}/tools/patch-demos.ts`);
const { scoreOf } = await import(`${root}/src/score/test-score.ts`);
const { layoutScene, layoutObstacles } = await import(`${root}/src/models/layout-scene.ts`);
const { ModelCache } = await import(`${root}/src/models/model-cache.ts`);
const { obstaclesTouch } = await import(`${root}/src/models/footprint.ts`);
const { pianoSoloFile } = await import(`${root}/src/score/test-audit-files.ts`);
const chamber = await import(`${root}/src/models/test-chamber.ts`);

const models = new ModelCache();
const cases: { name: string; score: unknown }[] = [];
for (const demo of await patchedDemos()) {
  for (const size of ['auto', 'one-per-part', 'full']) {
    cases.push({ name: `${demo.file} ${size}`, score: scoreOf(demo.bytes, size) });
  }
}
for (const [name, file] of [
  ['string quartet', chamber.stringQuartetFile()],
  ['violin and piano', chamber.violinPianoDuoFile()],
  ['wind quintet', chamber.windQuintetFile()],
  ['string sextet', chamber.stringSextetFile()],
  ['piano solo', pianoSoloFile()],
] as const) {
  cases.push({ name, score: scoreOf(file) });
}
for (const { name, score } of cases) {
  const layout = layoutScene(score, models);
  const obstacles = layoutObstacles(layout, models);
  for (const [i, a] of obstacles.entries()) {
    for (const b of obstacles.slice(i + 1)) {
      if (obstaclesTouch(a, b, 0)) {
        console.log(`${name}: ${a.label} and ${b.label}`);
      }
    }
  }
}
console.log('done');
