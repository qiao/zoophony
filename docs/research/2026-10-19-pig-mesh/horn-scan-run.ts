/**
 * Runs horn-scan.ts in a copy of the tree with the pig body of a GLB file.
 * Usage: node docs/research/2026-10-19-pig-mesh/horn-scan-run.ts <glb> '<y>,<x>,<z>' ...
 */
import { copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { runTool, withGlbBody } from '../../../tools/glb-swap.ts';

const [glb = '', ...variants] = process.argv.slice(2);
process.exitCode = await withGlbBody('pig', resolve(glb), (dir) => {
  copyFileSync(join(import.meta.dirname, 'horn-scan.ts'), join(dir, 'tools', 'horn-scan.ts'));
  return runTool(dir, 'horn-scan.ts', variants);
});
