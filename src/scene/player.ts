import { Bone, BufferAttribute, Matrix4, Mesh, Skeleton, SkinnedMesh, Vector3 } from 'three';
import type { BufferGeometry, MeshStandardMaterial } from 'three';

import type { Vec3 } from '../models/tuples.ts';
import type { MeshData } from '../models/mesh.ts';
import type { ModelCache } from '../models/model-cache.ts';
import type { PlayerModel } from '../models/player.ts';
import type { Support } from '../models/props.ts';
import type { SpeciesId } from '../models/species.ts';
import type { KettleCount } from '../models/instruments/percussion.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { STUDIO_BONES } from '../models/studio-format.ts';
import { studioRenderMesh } from '../models/studio-body.ts';
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
 * Creates the geometry of a player model, with the skin attributes and the baked occlusion of
 * design 4.5. Each vertex follows its main bone and its second bone, with the weights of the
 * mesh data (design 4.4, 4.7). A rigid vertex gives its second bone the weight 0. All players of
 * one model share the geometry.
 *
 * @param model The player model of `models/`.
 * @returns The geometry.
 */
export function createPlayerGeometry(model: PlayerModel): BufferGeometry {
  if (model.studio) {
    return createStudioGeometry(model, model.studio);
  }
  const geometry = createGeometry(model.mesh, model.skeleton.parents);

  const { bones, blendBones, blendWeights } = model.mesh;
  const vertexCount = bones.length;
  const skinIndex = new Uint16Array(vertexCount * 4);
  const skinWeight = new Float32Array(vertexCount * 4);
  for (let v = 0; v < vertexCount; v++) {
    const blendWeight = blendWeights[v] ?? 0;
    skinIndex[v * 4] = bones[v] ?? 0;
    skinIndex[v * 4 + 1] = blendBones[v] ?? 0;
    skinWeight[v * 4] = 1 - blendWeight;
    skinWeight[v * 4 + 1] = blendWeight;
  }

  geometry.setAttribute('skinIndex', new BufferAttribute(skinIndex, 4));
  geometry.setAttribute('skinWeight', new BufferAttribute(skinWeight, 4));
  return geometry;
}

/**
 * Creates the geometry of a player with a studio body (design 4.4): the body in the bind pose of
 * the studio, with four bones for each vertex and the corrective shapes of the arms as morph
 * targets, and the instrument on the bones of the player. The colors of the studio hold its
 * baked occlusion, so the geometry adds none. The body gets its smooth normals, with their changes
 * for the corrective shapes as morph normals (design 4.5). The instrument keeps the crease normals
 * of its finishes.
 *
 * @param model The player model.
 * @param rig The rig of its studio body.
 * @returns The geometry. Its skin indices point at the bones of {@link createPlayerMesh}.
 */
function createStudioGeometry(model: PlayerModel, rig: StudioRig): BufferGeometry {
  const render = studioRenderMesh(rig, model.mesh);
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
export class FrameSkeleton extends Skeleton {
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

/** The player meshes with a studio body. */
const studioPlayers = new WeakMap<SkinnedMesh, StudioPlayer>();

/** The index of the `slide` bone of the trombone (design 4.7). */
const SLIDE = boneIndex('slide');

/** The index of the `instrument` bone (design 4.7). */
const INSTRUMENT = boneIndex('instrument');

/** The offset of a bone that does not move. */
const NO_MOVE = [0, 0, 0] as const;

/** The indices of the eye bones, which scale on y for a blink (design 4.7, 5.1). */
const EYES = [boneIndex('eyeL'), boneIndex('eyeR')] as const;

/**
 * The smallest y scale of a closed eye. A scale of 0 makes the bone matrix singular, so a closed
 * eye keeps a thin line.
 */
export const CLOSED_EYE_SCALE = 0.05;

/**
 * The bind positions of the `slide` and the `instrument` bones of each player mesh, in the axes
 * of their parents.
 */
const offsetBinds = new WeakMap<SkinnedMesh, { slide: Vector3; instrument: Vector3 }>();

/**
 * Creates the skinned mesh of one player (design 4.4). Each player has its own bones, so that
 * each player gets its own pose.
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
  if (model.studio) {
    return createStudioMesh(model, model.studio, geometry, materials);
  }
  const { positions, parents } = model.skeleton;
  const bones = positions.map(() => {
    const bone = new Bone();
    // A write of the quaternion also sets the Euler angles of `bone.rotation` in three.js, which
    // took 0.46 ms of each frame with perf-60.mid (research/step-5-frame.md, section 5). No code
    // reads `bone.rotation`, so the quaternion keeps no change callback.
    // oxlint-disable-next-line no-underscore-dangle -- three.js gives this method an underscore.
    bone.quaternion._onChange(() => undefined);
    return bone;
  });
  for (const [i, bone] of bones.entries()) {
    const parent = parents[i] ?? -1;
    const position = positions[i] ?? [0, 0, 0];
    const parentBone = bones[parent];
    const origin = parentBone ? (positions[parent] ?? [0, 0, 0]) : [0, 0, 0];
    bone.position.set(
      position[0] - (origin[0] ?? 0),
      position[1] - (origin[1] ?? 0),
      position[2] - (origin[2] ?? 0),
    );
    parentBone?.add(bone);
  }

  const mesh = new SkinnedMesh(geometry, [...materials]);
  const root = bones[0];
  if (root) {
    mesh.add(root);
  }
  mesh.updateMatrixWorld(true);
  mesh.bind(new FrameSkeleton(bones));
  const slide = bones[SLIDE];
  const instrument = bones[INSTRUMENT];
  if (slide && instrument) {
    offsetBinds.set(mesh, {
      slide: slide.position.clone(),
      instrument: instrument.position.clone(),
    });
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // The bounding sphere of the bind pose does not follow the pose. The stage fits a sphere to the
  // pose of each frame and turns the culling on (`fitPoseSphere()` of `scene/bounds.ts`).
  mesh.frustumCulled = false;
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
  const bones = Array.from({ length: STUDIO_POSE_BONES }, () => {
    const bone = new Bone();
    bone.matrixAutoUpdate = false;
    mesh.add(bone);
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
 * @param mesh A mesh of {@link createStudioMesh}.
 * @param pose The pose of the player.
 * @returns False if the mesh has no studio body.
 */
function applyStudioPose(mesh: SkinnedMesh, pose: AnimalPose): boolean {
  const player = studioPlayers.get(mesh);
  if (!player) {
    return false;
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
  for (const [i, bone] of mesh.skeleton.bones.entries()) {
    bone.matrix.fromArray(matrices, i * 16);
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
  return true;
}

/**
 * Hides the parts of one bone of a player mesh: the bone scales to 0, for example the baton of a
 * silhouette. The next pose shows the parts again.
 *
 * @param mesh A mesh of {@link createPlayerMesh}.
 * @param name The bone of the player.
 */
export function hideBone(mesh: SkinnedMesh, name: BoneName): void {
  const studio = studioPlayers.has(mesh);
  const bone = mesh.skeleton.bones[(studio ? STUDIO_BONES.length : 0) + boneIndex(name)];
  if (!bone) {
    return;
  }
  if (studio) {
    bone.matrix.multiply(new Matrix4().makeScale(0, 0, 0));
    bone.matrixWorldNeedsUpdate = true;
  } else {
    bone.scale.setScalar(0);
  }
}

/**
 * Copies a pose to the bones of a player mesh: the rotations, the offset of the root, the move of
 * the trombone slide along its axis, the move of the instrument, and the blink of the eyes
 * (design 5.1). A mesh with a studio body gets the bones of the studio from the pose
 * ({@link applyStudioPose}).
 *
 * @param mesh A mesh of {@link createPlayerMesh}.
 * @param pose The pose, with one rotation for each bone.
 */
export function applyPose(mesh: SkinnedMesh, pose: AnimalPose): void {
  if (applyStudioPose(mesh, pose)) {
    return;
  }
  for (const [i, bone] of mesh.skeleton.bones.entries()) {
    bone.quaternion.fromArray(pose.rotations, i * 4);
  }
  const root = mesh.skeleton.bones[0];
  if (root) {
    root.position.fromArray(pose.rootOffset);
  }
  const slide = mesh.skeleton.bones[SLIDE];
  const instrument = mesh.skeleton.bones[INSTRUMENT];
  const binds = offsetBinds.get(mesh);
  if (slide && instrument && binds) {
    slide.position.fromArray(pose.slideOffset).add(binds.slide);
    instrument.position.fromArray(pose.instrumentOffset ?? NO_MOVE).add(binds.instrument);
  }
  const eyeScale = Math.max(CLOSED_EYE_SCALE, 1 - pose.blink);
  for (const eye of EYES) {
    mesh.skeleton.bones[eye]?.scale.setY(eyeScale);
  }
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
  const geometries = new Map<PlayerModel, BufferGeometry>();
  const meshes: SkinnedMesh[] = [];
  for (const spot of spots) {
    const model = models.get(spot.species, spot.instrument, spot.kettles, spot.support);
    let geometry = geometries.get(model);
    if (!geometry) {
      geometry = createPlayerGeometry(model);
      geometries.set(model, geometry);
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
