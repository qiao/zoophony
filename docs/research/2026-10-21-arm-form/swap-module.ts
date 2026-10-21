/**
 * Writes the studio module of a GLB file into src/models/studio/<animal>.ts of this worktree, for
 * a render of the working tree. Restore the file with git checkout after the render.
 *
 * Usage: node scratch/swap-module.ts <animal> <file.glb>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { glbModule } from '../tools/glb-swap.ts';

const [animal = '', file = ''] = process.argv.slice(2);
const { text } = glbModule(animal, file, new Uint8Array(readFileSync(file)));
writeFileSync(join(import.meta.dirname, '..', 'src', 'models', 'studio', `${animal}.ts`), text);
console.log(`wrote the module of ${file} for ${animal}`);
