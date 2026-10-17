/**
 * Prints the colors of the faces of the standing cat body with the largest areas (the palette of
 * the rig, from the texture of the mesh), in sRGB, with their Oklab lightness, chroma, and hue, and
 * the same for the red fox and the rabbit. The light of a render does not touch these colors.
 * Usage: node docs/research/2026-10-16-cat-mesh/mesh-colors.ts
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';

const srgb = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const oklab = (r: number, g: number, b: number): [number, number, number] => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};
for (const [species, instrument] of [['cat', 'viola'], ['fox-red', 'violin'], ['rabbit', 'violin']] as const) {
  const { mesh } = buildPlayer(species, instrument, 4, 'stand');
  const instrumentBones = new Set([boneIndex('instrument'), boneIndex('bow')]);
  const areas = new Map<string, number>();
  let total = 0;
  for (let t = 0; t < mesh.positions.length / 9; t++) {
    if (instrumentBones.has(mesh.bones[t * 3] ?? -1)) {
      continue;
    }
    const p = (k: number, i: number): number => mesh.positions[t * 9 + k * 3 + i] ?? 0;
    const e1 = [0, 1, 2].map((i) => p(1, i) - p(0, i));
    const e2 = [0, 1, 2].map((i) => p(2, i) - p(0, i));
    const area =
      Math.hypot(
        e1[1]! * e2[2]! - e1[2]! * e2[1]!,
        e1[2]! * e2[0]! - e1[0]! * e2[2]!,
        e1[0]! * e2[1]! - e1[1]! * e2[0]!,
      ) / 2;
    const key = [0, 1, 2].map((i) => (mesh.colors[t * 9 + i] ?? 0).toFixed(4)).join(' ');
    areas.set(key, (areas.get(key) ?? 0) + area);
    total += area;
  }
  console.log(`${species}: ${areas.size} colors`);
  for (const [key, area] of [...areas].toSorted((a, b) => b[1] - a[1]).slice(0, 6)) {
    const [r, g, b] = key.split(' ').map(Number) as [number, number, number];
    const hex = [r, g, b].map((c) => Math.round(srgb(c) * 255).toString(16).padStart(2, '0')).join('');
    const [L, A, B] = oklab(r, g, b);
    const hue = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
    console.log(
      `  #${hex} ${((100 * area) / total).toFixed(1)}% of the area, Oklab L ${L.toFixed(3)}, chroma ${Math.hypot(A, B).toFixed(4)}, hue ${hue.toFixed(0)} deg`,
    );
  }
}
