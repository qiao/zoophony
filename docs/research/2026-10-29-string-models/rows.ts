// Prints the radius of each string seat from the podium center of the default demo.
import { buildScore } from '../../../src/score/score.ts';
import { layoutScene } from '../../../src/models/layout-scene.ts';
import { patchedDemo } from '../../../tools/patch-demos.ts';
const result = buildScore((await patchedDemo('boulanger-matin.mid')).bytes, 'auto');
if (!result.ok) throw new Error('bad');
const layout = layoutScene(result.score);
const [px, , pz] = layout.podium;
for (const p of layout.players) {
  if (['violin', 'viola', 'cello', 'contrabass'].includes(p.cast.instrument)) {
    const r = Math.hypot(p.position[0] - px, p.position[2] - pz);
    const a = (Math.atan2(p.position[0] - px, -(p.position[2] - pz)) * 180) / Math.PI;
    console.log(p.cast.species.padEnd(8), p.cast.instrument.padEnd(10), 'radius', r.toFixed(2), 'angle', a.toFixed(1));
  }
}
