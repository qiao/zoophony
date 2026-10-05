/** A point or a direction in meters, as (x, y, z) (design 5.1). */
export type Vec3 = readonly [number, number, number];

/** A rotation as a unit quaternion (x, y, z, w), in the order of three.js. */
export type Quat = readonly [number, number, number, number];

/** The rotation that changes nothing. */
export const IDENTITY: Quat = [0, 0, 0, 1];

/** The conversion factor from degrees to radians. */
export const DEG = Math.PI / 180;

/**
 * Adds two vectors.
 *
 * @param a The first vector.
 * @param b The second vector.
 * @returns The sum a + b.
 */
export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/**
 * Subtracts a vector from a vector.
 *
 * @param a The vector to subtract from.
 * @param b The vector to subtract.
 * @returns The difference a - b.
 */
export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/**
 * Multiplies a vector by a number.
 *
 * @param v The vector.
 * @param s The factor.
 * @returns The product s × v.
 */
export function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/**
 * Calculates the dot product of two vectors.
 *
 * @param a The first vector.
 * @param b The second vector.
 * @returns The dot product.
 */
export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Calculates the cross product of two vectors.
 *
 * @param a The first vector.
 * @param b The second vector.
 * @returns The cross product a × b.
 */
export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/**
 * Calculates the length of a vector.
 *
 * @param v The vector.
 * @returns The Euclidean length.
 */
export function length(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

/**
 * Scales a vector to the length 1.
 *
 * @param v A vector with a length larger than 0.
 * @returns The unit vector in the direction of `v`.
 */
export function normalize(v: Vec3): Vec3 {
  return scale(v, 1 / length(v));
}

/**
 * Multiplies two quaternions. The result applies `b` first, then `a`.
 *
 * @param a The second rotation.
 * @param b The first rotation.
 * @returns The product a × b.
 */
export function multiply(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

/**
 * Inverts a unit quaternion.
 *
 * @param q The rotation.
 * @returns The opposite rotation.
 */
export function invert(q: Quat): Quat {
  return [-q[0], -q[1], -q[2], q[3]];
}

/**
 * Makes a rotation around an axis.
 *
 * @param axis The axis. The function normalizes it.
 * @param angle The angle in radians. A positive angle turns counterclockwise when the axis points
 *   to the viewer.
 * @returns The rotation.
 */
export function axisAngle(axis: Vec3, angle: number): Quat {
  const [x, y, z] = normalize(axis);
  const s = Math.sin(angle / 2);
  return [x * s, y * s, z * s, Math.cos(angle / 2)];
}

/**
 * Makes a rotation from Euler angles in the XYZ order of three.js.
 *
 * @param x The angle around x, in radians.
 * @param y The angle around y, in radians.
 * @param z The angle around z, in radians.
 * @returns The rotation. It turns around z first, then y, then x, in the fixed axes.
 */
export function euler(x: number, y: number, z: number): Quat {
  return multiply(
    multiply(axisAngle([1, 0, 0], x), axisAngle([0, 1, 0], y)),
    axisAngle([0, 0, 1], z),
  );
}

/**
 * Finds the smallest rotation that turns one direction into another.
 *
 * @param from The start direction. It must not be 0.
 * @param to The end direction. It must not be 0.
 * @returns The rotation. For opposite directions, it turns 180° around an axis normal to `from`.
 */
export function rotationBetween(from: Vec3, to: Vec3): Quat {
  const a = normalize(from);
  const b = normalize(to);
  const d = dot(a, b);
  if (d < -0.999999) {
    const helper: Vec3 = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    return axisAngle(cross(a, helper), Math.PI);
  }
  const c = cross(a, b);
  const w = 1 + d;
  const n = Math.hypot(c[0], c[1], c[2], w);
  return [c[0] / n, c[1] / n, c[2] / n, w / n];
}

/**
 * Rotates a vector.
 *
 * @param q The rotation.
 * @param v The vector.
 * @returns The rotated vector.
 */
export function rotate(q: Quat, v: Vec3): Vec3 {
  const [qx, qy, qz, qw] = q;
  const u: Vec3 = [qx, qy, qz];
  const t = scale(cross(u, v), 2);
  return add(add(v, scale(t, qw)), cross(u, t));
}

/** A placement of a part: scale first, then rotation, then translation. */
export interface Transform {
  readonly position: Vec3;
  readonly rotation: Quat;
  readonly scale: Vec3;
}

/**
 * Makes a transform. The arguments that are left out change nothing.
 *
 * @param position The translation.
 * @param rotation The rotation.
 * @param scaleBy The scale on each axis.
 * @returns The transform.
 */
export function transform(
  position: Vec3 = [0, 0, 0],
  rotation: Quat = IDENTITY,
  scaleBy: Vec3 = [1, 1, 1],
): Transform {
  return { position, rotation, scale: scaleBy };
}

/**
 * Applies a transform to a point.
 *
 * @param t The transform.
 * @param p The point.
 * @returns The point after the scale, the rotation, and the translation.
 */
export function applyTransform(t: Transform, p: Vec3): Vec3 {
  const scaled: Vec3 = [p[0] * t.scale[0], p[1] * t.scale[1], p[2] * t.scale[2]];
  return add(rotate(t.rotation, scaled), t.position);
}
