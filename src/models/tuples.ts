import type { QuaternionTuple, Vector3Tuple } from 'three';

/**
 * A point or a direction in meters, as (x, y, z): the plain form of a `Vector3` (design 5.1). The
 * pure modules keep and return their points in this form, so that a test can compare them and no
 * caller can change them (design 7.1).
 */
export type Vec3 = Readonly<Vector3Tuple>;

/** A rotation as a unit quaternion (x, y, z, w): the plain form of a `Quaternion`. */
export type Quat = Readonly<QuaternionTuple>;

/** The rotation that changes nothing. */
export const IDENTITY: Quat = [0, 0, 0, 1];
