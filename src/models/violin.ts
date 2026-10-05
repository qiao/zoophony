import { INSTRUMENT_COLORS } from './colors.ts';
import { applyTransform, multiply, rotate, transform } from './math.ts';
import type { Quat, Transform, Vec3 } from './math.ts';
import type { MeshBuilder } from './mesh.ts';
import { box, icosphere, prism } from './primitives.ts';
import type { OutlinePoint } from './primitives.ts';
import { RABBIT_HEAD_HEIGHT } from './species.ts';

/**
 * The scale of the instrument models (design 4.6). The sizes of {@link VIOLIN} and {@link BOW} fit
 * a rabbit with a head height of 0.30 m, so the scale is the head height of the rabbit divided by
 * 0.30. With H 0.38 m, it is 1.27. The hold of each instrument applies it.
 */
export const INSTRUMENT_SCALE = RABBIT_HEAD_HEIGHT / 0.3;

/**
 * The sizes of the violin model, in meters before the {@link INSTRUMENT_SCALE}. The viola is this
 * model at 1.15 scale (4.6).
 */
export const VIOLIN = {
  length: 0.4,
  bodyLength: 0.24,
  bodyThickness: 0.04,
  /** The distance of the bridge from the tail end. */
  bridge: 0.095,
  /** The height of the strings above the bottom of the body at the bridge. */
  stringHeight: 0.068,
  /** The distance of the bow contact point from the tail end, between the bridge and the fingerboard. */
  bowContact: 0.11,
  /** The distance of the hand position on the neck from the tail end. */
  neckGrip: 0.27,
} as const;

/** The sizes of the bow model, in meters before the {@link INSTRUMENT_SCALE}. */
export const BOW = {
  length: 0.45,
  /** The distance of the hand from the frog end. */
  grip: 0.03,
  /** The distance from the stick to the hair. */
  hairGap: 0.012,
} as const;

/** The points of a violin that the pose needs, in the axes of the model. */
export interface ViolinAnchors {
  /** The point on the strings where the bow plays. */
  readonly bowContact: Vec3;
  /** The unit direction from the tail end to the scroll. */
  readonly axis: Vec3;
  /** The unit normal of the top plate: the strings are on this side. */
  readonly top: Vec3;
  /** The point under the neck that the left hand holds. */
  readonly neckGrip: Vec3;
}

/** The points of a bow in its bind pose, in the axes of the model. */
export interface BowAnchors {
  /** The point that the right hand holds. */
  readonly grip: Vec3;
  /** The unit direction from the frog to the tip. */
  readonly axis: Vec3;
  /** The unit direction from the stick to the hair. */
  readonly hairSide: Vec3;
  /** The distance from the stick to the hair, in meters. */
  readonly hairGap: number;
}

/**
 * The outline of the body around its center, counterclockwise from +y: the upper bout at +x
 * (the neck side), the waist, and the lower bout at -x (the tail side).
 */
const BODY_HALF: readonly OutlinePoint[] = [
  [0.12, 0],
  [0.11, -0.035],
  [0.085, -0.055],
  [0.055, -0.057],
  [0.03, -0.045],
  [0, -0.04],
  [-0.03, -0.045],
  [-0.06, -0.065],
  [-0.09, -0.068],
  [-0.11, -0.05],
  [-0.12, 0],
];

const BODY_OUTLINE: readonly OutlinePoint[] = [
  ...BODY_HALF,
  ...BODY_HALF.slice(1, -1)
    .toReversed()
    .map(([x, z]): OutlinePoint => [x, -z]),
];

/**
 * Adds a violin to a mesh. In its own axes, the violin runs along +x from the tail end at the
 * origin to the scroll. The top plate faces +y, and the bottom of the body is at y = 0.
 *
 * @param builder The mesh that gets the parts.
 * @param hold The placement of the violin in the axes of the model. Its scale is the size factor.
 * @param bone The bone that the violin follows.
 * @returns The points that the pose needs.
 */
export function addViolin(builder: MeshBuilder, hold: Transform, bone: number): ViolinAnchors {
  const v = VIOLIN;
  const wood = INSTRUMENT_COLORS.violinWood;
  const dark = INSTRUMENT_COLORS.fingerboard;
  const part = (
    corners: number[],
    color: readonly [number, number, number],
    at: Vec3,
    rotation?: Quat,
  ): void => {
    const local = transform(at, rotation);
    const placed = transform(
      applyTransform(hold, local.position),
      multiply(hold.rotation, local.rotation),
      hold.scale,
    );
    builder.add(corners, { color, bone, at: placed });
  };

  part(prism(BODY_OUTLINE, 0, v.bodyThickness), wood, [v.bodyLength / 2, 0, 0]);
  // The neck, the pegbox, and the scroll.
  part(box(0.1, 0.02, 0.022), wood, [v.bodyLength + 0.045, v.bodyThickness - 0.002, 0]);
  part(box(0.045, 0.025, 0.02), wood, [0.355, v.bodyThickness + 0.002, 0]);
  part(icosphere(0.018, 0), wood, [0.385, v.bodyThickness + 0.008, 0]);
  // The fingerboard over the neck and the upper body, and the tailpiece and the chin rest.
  part(box(0.17, 0.008, 0.026), dark, [0.255, v.bodyThickness + 0.016, 0]);
  part(box(0.05, 0.006, 0.03), dark, [0.04, v.bodyThickness + 0.008, 0]);
  part(box(0.04, 0.012, 0.05), dark, [0.018, v.bodyThickness + 0.006, 0.03]);
  // The bridge and the strings.
  part(box(0.004, 0.024, 0.032), INSTRUMENT_COLORS.bowHair, [v.bridge, v.bodyThickness + 0.012, 0]);
  part(box(0.27, 0.002, 0.016), INSTRUMENT_COLORS.bowHair, [0.2, v.stringHeight - 0.001, 0]);

  const toModel = (p: Vec3): Vec3 => applyTransform(hold, p);
  return {
    bowContact: toModel([v.bowContact, v.stringHeight, 0]),
    axis: rotate(hold.rotation, [1, 0, 0]),
    top: rotate(hold.rotation, [0, 1, 0]),
    neckGrip: toModel([v.neckGrip, v.bodyThickness - 0.01, 0]),
  };
}

/**
 * Adds a bow to a mesh. In its own axes, the bow runs along +x from the frog at the origin to the
 * tip, and the hair is below the stick (-y).
 *
 * @param builder The mesh that gets the parts.
 * @param hold The placement of the bow in the axes of the model, in its bind pose. Its scale is
 *   the size factor.
 * @param bone The bone that the bow follows.
 * @returns The grip and the directions of the bow in its bind pose.
 */
export function addBow(builder: MeshBuilder, hold: Transform, bone: number): BowAnchors {
  const b = BOW;
  const add = (corners: number[], color: readonly [number, number, number], at: Vec3): void => {
    builder.add(corners, {
      color,
      bone,
      at: transform(applyTransform(hold, at), hold.rotation, hold.scale),
    });
  };
  add(box(b.length, 0.006, 0.006), INSTRUMENT_COLORS.bowStick, [b.length / 2, 0, 0]);
  add(box(b.length - 0.05, 0.002, 0.008), INSTRUMENT_COLORS.bowHair, [b.length / 2, -b.hairGap, 0]);
  add(box(0.035, 0.016, 0.01), INSTRUMENT_COLORS.fingerboard, [0.02, -0.007, 0]);
  add(box(0.012, 0.014, 0.007), INSTRUMENT_COLORS.bowStick, [b.length - 0.006, -0.006, 0]);
  return {
    grip: applyTransform(hold, [b.grip, 0, 0]),
    axis: rotate(hold.rotation, [1, 0, 0]),
    hairSide: rotate(hold.rotation, [0, -1, 0]),
    hairGap: b.hairGap * hold.scale[1],
  };
}
