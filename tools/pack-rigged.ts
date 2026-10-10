import { readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';

import { Matrix4, Vector3 } from 'three';

import { BONE_NAMES } from '../src/models/rig.ts';
import { RIGGED_JOINTS, WEIGHT_UNITS } from '../src/models/rigged.ts';
import type { RiggedBody, RiggedJoint } from '../src/models/rigged.ts';
import { SPECIES } from '../src/models/species.ts';
import type { SpeciesId, SpeciesParams } from '../src/models/species.ts';
import type { Vec3 } from '../src/models/tuples.ts';
import { packCoordinate, writeVarint, zigzag } from './build-sculpt.ts';
import type { SculptRegion } from './sculpt-format.ts';

/** The folder of the modules of the rigged bodies (design 4.4). */
export const RIGGED_DIR = join(import.meta.dirname, '..', 'src', 'models', 'rigged');

/**
 * The height of the seat of the model sheet, in meters: the chair of `fox-views.png`, which the
 * Blender build of route B sits the body on.
 */
export const SHEET_SEAT = 0.35;

/**
 * The bones of the Blender rig of route B (`tools/spike/fox-gated/rig.py`), and the bone of the
 * player that each one moves (design 4.7). The last two tail bones join `tail2`, because a
 * player has two tail bones.
 */
export const RIG_BONES = {
  hips: 'hips',
  spine: 'spine',
  chest: 'chest',
  neck: 'neck',
  head: 'head',
  'shoulder.L': 'shoulderL',
  'upper_arm.L': 'upperArmL',
  'forearm.L': 'forearmL',
  'hand.L': 'handL',
  'shoulder.R': 'shoulderR',
  'upper_arm.R': 'upperArmR',
  'forearm.R': 'forearmR',
  'hand.R': 'handR',
  'thigh.L': 'thighL',
  'shin.L': 'shinL',
  'foot.L': 'footL',
  'thigh.R': 'thighR',
  'shin.R': 'shinR',
  'foot.R': 'footR',
  'tail.1': 'tail1',
  'tail.2': 'tail2',
  'tail.3': 'tail2',
  'tail.4': 'tail2',
} as const satisfies Readonly<Record<string, RiggedJoint>>;

/**
 * The palette of the low-poly pass of route B (`tools/spike/fox-gated/lowpoly.py`) as sRGB
 * colors, by the role of each color. The packer gives each material of the GLB file the role of
 * the nearest color.
 */
export const ROUTE_B_PALETTE = {
  fur: '#db6e33',
  white: '#eddecc',
  dark: '#5c3626',
  nose: '#211a17',
  sclera: '#fffaf2',
  iris: '#6b381a',
  pupil: '#0d0a09',
  light: '#ffffff',
} as const;

/** The role of a color of the palette of route B. */
export type PaletteRole = keyof typeof ROUTE_B_PALETTE;

/** The roles of the palette, in the order of the regions of a packed body. */
const ROLES = Object.keys(ROUTE_B_PALETTE).filter((role): role is PaletteRole =>
  Object.hasOwn(ROUTE_B_PALETTE, role),
);

/** The roles of the eye parts. Their vertices follow the eye bones, so that the eyes blink. */
const EYE_ROLES: ReadonlySet<PaletteRole> = new Set(['sclera', 'iris', 'pupil', 'light']);

/**
 * Gives the color region of each role of the palette for a species: the colors of the stage
 * (design 4.5), as the sculpt of the species had them, so that the body has the look of the other
 * animals under the light of the stage.
 *
 * @param species The species.
 * @returns The region of each role.
 */
export function speciesRegions(species: SpeciesId): Readonly<Record<PaletteRole, SculptRegion>> {
  const params: SpeciesParams = SPECIES[species];
  const { colors, eyes } = params;
  return {
    fur: { color: colors.fur, finish: 'fur' },
    white: { color: colors.belly, finish: 'fur' },
    dark: { color: colors.accent, finish: 'fur' },
    nose: { color: '#2a1d15', finish: 'matte' },
    sclera: { color: '#f2e9df', finish: 'lacquer' },
    iris: { color: eyes.iris ?? '#15110e', finish: 'lacquer' },
    pupil: { color: '#15110e', finish: 'lacquer' },
    light: { color: '#f6f2ea', finish: 'lacquer' },
  };
}

/** The parts of the JSON of a glTF file that the packer reads. */
interface GltfJson {
  readonly nodes: readonly {
    readonly name?: string;
    readonly mesh?: number;
    readonly skin?: number;
  }[];
  readonly skins: readonly {
    readonly joints: readonly number[];
    readonly inverseBindMatrices: number;
  }[];
  readonly meshes: readonly {
    readonly primitives: readonly {
      readonly attributes: Readonly<Record<string, number>>;
      readonly indices: number;
      readonly material: number;
    }[];
  }[];
  readonly materials: readonly {
    readonly pbrMetallicRoughness?: { readonly baseColorFactor?: readonly number[] };
  }[];
  readonly accessors: readonly {
    readonly bufferView: number;
    readonly byteOffset?: number;
    readonly componentType: number;
    readonly count: number;
    readonly type: string;
  }[];
  readonly bufferViews: readonly {
    readonly byteOffset?: number;
    readonly byteStride?: number;
  }[];
}

/** A GLB file: its JSON and its binary chunk. */
export interface Glb {
  readonly json: GltfJson;
  readonly bin: Uint8Array;
}

/** The magic number of a GLB file: "glTF" in little-endian order. */
const GLB_MAGIC = 0x46546c67;

/**
 * Reads the two chunks of a GLB file.
 *
 * @param bytes The file.
 * @returns The JSON and the binary chunk.
 * @throws Error if the file is not a GLB file with a JSON chunk and a binary chunk.
 */
export function readGlb(bytes: Uint8Array): Glb {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 28 || view.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error('The file is not a GLB file.');
  }

  const jsonLength = view.getUint32(12, true);
  const binStart = 20 + jsonLength;
  const binLength = view.getUint32(binStart, true);
  const text = new TextDecoder().decode(bytes.subarray(20, binStart));
  // SAFETY: a GLB file holds a glTF JSON document, and the reads below check the parts they use.
  const json = JSON.parse(text) as GltfJson;
  return { json, bin: bytes.subarray(binStart + 8, binStart + 8 + binLength) };
}

/** The bytes of each glTF component type that the packer reads. */
const COMPONENT_BYTES = new Map([
  [5121, 1],
  [5123, 2],
  [5125, 4],
  [5126, 4],
]);

/** The number of components of each glTF accessor type that the packer reads. */
const TYPE_SIZES = new Map([
  ['SCALAR', 1],
  ['VEC3', 3],
  ['VEC4', 4],
  ['MAT4', 16],
]);

/**
 * Reads the values of one accessor as numbers.
 *
 * @param glb The GLB file.
 * @param index The index of the accessor.
 * @returns The values, `size` numbers for each element.
 * @throws Error if the accessor has an unknown type, or its buffer view interleaves elements.
 */
export function accessorValues(glb: Glb, index: number): number[] {
  const accessor = glb.json.accessors[index];
  const view = accessor ? glb.json.bufferViews[accessor.bufferView] : undefined;
  const bytes = accessor ? COMPONENT_BYTES.get(accessor.componentType) : undefined;
  const size = accessor ? TYPE_SIZES.get(accessor.type) : undefined;
  if (!accessor || !view || !bytes || !size || view.byteStride) {
    throw new Error(`The accessor ${index} has a form that the packer does not read.`);
  }

  const start = glb.bin.byteOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const data = new DataView(glb.bin.buffer, start, accessor.count * size * bytes);
  const values: number[] = [];
  for (let i = 0; i < accessor.count * size; i++) {
    switch (accessor.componentType) {
      case 5121:
        values.push(data.getUint8(i));
        break;
      case 5123:
        values.push(data.getUint16(i * 2, true));
        break;
      case 5125:
        values.push(data.getUint32(i * 4, true));
        break;
      default:
        values.push(data.getFloat32(i * 4, true));
    }
  }
  return values;
}

/**
 * Turns a point of glTF into the axes of the model: glTF has +z to the front and +x to the left
 * of the animal, and the model faces -z with its left side at -x.
 *
 * @param x The x of glTF.
 * @param y The y of glTF.
 * @param z The z of glTF.
 * @returns The point in the axes of the model.
 */
function toModel(x: number, y: number, z: number): Vec3 {
  return [-x, y, -z];
}

/**
 * Gives the CSS hex color in sRGB of a linear glTF color.
 *
 * @param linear The linear r, g, b.
 * @returns The color, such as `#db6e33`.
 */
function hexOf(linear: readonly number[]): string {
  const channel = (c: number): string => {
    const s = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, s)) * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(linear[0] ?? 1)}${channel(linear[1] ?? 1)}${channel(linear[2] ?? 1)}`;
}

/**
 * Finds the role of the palette color nearest to a color.
 *
 * @param hex The color, as a CSS hex color in sRGB.
 * @returns The role.
 */
export function roleOf(hex: string): PaletteRole {
  const rgb = (h: string): number[] => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
  const [r = 0, g = 0, b = 0] = rgb(hex);
  let best: PaletteRole = 'fur';
  let bestDistance = Infinity;
  for (const role of ROLES) {
    const [pr = 0, pg = 0, pb = 0] = rgb(ROUTE_B_PALETTE[role]);
    const distance = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (distance < bestDistance) {
      best = role;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Quantizes the bone weights of a vertex: at most four bones, from the largest weight to the
 * smallest, with weights in steps of 1 / {@link WEIGHT_UNITS} that add up to 1. A bone that
 * appears two times gets the sum of its weights.
 *
 * @param influences Each bone index with its weight. The weights add up to more than 0.
 * @returns Four bone indices and four weights in steps. An empty slot holds the main bone with
 *   the weight 0.
 * @throws Error if the weights add up to 0.
 */
export function quantizeSkin(
  influences: readonly (readonly [number, number])[],
): [bones: number[], units: number[]] {
  const sums = new Map<number, number>();
  for (const [bone, weight] of influences) {
    if (weight > 0) {
      sums.set(bone, (sums.get(bone) ?? 0) + weight);
    }
  }
  const kept = [...sums.entries()].toSorted((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 4);
  const total = kept.reduce((sum, [, weight]) => sum + weight, 0);
  const [top] = kept;
  if (!top || total <= 0) {
    throw new Error('A vertex has no bone with a weight.');
  }

  // Each weight rounds down, and the main bone gets the rest, so that it keeps the largest weight.
  const units = kept.map(([, weight]) => Math.floor((weight / total) * WEIGHT_UNITS));
  units[0] = (units[0] ?? 0) + WEIGHT_UNITS - units.reduce((sum, u) => sum + u, 0);
  const bones = kept.map(([bone]) => bone);
  while (bones.length < 4) {
    bones.push(top[0]);
    units.push(0);
  }
  return [bones, units];
}

/** One welded vertex of the packed mesh. */
interface PackedVertex {
  /** The position in steps of the packed coordinates. */
  readonly steps: Vec3;
  /** The four bones, from the largest weight to the smallest. */
  readonly bones: readonly number[];
  /** The four weights in steps of 1 / {@link WEIGHT_UNITS}. */
  readonly units: readonly number[];
}

/**
 * Gives the world matrix of each joint of the skin of a GLB file in the pose of the mesh: the
 * inverse of its inverse bind matrix.
 *
 * @param glb The GLB file.
 * @returns The matrices, by the name of each joint.
 * @throws Error if the file has no skin.
 */
function jointMatrices(glb: Glb): Map<string, Matrix4> {
  const skin = glb.json.skins[0];
  if (!skin) {
    throw new Error('The GLB file has no skin.');
  }

  const inverses = accessorValues(glb, skin.inverseBindMatrices);
  const matrices = new Map<string, Matrix4>();
  for (const [k, node] of skin.joints.entries()) {
    const name = glb.json.nodes[node]?.name ?? '';
    matrices.set(name, new Matrix4().fromArray(inverses, k * 16).invert());
  }
  return matrices;
}

/**
 * Packs the rigged body of a GLB file of route B (design 4.4): the mesh of the skinned node, its
 * skin on the bones of the player, the joints, the hand directions, and the tip of the nose.
 *
 * @param glb The GLB file, with one skinned mesh and one material for each palette color.
 * @param regions The color region of each role of the palette.
 * @returns The rigged body.
 * @throws Error if a bone of the rig has no bone of the player, or a joint is missing.
 */
export function packRigged(
  glb: Glb,
  regions: Readonly<Record<PaletteRole, SculptRegion>>,
): RiggedBody {
  const matrices = jointMatrices(glb);
  const skin = glb.json.skins[0];
  const node = glb.json.nodes.find((n) => n.skin !== undefined && n.mesh !== undefined);
  const mesh = node?.mesh === undefined ? undefined : glb.json.meshes[node.mesh];
  if (!skin || !mesh) {
    throw new Error('The GLB file has no skinned mesh.');
  }

  const playerBone = (joint: number): number => {
    const name = glb.json.nodes[skin.joints[joint] ?? -1]?.name ?? '';
    if (!Object.hasOwn(RIG_BONES, name)) {
      throw new Error(`The rig bone "${name}" has no bone of the player.`);
    }
    // SAFETY: the check above makes the name a key of RIG_BONES.
    return BONE_NAMES.indexOf(RIG_BONES[name as keyof typeof RIG_BONES]);
  };

  // The vertices of all primitives, welded by their packed position and their skin.
  const vertices: PackedVertex[] = [];
  const vertexIndex = new Map<string, number>();
  const triangles: number[] = [];
  const triangleRoles: PaletteRole[] = [];
  const eyePoints: Vec3[] = [];
  const nosePoints: Vec3[] = [];
  for (const primitive of mesh.primitives) {
    const color = glb.json.materials[primitive.material]?.pbrMetallicRoughness?.baseColorFactor;
    const role = roleOf(hexOf(color ?? [1, 1, 1]));
    const positions = accessorValues(glb, primitive.attributes['POSITION'] ?? -1);
    const joints = accessorValues(glb, primitive.attributes['JOINTS_0'] ?? -1);
    const weights = accessorValues(glb, primitive.attributes['WEIGHTS_0'] ?? -1);
    const indices = accessorValues(glb, primitive.indices);

    const local = Array.from({ length: positions.length / 3 }, (_, v): number => {
      const point = toModel(
        positions[v * 3] ?? 0,
        positions[v * 3 + 1] ?? 0,
        positions[v * 3 + 2] ?? 0,
      );
      const influences = EYE_ROLES.has(role)
        ? [[BONE_NAMES.indexOf(point[0] < 0 ? 'eyeL' : 'eyeR'), 1] as const]
        : [0, 1, 2, 3].map(
            (k) => [playerBone(joints[v * 4 + k] ?? 0), weights[v * 4 + k] ?? 0] as const,
          );
      if (EYE_ROLES.has(role)) {
        eyePoints.push(point);
      }
      if (role === 'nose') {
        nosePoints.push(point);
      }
      const [bones, units] = quantizeSkin(influences);
      const steps: Vec3 = [
        packCoordinate(point[0]),
        packCoordinate(point[1]),
        packCoordinate(point[2]),
      ];
      const key = [...steps, ...bones, ...units].join(' ');
      let index = vertexIndex.get(key);
      if (index === undefined) {
        index = vertices.length;
        vertexIndex.set(key, index);
        vertices.push({ steps, bones, units });
      }
      return index;
    });

    for (let t = 0; t < indices.length; t += 3) {
      const corners = [0, 1, 2].map((k) => local[indices[t + k] ?? 0] ?? 0);
      // glTF turns the faces counterclockwise from outside. The turn of 180° keeps the order.
      if (flatTriangle(corners.map((c) => vertices[c]?.steps ?? [0, 0, 0]))) {
        continue;
      }
      triangles.push(...corners);
      triangleRoles.push(role);
    }
  }

  const used = ROLES.filter((role) => triangleRoles.includes(role));
  const joints = jointPlaces(matrices, eyePoints);
  return {
    seatHeight: SHEET_SEAT,
    regions: used.map((role) => regions[role]),
    joints,
    handTips: { handL: handTip(matrices, 'hand.L'), handR: handTip(matrices, 'hand.R') },
    nose: frontPoint(nosePoints),
    mesh: packMesh(
      vertices,
      triangles,
      triangleRoles.map((role) => used.indexOf(role)),
    ),
  };
}

/**
 * Gives the front point of some points: the point with the smallest z, rounded to 1e-6.
 *
 * @param points The points, in the axes of the model.
 * @returns The front point.
 * @throws Error if there is no point.
 */
function frontPoint(points: readonly Vec3[]): Vec3 {
  const [first] = points;
  if (!first) {
    throw new Error('The GLB file has no triangles of the nose.');
  }

  const front = points.reduce((best, p) => (p[2] < best[2] ? p : best), first);
  return [round(front[0]), round(front[1]), round(front[2])];
}

/**
 * Tells if a triangle has no area in packed steps.
 *
 * @param corners The three corners, in steps.
 * @returns True for a triangle with no area.
 */
function flatTriangle(corners: readonly Vec3[]): boolean {
  const [a, b, c] = corners;
  if (!a || !b || !c) {
    return true;
  }

  const u = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const v = new Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  return u.cross(v).lengthSq() === 0;
}

/**
 * Gives the place of each joint: the head of the first rig bone that maps onto it, and the middle
 * of the vertices of each eye.
 *
 * @param matrices The joint world matrices, by rig bone name.
 * @param eyePoints The vertices of the eyes, in the axes of the model.
 * @returns The joints, in the axes of the model.
 * @throws Error if a joint has no rig bone.
 */
function jointPlaces(
  matrices: ReadonlyMap<string, Matrix4>,
  eyePoints: readonly Vec3[],
): Record<RiggedJoint, Vec3> {
  const places = new Map<RiggedJoint, Vec3>();
  for (const [name, bone] of Object.entries(RIG_BONES)) {
    const matrix = matrices.get(name);
    if (matrix && !places.has(bone)) {
      const p = new Vector3().setFromMatrixPosition(matrix);
      const [x, y, z] = toModel(p.x, p.y, p.z);
      places.set(bone, [round(x), round(y), round(z)]);
    }
  }
  for (const [eye, side] of [
    ['eyeL', -1],
    ['eyeR', 1],
  ] as const) {
    const points = eyePoints.filter((p) => Math.sign(p[0]) === side);
    const mean = points
      .reduce((sum, p) => sum.add(new Vector3(...p)), new Vector3())
      .divideScalar(Math.max(1, points.length));
    places.set(eye, [round(mean.x), round(mean.y), round(mean.z)]);
  }

  // SAFETY: the entries hold each joint of RIGGED_JOINTS one time.
  return Object.fromEntries(
    RIGGED_JOINTS.map((joint) => {
      const place = places.get(joint);
      if (!place) {
        throw new Error(`The joint "${joint}" has no bone in the rig.`);
      }
      return [joint, place];
    }),
  ) as Record<RiggedJoint, Vec3>;
}

/**
 * Rounds a value to 1e-6, so that the module stays short.
 *
 * @param value The value.
 * @returns The rounded value.
 */
function round(value: number): number {
  return Math.round(value * 1e6) / 1e6 + 0;
}

/** The distance of the tip of a hand from its wrist, in meters ({@link RiggedBody.handTips}). */
const HAND_TIP = 0.1;

/**
 * Gives the tip of a hand: the point {@link HAND_TIP} from the wrist on the y axis of the joint,
 * which Blender points from the head to the tail of the bone.
 *
 * @param matrices The joint world matrices, by rig bone name.
 * @param name The rig bone of the hand.
 * @returns The tip, in the axes of the model.
 * @throws Error if the rig has no such bone.
 */
function handTip(matrices: ReadonlyMap<string, Matrix4>, name: string): Vec3 {
  const matrix = matrices.get(name);
  if (!matrix) {
    throw new Error(`The rig has no bone "${name}".`);
  }

  const y = new Vector3().setFromMatrixColumn(matrix, 1).normalize();
  const tip = new Vector3().setFromMatrixPosition(matrix).addScaledVector(y, HAND_TIP);
  const [x, height, z] = toModel(tip.x, tip.y, tip.z);
  return [round(x), round(height), round(z)];
}

/**
 * Packs the welded vertices and the triangles in the format of `decodeRigged()`.
 *
 * @param vertices The welded vertices.
 * @param triangles The three vertices of each triangle.
 * @param regions The region of each triangle.
 * @returns The packed mesh as base64.
 */
function packMesh(
  vertices: readonly PackedVertex[],
  triangles: readonly number[],
  regions: readonly number[],
): string {
  // The vertices in the order of their first use, so that the corners and the position
  // differences are small numbers.
  const order: number[] = [];
  const newIndex = new Map<number, number>();
  for (const vertex of triangles) {
    if (!newIndex.has(vertex)) {
      newIndex.set(vertex, order.length);
      order.push(vertex);
    }
  }

  const out: number[] = [];
  writeVarint(out, order.length);
  writeVarint(out, regions.length);
  const last = [0, 0, 0];
  for (const vertex of order) {
    for (let axis = 0; axis < 3; axis++) {
      const value = vertices[vertex]?.steps[axis] ?? 0;
      writeVarint(out, zigzag(value - (last[axis] ?? 0)));
      last[axis] = value;
    }
  }
  for (const vertex of order) {
    const packed = vertices[vertex];
    if (packed) {
      out.push(...packed.bones.slice(0, 4), ...packed.units.slice(0, 3));
    }
  }
  let next = 0;
  for (const vertex of triangles) {
    const index = newIndex.get(vertex) ?? 0;
    writeVarint(out, index === next ? 0 : next - index);
    if (index === next) {
      next += 1;
    }
  }
  out.push(...regions);
  return Buffer.from(out).toString('base64');
}

/**
 * Gives the name of the constant of a rigged module, such as `FOX_RED_RIGGED`.
 *
 * @param species The species.
 * @returns The name.
 */
export function riggedConstant(species: SpeciesId): string {
  return `${species.toUpperCase().replaceAll('-', '_')}_RIGGED`;
}

/**
 * Writes the TypeScript module of a rigged body.
 *
 * @param species The species.
 * @param source The path of the GLB file, relative to the repository.
 * @param body The rigged body.
 * @returns The source text.
 */
export function riggedModule(species: SpeciesId, source: string, body: RiggedBody): string {
  return [
    `import type { RiggedBody } from '../rigged.ts';`,
    '',
    '/**',
    ` * The rigged body of the species \`${species}\` (design 4.4): route B of the fox spike. The`,
    ` * command \`pnpm pack-rigged <glb> ${species}\` writes this file from the GLB file`,
    ` * \`${source}\`. Do not change it by hand.`,
    ' */',
    `export const ${riggedConstant(species)}: RiggedBody = ${JSON.stringify(body, null, 2)};`,
    '',
  ].join('\n');
}

/** The ids of all species, in the order of `SPECIES`. */
const SPECIES_IDS: readonly SpeciesId[] = Object.keys(SPECIES).filter((id): id is SpeciesId =>
  Object.hasOwn(SPECIES, id),
);

/**
 * Packs the GLB file of a rigged body into the module of a species:
 * `node tools/pack-rigged.ts <glb> <species>`.
 */
async function main(): Promise<void> {
  const [path, species] = process.argv.slice(2);
  const id = SPECIES_IDS.find((s) => s === species);
  if (!path || !id) {
    throw new Error('Usage: node tools/pack-rigged.ts <glb> <species>');
  }

  const glb = readGlb(new Uint8Array(await readFile(path)));
  const body = packRigged(glb, speciesRegions(id));
  const root = join(import.meta.dirname, '..');
  const file = join(RIGGED_DIR, `${id}.ts`);
  await writeFile(file, riggedModule(id, relative(root, path), body));
  spawnSync(join(root, 'node_modules', '.bin', 'oxfmt'), [file], { stdio: 'inherit' });
  const formatted = await readFile(file);
  console.log(`${file}: ${formatted.byteLength} B, ${gzipSync(formatted).byteLength} B after gzip`);
}

if (import.meta.main) {
  await main();
}
