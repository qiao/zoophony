import { seated } from '../src/models/body-frame.ts';
import { SPECIES } from '../src/models/species.ts';
import { builtBody } from '../src/models/test-body.ts';
for (const id of ['bear', 'polar-bear'] as const) {
  const { mesh } = builtBody(SPECIES[id], seated(0.45));
  console.log(id, 'triangles', mesh.positions.length / 9);
}
