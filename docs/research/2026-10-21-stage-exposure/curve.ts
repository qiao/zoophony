// Prints the tone curve of GRADE and the grade of sample colors after AgX.
import { gradeLutData, GRADE_LUT_SIZE } from '../src/scene/grade.ts';
const lut = gradeLutData();
const n = GRADE_LUT_SIZE;
const at = (r: number, g: number, b: number): number[] => {
  const q = (v: number): number => Math.round((v / 255) * (n - 1));
  const i = ((q(b) * n + q(g)) * n + q(r)) * 4;
  return [lut[i]!, lut[i + 1]!, lut[i + 2]!];
};
for (const v of [32, 64, 96, 128, 144, 160, 176, 192, 208, 224, 240]) {
  console.log(`gray ${v} -> ${at(v, v, v).join(',')}`);
}
for (const c of [[200, 130, 80], [216, 140, 88], [184, 120, 72], [210, 200, 190], [225, 215, 205], [190, 180, 170]]) {
  console.log(`color ${c.join(',')} -> ${at(c[0]!, c[1]!, c[2]!).join(',')}`);
}
