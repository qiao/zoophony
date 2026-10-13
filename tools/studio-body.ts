import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { Box3, Matrix4, Quaternion, Vector3 } from 'three';

import { PIANO, PIANO_BENCH } from '../src/models/instruments/piano.ts';
import type { Finish } from '../src/models/mesh.ts';
import { STUDIO_BONES, packStudioMesh } from '../src/models/studio-format.ts';
import type {
  Side,
  StudioBody,
  StudioBone,
  StudioTriangle,
  StudioVertex,
} from '../src/models/studio-format.ts';
import type { Vec3 } from '../src/models/tuples.ts';

/** The repository root. */
const ROOT = join(import.meta.dirname, '..');

/** The folder of the modules of the studio bodies (design 4.4). */
export const STUDIO_DIR = join(ROOT, 'src', 'models', 'studio');

/** The settings of one animal of the studio that the app shows. */
export interface AnimalSettings {
  /**
   * The landmark of the scale (design 4.4): the shoulder joints of the bind pose, or the top of
   * the white keys of the piano of the studio (`piano_key_*`), which the pianist role puts a set
   * distance below the elbows of the seated bind pose.
   */
  readonly landmark: 'shoulders' | 'keys';
  /** The height of the landmark above the floor in the app, in meters. It sets the scale. */
  readonly height: number;
  /**
   * True for a body of a seated role. Its bind pose has the legs bent for the seat, with the hips
   * at their standing height, so the body drops until its soles are on the floor.
   */
  readonly seated: boolean;
  /** The name of the constant of the module. */
  readonly constant: string;
}

/** The animals of the studio that the app shows, by their ids in `lowpoly-studio/animals/`. */
export const ANIMALS: ReadonlyMap<string, AnimalSettings> = new Map([
  // The bear conductor keeps the shoulder joints of the parametric bear of 2026-10-11, 1.0 m
  // above the floor, because the conductor stand and the places of the hands fit them (design
  // 4.5, 5.4).
  ['bear', { landmark: 'shoulders', height: 1.0, seated: false, constant: 'STUDIO_BEAR' }],
  // The polar bear pianist keeps the keys of its studio piano at the keys of the piano of the app,
  // because the studio fitted its seated arms to them (design 4.4, 5.3).
  [
    'polar-bear',
    { landmark: 'keys', height: PIANO.keyTop, seated: true, constant: 'STUDIO_POLAR_BEAR' },
  ],
]);

/** The finish of each material of the studio (design 4.5, materials). */
const FINISHES: ReadonlyMap<string, Finish> = new Map([
  ['fur', 'matte'],
  ['gloss', 'lacquer'],
]);

/** The bones of the studio that the app drops: the hand props. The app has its own baton. */
const DROPPED_BONES: ReadonlySet<string> = new Set(['baton']);

/**
 * The name of a digit bone of a paw with four digits, such as `finger3_L` of the pianist role
 * (`lowpoly-studio/roles/pianist/role.toml`). The app has one finger bone on each hand, so the
 * digits of a paw become the one `fingers` bone of its side, and they curl together.
 */
const DIGIT = /^finger\d_([LR])$/;

/**
 * Gives the bone of a studio body that takes a bone of the studio: the `fingers` bone of its side
 * for a digit, and the bone itself for each other bone.
 *
 * @param name The name of the bone of the studio.
 * @returns The name of the bone of the studio body.
 */
export function ownBone(name: string): string {
  const digit = DIGIT.exec(name);
  return digit ? `fingers_${digit[1] ?? ''}` : name;
}

/**
 * The smallest distance of the middle of a gloss shell of the head from the middle plane, in the
 * units of the studio, for an eye. The nose lies on the middle plane.
 */
const EYE_SIDE = 0.02;

/** The order of the corrective shapes in a studio body: the left arm, then the right arm. */
export const CORRECTIVE_NAMES = ['arm_down_L', 'arm_down_R'] as const;

/** A node of a glTF file: the fields that the tool reads. */
interface GltfNode {
  readonly name?: string;
  readonly children?: readonly number[];
  readonly translation?: readonly number[];
  readonly rotation?: readonly number[];
  readonly scale?: readonly number[];
  readonly matrix?: readonly number[];
  readonly mesh?: number;
  readonly skin?: number;
}

/** A sparse part of an accessor. */
interface GltfSparse {
  readonly count: number;
  readonly indices: {
    readonly bufferView: number;
    readonly byteOffset?: number;
    readonly componentType: number;
  };
  readonly values: { readonly bufferView: number; readonly byteOffset?: number };
}

/** An accessor of a glTF file. */
interface GltfAccessor {
  readonly bufferView?: number;
  readonly byteOffset?: number;
  readonly componentType: number;
  readonly count: number;
  readonly type: string;
  readonly normalized?: boolean;
  readonly sparse?: GltfSparse;
}

/** A buffer view of a glTF file. */
interface GltfBufferView {
  readonly byteOffset?: number;
  readonly byteLength: number;
  readonly byteStride?: number;
}

/** A primitive of a mesh. */
interface GltfPrimitive {
  readonly attributes: Readonly<Record<string, number>>;
  readonly indices: number;
  readonly material?: number;
  readonly targets?: readonly Readonly<Record<string, number>>[];
}

/** A channel of an animation. */
interface GltfChannel {
  readonly sampler: number;
  readonly target: { readonly node: number; readonly path: string };
}

/** An animation of a glTF file. */
interface GltfAnimation {
  readonly name?: string;
  readonly channels: readonly GltfChannel[];
  readonly samplers: readonly { readonly input: number; readonly output: number }[];
}

/** The parts of a glTF file that the tool reads. */
interface Gltf {
  readonly nodes: readonly GltfNode[];
  readonly meshes: readonly {
    readonly primitives: readonly GltfPrimitive[];
    readonly extras?: { readonly targetNames?: readonly string[] };
  }[];
  readonly skins: readonly {
    readonly joints: readonly number[];
    readonly inverseBindMatrices: number;
  }[];
  readonly accessors: readonly GltfAccessor[];
  readonly bufferViews: readonly GltfBufferView[];
  readonly animations?: readonly GltfAnimation[];
  readonly materials?: readonly { readonly name?: string }[];
}

/** A GLB file: its JSON part and its binary part. */
export interface Glb {
  readonly json: Gltf;
  readonly bin: Uint8Array;
}

/**
 * Splits a GLB file into its JSON chunk and its binary chunk.
 *
 * @param bytes The file.
 * @returns The two chunks.
 * @throws Error if the file is not a GLB file of version 2.
 */
export function readGlb(bytes: Uint8Array): Glb {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) {
    throw new Error('The file is not a GLB file of version 2.');
  }

  const jsonLength = view.getUint32(12, true);
  const text = new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength));
  const binAt = 20 + jsonLength;
  const binLength = view.getUint32(binAt, true);
  // SAFETY: the JSON chunk of a GLB file holds a glTF document, and the reads below check the
  // fields that they use.
  const json = JSON.parse(text) as Gltf;
  return { json, bin: bytes.subarray(binAt + 8, binAt + 8 + binLength) };
}

/** The number of components of each accessor type. */
const COMPONENTS: ReadonlyMap<string, number> = new Map([
  ['SCALAR', 1],
  ['VEC2', 2],
  ['VEC3', 3],
  ['VEC4', 4],
  ['MAT4', 16],
]);

/** The byte size and the largest value of each integer component type. */
const INTEGERS: ReadonlyMap<number, readonly [bytes: number, max: number]> = new Map([
  [5121, [1, 255]],
  [5123, [2, 65535]],
  [5125, [4, 4294967295]],
]);

/**
 * Reads one component.
 *
 * @param view The binary chunk.
 * @param at The byte offset.
 * @param type The component type.
 * @returns The value, as stored.
 */
function component(view: DataView, at: number, type: number): number {
  switch (type) {
    case 5126:
      return view.getFloat32(at, true);
    case 5121:
      return view.getUint8(at);
    case 5123:
      return view.getUint16(at, true);
    case 5125:
      return view.getUint32(at, true);
    default:
      throw new Error(`The component type ${type} is not read.`);
  }
}

/**
 * Reads an accessor, with its sparse part. A normalized integer becomes a number from 0 to 1.
 *
 * @param glb The file.
 * @param index The accessor.
 * @returns The values, `count × components` numbers.
 * @throws Error if the accessor does not exist.
 */
export function readAccessor(glb: Glb, index: number): Float64Array {
  const accessor = glb.json.accessors[index];
  if (!accessor) {
    throw new Error(`The accessor ${index} does not exist.`);
  }

  const n = COMPONENTS.get(accessor.type) ?? 1;
  const out = new Float64Array(accessor.count * n);
  const view = new DataView(glb.bin.buffer, glb.bin.byteOffset, glb.bin.byteLength);
  const size = INTEGERS.get(accessor.componentType)?.[0] ?? 4;
  const max = accessor.normalized ? (INTEGERS.get(accessor.componentType)?.[1] ?? 1) : 1;
  const bufferView =
    accessor.bufferView === undefined ? undefined : glb.json.bufferViews[accessor.bufferView];
  if (bufferView) {
    const stride = bufferView.byteStride ?? size * n;
    const start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    for (let i = 0; i < accessor.count; i++) {
      for (let k = 0; k < n; k++) {
        out[i * n + k] =
          component(view, start + i * stride + k * size, accessor.componentType) / max;
      }
    }
  }
  const sparse = accessor.sparse;
  if (sparse) {
    const indexView = glb.json.bufferViews[sparse.indices.bufferView];
    const valueView = glb.json.bufferViews[sparse.values.bufferView];
    const indexSize = INTEGERS.get(sparse.indices.componentType)?.[0] ?? 4;
    for (let s = 0; s < sparse.count; s++) {
      const target = component(
        view,
        (indexView?.byteOffset ?? 0) + (sparse.indices.byteOffset ?? 0) + s * indexSize,
        sparse.indices.componentType,
      );
      for (let k = 0; k < n; k++) {
        const at = (valueView?.byteOffset ?? 0) + (sparse.values.byteOffset ?? 0);
        out[target * n + k] =
          component(view, at + (s * n + k) * size, accessor.componentType) / max;
      }
    }
  }
  return out;
}

/**
 * Gives the local matrix of a node, with the animated values of a pose in place of its own.
 *
 * @param node The node.
 * @param pose The animated rotation, translation, and scale of the node, or none.
 * @returns The matrix.
 */
function localMatrix(node: GltfNode, pose: NodePose | undefined): Matrix4 {
  if (node.matrix) {
    return new Matrix4().fromArray(node.matrix);
  }
  const t = pose?.translation ?? node.translation ?? [0, 0, 0];
  const r = pose?.rotation ?? node.rotation ?? [0, 0, 0, 1];
  const s = pose?.scale ?? node.scale ?? [1, 1, 1];
  return new Matrix4().compose(
    new Vector3(t[0], t[1], t[2]),
    new Quaternion(r[0], r[1], r[2], r[3]),
    new Vector3(s[0], s[1], s[2]),
  );
}

/** The animated values of one node at one time. */
interface NodePose {
  translation?: readonly number[];
  rotation?: readonly number[];
  scale?: readonly number[];
}

/**
 * Calculates the world matrix of each node of the scene, from the roots down.
 *
 * @param gltf The document.
 * @param poses The animated values of the nodes of a pose.
 * @returns The world matrix of each node.
 */
export function worldMatrices(gltf: Gltf, poses: ReadonlyMap<number, NodePose>): Matrix4[] {
  const parents = new Map<number, number>();
  for (const [i, node] of gltf.nodes.entries()) {
    for (const child of node.children ?? []) {
      parents.set(child, i);
    }
  }
  const worlds: (Matrix4 | undefined)[] = [];
  const worldOf = (i: number): Matrix4 => {
    const known = worlds[i];
    if (known) {
      return known;
    }
    const node = gltf.nodes[i] ?? {};
    const local = localMatrix(node, poses.get(i));
    const parent = parents.get(i);
    const world = parent === undefined ? local : worldOf(parent).clone().multiply(local);
    worlds[i] = world;
    return world;
  };
  return gltf.nodes.map((_, i) => worldOf(i));
}

/** The animated values of the nodes at the first key of an animation. */
interface FirstKeys {
  /** The values of each animated node. */
  readonly nodes: Map<number, NodePose>;
  /** The weights of the corrective shapes. */
  readonly weights: readonly number[];
}

/**
 * Gives the animated values of the nodes at the first key of an animation.
 *
 * @param glb The file.
 * @param name The name of the animation.
 * @returns The values of each animated node, and the weights of the corrective shapes.
 * @throws Error if the file has no animation of the name.
 */
export function firstKeys(glb: Glb, name: string): FirstKeys {
  const animation = glb.json.animations?.find((a) => a.name === name);
  if (!animation) {
    throw new Error(`The file has no animation "${name}".`);
  }

  const nodes = new Map<number, NodePose>();
  let weights: readonly number[] = [];
  for (const channel of animation.channels) {
    const sampler = animation.samplers[channel.sampler];
    if (!sampler) {
      continue;
    }
    const output = readAccessor(glb, sampler.output);
    const pose = nodes.get(channel.target.node) ?? {};
    const path = channel.target.path;
    if (path === 'rotation') {
      pose.rotation = Array.from(output.subarray(0, 4));
    } else if (path === 'translation') {
      pose.translation = Array.from(output.subarray(0, 3));
    } else if (path === 'scale') {
      pose.scale = Array.from(output.subarray(0, 3));
    } else if (path === 'weights') {
      weights = Array.from(output.subarray(0, CORRECTIVE_NAMES.length));
    }
    nodes.set(channel.target.node, pose);
  }
  return { nodes, weights };
}

/**
 * Moves a point of the studio into the model axes of the app: the studio animal faces +z with its
 * left side at +x, and the app animal faces -z with its left side at -x (design 4.4). The turn of
 * a half circle around y keeps the order of the corners of each face.
 *
 * @param p The point, in the units of the studio.
 * @param scale The meters for each unit.
 * @returns The point in meters, in the model axes.
 */
export function toModelAxes(p: Vector3, scale: number): Vec3 {
  return [round(-p.x * scale), round(p.y * scale), round(-p.z * scale)];
}

/**
 * Rounds a number to 6 decimals, so that the module stays short and the same on each run.
 *
 * @param value The number.
 * @returns The rounded number.
 */
function round(value: number): number {
  return Math.round(value * 1e6) / 1e6 + 0;
}

/** One welded vertex of the studio mesh, in the axes and the units of the studio. */
interface SourceVertex {
  readonly position: Vector3;
  /** The bones of the vertex, as names, and their weights. */
  skin: readonly (readonly [bone: string, weight: number])[];
  /** The move of each corrective shape. */
  readonly moves: Vector3[];
  /** The primitive of the vertex. */
  readonly material: string;
}

/** The welded mesh of the studio: the vertices and the faces. */
interface SourceMesh {
  readonly vertices: SourceVertex[];
  readonly faces: {
    readonly corners: [number, number, number];
    readonly color: Vec3;
    readonly finish: Finish;
  }[];
}

/**
 * Welds the primitives of the skinned mesh: each place with its skin is one vertex. The faces of
 * the studio are flat, with one color each, so a vertex needs no normal and no color.
 *
 * @param glb The file.
 * @returns The welded mesh. The primitive of a dropped bone (the baton) is not in it.
 * @throws Error if the file has no skinned mesh, or a face has corners of different colors.
 */
export function weldMesh(glb: Glb): SourceMesh {
  const node = glb.json.nodes.find((n) => n.mesh !== undefined && n.skin !== undefined);
  const mesh = node?.mesh === undefined ? undefined : glb.json.meshes[node.mesh];
  const skin = node?.skin === undefined ? undefined : glb.json.skins[node.skin];
  if (!mesh || !skin) {
    throw new Error('The file has no skinned mesh.');
  }
  const names = mesh.extras?.targetNames ?? [];
  if (CORRECTIVE_NAMES.some((name, i) => names[i] !== name)) {
    throw new Error(`The shapes are ${names.join(', ')}, not ${CORRECTIVE_NAMES.join(', ')}.`);
  }

  const jointNames = skin.joints.map((j) => ownBone(glb.json.nodes[j]?.name ?? ''));
  const vertices: SourceVertex[] = [];
  const faces: SourceMesh['faces'] = [];
  for (const primitive of mesh.primitives) {
    const material = glb.json.materials?.[primitive.material ?? -1]?.name ?? '';
    const finish = FINISHES.get(material);
    if (!finish) {
      continue;
    }
    const at = (name: string): Float64Array => readAccessor(glb, primitive.attributes[name] ?? -1);
    const positions = at('POSITION');
    const joints = at('JOINTS_0');
    const weights = at('WEIGHTS_0');
    const colors = at('COLOR_0');
    const colorSize = colors.length / (positions.length / 3);
    const moves = (primitive.targets ?? []).map((t) => readAccessor(glb, t['POSITION'] ?? -1));
    const indices = readAccessor(glb, primitive.indices);

    const welded = new Map<string, number>();
    const vertexOf = (v: number): number => {
      const key = [
        ...positions.subarray(v * 3, v * 3 + 3),
        ...joints.subarray(v * 4, v * 4 + 4),
      ].join(' ');
      const known = welded.get(key);
      if (known !== undefined) {
        return known;
      }
      // The digits of a paw are one bone, so their weights add up.
      const sums = new Map<string, number>();
      for (let k = 0; k < 4; k++) {
        const bone = jointNames[joints[v * 4 + k] ?? 0] ?? '';
        const w = weights[v * 4 + k] ?? 0;
        if (w > 0) {
          sums.set(bone, (sums.get(bone) ?? 0) + w);
        }
      }
      const skinOf = [...sums];
      if (skinOf.some(([bone]) => DROPPED_BONES.has(bone))) {
        throw new Error(`A vertex of the material "${material}" follows a dropped bone.`);
      }
      vertices.push({
        position: new Vector3().fromArray(positions, v * 3),
        skin: skinOf,
        moves: moves.map((m) => new Vector3().fromArray(m, v * 3)),
        material,
      });
      welded.set(key, vertices.length - 1);
      return vertices.length - 1;
    };

    for (let t = 0; t < indices.length; t += 3) {
      const [a, b, c] = [indices[t] ?? 0, indices[t + 1] ?? 0, indices[t + 2] ?? 0];
      const color = Array.from(colors.subarray(a * colorSize, a * colorSize + 3));
      for (const other of [b, c]) {
        const second = colors.subarray(other * colorSize, other * colorSize + 3);
        if (color.some((value, k) => Math.abs(value - (second[k] ?? 0)) > 1e-6)) {
          throw new Error(`The face ${t / 3} of the material "${material}" has two colors.`);
        }
      }
      faces.push({
        corners: [vertexOf(a), vertexOf(b), vertexOf(c)],
        color: [color[0] ?? 0, color[1] ?? 0, color[2] ?? 0],
        finish,
      });
    }
  }
  return { vertices, faces };
}

/** The bind pose of the skeleton of the studio, in the axes and the units of the studio. */
interface SourceSkeleton {
  /** The world matrix of each joint in the bind pose, by name. */
  readonly binds: ReadonlyMap<string, Matrix4>;
  /** The joint node of each name. */
  readonly nodes: ReadonlyMap<string, number>;
}

/**
 * Reads the bind pose of the skeleton from the inverse bind matrices, and checks that the nodes
 * of the scene give the same pose.
 *
 * @param glb The file.
 * @returns The bind pose.
 * @throws Error if the joints are not the bones of the biped template, or if the nodes and the
 *   inverse bind matrices disagree.
 */
export function readSkeleton(glb: Glb): SourceSkeleton {
  const skin = glb.json.skins[0];
  if (!skin) {
    throw new Error('The file has no skin.');
  }
  const inverse = readAccessor(glb, skin.inverseBindMatrices);
  const worlds = worldMatrices(glb.json, new Map());
  const binds = new Map<string, Matrix4>();
  const nodes = new Map<string, number>();
  for (const [k, joint] of skin.joints.entries()) {
    const name = glb.json.nodes[joint]?.name ?? '';
    const bind = new Matrix4().fromArray(inverse, k * 16).invert();
    const world = worlds[joint] ?? new Matrix4();
    const error = Math.max(...bind.elements.map((e, i) => Math.abs(e - (world.elements[i] ?? 0))));
    if (error > 1e-4) {
      throw new Error(`The node of "${name}" is ${error} from its bind pose.`);
    }
    binds.set(name, bind);
    nodes.set(name, joint);
  }
  for (const side of ['L', 'R'] as const) {
    const digits = [...binds].filter(([name]) => ownBone(name) === `fingers_${side}`);
    if (!binds.has(`fingers_${side}`) && digits.length > 0) {
      binds.set(`fingers_${side}`, mergedBind(digits.map(([, bind]) => bind)));
    }
  }
  const body = STUDIO_BONES.filter((b) => !b.startsWith('eye_'));
  const missing = body.filter((b) => !binds.has(b));
  const extra = [...binds.keys()].filter(
    (b) => !DROPPED_BONES.has(b) && !DIGIT.test(b) && !body.some((own) => own === b),
  );
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(`The joints lack ${missing.join(', ')} and add ${extra.join(', ')}.`);
  }
  return { binds, nodes };
}

/**
 * Makes the bind pose of the one finger bone of a paw from the bind poses of its digits: the
 * head at the middle of the heads of the digits, the y axis along the mean digit, and the z axis
 * (the side of the palm) along the mean z axis of the digits. The digits start on one line
 * across the paw, so a curl around this bone stays near the curl of each digit around its own
 * head.
 *
 * @param digits The bind pose of each digit.
 * @returns The bind pose of the finger bone.
 */
function mergedBind(digits: readonly Matrix4[]): Matrix4 {
  const head = new Vector3();
  const y = new Vector3();
  const z = new Vector3();
  const axes = [new Vector3(), new Vector3(), new Vector3()] as const;
  for (const digit of digits) {
    digit.extractBasis(axes[0], axes[1], axes[2]);
    head.add(new Vector3().setFromMatrixPosition(digit));
    y.add(axes[1].normalize());
    z.add(axes[2].normalize());
  }
  head.divideScalar(digits.length);
  y.normalize();
  z.addScaledVector(y, -z.dot(y)).normalize();
  const x = new Vector3().crossVectors(y, z);
  return new Matrix4().makeBasis(x, y, z).setPosition(head);
}

/**
 * Gives the place of the head of a joint in the bind pose.
 *
 * @param skeleton The bind pose.
 * @param bone The joint.
 * @returns The place, in the axes and the units of the studio.
 */
function headOf(skeleton: SourceSkeleton, bone: string): Vector3 {
  return new Vector3().setFromMatrixPosition(skeleton.binds.get(bone) ?? new Matrix4());
}

/**
 * Gives an axis of the frame of a joint in the bind pose.
 *
 * @param skeleton The bind pose.
 * @param bone The joint.
 * @param axis 0 for x, 1 for y (along the bone), 2 for z.
 * @returns The unit axis, in the axes of the studio.
 */
function axisOf(skeleton: SourceSkeleton, bone: string, axis: number): Vector3 {
  const x = new Vector3();
  const y = new Vector3();
  const z = new Vector3();
  (skeleton.binds.get(bone) ?? new Matrix4()).extractBasis(x, y, z);
  return [x, y, z][axis]?.normalize() ?? new Vector3();
}

/**
 * Finds the parts of the eyes: the shells of the gloss material on the head that are out of the
 * middle plane. Each eye is a few nested shells and a light.
 *
 * @param mesh The welded mesh.
 * @returns The vertices of the eye of each side.
 */
export function eyeVertices(mesh: SourceMesh): Readonly<Record<Side, ReadonlySet<number>>> {
  // The shells of the gloss faces on the head: the faces that share a vertex are one shell.
  const parent = mesh.vertices.map((_, v) => v);
  const rootOf = (v: number): number => {
    let r = v;
    while (parent[r] !== r) {
      r = parent[r] ?? r;
    }
    return r;
  };
  const onHead = mesh.faces.filter((face) =>
    face.corners.every((c) => {
      const v = mesh.vertices[c];
      return v?.material === 'gloss' && v.skin.length === 1 && v.skin[0]?.[0] === 'head';
    }),
  );
  for (const face of onHead) {
    const [a, b, c] = face.corners.map(rootOf);
    parent[b ?? 0] = a ?? 0;
    parent[rootOf(c ?? 0)] = a ?? 0;
  }
  const shells = new Map<number, number[]>();
  for (const face of onHead) {
    const root = rootOf(face.corners[0]);
    const shell = shells.get(root) ?? [];
    shell.push(...face.corners);
    shells.set(root, shell);
  }

  // A shell out of the middle plane is a part of an eye. The nose is on the middle plane.
  const out = { L: new Set<number>(), R: new Set<number>() };
  for (const shell of shells.values()) {
    const x = shell.reduce((sum, c) => sum + (mesh.vertices[c]?.position.x ?? 0), 0) / shell.length;
    if (Math.abs(x) > EYE_SIDE) {
      // The studio puts the left side of the animal at +x.
      for (const c of shell) {
        out[x > 0 ? 'L' : 'R'].add(c);
      }
    }
  }
  return out;
}

/** The arms of the pose of the sheet. */
interface SheetPose {
  /** The direction of each upper arm in the axes of the chest, in the axes of the studio. */
  readonly arms: Readonly<Record<Side, Vector3>>;
  /** The weights of the corrective shapes in the first key of the clip `reference`. */
  readonly weights: readonly number[];
}

/**
 * Finds the corrective weights of the pose of the sheet, and the direction of each upper arm in
 * the axes of the chest in that pose (`lowpoly-studio/templates/biped/corrective.py`).
 *
 * @param glb The file.
 * @param skeleton The bind pose.
 * @returns The direction of each upper arm, in the axes of the studio, and the weights of the
 *   shapes in the first key of the clip `reference`.
 */
export function sheetArms(glb: Glb, skeleton: SourceSkeleton): SheetPose {
  const keys = firstKeys(glb, 'reference');
  const posed = worldMatrices(glb.json, keys.nodes);
  const turn = (bone: string): Quaternion => {
    const node = skeleton.nodes.get(bone) ?? -1;
    const world = new Quaternion().setFromRotationMatrix(posed[node] ?? new Matrix4());
    const bind = new Quaternion().setFromRotationMatrix(skeleton.binds.get(bone) ?? new Matrix4());
    return world.multiply(bind.invert());
  };
  const chest = turn('chest').invert();
  const arm = (side: Side): Vector3 => {
    const rest = headOf(skeleton, `forearm_${side}`).sub(headOf(skeleton, `upper_arm_${side}`));
    return rest
      .normalize()
      .applyQuaternion(turn(`upper_arm_${side}`))
      .applyQuaternion(chest);
  };
  return { arms: { L: arm('L'), R: arm('R') }, weights: keys.weights };
}

/**
 * Gives the index of a bone of a studio body.
 *
 * @param bone The name of the bone.
 * @returns The index in `STUDIO_BONES`.
 * @throws Error if the name is not a bone of a studio body.
 */
function boneIndexOf(bone: string): number {
  const index = STUDIO_BONES.findIndex((own) => own === bone);
  if (index < 0) {
    throw new Error(`"${bone}" is not a bone of a studio body.`);
  }
  return index;
}

/** A welded mesh with its vertices in the order of their first use. */
interface OrderedMesh {
  readonly vertices: readonly SourceVertex[];
  /** The faces, with the new indices of their corners. */
  readonly faces: readonly StudioTriangle[];
}

/**
 * Puts the vertices in the order of their first use by the faces, so that the packed corners and
 * the differences of the places are small numbers.
 *
 * @param mesh The welded mesh.
 * @returns The vertices in the new order, and the faces with the new indices.
 */
export function orderByFirstUse(mesh: SourceMesh): OrderedMesh {
  const index = new Map<number, number>();
  const vertices: SourceVertex[] = [];
  const faces = mesh.faces.map((face): StudioTriangle => {
    const corners = face.corners.map((c) => {
      let known = index.get(c);
      if (known === undefined) {
        known = vertices.length;
        index.set(c, known);
        const vertex = mesh.vertices[c];
        if (!vertex) {
          throw new Error(`A face names the vertex ${c}, which does not exist.`);
        }
        vertices.push(vertex);
      }
      return known;
    });
    return {
      corners: [corners[0] ?? 0, corners[1] ?? 0, corners[2] ?? 0],
      color: face.color,
      finish: face.finish,
    };
  });
  return { vertices, faces };
}

/** The place of the studio animal in the app: its scale and its move. */
interface SceneFrame {
  /** The meters for each unit of the studio. */
  readonly scale: number;
  /** The move of each point of the studio, in the axes and the units of the studio. */
  readonly offset: Vector3;
}

/**
 * Gives the box around the meshes of the scene nodes of the GLB file whose names pass a test, such
 * as the bench or the keys of the piano of the studio.
 *
 * @param glb The file.
 * @param test The test of a node name.
 * @returns The box, in the axes and the units of the studio.
 * @throws Error if no node with a mesh passes the test.
 */
function propBox(glb: Glb, test: (name: string) => boolean): Box3 {
  const worlds = worldMatrices(glb.json, new Map());
  const box = new Box3();
  for (const [i, node] of glb.json.nodes.entries()) {
    const mesh = node.mesh === undefined ? undefined : glb.json.meshes[node.mesh];
    if (!mesh || node.skin !== undefined || !test(node.name ?? '')) {
      continue;
    }
    for (const primitive of mesh.primitives) {
      const positions = readAccessor(glb, primitive.attributes['POSITION'] ?? -1);
      for (let v = 0; v < positions.length; v += 3) {
        box.expandByPoint(
          new Vector3().fromArray(positions, v).applyMatrix4(worlds[i] ?? new Matrix4()),
        );
      }
    }
  }
  if (box.isEmpty()) {
    throw new Error('The file has no prop with a matching name.');
  }
  return box;
}

/**
 * Finds the scale and the move of the studio animal in the app (design 4.4). A standing body keeps
 * its place: the soles of the studio are on the floor. A seated body drops until the lowest point
 * of its mesh, a sole, is on the floor, and moves forward so that the front edge of the bench of
 * the studio is at the front edge of the piano bench of the app. The scene of the studio puts the
 * field of the soles on its floor, and the skin is a little outside the field, so the seated body
 * of the app is up to 0.011 units higher above its keys than in the studio.
 *
 * @param glb The file.
 * @param skeleton The bind pose.
 * @param mesh The welded mesh.
 * @param settings The settings of the animal.
 * @returns The scale and the move.
 */
function sceneFrame(
  glb: Glb,
  skeleton: SourceSkeleton,
  mesh: SourceMesh,
  settings: AnimalSettings,
): SceneFrame {
  const landmark =
    settings.landmark === 'shoulders'
      ? headOf(skeleton, 'upper_arm_L').y
      : propBox(glb, (name) => name.startsWith('piano_key_')).max.y;
  const scale = settings.height / landmark;
  if (!settings.seated) {
    return { scale, offset: new Vector3() };
  }

  const drop = Math.min(...mesh.vertices.map((v) => v.position.y));
  const front = propBox(glb, (name) => name === 'bench').max.z;
  return { scale, offset: new Vector3(0, -drop, PIANO_BENCH.depth / 2 / scale - front) };
}

/**
 * Finds the height of a flat bench under a seated studio body (design 4.4, 4.5): the lowest point
 * of the mesh over the piano bench of the app, so that the body rests on the bench and no part of
 * it goes into the bench.
 *
 * @param mesh The welded mesh.
 * @param frame The place of the animal in the app.
 * @returns The height of the top of the bench, in meters.
 */
function seatHeightOf(mesh: SourceMesh, frame: SceneFrame): number {
  const halfX = PIANO_BENCH.width / 2 / frame.scale;
  const halfZ = PIANO_BENCH.depth / 2 / frame.scale;
  let low = Infinity;
  for (const vertex of mesh.vertices) {
    const p = vertex.position.clone().add(frame.offset);
    if (Math.abs(p.x) <= halfX && Math.abs(p.z) <= halfZ) {
      low = Math.min(low, p.y);
    }
  }
  return round(low * frame.scale);
}

/** The output of the export of a studio body. */
interface Export {
  readonly body: StudioBody;
  /** The weights of the corrective shapes in the pose of the sheet, for the report. */
  readonly sheetWeights: readonly number[];
}

/**
 * Makes the studio body of an animal from its GLB file (design 4.4): the mesh in the model axes
 * and in meters, the skin with the eye bones, the corrective shapes, and the points that the app
 * reads.
 *
 * @param bytes The GLB file.
 * @param source The GLB file, relative to the repository.
 * @param settings The settings of the animal.
 * @returns The body, and the corrective weights of the pose of the sheet for the report.
 */
export function studioBody(bytes: Uint8Array, source: string, settings: AnimalSettings): Export {
  const glb = readGlb(bytes);
  const skeleton = readSkeleton(glb);
  const mesh = weldMesh(glb);
  const frame = sceneFrame(glb, skeleton, mesh, settings);
  const scale = frame.scale;
  const model = (p: Vector3): Vec3 => toModelAxes(p.clone().add(frame.offset), scale);
  const direction = (d: Vector3): Vec3 => toModelAxes(d.clone().normalize(), 1);

  // The eyes follow eye bones of their own, so that they blink.
  const eyes = eyeVertices(mesh);
  const eyeCenter = (side: Side): Vector3 => {
    const center = new Vector3();
    for (const v of eyes[side]) {
      center.add(mesh.vertices[v]?.position ?? new Vector3());
    }
    return center.divideScalar(Math.max(1, eyes[side].size));
  };
  for (const side of ['L', 'R'] as const) {
    for (const v of eyes[side]) {
      const vertex = mesh.vertices[v];
      if (vertex) {
        vertex.skin = [[`eye_${side}`, 1]];
      }
    }
  }

  const heads = Object.fromEntries(
    STUDIO_BONES.map((bone): [StudioBone, Vec3] => {
      if (bone === 'eye_L' || bone === 'eye_R') {
        return [bone, model(eyeCenter(bone === 'eye_L' ? 'L' : 'R'))];
      }
      return [bone, model(headOf(skeleton, bone))];
    }),
  );

  // The end of each finger block: the farthest claw tip along the `fingers` bone.
  const fingerTip = (side: Side): Vec3 => {
    const head = headOf(skeleton, `fingers_${side}`);
    const along = axisOf(skeleton, `fingers_${side}`, 1);
    let far = 0;
    for (const vertex of mesh.vertices) {
      if (vertex.skin.some(([bone, w]) => bone === `fingers_${side}` && w > 0.5)) {
        far = Math.max(far, vertex.position.clone().sub(head).dot(along));
      }
    }
    return model(head.addScaledVector(along, far));
  };

  // The head: the faces of the fur that follow the head bone most. The ears follow ear bones.
  let top = -Infinity;
  let chin = Infinity;
  const box = {
    min: new Vector3(Infinity, Infinity, Infinity),
    max: new Vector3(-Infinity, -Infinity, -Infinity),
  };
  let nose = new Vector3(0, 0, -Infinity);
  for (const vertex of mesh.vertices) {
    const head = vertex.skin.find(([bone]) => bone === 'head')?.[1] ?? 0;
    if (vertex.material === 'fur' && head > 0.5) {
      top = Math.max(top, vertex.position.y);
      chin = Math.min(chin, vertex.position.y);
      box.min.min(vertex.position);
      box.max.max(vertex.position);
    }
    if (vertex.material === 'gloss' && head === 1 && vertex.position.z > nose.z) {
      nose = vertex.position;
    }
  }
  const center = box.min.clone().add(box.max).multiplyScalar(0.5).setX(0);

  // The studio animal faces +z, so its moves turn as its points do.
  const ordered = orderByFirstUse(mesh);
  const vertices: StudioVertex[] = ordered.vertices.map((v) => ({
    position: model(v.position),
    skin: v.skin.map(([bone, w]) => [boneIndexOf(bone), w] as const),
  }));
  const correctives = CORRECTIVE_NAMES.map((_, s) =>
    ordered.vertices.map((v) => toModelAxes(v.moves[s] ?? new Vector3(), scale)),
  );
  const sheet = sheetArms(glb, skeleton);

  return {
    body: {
      source,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      scale: round(scale),
      // SAFETY: the entries hold each bone of STUDIO_BONES one time.
      heads: heads as Record<StudioBone, Vec3>,
      palms: {
        L: direction(axisOf(skeleton, 'hand_L', 2)),
        R: direction(axisOf(skeleton, 'hand_R', 2)),
      },
      fingerTips: { L: fingerTip('L'), R: fingerTip('R') },
      sheetArms: { L: direction(sheet.arms.L), R: direction(sheet.arms.R) },
      headHeight: round((top - chin) * scale),
      headCenter: model(center),
      nose: model(nose),
      floor: toModelAxes(new Vector3(0, 0, frame.offset.z), scale),
      seatHeight: settings.seated ? seatHeightOf(mesh, frame) : null,
      mesh: packStudioMesh(vertices, ordered.faces, correctives),
    },
    sheetWeights: sheet.weights,
  };
}

/** A box in the axes and the units of the studio. */
export interface UnitBox {
  /** The lowest corner. */
  readonly min: Vec3;
  /** The highest corner. */
  readonly max: Vec3;
}

/** One node of the scene of a GLB file, in the order of a walk from the roots down. */
export interface InspectedNode {
  /** The name of the node. */
  readonly name: string;
  /** The number of parents of the node. */
  readonly depth: number;
  /** The skinned mesh of the animal, a prop with a mesh, a joint of the skin, or another node. */
  readonly kind: 'skinned mesh' | 'prop' | 'joint' | 'node';
  /** The number of faces of each material of the mesh of the node, by material name. */
  readonly faces: ReadonlyMap<string, number>;
  /** The number of joints in the tree of a root joint of the skin, or 0 for another node. */
  readonly joints: number;
  /** The names of the nodes in the tree of a root joint that are no joints, such as a prop tip. */
  readonly inside: readonly string[];
}

/** The joints of the skin of a GLB file, by what the export does with them. */
export interface InspectedJoints {
  /** All joints, in the order of the skin. */
  readonly all: readonly string[];
  /** The digits of each paw, which become the one `fingers` bone of their side. */
  readonly digits: Readonly<Record<Side, readonly string[]>>;
  /** The joints that the export drops, such as the baton. */
  readonly dropped: readonly string[];
  /** The body bones of a studio body that the skin does not have. The export stops on them. */
  readonly missing: readonly string[];
  /** The joints that are no bone of a studio body. The export stops on them. */
  readonly unknown: readonly string[];
}

/** One animation clip of a GLB file. */
export interface InspectedClip {
  /** The name of the clip. */
  readonly name: string;
  /** The time of the last key, in seconds. */
  readonly seconds: number;
  /** The number of channels. */
  readonly channels: number;
  /** The height of the hips joint at the first key, in units of the studio. */
  readonly hips: number;
}

/** One group of props: one node, or all keys `piano_key_*` of the piano of the studio. */
export interface InspectedProp {
  /** The name of the node, or `piano_key_*` for the keys. */
  readonly name: string;
  /** The number of nodes in the group. */
  readonly nodes: number;
  /** The box of the meshes of the group. */
  readonly box: UnitBox;
}

/** One morph target of the skinned mesh. */
export interface InspectedTarget {
  /** The name of the target, such as `arm_down_L`. */
  readonly name: string;
  /** True when the export keeps the target as a corrective shape. */
  readonly kept: boolean;
}

/** The keys `piano_key_*` of the piano of the studio. */
export interface InspectedKeys {
  /** The height of the top of the keys. */
  readonly top: number;
  /** The z of the front edge of the keys: the edge near the player. */
  readonly front: number;
}

/**
 * The facts of a GLB file of the studio that a new studio body needs (design 4.4), in the axes
 * and the units of the studio: the animal faces +z with its left side at +x.
 */
export interface StudioInspection {
  /** The meters for each unit of the studio. */
  readonly scale: number;
  /** The source of the scale: the settings of `ANIMALS`, or the assumed settings. */
  readonly scaleFrom: string;
  /** The nodes of the scene, from the roots down. */
  readonly nodes: readonly InspectedNode[];
  /** The joints of the skin. */
  readonly joints: InspectedJoints;
  /** The morph targets of the skinned mesh, and if the export keeps each one. */
  readonly targets: readonly InspectedTarget[];
  /** The animation clips. */
  readonly clips: readonly InspectedClip[];
  /** The height of the hips joint in the bind pose. */
  readonly bindHips: number;
  /**
   * True for a seated role: the setting of `ANIMALS`, or a prop `bench` for an animal that is not
   * in `ANIMALS`.
   */
  readonly seated: boolean;
  /**
   * The lowest point of the skin in the bind pose: the drop of a seated body in the app, which
   * puts the soles on the floor.
   */
  readonly lowest: Vec3;
  /** The props: the scene nodes with a mesh and no skin. */
  readonly props: readonly InspectedProp[];
  /** The height of the top of the prop `bench`, or `null` with no bench. */
  readonly benchTop: number | null;
  /** The keys of the piano of the studio, or `null` with no keys. */
  readonly keys: InspectedKeys | null;
}

/**
 * Gives a box as two points.
 *
 * @param box The box.
 * @returns The box.
 */
function unitBox(box: Box3): UnitBox {
  return { min: box.min.toArray(), max: box.max.toArray() };
}

/**
 * Gives the box of the meshes of some scene nodes of a GLB file.
 *
 * @param glb The file.
 * @param worlds The world matrix of each node.
 * @param nodes The nodes.
 * @returns The box, in the axes and the units of the studio.
 */
function meshBox(glb: Glb, worlds: readonly Matrix4[], nodes: readonly number[]): Box3 {
  const box = new Box3();
  for (const i of nodes) {
    const node = glb.json.nodes[i];
    const mesh = node?.mesh === undefined ? undefined : glb.json.meshes[node.mesh];
    for (const primitive of mesh?.primitives ?? []) {
      const positions = readAccessor(glb, primitive.attributes['POSITION'] ?? -1);
      for (let v = 0; v < positions.length; v += 3) {
        box.expandByPoint(
          new Vector3().fromArray(positions, v).applyMatrix4(worlds[i] ?? new Matrix4()),
        );
      }
    }
  }
  return box;
}

/**
 * Reads the facts of a GLB file of the studio that a new studio body needs (design 4.4): the
 * nodes, the joints, the morph targets, the clips, the heights of the hips, the lowest point of
 * the skin, and the boxes of the props. It reads the file as it is, and it does not stop on a
 * part that the export refuses: it lists that part.
 *
 * @param bytes The GLB file.
 * @param settings The settings of the animal, or `null` for an animal that is not in `ANIMALS`.
 *   Then the scale puts the shoulder joints 1.0 m above the floor.
 * @returns The facts, in the axes and the units of the studio.
 * @throws Error if the file has no skin, or no prop of the landmark of the settings.
 */
export function inspectStudioGlb(
  bytes: Uint8Array,
  settings: AnimalSettings | null,
): StudioInspection {
  const glb = readGlb(bytes);
  const gltf = glb.json;
  const skin = gltf.skins[0];
  if (!skin) {
    throw new Error('The file has no skin.');
  }
  const worlds = worldMatrices(gltf, new Map());
  const nodeOf = (name: string): number => gltf.nodes.findIndex((n) => n.name === name);
  const heightOf = (node: number, matrices: readonly Matrix4[]): number =>
    new Vector3().setFromMatrixPosition(matrices[node] ?? new Matrix4()).y;

  // The props: each node with a mesh and no skin. The keys of the piano are one group.
  const propNodes = [...gltf.nodes.keys()].filter(
    (i) => gltf.nodes[i]?.mesh !== undefined && gltf.nodes[i]?.skin === undefined,
  );
  const keyNodes = propNodes.filter((i) => (gltf.nodes[i]?.name ?? '').startsWith('piano_key_'));
  const groups = [
    ...propNodes
      .filter((i) => !keyNodes.includes(i))
      .map((i) => ({ name: gltf.nodes[i]?.name ?? '', nodes: [i] })),
    ...(keyNodes.length > 0 ? [{ name: 'piano_key_*', nodes: keyNodes }] : []),
  ];
  const props = groups.map((group) => ({
    name: group.name,
    nodes: group.nodes.length,
    box: meshBox(glb, worlds, group.nodes),
  }));
  const bench = props.find((prop) => prop.name === 'bench');
  const keys = props.find((prop) => prop.name === 'piano_key_*');

  // The scale of the settings, as the export finds it.
  const used = settings ?? { landmark: 'shoulders', height: 1, seated: false, constant: '' };
  const landmark =
    used.landmark === 'shoulders' ? heightOf(nodeOf('upper_arm_L'), worlds) : keys?.box.max.y;
  if (landmark === undefined) {
    throw new Error('The file has no keys `piano_key_*` for the landmark of the settings.');
  }
  const scaleFrom = settings
    ? `ANIMALS: the ${used.landmark} at ${used.height} m`
    : 'assumed: the shoulders at 1 m, because the animal is not in ANIMALS';

  // The joints, by what the export does with them.
  const all = skin.joints.map((j) => gltf.nodes[j]?.name ?? '');
  const body = STUDIO_BONES.filter((b) => !b.startsWith('eye_'));
  const digits = {
    L: all.filter((name) => DIGIT.exec(name)?.[1] === 'L'),
    R: all.filter((name) => DIGIT.exec(name)?.[1] === 'R'),
  };
  const joints: InspectedJoints = {
    all,
    digits,
    dropped: all.filter((name) => DROPPED_BONES.has(name)),
    // The digits of a paw give the `fingers` bone of its side.
    missing: body.filter((bone) => !all.some((name) => ownBone(name) === bone)),
    unknown: all.filter(
      (name) => !DROPPED_BONES.has(name) && !DIGIT.test(name) && !body.some((b) => b === name),
    ),
  };

  // The nodes, from the roots down. The tree of a root joint is one node.
  const jointSet = new Set(skin.joints);
  const children = new Set(gltf.nodes.flatMap((n) => n.children ?? []));
  const nodes: InspectedNode[] = [];
  const subtree = (i: number): number[] => [
    i,
    ...(gltf.nodes[i]?.children ?? []).flatMap((c) => subtree(c)),
  ];
  const walk = (i: number, depth: number): void => {
    const node = gltf.nodes[i] ?? {};
    const faces = new Map<string, number>();
    const mesh = node.mesh === undefined ? undefined : gltf.meshes[node.mesh];
    for (const primitive of mesh?.primitives ?? []) {
      const material = gltf.materials?.[primitive.material ?? -1]?.name ?? '';
      const count = (gltf.accessors[primitive.indices]?.count ?? 0) / 3;
      faces.set(material, (faces.get(material) ?? 0) + count);
    }
    const kind =
      node.skin !== undefined ? 'skinned mesh' : mesh ? 'prop' : jointSet.has(i) ? 'joint' : 'node';
    if (kind === 'joint') {
      const tree = subtree(i);
      const inside = tree.filter((t) => !jointSet.has(t)).map((t) => gltf.nodes[t]?.name ?? '');
      const count = tree.length - inside.length;
      nodes.push({ name: node.name ?? '', depth, kind, faces, joints: count, inside });
      return;
    }
    nodes.push({ name: node.name ?? '', depth, kind, faces, joints: 0, inside: [] });
    for (const child of node.children ?? []) {
      walk(child, depth + 1);
    }
  };
  for (const i of gltf.nodes.keys()) {
    if (!children.has(i)) {
      walk(i, 0);
    }
  }

  // The skinned mesh: its morph targets and the lowest point of the faces that the export keeps.
  const skinned = gltf.nodes.find((n) => n.skin !== undefined && n.mesh !== undefined);
  const animal = skinned?.mesh === undefined ? undefined : gltf.meshes[skinned.mesh];
  const targets = (animal?.extras?.targetNames ?? []).map((name) => ({
    name,
    kept: CORRECTIVE_NAMES.some((own) => own === name),
  }));
  const lowest = new Vector3(0, Infinity, 0);
  for (const primitive of animal?.primitives ?? []) {
    if (!FINISHES.has(gltf.materials?.[primitive.material ?? -1]?.name ?? '')) {
      continue;
    }
    const positions = readAccessor(glb, primitive.attributes['POSITION'] ?? -1);
    for (let v = 0; v < positions.length; v += 3) {
      if ((positions[v + 1] ?? 0) < lowest.y) {
        lowest.fromArray(positions, v);
      }
    }
  }

  // The clips: the time of the last key, and the hips at the first key.
  const hips = nodeOf('hips');
  const clips = (gltf.animations ?? []).map((animation): InspectedClip => {
    let seconds = 0;
    for (const sampler of animation.samplers) {
      const times = readAccessor(glb, sampler.input);
      seconds = Math.max(seconds, times.at(-1) ?? 0);
    }
    const posed = worldMatrices(gltf, firstKeys(glb, animation.name ?? '').nodes);
    return {
      name: animation.name ?? '',
      seconds,
      channels: animation.channels.length,
      hips: heightOf(hips, posed),
    };
  });

  return {
    scale: used.height / landmark,
    scaleFrom,
    nodes,
    joints,
    targets,
    clips,
    bindHips: heightOf(hips, worlds),
    seated: settings ? settings.seated : bench !== undefined,
    lowest: lowest.toArray(),
    props: props.map((prop) => ({ name: prop.name, nodes: prop.nodes, box: unitBox(prop.box) })),
    benchTop: bench ? bench.box.max.y : null,
    keys: keys ? { top: keys.box.max.y, front: keys.box.min.z } : null,
  };
}

/**
 * Writes the facts of a GLB file as the lines of the report of `--inspect`. Each length is in the
 * units of the studio, and in meters at the scale of the facts.
 *
 * @param facts The facts.
 * @returns The lines.
 */
export function inspectionLines(facts: StudioInspection): string[] {
  const units = (value: number): string =>
    `${value.toFixed(3)} u (${(value * facts.scale).toFixed(3)} m)`;
  const list = (names: readonly string[]): string => (names.length > 0 ? names.join(' ') : 'none');
  const point = (p: Vec3): string => `[${p.map((v) => v.toFixed(3)).join(', ')}] u`;
  const lines = [
    `Scale: ${facts.scale.toFixed(4)} m for each unit (${facts.scaleFrom}).`,
    'The studio animal faces +z, with its left side at +x.',
    '',
    `Scene nodes (the export keeps the faces of the skinned mesh in ${[...FINISHES.keys()].join(' and ')}):`,
  ];
  for (const node of facts.nodes) {
    const faces = [...node.faces].map(([material, n]) => `${material} ${n}`).join(', ');
    const what =
      node.kind === 'joint'
        ? `root joint of the skin, ${node.joints} joints, other nodes in its tree: ${list(node.inside)}`
        : node.kind === 'node'
          ? 'node'
          : `${node.kind}, faces: ${faces}`;
    lines.push(`  ${'  '.repeat(node.depth)}${node.name}: ${what}`);
  }

  const { joints } = facts;
  lines.push(
    '',
    `Joints of the skin (${joints.all.length}): ${joints.all.join(' ')}`,
    `  Digits of the left paw: ${list(joints.digits.L)}`,
    `  Digits of the right paw: ${list(joints.digits.R)}`,
    `  Dropped by the export: ${list(joints.dropped)}`,
    `  Missing body bones (the export stops): ${list(joints.missing)}`,
    `  Unknown joints (the export stops): ${list(joints.unknown)}`,
    '',
    `Morph targets: ${facts.targets.map((t) => `${t.name} (${t.kept ? 'kept' : 'dropped'})`).join(', ') || 'none'}`,
    '',
    'Clips (the time of the last key, the channels, the hips at the first key):',
    ...facts.clips.map(
      (clip) =>
        `  ${clip.name}: ${clip.seconds.toFixed(3)} s, ${clip.channels} channels, hips ${units(clip.hips)}`,
    ),
    '',
    `Hips in the bind pose: ${units(facts.bindHips)}`,
    `Lowest point of the skin: ${point(facts.lowest)}, height ${units(facts.lowest[1])}`,
    facts.seated
      ? '  Seated: the body drops by this height in the app, so that its soles are on the floor.'
      : '  Standing: no drop.',
    '',
    'Props (the box in units: min, max):',
    ...facts.props.map(
      (prop) =>
        `  ${prop.name} (${prop.nodes} node${prop.nodes === 1 ? '' : 's'}): ${point(prop.box.min)}, ${point(prop.box.max)}`,
    ),
  );
  if (facts.props.length === 0) {
    lines.push('  none');
  }
  if (facts.benchTop !== null) {
    lines.push(`Bench top: ${units(facts.benchTop)}`);
  }
  if (facts.keys) {
    lines.push(
      `Key top: ${units(facts.keys.top)}`,
      `Key front (the edge near the player), z: ${units(facts.keys.front)}`,
    );
  }
  return lines;
}

/**
 * Writes the TypeScript module of a studio body.
 *
 * @param animal The id of the animal in `lowpoly-studio/animals/`.
 * @param constant The name of the constant.
 * @param body The body.
 * @returns The source text.
 */
export function studioModule(animal: string, constant: string, body: StudioBody): string {
  // Each point goes on one line.
  const fields = JSON.stringify(body, null, 2).replaceAll(
    /\[\s*(-?[\d.e-]+),\s*(-?[\d.e-]+),\s*(-?[\d.e-]+)\s*\]/g,
    '[$1, $2, $3]',
  );
  return [
    `import type { StudioBody } from '../studio-format.ts';`,
    '',
    '/**',
    ` * The studio body of the animal \`${animal}\` (design 4.4), from \`${body.source}\`. The`,
    ` * command \`pnpm studio-body ${animal}\` writes this file. Do not change it by hand.`,
    ' */',
    `export const ${constant} = ${fields} satisfies StudioBody;`,
    '',
  ].join('\n');
}

/**
 * Gives the GLB file of an animal of the studio.
 *
 * @param animal The id of the animal in `lowpoly-studio/animals/`.
 * @returns The absolute path of the file.
 */
export function studioGlbPath(animal: string): string {
  return join(ROOT, 'lowpoly-studio', 'animals', animal, 'out', `${animal}.glb`);
}

/**
 * Reads the GLB file of an animal of the studio.
 *
 * @param animal The id of the animal in `lowpoly-studio/animals/`.
 * @returns The file.
 * @throws Error if the studio has not built the animal.
 */
async function readStudioGlb(animal: string): Promise<Buffer> {
  const file = studioGlbPath(animal);
  if (!existsSync(file)) {
    throw new Error(
      `The studio has no GLB file ${relative(ROOT, file)}. Build it with: python3 studio build ${animal}`,
    );
  }
  return readFile(file);
}

/**
 * Writes the module of a studio body from its GLB file: `node tools/studio-body.ts <animal>`
 * (design 4.4). The GLB file is `lowpoly-studio/animals/<animal>/out/<animal>.glb`, the output
 * of `python3 studio build <animal>`. With `--inspect`, it writes no file, and it prints the
 * facts of the GLB file that a new studio body needs. An animal that is not in `ANIMALS` gets
 * an assumed scale.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inspect = args.includes('--inspect');
  const animal = args.find((arg) => !arg.startsWith('--')) ?? '';
  const settings = ANIMALS.get(animal);
  if (inspect && animal) {
    const file = studioGlbPath(animal);
    const bytes = await readStudioGlb(animal);
    console.log(relative(ROOT, file));
    console.log(inspectionLines(inspectStudioGlb(bytes, settings ?? null)).join('\n'));
    return;
  }
  if (!settings) {
    throw new Error(
      `Usage: node tools/studio-body.ts <animal> [--inspect], with an animal of: ${[...ANIMALS.keys()].join(', ')}. --inspect also takes another animal of the studio.`,
    );
  }

  const file = studioGlbPath(animal);
  const source = relative(ROOT, file);
  const { body, sheetWeights } = studioBody(await readStudioGlb(animal), source, settings);
  await mkdir(STUDIO_DIR, { recursive: true });
  const out = join(STUDIO_DIR, `${animal}.ts`);
  await writeFile(out, studioModule(animal, settings.constant, body));
  // The formatter of the repository gives the module its final form (design 9.5).
  const format = spawnSync(join(ROOT, 'node_modules', '.bin', 'oxfmt'), [out], {
    stdio: 'inherit',
  });
  if (format.status !== 0) {
    throw new Error(`oxfmt failed with the status ${String(format.status)}.`);
  }
  console.log(`Wrote ${relative(ROOT, out)} from ${source} (sha256 ${body.sha256.slice(0, 12)}).`);
  console.log(`Scale ${body.scale} m for each unit, head height ${body.headHeight} m.`);
  console.log(`Corrective weights of the sheet pose: ${sheetWeights.join(', ')}.`);
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
