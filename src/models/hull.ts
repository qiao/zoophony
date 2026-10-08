import { Vector3 } from 'three';
import type { Vec3 } from './tuples.ts';

/** The smallest distance of a point in front of a face that makes the face visible from it. */
const VISIBLE = 1e-9;

/** One triangle of the hull: three indices of points, counterclockwise from outside. */
type HullFace = [number, number, number];

/**
 * Gives the unit normal and the offset of the plane of a face.
 *
 * @param points The points.
 * @param face The face.
 * @returns The normal, and its dot product with each point of the plane.
 */
function planeOf(points: readonly Vector3[], face: HullFace): [Vector3, number] {
  const [a, b, c] = face.map((i) => points[i] ?? new Vector3());
  if (!a || !b || !c) {
    return [new Vector3(), 0];
  }
  const normal = new Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
  return [normal, normal.dot(a)];
}

/**
 * Finds the first four points of the hull: two points far apart, the point farthest from their
 * line, and the point farthest from the plane of the three.
 *
 * @param points The points.
 * @returns The indices of the four points.
 * @throws Error if all points lie on one plane.
 */
function firstTetrahedron(points: readonly Vector3[]): [number, number, number, number] {
  const farthest = (score: (p: Vector3) => number): number => {
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (score(points[i] ?? new Vector3()) > score(points[best] ?? new Vector3())) {
        best = i;
      }
    }
    return best;
  };

  const p0 = points[0] ?? new Vector3();
  const i1 = farthest((p) => p.distanceToSquared(p0));
  const p1 = points[i1] ?? new Vector3();
  const along = p1.clone().sub(p0).normalize();
  const i2 = farthest((p) => p.clone().sub(p0).cross(along).lengthSq());
  const p2 = points[i2] ?? new Vector3();
  const normal = new Vector3().crossVectors(p1.clone().sub(p0), p2.clone().sub(p0)).normalize();
  const i3 = farthest((p) => Math.abs(normal.dot(p.clone().sub(p0))));
  if (Math.abs(normal.dot((points[i3] ?? p0).clone().sub(p0))) <= VISIBLE) {
    throw new Error('The points of the hull lie on one plane.');
  }

  return [0, i1, i2, i3];
}

/**
 * Makes the convex hull of a set of points: the smallest convex solid that holds them all, as a
 * corner list (design 4.5, faceted heads). Points on the plane of a face or inside the hull add
 * no corner. Points on one plane of the hull give coplanar triangles, so the face of the hull
 * shows as one flat plane with the flat shading of the fur.
 *
 * @param input The points. At least four of them must not lie on one plane.
 * @returns The corner list, 9 numbers for each triangle, counterclockwise from outside.
 * @throws Error if all points lie on one plane.
 */
export function convexHull(input: readonly Vec3[]): number[] {
  const points = input.map((p) => new Vector3(...p));
  const first = firstTetrahedron(points);
  const inside = first
    .map((i) => points[i] ?? new Vector3())
    .reduce((sum, p) => sum.add(p), new Vector3())
    .multiplyScalar(0.25);

  // The four faces of the first tetrahedron, each turned so that its normal points away from
  // the inside point.
  const [a, b, c, d] = first;
  let faces: HullFace[] = [
    [a, b, c],
    [a, c, d],
    [a, d, b],
    [b, d, c],
  ].map((face): HullFace => {
    const [normal, offset] = planeOf(points, [face[0] ?? 0, face[1] ?? 0, face[2] ?? 0]);
    const [i = 0, j = 0, k = 0] = face;
    return normal.dot(inside) > offset ? [i, k, j] : [i, j, k];
  });

  for (const [p, point] of points.entries()) {
    if (first.includes(p)) {
      continue;
    }

    // The faces that the point sees, and the edges between them and the other faces.
    const seen = faces.filter((face) => {
      const [normal, offset] = planeOf(points, face);
      return normal.dot(point) - offset > VISIBLE;
    });
    if (seen.length === 0) {
      continue;
    }
    const seenEdges = new Set(seen.flatMap(([i, j, k]) => [`${i},${j}`, `${j},${k}`, `${k},${i}`]));
    const horizon = seen.flatMap(([i, j, k]) =>
      (
        [
          [i, j],
          [j, k],
          [k, i],
        ] as const
      ).filter(([from, to]) => !seenEdges.has(`${to},${from}`)),
    );

    // The point replaces the faces that it sees with a fan to the horizon.
    faces = [
      ...faces.filter((face) => !seen.includes(face)),
      ...horizon.map(([from, to]): HullFace => [from, to, p]),
    ];
  }

  return faces.flatMap((face) => face.flatMap((i) => input[i] ?? [0, 0, 0]));
}
