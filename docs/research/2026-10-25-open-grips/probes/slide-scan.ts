// Scans the slide travel that the right arm of the panda reaches, for slide angles and shoulder turns.
import { MathUtils, Quaternion, Vector3 } from 'three';
import { setHolds } from '../../../../tools/hold-sets.ts';
import { slideReach, windReach } from '../../../../tools/hold-reach.ts';

const Y = new Vector3(0, 1, 0);
const X = new Vector3(1, 0, 0);
function play(right: number, down: number): string {
  const q = new Quaternion()
    .setFromAxisAngle(Y, -right * MathUtils.DEG2RAD)
    .multiply(new Quaternion().setFromAxisAngle(X, -down * MathUtils.DEG2RAD));
  return `[${q.x},${q.y},${q.z},${q.w}]`;
}
const rights = (process.argv[2] ?? '30,45,60,75,90').split(',').map(Number);
const downs = (process.argv[3] ?? '-5,0,5,10').split(',').map(Number);
const reaches = (process.argv[4] ?? '45').split(',').map(Number);
const extra = process.argv[5] ?? '';
console.log('| right° | down (from bind 15°) | reach° | travel cm | R spare play cm | L spare play cm |');
for (const reach of reaches) {
  for (const right of rights) {
    for (const down of downs) {
      const set = `trombone@panda.play=${play(right, down)};trombone@panda.reach=${reach * MathUtils.DEG2RAD}${extra ? ';' + extra : ''}`;
      const h = setHolds(set);
      try {
        const s = slideReach('panda', 'trombone', 'chair');
        const w = windReach('panda', 'trombone', 'chair');
        console.log(
          `| ${right} | ${down} | ${reach} | ${((s?.reach ?? 0) * 100).toFixed(1)} | ${((w.R.arm - w.R.play) * 100).toFixed(1)} | ${((w.L.arm - w.L.play) * 100).toFixed(1)} |`,
        );
      } finally {
        h.undo();
      }
    }
  }
}
