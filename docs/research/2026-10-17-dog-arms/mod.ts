// Writes the module of the dog body of a GLB file: node docs/research/2026-10-17-dog-arms/mod.ts <glb> <out.ts> [<constant>]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { glbModule } from '../../../tools/glb-swap.ts';
const [glb, out] = process.argv.slice(2);
if (!glb || !out) throw new Error('usage');
const file = resolve(glb);
const { text } = glbModule('dog', file, new Uint8Array(readFileSync(file)));
writeFileSync(out, text);
console.log(`wrote ${out}: ${text.length} chars`);
