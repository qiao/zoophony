import { Bone, BufferAttribute, Mesh, Skeleton, SkinnedMesh, Vector3 } from 'three';
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
import type { AnimalPose, ScenePose } from '../pose/types.ts';
import { createGeometry } from './geometry.ts';

/**
 * Creates the geometry of a player model, with the skin attributes. Each vertex follows one bone
 * with the weight 1, so each part stays rigid (design 4.4). All players of one model share it.
 *
 * @param model The player model of `models/`.
 * @returns The geometry.
 */
export function createPlayerGeometry(model: PlayerModel): BufferGeometry {
  const geometry = createGeometry(model.mesh);
  const vertexCount = model.mesh.bones.length;
  const skinIndex = new Uint16Array(vertexCount * 4);
  const skinWeight = new Float32Array(vertexCount * 4);
  for (let v = 0; v < vertexCount; v++) {
    skinIndex[v * 4] = model.mesh.bones[v] ?? 0;
    skinWeight[v * 4] = 1;
  }
  geometry.setAttribute('skinIndex', new BufferAttribute(skinIndex, 4));
  geometry.setAttribute('skinWeight', new BufferAttribute(skinWeight, 4));
  return geometry;
}

/** The index of the `slide` bone of the trombone (design 4.7). */
const SLIDE = boneIndex('slide');

/** The indices of the eye bones, which scale on y for a blink (design 4.7, 5.1). */
const EYES = [boneIndex('eyeL'), boneIndex('eyeR')] as const;

/**
 * The smallest y scale of a closed eye. A scale of 0 makes the bone matrix singular, so a closed
 * eye keeps a thin line.
 */
export const CLOSED_EYE_SCALE = 0.05;

/** The bind position of the `slide` bone of each player mesh, in the axes of its parent. */
const slideBinds = new WeakMap<SkinnedMesh, Vector3>();

/**
 * Creates the skinned mesh of one player (design 4.4). Each player has its own bones, so that
 * each player gets its own pose.
 *
 * @param model The player model of `models/`.
 * @param geometry The geometry of the model, from {@link createPlayerGeometry}.
 * @param materials The matte and the metal material.
 * @returns The mesh, with its bones in the order of `BONE_NAMES`.
 */
export function createPlayerMesh(
  model: PlayerModel,
  geometry: BufferGeometry,
  materials: readonly MeshStandardMaterial[],
): SkinnedMesh {
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
  mesh.bind(new Skeleton(bones));
  const slide = bones[SLIDE];
  if (slide) {
    slideBinds.set(mesh, slide.position.clone());
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // The bounding sphere of the bind pose does not follow the pose.
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * Copies a pose to the bones of a player mesh: the rotations, the offset of the root, the move of
 * the trombone slide along its axis, and the blink of the eyes (design 5.1).
 *
 * @param mesh A mesh of {@link createPlayerMesh}.
 * @param pose The pose, with one rotation for each bone.
 */
export function applyPose(mesh: SkinnedMesh, pose: AnimalPose): void {
  for (const [i, bone] of mesh.skeleton.bones.entries()) {
    bone.quaternion.fromArray(pose.rotations, i * 4);
  }
  const root = mesh.skeleton.bones[0];
  if (root) {
    root.position.fromArray(pose.rootOffset);
  }
  const slide = mesh.skeleton.bones[SLIDE];
  const bind = slideBinds.get(mesh);
  if (slide && bind) {
    slide.position.fromArray(pose.slideOffset).add(bind);
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
 * and kettle count) share one model and one geometry, and all players share the two materials.
 * `poseAt()` gives their poses from the first frame (design 5.1).
 *
 * @param spots The players and their places.
 * @param materials The matte and the metal material.
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
 * @param materials The matte and the metal material.
 * @returns The mesh. It casts and receives shadows.
 */
export function createStaticMesh(data: MeshData, materials: readonly MeshStandardMaterial[]): Mesh {
  const mesh = new Mesh(createGeometry(data), [...materials]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
