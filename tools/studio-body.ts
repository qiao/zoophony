import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { Matrix4, Quaternion, Vector3 } from 'three';

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
interface AnimalSettings {
  /**
   * The height of the shoulder joints above the soles, in meters. It sets the scale of the
   * animal. The bear conductor keeps the shoulder joints of the parametric bear of 2026-10-11,
   * 1.0 m above the floor, because the conductor stand and the places of the hands fit them
   * (design 4.5, 5.4).
   */
  readonly shoulderHeight: number;
  /** The name of the constant of the module. */
  readonly constant: string;
}

/** The animals of the studio that the app shows, by their ids in `lowpoly-studio/animals/`. */
const ANIMALS: ReadonlyMap<string, AnimalSettings> = new Map([
  ['bear', { shoulderHeight: 1.0, constant: 'STUDIO_BEAR' }],
]);

/** The finish of each material of the studio (design 4.5, materials). */
const FINISHES: ReadonlyMap<string, Finish> = new Map([
  ['fur', 'matte'],
  ['gloss', 'lacquer'],
]);

/** The bones of the studio that the app drops: the hand props. The app has its own baton. */
const DROPPED_BONES: ReadonlySet<string> = new Set(['baton']);

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

  const jointNames = skin.joints.map((j) => glb.json.nodes[j]?.name ?? '');
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
      const skinOf = [0, 1, 2, 3]
        .map((k) => [jointNames[joints[v * 4 + k] ?? 0] ?? '', weights[v * 4 + k] ?? 0] as const)
        .filter(([, w]) => w > 0);
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
  const body = STUDIO_BONES.filter((b) => !b.startsWith('eye_'));
  const missing = body.filter((b) => !binds.has(b));
  const extra = [...binds.keys()].filter(
    (b) => !DROPPED_BONES.has(b) && !body.some((own) => own === b),
  );
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(`The joints lack ${missing.join(', ')} and add ${extra.join(', ')}.`);
  }
  return { binds, nodes };
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
  const scale = settings.shoulderHeight / headOf(skeleton, 'upper_arm_L').y;
  const model = (p: Vector3): Vec3 => toModelAxes(p, scale);
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
      mesh: packStudioMesh(vertices, ordered.faces, correctives),
    },
    sheetWeights: sheet.weights,
  };
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
    `export const ${constant}: StudioBody = ${fields};`,
    '',
  ].join('\n');
}

/**
 * Writes the module of a studio body from its GLB file: `node tools/studio-body.ts <animal>`
 * (design 4.4). The GLB file is `lowpoly-studio/animals/<animal>/out/<animal>.glb`, the output
 * of `python3 studio build <animal>`.
 */
async function main(): Promise<void> {
  const animal = process.argv[2] ?? '';
  const settings = ANIMALS.get(animal);
  if (!settings) {
    throw new Error(
      `Usage: node tools/studio-body.ts <animal>, with an animal of: ${[...ANIMALS.keys()].join(', ')}.`,
    );
  }

  const file = join(ROOT, 'lowpoly-studio', 'animals', animal, 'out', `${animal}.glb`);
  const source = relative(ROOT, file);
  const { body, sheetWeights } = studioBody(await readFile(file), source, settings);
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
  await main();
}
