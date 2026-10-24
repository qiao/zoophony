// Runs tools/wind-grip.ts with a smaller paw turn of the retarget, in memory.
// Usage: node scratch/pawturn.ts <max degrees> <wind-grip arguments>...
import { PAW_TURN } from '../src/models/studio-rig.ts';

const [max, ...rest] = process.argv.slice(2);
Object.assign(PAW_TURN, { max: (Number(max) * Math.PI) / 180 });
process.argv = [process.argv[0] ?? 'node', 'wind-grip.ts', ...rest];
await import('../tools/wind-grip.ts');
