import { FINISHES, FINISH_ORDER } from './mesh.ts';
import type { MeshData } from './mesh.ts';

/**
 * The step of the weld grid, in meters. Two corners at the same point of this grid share one
 * vertex. The models place their corners with float math, so the two corners of a seam can
 * differ by a few micrometers.
 */
const WELD_STEP = 1e-4;

/**
 * The welded vertices of a mesh: the corners at one point. The corners of two bones can share a
 * vertex, for example on the seam of the torso between `spine` and `chest`. Each corner still
 * follows its own bone (design 4.4).
 */
export interface Welds {
  /** The vertex of each corner. */
  readonly vertexOf: Uint32Array;
  /**
   * The start of the corner list of each vertex in {@link Welds.corners}, with one more entry
   * at the end. The corners of vertex `v` are `corners[start[v]]` to `corners[start[v + 1] - 1]`.
   */
  readonly start: Uint32Array;
  /** The corners, in the order of their vertices. */
  readonly corners: Uint32Array;
}

/**
 * Welds the corners of a mesh by their position.
 *
 * @param mesh The mesh data.
 * @returns The welded vertices.
 */
export function weldCorners(mesh: MeshData): Welds {
  const cornerCount = mesh.bones.length;
  const vertexOf = new Uint32Array(cornerCount);
  const keys = new Map<string, number>();
  const p = mesh.positions;
  for (let c = 0; c < cornerCount; c++) {
    const key = `${Math.round((p[c * 3] ?? 0) / WELD_STEP)} ${Math.round(
      (p[c * 3 + 1] ?? 0) / WELD_STEP,
    )} ${Math.round((p[c * 3 + 2] ?? 0) / WELD_STEP)}`;
    let vertex = keys.get(key);
    if (vertex === undefined) {
      vertex = keys.size;
      keys.set(key, vertex);
    }
    vertexOf[c] = vertex;
  }
  const start = new Uint32Array(keys.size + 1);
  for (const vertex of vertexOf) {
    start[vertex + 1] = (start[vertex + 1] ?? 0) + 1;
  }
  for (let v = 0; v < keys.size; v++) {
    start[v + 1] = (start[v + 1] ?? 0) + (start[v] ?? 0);
  }
  const fill = start.slice(0, keys.size);
  const corners = new Uint32Array(cornerCount);
  for (let c = 0; c < cornerCount; c++) {
    const vertex = vertexOf[c] ?? 0;
    const at = fill[vertex] ?? 0;
    corners[at] = c;
    fill[vertex] = at + 1;
  }
  return { vertexOf, start, corners };
}

/** The face values of a mesh. */
interface FaceData {
  /** The unit normal of each triangle: x, y, z. A triangle with no area has 0, 0, 0. */
  readonly normals: Float32Array;
  /** The angle of each corner in its triangle, in radians. */
  readonly angles: Float32Array;
}

/**
 * Calculates the unit normal of each triangle and the angle of each corner.
 *
 * @param mesh The mesh data.
 * @returns The normals and the angles.
 */
function faceData(mesh: MeshData): FaceData {
  const p = mesh.positions;
  const triangleCount = mesh.finishes.length;
  const normals = new Float32Array(triangleCount * 3);
  const angles = new Float32Array(triangleCount * 3);
  for (let t = 0; t < triangleCount; t++) {
    const i = t * 9;
    const ax = p[i] ?? 0;
    const ay = p[i + 1] ?? 0;
    const az = p[i + 2] ?? 0;
    const ux = (p[i + 3] ?? 0) - ax;
    const uy = (p[i + 4] ?? 0) - ay;
    const uz = (p[i + 5] ?? 0) - az;
    const wx = (p[i + 6] ?? 0) - ax;
    const wy = (p[i + 7] ?? 0) - ay;
    const wz = (p[i + 8] ?? 0) - az;
    const nx = uy * wz - uz * wy;
    const ny = uz * wx - ux * wz;
    const nz = ux * wy - uy * wx;
    const length = Math.hypot(nx, ny, nz);
    if (length > 0) {
      normals[t * 3] = nx / length;
      normals[t * 3 + 1] = ny / length;
      normals[t * 3 + 2] = nz / length;
    }
    // The angle at corner k, between the edges to the two other corners.
    for (let k = 0; k < 3; k++) {
      const o = i + k * 3;
      const b = i + ((k + 1) % 3) * 3;
      const c = i + ((k + 2) % 3) * 3;
      const ex = (p[b] ?? 0) - (p[o] ?? 0);
      const ey = (p[b + 1] ?? 0) - (p[o + 1] ?? 0);
      const ez = (p[b + 2] ?? 0) - (p[o + 2] ?? 0);
      const fx = (p[c] ?? 0) - (p[o] ?? 0);
      const fy = (p[c + 1] ?? 0) - (p[o + 1] ?? 0);
      const fz = (p[c + 2] ?? 0) - (p[o + 2] ?? 0);
      const lengths = Math.hypot(ex, ey, ez) * Math.hypot(fx, fy, fz);
      angles[t * 3 + k] =
        lengths > 0
          ? Math.acos(Math.min(1, Math.max(-1, (ex * fx + ey * fy + ez * fz) / lengths)))
          : 0;
    }
  }
  return { normals, angles };
}

/** The cosine of the crease angle of each finish, in the order of {@link FINISH_ORDER}. */
const CREASE_COSINES = FINISH_ORDER.map((finish) =>
  Math.cos((FINISHES[finish].crease * Math.PI) / 180),
);

/**
 * Calculates the crease normal of each corner of a mesh (design 4.5, materials). A corner gets
 * the mean of the normals of the faces at its welded vertex that turn from its own face by less
 * than the crease angle of its finish. Each face counts with the angle of its corner at the
 * vertex. Thus a curved part looks smooth, and a box keeps its hard edges.
 *
 * @param mesh The mesh data.
 * @param welds The welded vertices of the mesh, from {@link weldCorners}.
 * @returns The unit normal of each corner: x, y, z, in the order of the corners.
 */
export function creaseNormals(mesh: MeshData, welds: Welds = weldCorners(mesh)): Float32Array {
  const { normals: faces, angles } = faceData(mesh);
  const out = new Float32Array(mesh.bones.length * 3);
  const vertexCount = welds.start.length - 1;
  for (let v = 0; v < vertexCount; v++) {
    const first = welds.start[v] ?? 0;
    const end = welds.start[v + 1] ?? 0;
    for (let i = first; i < end; i++) {
      const corner = welds.corners[i] ?? 0;
      const own = Math.floor(corner / 3);
      const ox = faces[own * 3] ?? 0;
      const oy = faces[own * 3 + 1] ?? 0;
      const oz = faces[own * 3 + 2] ?? 0;
      const finishCrease = CREASE_COSINES[mesh.finishes[own] ?? 0] ?? 1;
      let sx = 0;
      let sy = 0;
      let sz = 0;
      for (let j = first; j < end; j++) {
        const other = welds.corners[j] ?? 0;
        const face = Math.floor(other / 3);
        const fx = faces[face * 3] ?? 0;
        const fy = faces[face * 3 + 1] ?? 0;
        const fz = faces[face * 3 + 2] ?? 0;
        // A crease of 0 has the cosine 1, so only the own face (and a face of the same
        // direction) counts.
        if (other === corner || ox * fx + oy * fy + oz * fz >= finishCrease - 1e-6) {
          const weight = angles[other] ?? 0;
          sx += fx * weight;
          sy += fy * weight;
          sz += fz * weight;
        }
      }
      let length = Math.hypot(sx, sy, sz);
      if (length === 0) {
        // A face with no area: it takes its own normal, or up.
        [sx, sy, sz] = Math.hypot(ox, oy, oz) > 0 ? [ox, oy, oz] : [0, 1, 0];
        length = 1;
      }
      out[corner * 3] = sx / length;
      out[corner * 3 + 1] = sy / length;
      out[corner * 3 + 2] = sz / length;
    }
  }
  return out;
}
