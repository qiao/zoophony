// The error of the lookup table of the grade (docs/research/2026-10-18-cinematic-light.md,
// section 2.2): the trilinear lookup of gradeLutData() against gradeColor(), on a 64^3 grid of
// inputs, in levels of 255. Run from the root of the repository:
// node docs/research/2026-10-18-cinematic-light/lut_check.ts
import { GRADE_LUT_SIZE, gradeColor, gradeLutData } from '../../../src/scene/grade.ts';

const n = GRADE_LUT_SIZE;
const lut = gradeLutData(n);
const at = (r: number, g: number, b: number, ch: number): number =>
  (lut[((b * n + g) * n + r) * 4 + ch] ?? 0) / 255;

function lookup(rgb: number[]): number[] {
  const p = rgb.map((v) => v * (n - 1));
  const i = p.map((v) => Math.min(n - 2, Math.floor(v)));
  const f = p.map((v, k) => v - (i[k] ?? 0));
  return [0, 1, 2].map((ch) => {
    let sum = 0;
    for (const dr of [0, 1]) {
      for (const dg of [0, 1]) {
        for (const db of [0, 1]) {
          const w =
            (dr ? f[0]! : 1 - f[0]!) * (dg ? f[1]! : 1 - f[1]!) * (db ? f[2]! : 1 - f[2]!);
          sum += w * at(i[0]! + dr, i[1]! + dg, i[2]! + db, ch);
        }
      }
    }
    return sum;
  });
}

let max = 0;
let sum = 0;
let count = 0;
const N = 64;
for (let r = 0; r <= N; r++) {
  for (let g = 0; g <= N; g++) {
    for (let b = 0; b <= N; b++) {
      const c: [number, number, number] = [r / N, g / N, b / N];
      const exact = gradeColor(c).map((v) => Math.min(1, Math.max(0, v)));
      const looked = lookup(c);
      for (let k = 0; k < 3; k++) {
        const d = Math.abs((exact[k] ?? 0) - (looked[k] ?? 0)) * 255;
        max = Math.max(max, d);
        sum += d;
        count++;
      }
    }
  }
}
console.log(`max error ${max.toFixed(2)} levels, mean ${(sum / count).toFixed(3)} levels`);
