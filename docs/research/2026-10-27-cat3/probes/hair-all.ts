// Prints, for each bowed player model of the demos, the hair end and the reached bow range.
import { probeDemos } from '../tools/probe-demos.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
const seen = new Set<string>();
for (const demo of await probeDemos()) {
  const scene = sceneOf(demo.bytes);
  for (const [i, p] of scene.plan.players.entries()) {
    if (p.note.family !== 'bowed') continue;
    const cast = scene.layout.players[i]!.cast;
    const key = `${cast.species} ${cast.instrument} ${cast.support}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const r = p.note.rig;
    const end = r.hairLength - r.hold.freeHair;
    console.log(`${key}: end ${end.toFixed(4)}, bowRange ${r.bowRange.map((v) => v.toFixed(4)).join('-')}${end - r.bowRange[1] < 0.005 ? ' (last step)' : ''}`);
  }
}
