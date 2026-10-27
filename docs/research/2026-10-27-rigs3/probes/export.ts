// Writes the posed places of named samples of the deer harpist, with the triangles of main and of
// the tree, for elbow_draw.py.   node scratch/a/export.ts <out.json> <label>...
import { writeFileSync } from 'node:fs';
import { unpackStudioMesh } from '../../src/models/studio-format.ts';
import { skinStudioMesh } from '../../src/models/studio-rig.ts';
import { foldedFaces } from '../../tools/fold-probe.ts';
import { load } from './elbow.ts';
import { STUDIO_DEER as MAIN } from './deer-main.ts';

const [out = 'scratch/a/posed.json', ...labels] = process.argv.slice(2);
const { mesh, samples } = await load();
const main = { ...mesh, corners: unpackStudioMesh(MAIN.mesh, (MAIN as { palette?: string }).palette).corners };
const rows = [];
for (const label of labels) {
  const s = samples.find((x) => x.label === label);
  if (!s) throw new Error(`no sample ${label}`);
  const posed = skinStudioMesh(mesh, s);
  rows.push({
    label,
    posed: Array.from(posed),
    foldsMain: foldedFaces(main, s.matrices, posed),
    foldsTree: foldedFaces(mesh, s.matrices, posed),
  });
}
writeFileSync(out, JSON.stringify({ bind: Array.from(mesh.positions), main: Array.from(main.corners), tree: Array.from(mesh.corners), rows }));
console.log(rows.map((r) => `${r.label}: main folds ${r.foldsMain.join(',') || 'none'}, tree folds ${r.foldsTree.join(',') || 'none'}`).join('\n'));
