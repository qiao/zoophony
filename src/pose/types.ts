/** The pose of one animal for one frame (design 5.1). */
export interface AnimalPose {
  /**
   * One quaternion (x, y, z, w) for each bone, in the order of `BONE_NAMES` (4.7). Each rotation
   * is relative to the parent bone, and the bind pose has no rotation.
   */
  readonly rotations: Float32Array;
  /** The offset of the root bone, for the sway. */
  readonly rootOffset: readonly [number, number, number];
  /**
   * The move of the `slide` bone from its bind place, in meters, in the axes of its parent bone
   * `instrument`. The trombone slide moves along its axis (4.6). It is (0, 0, 0) for each other
   * instrument. The scene adds it to the bind position of the bone.
   */
  readonly slideOffset: readonly [number, number, number];
  /** 0 is open eyes, 1 is closed eyes. The eye bones scale on y by `1 - blink`. */
  readonly blink: number;
}

/** The poses of the scene for one frame (design 5.1). */
export interface ScenePose {
  /** One entry for each player, in the order of `SceneLayout.players`. */
  readonly players: readonly AnimalPose[];
  readonly conductor: AnimalPose;
}

/** The play state. It changes only on play, pause, and stop (design 5.1, 5.2). */
export interface Transport {
  readonly playing: boolean;
  /** Wall clock seconds of the last play, pause, or stop. `null` before the first play. */
  readonly changedAtWall: number | null;
  /**
   * Wall clock seconds of the change before the last one, or `null` if there was none. A play
   * that starts soon after a pause lifts the instruments from where they are.
   */
  readonly previousChangeAtWall: number | null;
}

/** The mute and solo result of one seat (design 5.5, 6.6). */
export interface SeatAudibility {
  readonly audible: boolean;
  /** Wall clock seconds of the last change. */
  readonly changedAtWall: number;
  /**
   * Wall clock seconds of the change before the last one, or `null` if there was none. A seat
   * that sounds again soon after a mute lifts its instruments from where they are.
   */
  readonly previousChangeAtWall: number | null;
}
