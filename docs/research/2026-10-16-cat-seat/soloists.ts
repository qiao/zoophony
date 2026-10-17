/** Lists the standing soloists of each demo. Usage: node docs/research/2026-10-16-cat-seat/soloists.ts */
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
for (const demo of await patchedDemos()) {
  const scene = sceneOf(demo.bytes);
  const stand = scene.layout.players.filter((p) => p.cast.support === 'stand').map((p) => `${p.cast.species} ${p.cast.instrument}`);
  if (stand.length > 0) {
    console.log(demo.file, stand.join(', '));
  }
}
