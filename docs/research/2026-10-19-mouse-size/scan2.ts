// Finds the largest oboe scale of the mouse with 3 cm to spare for each paw, in the play and in the
// rest, for each variant of the hold (the reach of pnpm hold-reach).
// Usage: node docs/research/2026-10-19-mouse-size/scan2.ts '<set>' ... Each argument is one variant,
// and turn(x,z) writes holdTurn(x, z) of src/pose/winds.ts.
import { MathUtils, Quaternion, Vector3 } from 'three';
import { windReach } from '../../../tools/hold-reach.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const X = new Vector3(1, 0, 0);
const Z = new Vector3(0, 0, 1);
/** Writes holdTurn(x, z) of winds.ts as a --set list. */
export const turn = (x: number, z: number): string =>
  new Quaternion()
    .setFromAxisAngle(X, x * MathUtils.DEG2RAD)
    .multiply(new Quaternion().setFromAxisAngle(Z, z * MathUtils.DEG2RAD))
    .toArray()
    .map((v) => v.toFixed(6))
    .join(',');

const GOAL = 0.03;
const spares = (variant: string, s: number) => {
  const { undo } = setHolds(`${variant ? `${variant};` : ''}mouse.oboeScale=${s}`);
  try {
    const r = windReach('mouse', 'oboe', 'chair');
    return {
      Lp: r.L.arm - r.L.play,
      Lr: r.L.arm - r.L.rest,
      Rp: r.R.arm - r.R.play,
      Rr: r.R.arm - r.R.rest,
    };
  } finally {
    undo();
  }
};
const largest = (variant: string, pick: (sp: ReturnType<typeof spares>) => number): number | null => {
  for (let s = 0.95; s >= 0.5 - 1e-9; s -= 0.01) {
    const v = Number(s.toFixed(2));
    if (pick(spares(variant, v)) >= GOAL) {
      return v;
    }
  }
  return null;
};
const expand = (text: string): string =>
  text.replace(/turn\((-?[\d.]+),(-?[\d.]+)\)/g, (...[, x, z]) => turn(Number(x), Number(z)));
for (const arg of import.meta.main ? process.argv.slice(2) : []) {
  const variant = expand(arg);
  const play = largest(variant, (sp) => Math.min(sp.Lp, sp.Rp));
  const rest = largest(variant, (sp) => Math.min(sp.Lr, sp.Rr));
  const both = largest(variant, (sp) => Math.min(sp.Lp, sp.Rp, sp.Lr, sp.Rr));
  const at = both ?? 0.6;
  const sp = spares(variant, at);
  const cm = (v: number): string => (v * 100).toFixed(1);
  console.log(
    `| ${arg || 'base'} | ${play ?? '<0.5'} | ${rest ?? '<0.5'} | ${both ?? '<0.5'} | at ${at}: Lp ${cm(sp.Lp)} Rp ${cm(sp.Rp)} Lr ${cm(sp.Lr)} Rr ${cm(sp.Rr)} |`,
  );
}
