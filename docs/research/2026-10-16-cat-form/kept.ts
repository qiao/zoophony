/**
 * Prints the landmark height of ANIMALS for each variant config of the cat: 1.16494 m (the
 * shoulder joints of the cat config at the start of the round) times keptHeight() of the variant,
 * so that the variant keeps the meters for each unit. Usage, from the root of the worktree, with
 * the config of the start of the round in tools/mesh-rigs/cat.json:
 *
 *     node docs/research/2026-10-16-cat-form/kept.ts <variant.json>...
 */
import { readFileSync } from 'node:fs';
import { keptHeight, parseConfig } from '../../../tools/rig-mesh.ts';
const base = parseConfig(readFileSync('tools/mesh-rigs/cat.json', 'utf8'));
for (const f of process.argv.slice(2)) {
  const k = keptHeight(base, parseConfig(readFileSync(f, 'utf8')));
  console.log(f, (1.16494 * k).toFixed(6));
}
