/**
 * Prints the gzip size of the packed mesh of each studio body, with the default level of Node
 * zlib, as `src/models/studio-size.test.ts` measures it. Usage:
 *
 *     node docs/research/2026-10-14-rabbit-mesh-retro/mesh-gzip.ts
 */
import { STUDIO_BODIES } from '../../../src/models/studio-body.ts';
import { STUDIO_MESH_GZIP_BUDGET, gzipSize } from '../../../tools/studio-budgets.ts';

for (const [name, body] of Object.entries(STUDIO_BODIES)) {
  console.log(`${name}: ${body.mesh.length} B packed, ${gzipSize(body.mesh)} B after gzip`);
}
console.log(`budget: ${STUDIO_MESH_GZIP_BUDGET} B`);
