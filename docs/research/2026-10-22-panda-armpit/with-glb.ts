/**
 * Runs a scratch probe on the studio body of a GLB file of the bear: a copy of `src/` holds the
 * module of the file (`withGlbBody()`), and the probe runs from `scratch/` of the copy.
 * Usage: node scratch/with-glb.ts <glb> <probe.ts> [args]...
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { withGlbBody } from '../tools/glb-swap.ts';

const [glb, probe, ...rest] = process.argv.slice(2);
await withGlbBody(process.env.SPECIES ?? 'panda', resolve(glb!), async (dir) => {
  mkdirSync(join(dir, 'scratch'), { recursive: true });
  cpSync(resolve('scratch'), join(dir, 'scratch'), {
    recursive: true,
    filter: (p) => !p.includes('/rig') && !p.endsWith('.json') && !p.endsWith('.png') && !p.endsWith('.glb'),
  });
  const out = spawnSync(process.execPath, [join(dir, 'scratch', probe!), ...rest], { stdio: 'inherit' });
  return out.status;
});
