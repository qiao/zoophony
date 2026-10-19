// Hashes the model of each instrument for each species, with the scale of the species.
import { createHash } from 'node:crypto';

import { INSTRUMENT_IDS, buildInstrument } from '../../../src/models/instruments/catalog.ts';
import { SPECIES, SPECIES_IDS, instrumentScale } from '../../../src/models/species.ts';

const hash = createHash('sha256');
let count = 0;
for (const species of SPECIES_IDS) {
  const params = SPECIES[species];
  for (const id of INSTRUMENT_IDS) {
    const scale = instrumentScale(params, id);
    const model = buildInstrument(id, 4, scale, params.bowGrip);
    hash.update(`${species} ${id} ${scale} ${JSON.stringify(model)}\n`);
    count++;
  }
}
console.log(`${count} instruments, sha256 ${hash.digest('hex')}`);
