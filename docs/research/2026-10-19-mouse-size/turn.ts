// Prints holdTurn(x, z) of src/pose/winds.ts as a --set list. Usage: node turn.ts <x> <z>
import { turn } from './scan2.ts';
const [x = '0', z = '0'] = process.argv.slice(2);
console.log(turn(Number(x), Number(z)));
