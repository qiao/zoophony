import { Vector3 } from 'three';

import type { BodyBones } from './biped.ts';
import type { CornerSkin, MeshBuilder, MeshData } from './mesh.ts';
import { BONE_NAMES } from './rig.ts';
import { makeSkeleton } from './rig.ts';
import { STUDIO_BONES, STUDIO_INFLUENCES } from './studio-format.ts';
import type { StudioBody } from './studio-format.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh, studioRig } from './studio-rig.ts';
import type { StudioRig } from './studio-rig.ts';
import { STUDIO_BEAR } from './studio/bear.ts';
import type { Vec3 } from './tuples.ts';

/** The studio bodies that a species can have (design 4.4), by the value of `SpeciesParams.body`. */
export const STUDIO_BODIES = { 'studio-bear': STUDIO_BEAR } as const satisfies Readonly<
  Record<string, StudioBody>
>;

/** The name of a studio body of a species. */
export type StudioBodyName = keyof typeof STUDIO_BODIES;

/** The rig of each studio body, made on its first use. */
const rigs = new Map<StudioBodyName, StudioRig>();

/**
 * Gives the rig of a studio body. The rig of each body is made one time.
 *
 * @param name The studio body.
 * @returns The rig.
 */
export function studioRigOf(name: StudioBodyName): StudioRig {
  let rig = rigs.get(name);
  if (!rig) {
    rig = studioRig(STUDIO_BODIES[name]);
    rigs.set(name, rig);
  }
  return rig;
}

/** The place of the mouth below the tip of the nose, in H. */
const MOUTH_DROP = 0.08;

/**
 * Gives the skin of each vertex of a studio body on the bones of the player: the two bones of the
 * player with the largest sums of the weights of their studio bones (design 4.7). The readers of
 * the bind mesh read the main bone, such as the footprints and the hanging arms.
 *
 * @param rig The studio rig.
 * @returns The skin of each vertex.
 */
function playerSkins(rig: StudioRig): CornerSkin[] {
  const { joints, weights } = rig.mesh;
  const sums = new Map<number, number>();
  return Array.from({ length: rig.mesh.positions.length / 3 }, (_, v) => {
    sums.clear();
    for (let k = 0; k < STUDIO_INFLUENCES; k++) {
      const w = weights[v * STUDIO_INFLUENCES + k] ?? 0;
      if (w > 0) {
        const bone = rig.follows[joints[v * STUDIO_INFLUENCES + k] ?? 0] ?? 0;
        sums.set(bone, (sums.get(bone) ?? 0) + w);
      }
    }
    const [first, second] = [...sums].toSorted((a, b) => b[1] - a[1] || a[0] - b[0]);
    const main = first?.[0] ?? 0;
    if (!second) {
      return { bone: main, blendBone: main, blendWeight: 0 };
    }
    return {
      bone: main,
      blendBone: second[0],
      blendWeight: second[1] / (second[1] + (first?.[1] ?? 1)),
    };
  });
}

/**
 * Builds a studio body in the bind pose of the player, and adds its triangles to a mesh (design
 * 4.4). The arms of the studio come down from their bind pose to hang straight, with the skin and
 * the corrective shapes of the studio, as the GPU poses them. Each corner follows the two bones
 * of the player with the largest weights, for the readers of the bind mesh. The scene draws the
 * body with the skin of the studio (`StudioRig`). A studio body stands on the floor on each
 * support: the cast gives the bear only the stand of the conductor.
 *
 * @param builder The mesh that gets the triangles.
 * @param name The studio body.
 * @returns The bind positions of the body bones, and the points that the instruments need.
 */
export function buildStudioBody(builder: MeshBuilder, name: StudioBodyName): BodyBones {
  const rig = studioRigOf(name);
  const { body, positions } = rig;
  const skeleton = makeSkeleton(
    {
      ...positions,
      instrument: positions.chest,
      bow: positions.handR,
      malletL: positions.handL,
      malletR: positions.handR,
      baton: positions.handR,
      slide: positions.chest,
    },
    'chest',
  );
  const bind = new Float32Array(BONE_NAMES.length * 4).map((_, i) => (i % 4 === 3 ? 1 : 0));
  const posed = skinStudioMesh(
    rig.mesh,
    poseStudioBones(rig, skeleton, bind, [0, 0, 0], 1, createStudioPose()),
  );

  const { corners, colors, finishes } = rig.mesh;
  const skins = playerSkins(rig);
  const places = new Float32Array(corners.length * 3);
  for (const [c, v] of corners.entries()) {
    places.set(posed.subarray(v * 3, v * 3 + 3), c * 3);
  }
  builder.addFaces(places, colors, finishes, (c) => {
    const skin = skins[corners[c] ?? 0];
    return skin ?? { bone: 0, blendBone: 0, blendWeight: 0 };
  });

  const midpoint = (a: Vec3, b: Vec3): Vec3 => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
    (a[2] + b[2]) / 2,
  ];
  // The finger block of the bind pose of the player hangs straight down from its bone.
  const tip = (side: 'L' | 'R'): Vec3 => {
    const length = new Vector3(...body.fingerTips[side]).distanceTo(
      new Vector3(...body.heads[`fingers_${side}`]),
    );
    const fingers = positions[`fingers${side}`];
    return [fingers[0], fingers[1] - length, fingers[2]];
  };
  const h = body.headHeight;
  return {
    headHeight: h,
    headCenter: body.headCenter,
    mouth: [body.nose[0], body.nose[1] - MOUTH_DROP * h, body.nose[2]],
    floor: [0, 0, 0],
    palmL: midpoint(positions.handL, positions.fingersL),
    palmR: midpoint(positions.handR, positions.fingersR),
    fingerBlockL: midpoint(positions.fingersL, tip('L')),
    fingerBlockR: midpoint(positions.fingersR, tip('R')),
    positions,
  };
}

/**
 * The mesh of a player with a studio body as the GPU draws it (design 4.4): the body in the bind
 * pose of the studio, with the skin of the studio, and the instrument in the bind pose of the
 * player, on the bones of the player.
 */
export interface StudioRenderMesh {
  /**
   * The corners, the colors, and the finishes. The bones of the corners are the main bones of the
   * mesh of the player, for the readers of the bind mesh.
   */
  readonly data: MeshData;
  /**
   * The four bones of each corner, as indices in the matrices of a `StudioPose`: the studio bones,
   * then the bones of the player.
   */
  readonly joints: Uint16Array;
  /** The four weights of each corner. */
  readonly weights: Float32Array;
  /** The move of each corner for each corrective shape: x, y, z in meters. */
  readonly correctives: readonly Float32Array[];
}

/**
 * Makes the mesh of a player with a studio body as the GPU draws it. The triangles of the body
 * come first in the mesh of the player (`buildStudioBody()`), and the triangles of the instrument
 * follow.
 *
 * @param rig The studio rig.
 * @param mesh The mesh of the player in its bind pose.
 * @returns The render mesh.
 */
export function studioRenderMesh(rig: StudioRig, mesh: MeshData): StudioRenderMesh {
  const { corners, positions, joints, weights, correctives } = rig.mesh;
  const bodyCorners = corners.length;
  const total = mesh.bones.length;
  const places = new Float32Array(mesh.positions);
  const cornerJoints = new Uint16Array(total * STUDIO_INFLUENCES);
  const cornerWeights = new Float32Array(total * STUDIO_INFLUENCES);
  const moves = correctives.map(() => new Float32Array(total * 3));
  for (let c = 0; c < total; c++) {
    if (c < bodyCorners) {
      const v = corners[c] ?? 0;
      places.set(positions.subarray(v * 3, v * 3 + 3), c * 3);
      for (let k = 0; k < STUDIO_INFLUENCES; k++) {
        cornerJoints[c * STUDIO_INFLUENCES + k] = joints[v * STUDIO_INFLUENCES + k] ?? 0;
        cornerWeights[c * STUDIO_INFLUENCES + k] = weights[v * STUDIO_INFLUENCES + k] ?? 0;
      }
      for (const [s, move] of moves.entries()) {
        move.set(correctives[s]?.subarray(v * 3, v * 3 + 3) ?? [0, 0, 0], c * 3);
      }
    } else {
      const blend = mesh.blendWeights[c] ?? 0;
      cornerJoints[c * STUDIO_INFLUENCES] = STUDIO_BONES.length + (mesh.bones[c] ?? 0);
      cornerJoints[c * STUDIO_INFLUENCES + 1] = STUDIO_BONES.length + (mesh.blendBones[c] ?? 0);
      cornerWeights[c * STUDIO_INFLUENCES] = 1 - blend;
      cornerWeights[c * STUDIO_INFLUENCES + 1] = blend;
    }
  }
  return {
    data: { ...mesh, positions: places },
    joints: cornerJoints,
    weights: cornerWeights,
    correctives: moves,
  };
}
