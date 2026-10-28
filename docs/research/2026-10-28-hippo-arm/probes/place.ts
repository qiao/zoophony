// Prints the index, the place, and the facing of the hippo bassist in a demo (boulanger-matin by
// default). Usage: node docs/research/2026-10-28-hippo-arm/probes/place.ts [<demo>]
import { roleBodies } from '../../../../tools/fold-probe.ts';
import { demoSceneOf } from '../../../../src/pose/test-scene.ts';
const scene = await demoSceneOf(process.argv[2] ?? 'boulanger-matin.mid');
const [body] = roleBodies({ kind: 'player', instrument: 'contrabass', species: ['hippo'] }, scene);
const place = scene.layout.players[body?.index ?? 0];
console.log(JSON.stringify({ index: body?.index, position: place?.position, facing: place?.facing }));
