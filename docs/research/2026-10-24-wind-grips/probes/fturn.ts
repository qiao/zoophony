import { fluteTurn } from '../src/pose/winds.ts';
const [f, d, kx, ky, kz] = process.argv.slice(2).map(Number);
console.log(fluteTurn(f, d, [kx, ky, kz]).map((v) => v.toFixed(5)).join(','));
