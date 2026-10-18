/**
 * Runs `keys-dump.ts` with the studio body that the export makes from a GLB file of the dog, in a
 * copy of the tree (`withGlbBody()` of `tools/glb-swap.ts`), so that the folds of each sample come
 * from the rig of a variant.
 *
 * Usage, from the root of the tree:
 *
 *     node docs/research/2026-10-17-dog-folds/keys-glb.ts <rig.glb> <out.json> [--step <s>]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { runTool, withGlbBody } from '../../../tools/glb-swap.ts';

const [glb = '', out = 'keys.json', ...rest] = process.argv.slice(2);
const text = (await readFile(new URL('keys-dump.ts', import.meta.url), 'utf8'))
  .replaceAll('../../../src/', '../src/')
  .replaceAll('../../../tools/', './');
const code = await withGlbBody('dog', resolve(glb), async (dir) => {
  await writeFile(join(dir, 'tools', 'keys-dump-copy.ts'), text);
  return runTool(dir, 'keys-dump-copy.ts', [resolve(out), ...rest]);
});
process.exitCode = code;
