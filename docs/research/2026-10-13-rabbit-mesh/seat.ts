/**
 * Prints the seat height, the chair depth, and the head height that `pnpm studio-body` gives the
 * rig of the rabbit mesh, with no write: the export runs in memory with the GLB file of the rig on
 * the rabbit entry of `ANIMALS`.
 *
 *     node docs/research/2026-10-13-rabbit-mesh/seat.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ANIMALS, studioBody } from '../../../tools/studio-body.ts';

const source = 'assets/models/rabbit/rabbit-4.rig.glb';
const settings = ANIMALS.get('rabbit');
if (!settings) {
  throw new Error('ANIMALS has no rabbit.');
}
const bytes = readFileSync(join(import.meta.dirname, '..', '..', '..', source));
const { body } = studioBody(bytes, source, { ...settings, glb: source });
console.log(`seat height ${body.seatHeight} m, chair depth ${body.chairDepth} m`);
console.log(`head height ${body.headHeight} m, scale ${body.scale} m for each unit`);
