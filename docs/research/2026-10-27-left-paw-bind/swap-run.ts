// Runs a script of the tree in a copy of the tree whose animal has the studio body of a GLB file
// (withGlbBody() of tools/glb-swap.ts), such as the trace of a rig of `pnpm rig-mesh --check
// --keep`. A script outside tools/ is copied to its own path in the copy first, so that its
// relative imports read the copy.
// Usage: node docs/research/2026-10-27-left-paw-bind/swap-run.ts <animal> <glb> <script> [args...]
// Example: node docs/research/2026-10-27-left-paw-bind/swap-run.ts rabbit <dir>/variant-2.glb
//          tools/arm-check.ts violinist --trace mozart-k525:lift0-1.2
import { spawn } from 'node:child_process';
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { withGlbBody } from '../../../tools/glb-swap.ts';

const [animal = '', glb = '', script = '', ...args] = process.argv.slice(2);
const code = await withGlbBody(animal, resolve(glb), async (dir) => {
  const path = join(dir, script);
  if (!script.startsWith('tools/')) {
    mkdirSync(dirname(path), { recursive: true });
    cpSync(resolve(script), path);
  }
  return new Promise<number>((done) => {
    spawn(process.execPath, [path, ...args], {
      stdio: 'inherit',
      env: { ...process.env, PROBE_NO_CACHE: '1' },
    }).on('close', (c) => done(c ?? 1));
  });
});
process.exit(code);
