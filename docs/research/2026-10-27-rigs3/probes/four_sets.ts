// Counts the folds of the deer harpist in the four sets (rest, play, lift, lowering) with the
// triangles of the tree and with the triangles of main (the places and the weights are the same).
//   node scratch/a/four_sets.ts
import { unpackStudioMesh } from '../../src/models/studio-format.ts';
import { count, countText, load } from './elbow.ts';
import { STUDIO_DEER as MAIN } from './deer-main.ts';

const { mesh, samples } = await load();
const corners = unpackStudioMesh(MAIN.mesh, (MAIN as { palette?: string }).palette).corners;
const sets = ['rest', 'play', 'lift', 'lower'] as const;
console.log(`samples: ${sets.map((s) => `${s} ${samples.filter((x) => x.set === s).length}`).join(', ')}`);
console.log(countText('main', count({ ...mesh, corners }, samples)));
console.log(countText('round', count(mesh, samples)));
