import { Bone, BufferAttribute, Group, Mesh, Skeleton, SkinnedMesh } from 'three';
import type { BufferGeometry, MeshStandardMaterial } from 'three';

import type { Vec3 } from '../models/math.ts';
import type { MeshData } from '../models/mesh.ts';
import { buildPlayer } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import type { SpeciesId } from '../models/species.ts';
import type { KettleCount } from '../models/instruments/percussion.ts';
import type { InstrumentId } from '../models/instruments/types.ts';
import type { AnimalPose } from '../pose/types.ts';
import { violinPlayingPose } from '../pose/violin-pose.ts';
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
  const bones = positions.map(() => new Bone());
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
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // The bounding sphere of the bind pose does not follow the pose.
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * Copies a pose to the bones of a player mesh.
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
}

/** One player to show: the species, the instrument, and the place on the stage. */
export interface PlayerSpot {
  readonly species: SpeciesId;
  readonly instrument: InstrumentId;
  readonly kettles: KettleCount;
  readonly position: Vec3;
  /** Radians around y. 0 faces -z (the back). */
  readonly facing: number;
}

/** The model of one kind of player, with its shared geometry and its static pose. */
interface PlayerKind {
  readonly model: PlayerModel;
  readonly geometry: BufferGeometry;
  /** The violin playing pose of step 3, or `null` for the bind pose. */
  readonly pose: AnimalPose | null;
}

/**
 * Gives the static pose of a player model before step 5. The violin and the viola show the
 * violin playing pose of step 3. The other players show the bind pose, because `poseAt()` of
 * step 5 gives their motion.
 *
 * @param model The player model.
 * @returns The pose, or `null` for the bind pose.
 */
export function staticPose(model: PlayerModel): AnimalPose | null {
  const id = model.instrument.id;
  return id === 'violin' || id === 'viola' ? violinPlayingPose(model) : null;
}

/**
 * Creates the players of a scene in their static poses. The players of one kind (species,
 * instrument, and kettle count) share one geometry, and all players share the two materials.
 *
 * @param spots The players and their places.
 * @param materials The matte and the metal material.
 * @returns A group with one skinned mesh for each player.
 */
export function createPlayers(
  spots: readonly PlayerSpot[],
  materials: readonly MeshStandardMaterial[],
): Group {
  const kinds = new Map<string, PlayerKind>();
  const group = new Group();
  for (const spot of spots) {
    const key = `${spot.species} ${spot.instrument} ${spot.kettles}`;
    let kind = kinds.get(key);
    if (!kind) {
      const model = buildPlayer(spot.species, spot.instrument, spot.kettles);
      kind = { model, geometry: createPlayerGeometry(model), pose: staticPose(model) };
      kinds.set(key, kind);
    }
    const mesh = createPlayerMesh(kind.model, kind.geometry, materials);
    if (kind.pose) {
      applyPose(mesh, kind.pose);
    }
    mesh.position.set(...spot.position);
    mesh.rotation.y = spot.facing;
    group.add(mesh);
  }
  return group;
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
