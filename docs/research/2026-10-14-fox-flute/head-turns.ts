// Reach of the tan fox palms to the flute grips for head turns of the real hold (square to the face).
import { MathUtils } from 'three';
import { SPECIES_WIND_HOLDS, fluteTurn } from '../../../src/pose/winds.ts';
import { fluteReach } from '../../../tools/hold-reach.ts';
const hold = SPECIES_WIND_HOLDS['fox-tan']?.flute;
if (!hold) throw new Error('no hold');
for (const turn of [0, 15, 20, 25, 30, 35, 40]) {
  for (const slope of [10]) {
    Reflect.set(hold, 'headTurn', turn * MathUtils.DEG2RAD);
    Reflect.set(hold, 'play', fluteTurn(turn, slope));
    const r = fluteReach('fox-tan', 'chair');
    console.log(`head ${turn} slope ${slope}: L ${r.L.play.toFixed(3)} (spare ${(r.L.arm - r.L.play).toFixed(3)}), R ${r.R.play.toFixed(3)} (spare ${(r.R.arm - r.R.play).toFixed(3)}), arm ${r.R.arm.toFixed(3)}`);
  }
}
