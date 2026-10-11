import type { BoneName } from './rig.ts';
import type { Vec3 } from './tuples.ts';

/**
 * The bones that a rigged body places (design 4.4, 4.7). The packer gives each one its head in the
 * rest pose of the mesh. The other body bones of the player move no vertex of a rigged body.
 */
export const RIGGED_BONES = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'earL',
  'earR',
  'tail1',
  'tail2',
  'shoulderL',
  'upperArmL',
  'forearmL',
  'handL',
  'fingersL',
  'shoulderR',
  'upperArmR',
  'forearmR',
  'handR',
  'fingersR',
  'thighL',
  'shinL',
  'footL',
  'thighR',
  'shinR',
  'footR',
] as const satisfies readonly BoneName[];

/** A bone that a rigged body places. */
export type RiggedBone = (typeof RIGGED_BONES)[number];

/**
 * The eye bones of a rigged body. The vertices of the plate in front of each eye follow its eye
 * bone, so that the eye blinks (design 4.4, 5.1).
 */
export const RIGGED_EYE_BONES = ['eyeL', 'eyeR'] as const satisfies readonly BoneName[];

/** An eye of a rigged body: the plate of the eye is in the mesh (design 4.4). */
export interface RiggedEye {
  /** The middle of the eye on the surface of the head: the place of its eye bone. */
  readonly middle: Vec3;
  /** The unit normal of the surface of the head at the eye, outward. */
  readonly normal: Vec3;
  /** The larger half size of the eye of the texture, in meters. */
  readonly radius: number;
}

/**
 * A rigged body: a mesh from a GLB file with its own skeleton and weights (design 4.4). The mesh
 * is in its rest pose, a T-pose with the arms out to the sides. Each vertex follows two bones at
 * most (design 4.7). The axes are the axes of the model: the animal faces -z, its left side is
 * -x, the soles are on y = 0, the middle plane is x = 0, and the hips are on z = 0. The units are
 * meters. `pnpm rig-body <species>` writes the module of a species.
 */
export interface RiggedBody {
  /** The head height `H`, from the chin to the top of the skull. */
  readonly headHeight: number;
  /** The middle of the head. */
  readonly headCenter: Vec3;
  /** The tip of the nose. */
  readonly nose: Vec3;
  /**
   * The URL of the skin texture: a WebP image of the colors of the body, baked from the texture
   * of the GLB file. The skin coordinates of the packed mesh point into it.
   */
  readonly skin: string;
  /** The head of each bone in the rest pose. */
  readonly joints: Readonly<Record<RiggedBone, Vec3>>;
  /** The end of each finger block: the tail of its `fingers` bone. */
  readonly fingerTips: Readonly<Record<'fingersL' | 'fingersR', Vec3>>;
  /** The eyes. */
  readonly eyes: Readonly<Record<'eyeL' | 'eyeR', RiggedEye>>;
  /** The packed mesh (`packMesh()`), with the skin coordinates of each vertex. */
  readonly mesh: string;
}
