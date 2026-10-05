import type { Vec3 } from './math.ts';

// Low-poly solids as corner lists: 9 numbers (three x, y, z corners) for each triangle, with the
// corners counterclockwise when seen from outside. The facet counts follow design 4.5.

/** One point of a lathe profile: the radius and the height. */
export type ProfilePoint = readonly [radius: number, y: number];

/** One point of an outline in the x-z plane. */
export type OutlinePoint = readonly [x: number, z: number];

/**
 * Makes a flat quad of two triangles.
 *
 * @param a The first corner.
 * @param b The second corner.
 * @param c The third corner.
 * @param d The fourth corner. The corners go counterclockwise when seen from the front.
 * @returns 2 triangles.
 */
export function quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3): number[] {
  return [...a, ...b, ...c, ...a, ...c, ...d];
}

function pushQuad(out: number[], a: Vec3, b: Vec3, c: Vec3, d: Vec3): void {
  out.push(...quad(a, b, c, d));
}

/**
 * Makes a box with its center at the origin.
 *
 * @param width The size on x.
 * @param height The size on y.
 * @param depth The size on z.
 * @returns 12 triangles.
 */
export function box(width: number, height: number, depth: number): number[] {
  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;
  const out: number[] = [];
  // +x, -x, +y, -y, +z, -z
  pushQuad(out, [x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]);
  pushQuad(out, [-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]);
  pushQuad(out, [-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]);
  pushQuad(out, [-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]);
  pushQuad(out, [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]);
  pushQuad(out, [x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]);
  return out;
}

/**
 * Makes a solid of revolution around the y axis. A ring with a radius of 0 closes the solid at
 * its height. An end ring with a radius larger than 0 gets a flat cap.
 *
 * @param profile The profile from the bottom to the top.
 * @param segments The number of faces around the axis.
 * @returns 2 triangles for each segment of each profile step, less the triangles at a radius of
 *   0, plus `segments` triangles for each cap.
 */
export function lathe(profile: readonly ProfilePoint[], segments: number): number[] {
  // A half-segment turn puts a face, not an edge, at the front (-z) and at the sides.
  const ring = (r: number, y: number, i: number): number[] => {
    const angle = ((i + 0.5) / segments) * 2 * Math.PI;
    return [r * Math.sin(angle), y, r * Math.cos(angle)];
  };
  const out: number[] = [];
  for (let j = 0; j + 1 < profile.length; j++) {
    const [r0, y0] = profile[j] ?? [0, 0];
    const [r1, y1] = profile[j + 1] ?? [0, 0];
    for (let i = 0; i < segments; i++) {
      const a = ring(r0, y0, i);
      const b = ring(r0, y0, i + 1);
      const c = ring(r1, y1, i + 1);
      const d = ring(r1, y1, i);
      if (r0 > 0) {
        out.push(...a, ...b, ...c);
      }
      if (r1 > 0) {
        out.push(...a, ...c, ...d);
      }
    }
  }
  const [bottomR, bottomY] = profile[0] ?? [0, 0];
  const [topR, topY] = profile.at(-1) ?? [0, 0];
  for (let i = 0; i < segments; i++) {
    if (bottomR > 0) {
      out.push(0, bottomY, 0, ...ring(bottomR, bottomY, i + 1), ...ring(bottomR, bottomY, i));
    }
    if (topR > 0) {
      out.push(0, topY, 0, ...ring(topR, topY, i), ...ring(topR, topY, i + 1));
    }
  }
  return out;
}

/**
 * Makes a closed cylinder or cone on the y axis, from y = 0 to y = `height`.
 *
 * @param bottomRadius The radius at y = 0.
 * @param topRadius The radius at the top. 0 gives a cone.
 * @param height The length on y.
 * @param segments The number of side faces.
 * @returns `4 × segments` triangles, or `2 × segments` for a cone.
 */
export function cylinder(
  bottomRadius: number,
  topRadius: number,
  height: number,
  segments: number,
): number[] {
  return lathe(
    [
      [bottomRadius, 0],
      [topRadius, height],
    ],
    segments,
  );
}

const PHI = (1 + Math.sqrt(5)) / 2;

const ICOSAHEDRON_CORNERS: readonly (readonly [number, number, number])[] = [
  [-1, PHI, 0],
  [1, PHI, 0],
  [-1, -PHI, 0],
  [1, -PHI, 0],
  [0, -1, PHI],
  [0, 1, PHI],
  [0, -1, -PHI],
  [0, 1, -PHI],
  [PHI, 0, -1],
  [PHI, 0, 1],
  [-PHI, 0, -1],
  [-PHI, 0, 1],
];

const ICOSAHEDRON_FACES: readonly (readonly [number, number, number])[] = [
  [0, 11, 5],
  [0, 5, 1],
  [0, 1, 7],
  [0, 7, 10],
  [0, 10, 11],
  [1, 5, 9],
  [5, 11, 4],
  [11, 10, 2],
  [10, 7, 6],
  [7, 1, 8],
  [3, 9, 4],
  [3, 4, 2],
  [3, 2, 6],
  [3, 6, 8],
  [3, 8, 9],
  [4, 9, 5],
  [2, 4, 11],
  [6, 2, 10],
  [8, 6, 7],
  [9, 8, 1],
];

type Corner = readonly [number, number, number];

function onSphere(p: Corner, radius: number): Corner {
  const n = radius / Math.hypot(p[0], p[1], p[2]);
  return [p[0] * n, p[1] * n, p[2] * n];
}

function middle(a: Corner, b: Corner): Corner {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

/**
 * Makes a sphere from an icosahedron with its center at the origin.
 *
 * @param radius The radius.
 * @param detail The number of times that each face splits into four. Design 4.5 uses 1 for a head.
 * @returns `20 × 4^detail` triangles.
 */
export function icosphere(radius: number, detail: number): number[] {
  let faces: Corner[][] = ICOSAHEDRON_FACES.map((face) =>
    face.map((i) => ICOSAHEDRON_CORNERS[i] ?? [0, 0, 0]),
  );
  for (let level = 0; level < detail; level++) {
    faces = faces.flatMap(([a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0]]) => {
      const ab = middle(a, b);
      const bc = middle(b, c);
      const ca = middle(c, a);
      return [
        [a, ab, ca],
        [ab, b, bc],
        [ca, bc, c],
        [ab, bc, ca],
      ];
    });
  }
  return faces.flatMap((face) => face.flatMap((p) => onSphere(p, radius)));
}

/**
 * Makes a prism from an outline in the x-z plane, from y = `bottom` to y = `top`. The caps are
 * fans from the origin, so the outline must be star-shaped around the origin.
 *
 * @param outline The outline, counterclockwise when seen from +y.
 * @param bottom The height of the bottom face.
 * @param top The height of the top face.
 * @returns `4 × outline.length` triangles.
 */
export function prism(outline: readonly OutlinePoint[], bottom: number, top: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < outline.length; i++) {
    const [x0, z0] = outline[i] ?? [0, 0];
    const [x1, z1] = outline[(i + 1) % outline.length] ?? [0, 0];
    pushQuad(out, [x0, bottom, z0], [x1, bottom, z1], [x1, top, z1], [x0, top, z0]);
    out.push(0, top, 0, x0, top, z0, x1, top, z1);
    out.push(0, bottom, 0, x1, bottom, z1, x0, bottom, z0);
  }
  return out;
}
