/**
 * Sets the bow grip of species in memory from `--grip <species>:<x>,<y>,<z>,<deg>` options, before
 * the scenes are built.
 */
import { SPECIES } from '../../../src/models/species.ts';

export function applyGrips(args: readonly string[]): string[] {
  const done: string[] = [];
  args.forEach((arg, i) => {
    if (args[i - 1] !== '--grip') {
      return;
    }
    const [species, values] = arg.split(':');
    const [x, y, z, deg] = (values ?? '').split(',').map(Number);
    // SAFETY: a probe changes the table in memory.
    const entry = (SPECIES as unknown as Record<string, { bowGrip?: unknown }>)[species ?? ''];
    if (!entry) {
      throw new Error(`unknown species ${species}`);
    }
    entry.bowGrip = { at: [x, y, z], turn: ((deg ?? 0) * Math.PI) / 180 };
    done.push(arg);
  });
  return done;
}
