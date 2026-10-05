import { Bone, BufferAttribute, Group, Mesh, Skeleton, SkinnedMesh } from 'three';
import type { MeshStandardMaterial } from 'three';

import type { PlayerPlace, StandPlace } from '../models/layout.ts';
import type { PlayerModel } from '../models/player.ts';
import { buildChair, buildMusicStand } from '../models/props.ts';
import type { AnimalPose } from '../pose/types.ts';
import { createGeometry } from './geometry.ts';

/**
 * Creates the skinned mesh of one player (design 4.4). Each vertex follows one bone with the
 * weight 1, so each part stays rigid.
 *
 * @param model The player model of `models/`.
 * @param materials The matte and the metal material.
 * @returns The mesh, with its bones in the order of `BONE_NAMES`.
 */
export function createPlayerMesh(
  model: PlayerModel,
  materials: readonly MeshStandardMaterial[],
): SkinnedMesh {
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

/**
 * Places an object at a place of the layout.
 *
 * @param object The object.
 * @param place The position and the facing.
 */
function place(object: Group | Mesh, at: PlayerPlace | StandPlace): void {
  object.position.set(...at.position);
  object.rotation.y = at.facing;
}

/**
 * Creates one seated player on its chair, at its place in the layout.
 *
 * @param mesh The player mesh.
 * @param at The place of the player.
 * @param materials The matte and the metal material.
 * @returns A group with the player and the chair.
 */
export function createSeatedPlayer(
  mesh: SkinnedMesh,
  at: PlayerPlace,
  materials: readonly MeshStandardMaterial[],
): Group {
  const chair = new Mesh(createGeometry(buildChair()), [...materials]);
  chair.castShadow = true;
  chair.receiveShadow = true;
  const group = new Group();
  group.add(mesh, chair);
  place(group, at);
  return group;
}

/**
 * Creates a music stand at its place in the layout.
 *
 * @param at The place of the stand.
 * @param materials The matte and the metal material.
 * @returns The stand mesh.
 */
export function createMusicStand(at: StandPlace, materials: readonly MeshStandardMaterial[]): Mesh {
  const stand = new Mesh(createGeometry(buildMusicStand()), [...materials]);
  stand.castShadow = true;
  stand.receiveShadow = true;
  place(stand, at);
  return stand;
}
