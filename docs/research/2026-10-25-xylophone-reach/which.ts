// Lists the xylophone players of each demo: node docs/research/2026-10-25-xylophone-reach/which.ts
import { probeDemos } from '../../../tools/probe-demos.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
for (const d of await probeDemos()) {
  const s = sceneOf(d.bytes);
  const xs = s.layout.players.filter((p) => p.cast.instrument === 'xylophone').map((p) => p.cast.species);
  console.log(d.file, xs.join(',') || '-');
}
