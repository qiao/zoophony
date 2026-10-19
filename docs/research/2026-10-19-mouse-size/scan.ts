// Scans the oboe scale and the hold of the mouse for the reach of the grips (pnpm hold-reach).
// Usage: node docs/research/2026-10-19-mouse-size/scan.ts
import { MathUtils, Quaternion, Vector3 } from 'three';
import { windReach } from '../../../tools/hold-reach.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const X = new Vector3(1, 0, 0);
const Z = new Vector3(0, 0, 1);
const turn = (x: number, z: number): string =>
  new Quaternion()
    .setFromAxisAngle(X, x * MathUtils.DEG2RAD)
    .multiply(new Quaternion().setFromAxisAngle(Z, z * MathUtils.DEG2RAD))
    .toArray()
    .map((v) => v.toFixed(6))
    .join(',');

const scales = [0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6];
const rows: string[] = [];
const args = process.argv.slice(2);
const forwards = (args[0] ?? '-15,-10,-5,0,5,10').split(',').map(Number);
const reaches = (args[1] ?? '20,30,40').split(',').map(Number);
const extra = args[2] ?? '';
for (const f of forwards) {
  for (const r of reaches) {
    const hold = `oboe@mouse.play=${turn(f, 0)};oboe@mouse.reach=${r}deg${extra ? `;${extra}` : ''}`;
    const cells: string[] = [];
    let best: number | null = null;
    for (const s of scales) {
      const { undo } = setHolds(`${hold};mouse.oboeScale=${s}`);
      try {
        const reach = windReach('mouse', 'oboe', 'chair');
        const spare = Math.min(
          reach.L.arm - reach.L.play,
          reach.L.arm - reach.L.rest,
          reach.R.arm - reach.R.play,
          reach.R.arm - reach.R.rest,
        );
        const sp = (v: number): string => (v * 100).toFixed(1);
        cells.push(
          `${s}: ${sp(spare)} (Lp ${sp(reach.L.arm - reach.L.play)} Lr ${sp(reach.L.arm - reach.L.rest)} Rp ${sp(reach.R.arm - reach.R.play)} Rr ${sp(reach.R.arm - reach.R.rest)})`,
        );
        if (best === null && spare >= 0.03) {
          best = s;
        }
      } finally {
        undo();
      }
    }
    rows.push(`| ${30 + f + 10}° (forward ${f}) | reach ${r}° | ${extra || '-'} | best ${best ?? 'none'} | ${cells.join('; ')} |`);
  }
}
console.log(rows.join('\n'));
