/** The pose of one animal for one frame (design 5.1). */
export interface AnimalPose {
  /**
   * One quaternion (x, y, z, w) for each bone, in the order of `BONE_NAMES` (4.7). Each rotation
   * is relative to the parent bone, and the bind pose has no rotation.
   */
  readonly rotations: Float32Array;
  /** The offset of the root bone, for the sway. */
  readonly rootOffset: readonly [number, number, number];
  /** 0 is open eyes, 1 is closed eyes. The eye bones scale on y by `1 - blink`. */
  readonly blink: number;
}
