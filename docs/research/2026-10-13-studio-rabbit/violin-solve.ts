import { SPECIES_HOLDS, violinTurn } from '../../../src/pose/bowed-rig.ts';
import { measure } from './violin-rule.ts';
// Solves the violin scale of the rule: the scroll in the middle of the palm of the extended left arm.
for (const yaw of [-25, -20, -15, -10]) {
  const hold = SPECIES_HOLDS.rabbit?.violin;
  (SPECIES_HOLDS.rabbit as { violin: unknown }).violin = { ...hold, playTurn: violinTurn(yaw, -8) };
  let lo = 0.1, hi = 1;
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2;
    const r = measure('rabbit', 'chair', mid);
    if (r.scroll > r.arm) hi = mid; else lo = mid;
  }
  const r = measure('rabbit', 'chair', lo);
  console.log('yaw', yaw, '(', 70 + yaw, 'deg left of front) scale', lo.toFixed(3), 'violin', r.length.toFixed(3), 'm, arm', r.arm.toFixed(3), 'stop', r.stop.map((v) => v.toFixed(2)).join('..'), 'bow', r.bow.map((v) => v.toFixed(3)).join('..'));
}
