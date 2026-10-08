import { Quaternion, Vector3 } from 'three';
import { IDENTITY, toVec3 } from './tuples.ts';
import type { Quat, Vec3 } from './tuples.ts';

/** A color as linear (r, g, b), each 0 to 1. three.js reads vertex colors in this space. */
export type Rgb = readonly [number, number, number];

/**
 * The surface finish of a triangle (design 4.5, materials): how rough and how metallic its
 * surface is under the light.
 *
 * - `matte`: cloth, raw wood, and the parts of a body with no fur: the noses, the inner ears, the
 *   teeth, the tusks, the antlers, the horn, and the beak.
 * - `fur`: the fur of the bodies, with flat faces (crease 0).
 * - `varnish`: the varnished wood of the bowed strings, with a soft highlight.
 * - `lacquer`: the black lacquer of the piano and a clarinet, and the wet eyes, with a sharp
 *   highlight.
 * - `metal`: brass, copper, and silver. The vertex color gives the metal its tint.
 */
export type Finish = 'matte' | 'varnish' | 'lacquer' | 'metal' | 'fur';

/**
 * The shading values of a finish: the roughness and the metalness, each 0 to 1 (the values of
 * three.js), and the crease angle of its normals.
 */
export interface FinishValues {
  readonly roughness: number;
  readonly metalness: number;
  /**
   * The crease angle in degrees (design 4.5, materials). The shading smooths the normals across
   * an edge with a smaller angle between its two faces, and keeps a larger angle as a hard edge.
   * 0 keeps each face flat.
   */
  readonly crease: number;
}

/**
 * The values of each finish (design 4.5, materials). The order of the keys gives the index of a
 * finish in {@link MeshData.finishes}.
 */
export const FINISHES = {
  matte: { roughness: 0.85, metalness: 0, crease: 60 },
  varnish: { roughness: 0.38, metalness: 0, crease: 60 },
  lacquer: { roughness: 0.22, metalness: 0, crease: 60 },
  metal: { roughness: 0.3, metalness: 0.35, crease: 60 },
  fur: { roughness: 0.85, metalness: 0, crease: 0 },
} as const satisfies Readonly<Record<Finish, FinishValues>>;

/** The finishes in the order of their indices in {@link MeshData.finishes}. */
export const FINISH_ORDER: readonly Finish[] = ['matte', 'varnish', 'lacquer', 'metal', 'fur'];

/**
 * The geometry data of one mesh. The arrays hold no index: each triangle has its own three
 * corners, so that each corner can have its own normal at a hard edge (design 4.5, materials).
 */
export interface MeshData {
  /**
   * x, y, z of each corner, in meters. Three corners for each triangle, counterclockwise from
   * outside.
   */
  readonly positions: Float32Array;
  /** Linear r, g, b of each corner. */
  readonly colors: Float32Array;
  /**
   * The main bone of each corner: the bone with the larger weight (design 4.4). 0 for a static
   * mesh.
   */
  readonly bones: Uint8Array;
  /** The second bone of each corner. It is equal to {@link MeshData.bones} for a rigid corner. */
  readonly blendBones: Uint8Array;
  /**
   * The weight of the second bone of each corner, from 0 to 0.5. The main bone has 1 minus this
   * weight.
   */
  readonly blendWeights: Float32Array;
  /** The finish of each triangle, as an index in {@link FINISH_ORDER}. */
  readonly finishes: Uint8Array;
  /**
   * 1 for each triangle of a filler, else 0 (design 4.5, 4.7). A filler is a rigid part inside
   * the skin of a joint, such as the ball of an elbow. It shows only where a bent joint loses
   * volume, so the baked occlusion does not count it as a part that shades the skin.
   */
  readonly fillers: Uint8Array;
  /**
   * The skin of each corner with up to four bones, for a mesh with a rigged body (design 4.4,
   * 4.7). The GPU and the test skin read it in place of the main bone and the second bone. Then
   * {@link MeshData.bones} and {@link MeshData.blendBones} hold the two bones with the largest
   * weights, and {@link MeshData.blendWeights} the share of the second bone of the two. With no
   * value, each corner follows its main bone and its second bone.
   */
  readonly skin?: FourBoneSkin;
}

/** The skin of the corners of a mesh with up to four bones for each corner (design 4.7). */
export interface FourBoneSkin {
  /** Four bone indices for each corner. A slot with the weight 0 holds any bone. */
  readonly indices: Uint8Array;
  /** Four weights for each corner, in the order of the indices. They add up to 1. */
  readonly weights: Float32Array;
}

/** The bones of one corner of a skinned part, and their weights (design 4.4, 4.7). */
export interface CornerSkin {
  /** The main bone: the bone with the larger weight. */
  readonly bone: number;
  /** The second bone, or `bone` for a rigid corner. */
  readonly blendBone: number;
  /** The weight of `blendBone`, from 0 to 0.5. The main bone has 1 minus this weight. */
  readonly blendWeight: number;
}

/**
 * A rule that gives the skin of a corner from its bind position, in the model axes, after the
 * placement of its part.
 */
export type SkinRule = (point: Vec3) => CornerSkin;

/**
 * Gives the skin of a corner that blends two bones. The bone with the larger weight becomes the
 * main bone.
 *
 * @param parent The parent bone.
 * @param child The child bone.
 * @param childWeight The weight of the child bone, from 0 to 1. The parent has 1 minus this
 *   weight.
 * @returns The skin of the corner.
 * @throws Error if the weight is not from 0 to 1.
 */
export function blendSkin(parent: number, child: number, childWeight: number): CornerSkin {
  if (!(childWeight >= 0 && childWeight <= 1)) {
    throw new Error(`The weight of the child bone (${childWeight}) is not from 0 to 1.`);
  }

  if (childWeight > 0.5) {
    return { bone: child, blendBone: parent, blendWeight: 1 - childWeight };
  }
  return { bone: parent, blendBone: child, blendWeight: childWeight };
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

/** Scratch objects of {@link applyTransform}, which runs for each vertex of each mesh. */
const scratchPoint = new Vector3();
const scratchScale = new Vector3();
const scratchRotation = new Quaternion();
const scratchPosition = new Vector3();

/**
 * Applies a transform to a point.
 *
 * @param t The transform.
 * @param p The point.
 * @returns The point after the scale, the rotation, and the translation.
 */
export function applyTransform(t: Transform, p: Vec3): Vec3 {
  return toVec3(
    scratchPoint
      .set(...p)
      .multiply(scratchScale.set(...t.scale))
      .applyQuaternion(scratchRotation.set(...t.rotation))
      .add(scratchPosition.set(...t.position)),
  );
}

/** The placement and the look of one part of a mesh. */
export interface PartOptions {
  /** The linear color of each corner of the part. */
  readonly color: Rgb;
  /** The index of the bone that a rigid part follows. Default 0. A part with `skin` ignores it. */
  readonly bone?: number;
  /**
   * The rule that gives the bones of each corner of a skinned part (design 4.7). Default: each
   * corner follows `bone` with the weight 1.
   */
  readonly skin?: SkinRule;
  /** The placement of the part. Default: no change. */
  readonly at?: Transform;
  /** Default `matte`. */
  readonly finish?: Finish;
  /** Whether the part is a filler inside the skin of a joint ({@link MeshData.fillers}). */
  readonly filler?: boolean;
}

/**
 * Converts a CSS hex color in sRGB to linear r, g, b.
 *
 * @param hex A color such as `#a8a090`.
 * @returns The linear color.
 */
export function srgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (byte: number): number => {
    const c = byte / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return [channel((value >> 16) & 0xff), channel((value >> 8) & 0xff), channel(value & 0xff)];
}

/**
 * Calculates the normal of a triangle of a flat corner list.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @param triangle The index of the triangle.
 * @returns The normal, not normalized. Its length is two times the area.
 */
export function triangleNormal(corners: readonly number[], triangle: number): Vec3 {
  const at = (k: number): Vector3 => {
    const i = triangle * 9 + k * 3;
    return new Vector3(corners[i] ?? 0, corners[i + 1] ?? 0, corners[i + 2] ?? 0);
  };
  const a = at(0);
  return toVec3(new Vector3().crossVectors(at(1).sub(a), at(2).sub(a)));
}

/**
 * Splits the triangles of a corner list by the direction of their faces.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @param direction A unit direction.
 * @param minDot The smallest cosine between the face normal and `direction` that matches.
 * @returns The matching triangles, then the other triangles.
 */
export function splitByFacing(
  corners: readonly number[],
  direction: Vec3,
  minDot: number,
): [number[], number[]] {
  const matching: number[] = [];
  const others: number[] = [];
  const unit = new Vector3(...direction);
  for (let t = 0; t < corners.length / 9; t++) {
    const n = new Vector3(...triangleNormal(corners, t));
    const cosine = n.dot(unit) / n.length();
    (cosine >= minDot ? matching : others).push(...corners.slice(t * 9, t * 9 + 9));
  }
  return [matching, others];
}

/**
 * Splits the triangles of a corner list by the place of their centroids.
 *
 * @param corners The corner list, 9 numbers for each triangle.
 * @param match The test of a centroid.
 * @returns The matching triangles, then the other triangles.
 */
export function splitByCentroid(
  corners: readonly number[],
  match: (centroid: Vec3) => boolean,
): [number[], number[]] {
  const matching: number[] = [];
  const others: number[] = [];
  for (let t = 0; t < corners.length / 9; t++) {
    const mean = (axis: number): number =>
      ((corners[t * 9 + axis] ?? 0) +
        (corners[t * 9 + 3 + axis] ?? 0) +
        (corners[t * 9 + 6 + axis] ?? 0)) /
      3;
    (match([mean(0), mean(1), mean(2)]) ? matching : others).push(
      ...corners.slice(t * 9, t * 9 + 9),
    );
  }
  return [matching, others];
}

/**
 * The part of an edge near a corner where {@link splitByField} puts the cut on the corner. A cut
 * nearer to the corner would make a thin sliver triangle.
 */
const CUT_SNAP = 0.01;

/**
 * Tells whether a point comes before another point in the order of the cuts of
 * {@link splitByField}: by |x|, then y, then z, then x. The order does not change under a mirror
 * in x, so a cut on the left half is the mirror image of the cut on the right half.
 *
 * @param p The first point.
 * @param q The second point.
 * @returns Whether `p` comes first.
 */
function cutsFirst(p: Vec3, q: Vec3): boolean {
  for (const [a, b] of [
    [Math.abs(p[0]), Math.abs(q[0])],
    [p[1], q[1]],
    [p[2], q[2]],
    [p[0], q[0]],
  ] as const) {
    if (a !== b) {
      return a < b;
    }
  }
  return true;
}

/**
 * Finds the point of an edge where a field crosses 0. The two triangles of an edge find the same
 * point, because the calculation starts at the first end in the order of {@link cutsFirst}. A
 * point within {@link CUT_SNAP} of an end moves onto that end.
 *
 * @param p One end of the edge.
 * @param fp The field value at `p`.
 * @param q The other end.
 * @param fq The field value at `q`. It has the other sign than `fp`.
 * @returns The point on the edge.
 */
function edgeCut(p: Vec3, fp: number, q: Vec3, fq: number): Vec3 {
  const [a, fa, b, fb] = cutsFirst(p, q) ? [p, fp, q, fq] : [q, fq, p, fp];
  const u = fa / (fa - fb);
  if (u < CUT_SNAP) {
    return a;
  }
  if (u > 1 - CUT_SNAP) {
    return b;
  }
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

/**
 * Gives the squared distance of two points.
 *
 * @param p The first point.
 * @param q The second point.
 * @returns The squared distance.
 */
function distanceSquared(p: Vec3, q: Vec3): number {
  return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
}

/**
 * Adds a convex polygon of 3 or 4 corners as triangles, with the corner order of the polygon. A
 * polygon of 4 corners splits along its shorter diagonal. When the diagonals have the same
 * length, it splits along the diagonal through the last corner in the order of
 * {@link cutsFirst}, so that the mirror image of a polygon splits in the same way.
 *
 * @param polygon The corners, counterclockwise from outside. Two neighbor corners can be the
 *   same point, and the polygon then has one corner less.
 * @param out The corner list that gets the triangles.
 */
function addPolygon(polygon: readonly Vec3[], out: number[]): void {
  const corners = polygon.filter(
    (p, i) => distanceSquared(p, polygon[(i + 1) % polygon.length] ?? p) > 0,
  );

  if (corners.length === 3) {
    out.push(...corners.flat());
    return;
  }
  const [a, b, c, d] = corners;
  if (corners.length !== 4 || !a || !b || !c || !d) {
    return;
  }

  // The diagonal a-c, or else the diagonal b-d.
  const ac = distanceSquared(a, c);
  const bd = distanceSquared(b, d);
  let alongAc = ac < bd;
  if (Math.abs(ac - bd) <= 1e-12 * (ac + bd)) {
    const last = corners.reduce((best, p) => (cutsFirst(best, p) ? p : best));
    alongAc = last === a || last === c;
  }
  out.push(...(alongAc ? [a, b, c, a, c, d] : [b, c, d, b, d, a]).flat());
}

/**
 * Tells whether a point is the mirror image of another point in x, within 1e-9 on each axis.
 *
 * @param p The first point.
 * @param q The second point.
 * @returns Whether `p` is the mirror image of `q`.
 */
function isMirrorOf(p: Vec3, q: Vec3): boolean {
  return (
    Math.abs(p[0] + q[0]) < 1e-9 && Math.abs(p[1] - q[1]) < 1e-9 && Math.abs(p[2] - q[2]) < 1e-9
  );
}

/**
 * Adds a convex polygon as a fan of triangles around a point on one of its edges: one triangle
 * for each other edge, with the corner order of the polygon. A triangle on the middle plane
 * (x = 0) that the cut of {@link splitByField} crosses splits so around the middle of the cut,
 * because no split of a quad into two triangles is its own mirror image.
 *
 * @param polygon The corners, counterclockwise from outside.
 * @param middle The point on the edge from `polygon[edge]` to the next corner.
 * @param edge The index of the first corner of that edge.
 * @param out The corner list that gets the triangles.
 */
function addFan(polygon: readonly Vec3[], middle: Vec3, edge: number, out: number[]): void {
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i];
    const q = polygon[(i + 1) % polygon.length];
    if (i === edge || !p || !q || distanceSquared(p, q) === 0) {
      continue;
    }
    out.push(...middle, ...p, ...q);
  }
}

/**
 * Splits the triangles of a corner list at the zero line of a field (design 4.5, colors). A
 * triangle with corners on both sides of the line splits along it, into three triangles (or two,
 * when a corner lies on the line). Thus a color border is a straight line on each face, and it
 * goes across the facets. {@link splitByCentroid} gives each triangle one color, so its borders
 * follow the triangle edges, as a sawtooth line on the turned rings of a loft.
 *
 * The two triangles of an edge cut it at the same point, so the parts keep their welded seams.
 * A field that takes the same value at a point and at its mirror image in x gives cuts that are
 * mirror images too.
 *
 * @param corners The corner list, 9 numbers for each triangle, counterclockwise from outside.
 * @param field The value of the field at a point: below 0 is inside.
 * @returns The triangles inside, then the triangles outside, with their corner order.
 */
export function splitByField(
  corners: readonly number[],
  field: (point: Vec3) => number,
): [inside: number[], outside: number[]] {
  const inside: number[] = [];
  const outside: number[] = [];
  for (let t = 0; t < corners.length / 9; t++) {
    const points = [0, 1, 2].map((k): Vec3 => [
      corners[t * 9 + k * 3] ?? 0,
      corners[t * 9 + k * 3 + 1] ?? 0,
      corners[t * 9 + k * 3 + 2] ?? 0,
    ]);
    const values = points.map((p) => field(p));

    if (!values.some((v) => v > 0)) {
      inside.push(...points.flat());
      continue;
    }
    if (!values.some((v) => v < 0)) {
      outside.push(...points.flat());
      continue;
    }

    // Walk around the triangle. Each corner goes to its side (a corner on the line to both), and
    // each edge that crosses the line adds its cut point to both sides.
    const inPolygon: Vec3[] = [];
    const outPolygon: Vec3[] = [];
    const cuts: Vec3[] = [];
    for (let k = 0; k < 3; k++) {
      const p = points[k] ?? [0, 0, 0];
      const q = points[(k + 1) % 3] ?? [0, 0, 0];
      const fp = values[k] ?? 0;
      const fq = values[(k + 1) % 3] ?? 0;
      if (fp <= 0) {
        inPolygon.push(p);
      }
      if (fp >= 0) {
        outPolygon.push(p);
      }
      if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) {
        const cut = edgeCut(p, fp, q, fq);
        inPolygon.push(cut);
        outPolygon.push(cut);
        cuts.push(cut);
      }
    }

    const [first, second] = cuts;
    const onEdges = cuts.every((cut) => !points.includes(cut));
    if (first && second && onEdges && first[0] !== 0 && isMirrorOf(first, second)) {
      // The cut crosses the middle plane: both parts split around its middle. A cut that moved
      // onto a corner keeps the plain split, because a fan would then put a corner on an edge
      // of the neighbor triangle.
      const middle: Vec3 = [0, (first[1] + second[1]) / 2, (first[2] + second[2]) / 2];
      const isCut = (p: Vec3 | undefined): boolean => p === first || p === second;
      for (const [polygon, out] of [
        [inPolygon, inside],
        [outPolygon, outside],
      ] as const) {
        const edge = polygon.findIndex((p, i) => {
          const next = polygon[(i + 1) % polygon.length];
          return p !== next && isCut(p) && isCut(next);
        });
        addFan(polygon, middle, edge, out);
      }
      continue;
    }
    addPolygon(inPolygon, inside);
    addPolygon(outPolygon, outside);
  }
  return [inside, outside];
}

/** Collects the parts of one mesh, and makes its {@link MeshData}. */
export class MeshBuilder {
  /** x, y, z of each corner. */
  readonly #positions: number[] = [];
  /** Linear r, g, b of each corner. */
  readonly #colors: number[] = [];
  /** The main bone of each corner. */
  readonly #bones: number[] = [];
  /** The second bone of each corner. */
  readonly #blendBones: number[] = [];
  /** The weight of the second bone of each corner. */
  readonly #blendWeights: number[] = [];
  /** The finish index of each triangle. */
  readonly #finishes: number[] = [];
  /** 1 for each triangle of a filler, else 0. */
  readonly #fillers: number[] = [];
  /** Four bone indices for each corner ({@link FourBoneSkin}). */
  readonly #skinIndices: number[] = [];
  /** Four weights for each corner ({@link FourBoneSkin}). */
  readonly #skinWeights: number[] = [];
  /** Whether a mesh with a skin of four bones was added. Only then the build gives the skin. */
  #fourBones = false;

  /**
   * Adds the triangles of one part.
   *
   * @param corners The corner list of the part in its own axes, 9 numbers for each triangle.
   * @param options The color, the bones, the placement, and the finish.
   * @throws Error if the skin rule gives a weight that is not from 0 to 0.5.
   */
  add(corners: readonly number[], options: PartOptions): void {
    const at = options.at ?? transform();
    const bone = options.bone ?? 0;
    const finish = FINISH_ORDER.indexOf(options.finish ?? 'matte');
    const filler = options.filler ? 1 : 0;
    // A mirror scale turns the faces inside out. Then the corner order changes to keep them outside.
    const mirrored = at.scale[0] * at.scale[1] * at.scale[2] < 0;
    const order = mirrored ? [0, 2, 1] : [0, 1, 2];

    for (let t = 0; t < corners.length / 9; t++) {
      for (const k of order) {
        const i = t * 9 + k * 3;
        const p = applyTransform(at, [corners[i] ?? 0, corners[i + 1] ?? 0, corners[i + 2] ?? 0]);
        this.#positions.push(p[0], p[1], p[2]);
        this.#colors.push(options.color[0], options.color[1], options.color[2]);
        this.#pushSkin(options.skin ? options.skin(p) : { bone, blendBone: bone, blendWeight: 0 });
      }
      this.#finishes.push(finish);
      this.#fillers.push(filler);
    }
  }

  /**
   * Adds the bones of one corner. A corner with the weight 0 keeps its main bone as its second
   * bone, as a rigid corner does.
   *
   * @param skin The skin of the corner.
   * @throws Error if the weight is not from 0 to 0.5.
   */
  #pushSkin(skin: CornerSkin): void {
    if (!(skin.blendWeight >= 0 && skin.blendWeight <= 0.5)) {
      throw new Error(`The weight of the second bone (${skin.blendWeight}) is not from 0 to 0.5.`);
    }

    const blendBone = skin.blendWeight > 0 ? skin.blendBone : skin.bone;
    this.#bones.push(skin.bone);
    this.#blendBones.push(blendBone);
    this.#blendWeights.push(skin.blendWeight);
    this.#skinIndices.push(skin.bone, blendBone, 0, 0);
    this.#skinWeights.push(1 - skin.blendWeight, skin.blendWeight, 0, 0);
  }

  /**
   * Adds all triangles of a built mesh at a placement. Each corner keeps its color and its bones,
   * and each triangle keeps its finish. Thus many static props merge into one mesh (design 4.4).
   * A mesh with a skin of four bones gives the built mesh a skin of four bones.
   *
   * @param data The mesh data.
   * @param at The placement. It has no mirror scale.
   */
  addMesh(data: MeshData, at: Transform): void {
    if (data.skin) {
      this.#fourBones = true;
      for (let i = 0; i < data.skin.indices.length; i++) {
        this.#skinIndices.push(data.skin.indices[i] ?? 0);
        this.#skinWeights.push(data.skin.weights[i] ?? 0);
      }
    } else {
      for (let v = 0; v < data.bones.length; v++) {
        const bone = data.bones[v] ?? 0;
        const weight = data.blendWeights[v] ?? 0;
        this.#skinIndices.push(bone, data.blendBones[v] ?? bone, 0, 0);
        this.#skinWeights.push(1 - weight, weight, 0, 0);
      }
    }

    for (let v = 0; v < data.bones.length; v++) {
      const i = v * 3;
      const p = applyTransform(at, [
        data.positions[i] ?? 0,
        data.positions[i + 1] ?? 0,
        data.positions[i + 2] ?? 0,
      ]);
      this.#positions.push(p[0], p[1], p[2]);
      this.#colors.push(data.colors[i] ?? 0, data.colors[i + 1] ?? 0, data.colors[i + 2] ?? 0);
      this.#bones.push(data.bones[v] ?? 0);
      this.#blendBones.push(data.blendBones[v] ?? 0);
      this.#blendWeights.push(data.blendWeights[v] ?? 0);
    }
    for (const finish of data.finishes) {
      this.#finishes.push(finish);
    }
    for (const filler of data.fillers) {
      this.#fillers.push(filler);
    }
  }

  /** The number of triangles added so far. */
  get triangleCount(): number {
    return this.#finishes.length;
  }

  /**
   * Makes the mesh data of all parts.
   *
   * @returns The data, with the triangles in the order of their parts.
   */
  build(): MeshData {
    const data: MeshData = {
      positions: new Float32Array(this.#positions),
      colors: new Float32Array(this.#colors),
      bones: new Uint8Array(this.#bones),
      blendBones: new Uint8Array(this.#blendBones),
      blendWeights: new Float32Array(this.#blendWeights),
      finishes: new Uint8Array(this.#finishes),
      fillers: new Uint8Array(this.#fillers),
    };
    if (!this.#fourBones) {
      return data;
    }

    return {
      ...data,
      skin: {
        indices: new Uint8Array(this.#skinIndices),
        weights: new Float32Array(this.#skinWeights),
      },
    };
  }
}
