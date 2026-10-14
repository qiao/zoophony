// Prints --set values of the flute hold of the tan fox for a head turn: headTurn and play.
import { MathUtils } from 'three';
import { fluteTurn } from '../../../src/pose/winds.ts';
const [turn = 25, slope = 10] = process.argv.slice(2).map(Number);
const q = fluteTurn(turn, slope).map((v) => v.toFixed(6)).join(',');
console.log(`flute@fox-tan.headTurn=${turn}deg;flute@fox-tan.play=${q}`);
