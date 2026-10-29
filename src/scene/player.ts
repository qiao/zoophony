import {
  Bone,
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Group,
  Matrix4,
  Mesh,
  Skeleton,
  SkinnedMesh,
} from 'three';
import type { MeshStandardMaterial } from 'three';

import type { Vec3 } from '../models/tuples.ts';
import type { MeshData } from '../models/mesh.ts';
import type { PianoKeys } from '../models/instruments/hold.ts';
import type { ModelCache } from '../models/model-cache.ts';
import type { PlayerModel } from '../models/player.ts';
import type { Support } from '../models/props.ts';
import type { SpeciesId } from '../models/species.ts';
import type { KettleCount } from '../models/instruments/percussion.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { STUDIO_BONES } from '../models/studio-format.ts';
import { studioRenderMeshSteps } from '../models/studio-body.ts';
import { runAll } from '../score/steps.ts';
import type { Steps } from '../score/steps.ts';
import {
  STUDIO_POSE_BONES,
  createStudioPose,
  poseStudioBones,
  studioOffsets,
} from '../models/studio-rig.ts';
import type { StudioPose, StudioRig } from '../models/studio-rig.ts';
import type { Skeleton as PlayerSkeleton } from '../models/rig.ts';
import type { AnimalPose, ScenePose } from '../pose/types.ts';
import { createGeometry } from './geometry.ts';

/**
 * Creates the geometry of a player model with a studio body (design 4.4): the body in the bind
 * pose of the studio, with four bones for each vertex and the corrective shapes of the arms as morph
 * targets, and the instrument on the bones of the player. The colors of the studio hold its
 * baked occlusion, so the geometry adds none. The body gets its smooth normals, with their changes
 * for the corrective shapes as morph normals (design 4.5). The instrument keeps the crease normals
 * of its finishes. All players of one model share the geometry.
 *
 * @param model The player model of `models/`.
 * @returns The geometry. Its skin indices point at the bones of {@link createPlayerMesh}.
 */
export function createPlayerGeometry(model: PlayerModel): BufferGeometry {
  return runAll(createPlayerGeometrySteps(model));
}

/**
 * Creates the geometry of a player model as {@link createPlayerGeometry} does, in steps (design
 * 7.2).
 *
 * @param model The player model of `models/`.
 * @returns The steps, which return the geometry.
 */
function* createPlayerGeometrySteps(model: PlayerModel): Steps<BufferGeometry> {
  const render = yield* studioRenderMeshSteps(model.studio, model.mesh);
  yield;
  const geometry = createGeometry(render.data);
  geometry.setAttribute('skinIndex', new BufferAttribute(render.joints, 4));
  geometry.setAttribute('skinWeight', new BufferAttribute(render.weights, 4));
  geometry.morphAttributes['position'] = render.correctives.map(
    (move) => new BufferAttribute(move, 3),
  );
  const normals = geometry.getAttribute('normal');
  if (normals.array instanceof Float32Array) {
    normals.array.set(render.normals.corners);
  }
  geometry.morphAttributes['normal'] = render.normals.moves.map(
    (move) => new BufferAttribute(move, 3),
  );
  // The moves add to the bind places, as in a glTF file.
  geometry.morphTargetsRelative = true;
  return geometry;
}

/** The parts of a player mesh with a studio body that a pose needs. */
interface StudioPlayer {
  readonly rig: StudioRig;
  /** The skeleton of the player, which `poseAt()` poses. */
  readonly skeleton: PlayerSkeleton;
  /** The bones of the pose, written on each frame. */
  readonly pose: StudioPose;
}

/**
 * A skeleton that the stage poses one time in each frame (design 4.5). three.js calls `update()` in
 * each render that draws a skinned mesh. A frame of the stage has three such renders: the depth
 * pass of the beam, its shadow pass, and the depth pass of the depth of field. The bones do not
 * move between them, so each later call computed the same bone matrices again, and the call of the
 * depth of field uploaded each bone texture a second time. Out of a hold, the skeleton updates as
 * a skeleton of three.js, for example in the gallery.
 */
class FrameSkeleton extends Skeleton {
  /** True between {@link FrameSkeleton.hold} and {@link FrameSkeleton.release}. */
  #held = false;

  /**
   * Computes the bone matrices from the world matrices of the bones, and keeps them until
   * {@link FrameSkeleton.release}.
   */
  hold(): void {
    this.#held = false;
    this.update();
    this.#held = true;
  }

  /** Ends the hold: the next call of `update()` computes the bone matrices again. */
  release(): void {
    this.#held = false;
  }

  /** Computes the bone matrices, except during a hold. */
  override update(): void {
    if (!this.#held) {
      super.update();
    }
  }
}

/**
 * Computes the bone matrices of the players of a frame one time, and keeps them for each render of
 * the frame ({@link FrameSkeleton}). The world matrices of the bones must be ready.
 *
 * @param meshes The player meshes of {@link createPlayers}.
 */
export function holdSkeletons(meshes: readonly SkinnedMesh[]): void {
  for (const mesh of meshes) {
    if (mesh.skeleton instanceof FrameSkeleton) {
      mesh.skeleton.hold();
    }
  }
}

/**
 * Ends the hold of {@link holdSkeletons} after the renders of a frame.
 *
 * @param meshes The player meshes of {@link createPlayers}.
 */
export function releaseSkeletons(meshes: readonly SkinnedMesh[]): void {
  for (const mesh of meshes) {
    if (mesh.skeleton instanceof FrameSkeleton) {
      mesh.skeleton.release();
    }
  }
}

/**
 * Creates the hidden group that holds the bones of a player mesh. three.js visits each child of a
 * visible object in each render and in each shadow map, and stops at a hidden object. A bone draws
 * nothing, so the group hides the bones: a player with a studio body has 74 bones, and the 55
 * players of `perf-60.mid` gave about 4,000 visits in each pass. The group stays at the origin of
 * the mesh, and a product with the identity matrix is exact, so the world matrices of the bones do
 * not change.
 *
 * @returns The group.
 */
function createBoneGroup(): Group {
  const group = new Group();
  group.visible = false;
  group.matrixAutoUpdate = false;
  return group;
}

/** The player meshes with a studio body. */
const studioPlayers = new WeakMap<SkinnedMesh, StudioPlayer>();

/**
 * The smallest y scale of a closed eye. A scale of 0 makes the bone matrix singular, so a closed
 * eye keeps a thin line.
 */
export const CLOSED_EYE_SCALE = 0.05;

/** The keys of a player mesh with a keyboard, which {@link applyPose} turns (design 4.6, 5.3). */
interface KeyMesh {
  readonly keys: PianoKeys;
  /** The geometry that the players of the model share. Its positions are the bind places. */
  readonly shared: BufferGeometry;
  /** The bind places of the corners: the positions of {@link KeyMesh.shared}. */
  readonly bind: Float32Array;
  /** The positions of the mesh, with the turns of its keys. */
  readonly position: BufferAttribute;
  /** The level of each key in {@link KeyMesh.position}. */
  readonly levels: Float32Array;
}

/** The player meshes with a keyboard. */
const keyMeshes = new WeakMap<SkinnedMesh, KeyMesh>();

/**
 * Creates the geometry of one player with a keyboard: a position attribute of its own, because
 * two players of one model play different notes, and each other attribute and the morph
 * attributes of the shared geometry (design 4.6). The attribute names stay the same, so the mesh
 * keeps the program variant of the shared geometry, and it adds no draw call.
 *
 * @param shared The geometry that the players of the model share.
 * @returns The geometry of the player.
 * @throws Error if the shared geometry has no positions of 32-bit floats.
 */
function keyGeometry(shared: BufferGeometry): BufferGeometry {
  const geometry = new BufferGeometry();
  for (const [name, attribute] of Object.entries(shared.attributes)) {
    if (name !== 'position') {
      geometry.setAttribute(name, attribute);
    }
  }
  const bind = shared.getAttribute('position');
  if (!(bind instanceof BufferAttribute) || !(bind.array instanceof Float32Array)) {
    throw new Error('The geometry of a player has no positions of 32-bit floats.');
  }
  const position = new BufferAttribute(new Float32Array(bind.array), 3);
  position.setUsage(DynamicDrawUsage);
  geometry.setAttribute('position', position);
  geometry.morphAttributes = { ...shared.morphAttributes };
  geometry.morphTargetsRelative = shared.morphTargetsRelative;
  for (const group of shared.groups) {
    geometry.addGroup(group.start, group.count, group.materialIndex);
  }
  return geometry;
}

/**
 * Gives the geometry that the players of the model of a mesh share. A player with a keyboard has
 * a geometry of its own ({@link keyGeometry}), with the same bind places.
 *
 * @param mesh A mesh of {@link createPlayerMesh}.
 * @returns The shared geometry.
 */
export function sharedGeometryOf(mesh: SkinnedMesh): BufferGeometry {
  return keyMeshes.get(mesh)?.shared ?? mesh.geometry;
}

/**
 * Creates the skinned mesh of one player (design 4.4). Each player has its own bones, so that
 * each player gets its own pose. A player with a keyboard also gets its own positions, so that
 * its keys go down with its notes ({@link keyGeometry}).
 *
 * @param model The player model of `models/`.
 * @param geometry The geometry of the model, from {@link createPlayerGeometry}.
 * @param materials The shared material.
 * @returns The mesh, with its bones in the order of `BONE_NAMES`.
 */
export function createPlayerMesh(
  model: PlayerModel,
  geometry: BufferGeometry,
  materials: readonly MeshStandardMaterial[],
): SkinnedMesh {
  const own = model.keys ? keyGeometry(geometry) : geometry;
  const mesh = createStudioMesh(model, model.studio, own, materials);
  const position = own.getAttribute('position');
  const bind = geometry.getAttribute('position').array;
  if (model.keys && position instanceof BufferAttribute && bind instanceof Float32Array) {
    keyMeshes.set(mesh, {
      keys: model.keys,
      shared: geometry,
      bind,
      position,
      levels: new Float32Array(model.keys.corners.length - 1),
    });
  }
  return mesh;
}

/**
 * Creates the skinned mesh of a player with a studio body (design 4.4). Each bone of the studio and
 * of the player is a child of the mesh, with no parent bone: {@link applyPose} writes the matrix
 * of each bone from the pose of the player (`poseStudioBones()`).
 *
 * @param model The player model.
 * @param rig The rig of its studio body.
 * @param geometry The geometry of the model, from {@link createPlayerGeometry}.
 * @param materials The shared material.
 * @returns The mesh in the bind pose of the player.
 */
function createStudioMesh(
  model: PlayerModel,
  rig: StudioRig,
  geometry: BufferGeometry,
  materials: readonly MeshStandardMaterial[],
): SkinnedMesh {
  const mesh = new SkinnedMesh(geometry, [...materials]);
  const group = createBoneGroup();
  mesh.add(group);
  const bones = Array.from({ length: STUDIO_POSE_BONES }, () => {
    const bone = new Bone();
    bone.matrixAutoUpdate = false;
    group.add(bone);
    return bone;
  });
  mesh.updateMatrixWorld(true);
  mesh.bind(
    new FrameSkeleton(
      bones,
      bones.map(() => new Matrix4()),
    ),
  );
  studioPlayers.set(mesh, { rig, skeleton: model.skeleton, pose: createStudioPose() });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  applyStudioPose(mesh, {
    rotations: new Float32Array(model.skeleton.positions.length * 4).map((_, i) =>
      i % 4 === 3 ? 1 : 0,
    ),
    rootOffset: [0, 0, 0],
    slideOffset: [0, 0, 0],
    blink: 0,
  });
  return mesh;
}

/**
 * Copies a pose to the bones of a player mesh with a studio body: the matrix of each bone and the
 * weights of the corrective shapes (design 4.4, 5.1).
 *
 * @param mesh A mesh of {@link createStudioMesh}. Another mesh does not change.
 * @param pose The pose of the player.
 */
function applyStudioPose(mesh: SkinnedMesh, pose: AnimalPose): void {
  const player = studioPlayers.get(mesh);
  if (!player) {
    return;
  }
  const eyeScale = Math.max(CLOSED_EYE_SCALE, 1 - pose.blink);
  const { matrices, correctives } = poseStudioBones(
    player.rig,
    player.skeleton,
    pose.rotations,
    studioOffsets(pose),
    eyeScale,
    player.pose,
  );
  // A copy by index: an iterator of entries with Matrix4.fromArray() took twice the time.
  const bones = mesh.skeleton.bones;
  for (let b = 0; b < bones.length; b++) {
    const bone = bones[b];
    if (!bone) {
      continue;
    }
    const elements = bone.matrix.elements;
    const offset = b * 16;
    for (let k = 0; k < 16; k++) {
      elements[k] = matrices[offset + k] ?? 0;
    }
    bone.matrixWorldNeedsUpdate = true;
  }
  const influences = mesh.morphTargetInfluences;
  if (influences) {
    // A body has two morph targets for the arms down, and one more for each shape of a raised
    // arm or of a bent wrist.
    for (let i = 0; i < influences.length; i++) {
      influences[i] = correctives[i] ?? 0;
    }
  }
}

/**
 * Hides the parts of one bone of a player mesh: the bone scales to 0, for example the baton of a
 * silhouette. The next pose shows the parts again.
 *
 * @param mesh A mesh of {@link createPlayerMesh}.
 * @param name The bone of the player.
 */
export function hideBone(mesh: SkinnedMesh, name: BoneName): void {
  const bone = mesh.skeleton.bones[STUDIO_BONES.length + boneIndex(name)];
  if (!bone) {
    return;
  }
  bone.matrix.multiply(new Matrix4().makeScale(0, 0, 0));
  bone.matrixWorldNeedsUpdate = true;
}

/**
 * Copies a pose to the bones of a player mesh: the bones of the studio body from the pose
 * ({@link applyStudioPose}), and the turns of the keys of a mesh with a keyboard
 * ({@link applyKeys}) (design 5.1).
 *
 * @param mesh A mesh of {@link createPlayerMesh}.
 * @param pose The pose, with one rotation for each bone.
 */
export function applyPose(mesh: SkinnedMesh, pose: AnimalPose): void {
  applyKeys(mesh, pose.keys);
  applyStudioPose(mesh, pose);
}

/**
 * Turns the corners of one key from their bind places around the line of the keys (design 4.6).
 *
 * @param keys The keys of the mesh.
 * @param bind The bind places of the corners.
 * @param out The positions to write.
 * @param key The index of the key.
 * @param angle The turn, in radians. A positive turn moves the front of the key down.
 */
function turnKey(
  keys: PianoKeys,
  bind: Float32Array,
  out: Float32Array,
  key: number,
  angle: number,
): void {
  const [ux, uy, uz] = keys.axis;
  const [px, py, pz] = keys.pivot;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const end = (keys.corners[key + 1] ?? 0) * 3;
  // The rotation formula of Rodrigues, around the unit axis through the pivot.
  for (let i = (keys.corners[key] ?? 0) * 3; i < end; i += 3) {
    const x = (bind[i] ?? 0) - px;
    const y = (bind[i + 1] ?? 0) - py;
    const z = (bind[i + 2] ?? 0) - pz;
    const along = (ux * x + uy * y + uz * z) * (1 - cos);
    out[i] = px + x * cos + (uy * z - uz * y) * sin + ux * along;
    out[i + 1] = py + y * cos + (uz * x - ux * z) * sin + uy * along;
    out[i + 2] = pz + z * cos + (ux * y - uy * x) * sin + uz * along;
  }
}

/**
 * Turns the keys of a player mesh with a keyboard to their press levels (design 4.6, 5.3). Only
 * the keys whose level changed since the last frame move, and only their corners go to the GPU:
 * one range from the first changed key to the last.
 *
 * @param mesh A mesh of {@link createPlayerMesh}. A mesh with no keyboard does not change.
 * @param levels The level of each key, from `AnimalPose.keys`. With none, all keys are up.
 */
function applyKeys(mesh: SkinnedMesh, levels: Float32Array | null | undefined): void {
  const own = keyMeshes.get(mesh);
  if (!own) {
    return;
  }

  const { keys, bind, position, levels: shown } = own;
  const out = position.array;
  if (!(out instanceof Float32Array)) {
    return;
  }
  let from = Infinity;
  let to = -Infinity;
  for (let k = 0; k < shown.length; k++) {
    const level = levels?.[k] ?? 0;
    if (level === shown[k]) {
      continue;
    }
    shown[k] = level;
    turnKey(keys, bind, out, k, level * keys.angle);
    from = Math.min(from, keys.corners[k] ?? 0);
    to = Math.max(to, keys.corners[k + 1] ?? 0);
  }
  if (from >= to) {
    return;
  }

  // A range that the renderer did not upload, for example of a culled mesh, joins the new range.
  const pending = position.updateRanges[0];
  if (pending) {
    from = Math.min(from, pending.start / 3);
    to = Math.max(to, (pending.start + pending.count) / 3);
    position.clearUpdateRanges();
  }
  position.addUpdateRange(from * 3, (to - from) * 3);
  position.needsUpdate = true;
}

/**
 * Copies the poses of a scene to the player meshes (design 5.1).
 *
 * @param meshes The meshes of {@link createPlayers}: one for each player in the order of
 *   `ScenePose.players`, then the conductor.
 * @param pose The poses of the frame, from `poseAt()`.
 */
export function applyScenePose(meshes: readonly SkinnedMesh[], pose: ScenePose): void {
  for (const [i, mesh] of meshes.entries()) {
    const animal = i === pose.players.length ? pose.conductor : pose.players[i];
    if (animal) {
      applyPose(mesh, animal);
    }
  }
}

/** One player to show: the species, the instrument, and the place on the stage. */
export interface PlayerSpot {
  readonly species: SpeciesId;
  readonly instrument: InstrumentId;
  readonly kettles: KettleCount;
  /** The support of the player: a soloist can stand (design 4.5). */
  readonly support: Support;
  readonly position: Vec3;
  /** Radians around y. 0 faces -z (the back). */
  readonly facing: number;
}

/**
 * Creates the players of a scene in the bind pose. The players of one kind (species, instrument,
 * and kettle count) share one model and one geometry, and all players share the material.
 * `poseAt()` gives their poses from the first frame (design 5.1).
 *
 * @param spots The players and their places.
 * @param materials The shared material.
 * @param models The player models of the score, which the layout and the pose plan share.
 * @returns One skinned mesh for each player, in the order of `spots`.
 */
export function createPlayers(
  spots: readonly PlayerSpot[],
  materials: readonly MeshStandardMaterial[],
  models: ModelCache,
): SkinnedMesh[] {
  return runAll(createPlayersSteps(spots, materials, models));
}

/**
 * Creates the players of a scene as {@link createPlayers} does, in steps (design 7.2).
 *
 * @param spots The players and their places.
 * @param materials The shared material.
 * @param models The player models of the score.
 * @returns The steps, which return one skinned mesh for each player, in the order of `spots`.
 */
export function* createPlayersSteps(
  spots: readonly PlayerSpot[],
  materials: readonly MeshStandardMaterial[],
  models: ModelCache,
): Steps<SkinnedMesh[]> {
  const geometries = new Map<PlayerModel, BufferGeometry>();
  const meshes: SkinnedMesh[] = [];
  for (const spot of spots) {
    yield;
    const model = models.get(spot.species, spot.instrument, spot.kettles, spot.support);
    let geometry = geometries.get(model);
    if (!geometry) {
      geometry = yield* createPlayerGeometrySteps(model);
      geometries.set(model, geometry);
      yield;
    }
    const mesh = createPlayerMesh(model, geometry, materials);
    mesh.position.set(...spot.position);
    mesh.rotation.y = spot.facing;
    meshes.push(mesh);
  }
  return meshes;
}

/**
 * Creates a static mesh from mesh data, for example the merged props of a layout.
 *
 * @param data The mesh data of `models/`.
 * @param materials The shared material.
 * @returns The mesh. It casts and receives shadows.
 */
export function createStaticMesh(data: MeshData, materials: readonly MeshStandardMaterial[]): Mesh {
  const mesh = new Mesh(createGeometry(data), [...materials]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
