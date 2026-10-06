import type { Vec3 } from '../models/tuples.ts';

/** The head of a player or of the conductor on the stage, for the foreground test. */
export interface StageHead {
  /** The index of the player in `SceneLayout.players`, or `CONDUCTOR_OWNER`. */
  readonly owner: number;
  readonly center: Vec3;
  /** The radius of a sphere around the head, in meters. */
  readonly radius: number;
}

/**
 * The foreground rule of a close shot (design 5.6). Close shots showed large heads
 * of other players at the bottom edge and over the subject (UX audit 2026-10-05, SC1).
 */
export const FOREGROUND = {
  /**
   * A head of another player is in the foreground when it is nearer to the camera than this part
   * of the distance of the focus of the subject. Then it shows at least 1.3 times larger.
   */
  nearShare: 0.75,
  /**
   * A head of another player that is nearer than this part of the distance of the focus must
   * also stay out of the middle of the frame, where the subject is.
   */
  coverShare: 0.95,
  /**
   * The middle of the frame, in the units of the view: half its width and half its height. The
   * camera looks at the target of the subject, so the body and the instrument fill this part.
   */
  middle: [0.4, 0.6],
  /** The test reads the frame of a desktop view. */
  aspect: 1.6,
} as const;

/**
 * Tells if a head of another player stands in the foreground of a close camera (design 5.6). Such
 * a head is nearer to the camera than 0.75 times the distance of the focus of the subject, and a
 * part of it shows in the frame of a desktop view. A head nearer than 0.95 times that distance
 * also counts when a part of it shows in the middle of the frame, over the subject.
 *
 * @param heads The heads of the players and of the conductor.
 * @param members The owners of the heads of the subject. Their heads do not count.
 * @param focus The point of the subject that sets the distance: the middle of the head of a
 *   solo player or of the conductor, or the target of a section.
 * @param camera The camera.
 * @param target The point that the camera looks at.
 * @param fov The vertical field of view, in degrees.
 * @returns True if a head stands in the foreground.
 */
export function foregroundHead(
  heads: readonly StageHead[],
  members: readonly number[],
  focus: Vec3,
  camera: Vec3,
  target: Vec3,
  fov: number,
): boolean {
  // The axes of the camera: forward, right, and up.
  let fx = target[0] - camera[0];
  let fy = target[1] - camera[1];
  let fz = target[2] - camera[2];
  const fl = Math.hypot(fx, fy, fz);
  fx /= fl;
  fy /= fl;
  fz /= fl;
  // right = forward × (0, 1, 0)
  let rx = -fz;
  let rz = fx;
  const rl = Math.hypot(rx, rz);
  rx /= rl;
  rz /= rl;
  // up = right × forward
  const ux = -rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy;
  const tanV = Math.tan(((fov / 2) * Math.PI) / 180);
  const subjectDistance = Math.hypot(
    focus[0] - camera[0],
    focus[1] - camera[1],
    focus[2] - camera[2],
  );
  const [middleX, middleY] = FOREGROUND.middle;
  for (const head of heads) {
    if (members.includes(head.owner)) {
      continue;
    }
    const dx = head.center[0] - camera[0];
    const dy = head.center[1] - camera[1];
    const dz = head.center[2] - camera[2];
    const depth = dx * fx + dy * fy + dz * fz;
    const share = Math.hypot(dx, dy, dz) / subjectDistance;
    if (depth <= 0 || share >= FOREGROUND.coverShare) {
      continue;
    }
    const scale = depth * tanV;
    // The middle of the head in the units of the view, and the radius of the head.
    const x = Math.abs(dx * rx + dz * rz) / (scale * FOREGROUND.aspect);
    const y = Math.abs(dx * ux + dy * uy + dz * uz) / scale;
    const r = head.radius / scale;
    const rx2 = r / FOREGROUND.aspect;
    if (share < FOREGROUND.nearShare && x - rx2 < 1 && y - r < 1) {
      return true;
    }
    if (x - rx2 < middleX && y - r < middleY) {
      return true;
    }
  }
  return false;
}
