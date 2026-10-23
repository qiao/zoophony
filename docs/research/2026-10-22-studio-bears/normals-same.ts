import { STUDIO_BODIES, studioRigOf } from '../src/models/studio-body.ts';
import { studioNormals } from '../src/models/studio-normals.ts';
import { studioNormals as oldNormals } from './old-normals.ts';
let all = true;
for (const name of Object.keys(STUDIO_BODIES) as (keyof typeof STUDIO_BODIES)[]) {
  const rig = studioRigOf(name, false);
  const { caps, rim, crease } = rig.body;
  const a = studioNormals(rig.mesh, crease, caps, rim);
  const b = oldNormals(rig.mesh, crease, caps, rim);
  const same = a.length === b.length && a.every((v, i) => v === b[i]);
  all &&= same;
  if (!same) console.log('differs', name);
}
console.log(all ? 'all identical' : 'DIFF');
