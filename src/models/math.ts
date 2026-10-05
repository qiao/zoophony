import type { Quat, Vec3 } from './tuples.ts';

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

/**
 * Removes the part of a vector along an axis.
 *
 * @param v The vector.
 * @param axis A unit axis.
 * @returns The part of `v` normal to `axis`.
 */
export function reject(v: Vec3, axis: Vec3): Vec3 {
  return sub(v, scale(axis, dot(v, axis)));
}

/**
 * Makes the rotation that turns the x axis to `xAxis` and the y axis to `yAxis`.
 *
 * @param xAxis The new x axis, a unit vector.
 * @param yAxis The new y axis, a unit vector normal to `xAxis`.
 * @returns The rotation. The z axis turns to `xAxis × yAxis`.
 */
export function basisRotation(xAxis: Vec3, yAxis: Vec3): Quat {
  const [m00, m10, m20] = xAxis;
  const [m01, m11, m21] = yAxis;
  const [m02, m12, m22] = cross(xAxis, yAxis);
  const trace = m00 + m11 + m22;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    return [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s];
  }
  if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  }
  if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  }
  const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
  return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
}
