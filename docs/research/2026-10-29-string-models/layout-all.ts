// Prints each seat and each stand of each demo, so that two trees can be compared with diff.
import { DEMO_IDS } from '../../../src/app/demos.ts';
import { buildScore } from '../../../src/score/score.ts';
import { layoutScene } from '../../../src/models/layout-scene.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
for (const demo of DEMO_IDS) {
  const result = buildScore((await patchedDemo(`${demo}.mid`)).bytes, 'auto');
  if (!result.ok) throw new Error(demo);
  const layout = layoutScene(result.score);
  console.log(demo, 'stage', layout.stageSide.toFixed(6), 'podium', layout.podium.map((v) => v.toFixed(6)).join(' '));
  for (const p of layout.players) {
    console.log(' ', p.cast.species, p.cast.instrument, p.position.map((v) => v.toFixed(6)).join(' '), p.facing.toFixed(6));
  }
  for (const s of layout.stands) {
    console.log('  stand', JSON.stringify(s, (_, v: unknown) => (typeof v === 'number' ? Number(v.toFixed(6)) : v)));
  }
}
