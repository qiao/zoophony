import { Data3DTexture, LinearFilter, NoColorSpace, RGBAFormat, UnsignedByteType } from 'three';

/** A color with three channels from 0 to 1. */
export type GradeColor = readonly [r: number, g: number, b: number];

/**
 * The values of the color grade on the display values, after AgX (design 4.5, post effects).
 * {@link gradeColor} applies them, and the lookup table of {@link gradeLut} holds the result.
 */
export const GRADE = {
  /** The lift of the shadows, for each channel. */
  lift: [0.004, 0.004, 0.003],
  /** The gamma, for each channel. */
  gamma: [1.0, 1.0, 1.0],
  /** The gain, for each channel. */
  gain: [1.0, 1.0, 0.97],
  /** The blend to an S curve, from 0 to 1. */
  contrast: 0.25,
  /**
   * The lift of the highlights toward white, from 0 to 1. AgX compresses the light parts, so
   * white fur reached 170 at most, against 210 to 220 in `mockup.png`.
   */
  highlights: 1.0,
  /** The saturation of the middle tones and the highlights. */
  saturation: 1.0,
  /** The saturation of the shadows. The warm light and the wood saturate them strongly. */
  shadowSaturation: 0.45,
} as const;

/**
 * Calculates the smooth step of GLSL.
 *
 * @param edge0 The value that gives 0.
 * @param edge1 The value that gives 1.
 * @param x The value.
 * @returns A value from 0 to 1.
 */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Grades one display color (design 4.5, post effects): lift the shadows, set the gamma, scale the
 * highlights for each channel, blend to an S curve, move the highlights toward white, and set the
 * saturation.
 *
 * @param color The display color after AgX, from 0 to 1 for each channel.
 * @returns The graded color.
 */
export function gradeColor(color: GradeColor): [number, number, number] {
  const g = GRADE;
  const c = color.map((value, i) => {
    let v = Math.min(1, Math.max(0, value));
    v = v * (g.gain[i] ?? 1) + (g.lift[i] ?? 0) * (1 - v);
    v = Math.max(v, 0) ** (1 / (g.gamma[i] ?? 1));
    v += (v * v * (3 - 2 * v) - v) * g.contrast;
    return v + g.highlights * smoothstep(0.45, 1, v) * (1 - v);
  });
  const [r = 0, gr = 0, b = 0] = c;
  const luma = 0.2126 * r + 0.7152 * gr + 0.0722 * b;
  const saturation =
    g.shadowSaturation + (g.saturation - g.shadowSaturation) * smoothstep(0.05, 0.35, luma);
  return [
    luma + (r - luma) * saturation,
    luma + (gr - luma) * saturation,
    luma + (b - luma) * saturation,
  ];
}

/**
 * The number of entries of the lookup table on each axis. The middle of the first entry holds the
 * grade of 0, and the middle of the last entry the grade of 1.
 */
export const GRADE_LUT_SIZE = 33;

/**
 * Fills the lookup table of the grade: the {@link gradeColor} of each entry, as RGBA bytes. Red
 * changes fastest, then green, then blue, as `Data3DTexture` reads them.
 *
 * @param size The number of entries on each axis.
 * @returns Four bytes for each entry.
 */
export function gradeLutData(size: number = GRADE_LUT_SIZE): Uint8Array {
  const data = new Uint8Array(size * size * size * 4);
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const graded = gradeColor([r / (size - 1), g / (size - 1), b / (size - 1)]);
        const i = ((b * size + g) * size + r) * 4;
        for (const [channel, value] of graded.entries()) {
          data[i + channel] = Math.round(Math.min(1, Math.max(0, value)) * 255);
        }
        data[i + 3] = 255;
      }
    }
  }
  return data;
}

/** The lookup table of the grade, which all materials and passes share. */
let lut: Data3DTexture | null = null;

/**
 * Gives the lookup table of the grade (design 4.5, post effects), as a 3D texture with a linear
 * filter. The final pass and the views page read it with `GRADE_FUNCTION` of `post-shaders.ts`.
 *
 * @returns The texture. Its pixels stay in memory, so a restored WebGL context loads it again.
 */
export function gradeLut(): Data3DTexture {
  if (!lut) {
    const size = GRADE_LUT_SIZE;
    lut = new Data3DTexture(gradeLutData(size), size, size, size);
    lut.format = RGBAFormat;
    lut.type = UnsignedByteType;
    lut.minFilter = LinearFilter;
    lut.magFilter = LinearFilter;
    lut.colorSpace = NoColorSpace;
    lut.needsUpdate = true;
  }
  return lut;
}
