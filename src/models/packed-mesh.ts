/**
 * The size of one step of a packed coordinate, in meters. The rounding is the same on each side of
 * 0, so the left half of a symmetric mesh stays the mirror image of its right half.
 */
export const PACKED_STEP = 2.5e-4;

/**
 * Packs a coordinate in steps of {@link PACKED_STEP}, with the same rounding on each side of 0.
 *
 * @param value The coordinate, in meters.
 * @returns The number of steps.
 */
export function packCoordinate(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value) / PACKED_STEP) + 0;
}
