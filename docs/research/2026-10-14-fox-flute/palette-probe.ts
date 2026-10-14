import { SPECIES_COLORS } from '../../../src/models/colors.ts';
import { srgb } from '../../../src/models/mesh.ts';
import { linearOfOklab, oklab, paletteMap } from '../../../tools/studio-palette.ts';
import type { Vec3 } from '../../../src/models/tuples.ts';
const map = paletteMap({ from: SPECIES_COLORS['fox-red'], to: SPECIES_COLORS['fox-tan'] });
const fur = oklab(srgb(SPECIES_COLORS['fox-red'].fur));
const belly = oklab(srgb(SPECIES_COLORS['fox-red'].belly));
const d = (a: Vec3, b: Vec3) => Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
for (const t of [0.45, 0.49, 0.5, 0.51, 0.55]) {
  const lab: Vec3 = [fur[0]+(belly[0]-fur[0])*t, fur[1]+(belly[1]-fur[1])*t, fur[2]+(belly[2]-fur[2])*t];
  const out = oklab(map(linearOfOklab(lab), 'matte'));
  console.log(t, out.map(v=>v.toFixed(4)).join(' '));
}
// pale low-chroma faces
for (const hex of ['#fef7de','#fdf3d8','#f5ede0','#efe6d8','#e8dcc8','#f2e2c8', '#ffffff', '#f0eadc', '#d9cbb5']) {
  const c = srgb(hex); const o = oklab(c); const m = oklab(map(c,'matte'));
  console.log(hex, 'b', o[2].toFixed(4), '->', m[2].toFixed(4), 'a', o[1].toFixed(4), '->', m[1].toFixed(4));
}
console.log('fur', fur, 'tanfur', oklab(srgb(SPECIES_COLORS['fox-tan'].fur)));
