// Prints the quaternion of fluteTurn(forward, down, keys) as a set value.
// Usage: node docs/research/2026-10-24-wind-holds/flute-turn.ts <forward> <down> [<kx>,<ky>,<kz>]
import { fluteTurn } from '../../../src/pose/winds.ts';
import type { Vec3 } from '../../../src/models/tuples.ts';

const [forward, down, keys] = process.argv.slice(2);
const k = keys ? (keys.split(',').map(Number) as unknown as Vec3) : undefined;
console.log(fluteTurn(Number(forward), Number(down), k).map((x) => x.toFixed(5)).join(','));
