/**
 * Runs a probe of this folder with the studio body that the export makes from a GLB file of the
 * dog, in a copy of the tree (`withGlbBody()` of `tools/glb-swap.ts`), such as the rig of
 * `914da25c` for `weight-try.ts`.
 *
 * Usage, from the root of the tree:
 *
 *     node docs/research/2026-10-17-dog-folds/glb-run.ts <rig.glb> <probe.ts> [<argument>]...
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { runTool, withGlbBody } from '../../../tools/glb-swap.ts';

const [glb = '', probe = 'weight-try.ts', ...rest] = process.argv.slice(2);
const text = (await readFile(new URL(probe, import.meta.url), 'utf8'))
  .replaceAll('../../../src/', '../src/')
  .replaceAll('../../../tools/', './');
process.exitCode = await withGlbBody('dog', resolve(glb), async (dir) => {
  await writeFile(join(dir, 'tools', `copy-${probe}`), text);
  return runTool(dir, `copy-${probe}`, rest);
});
