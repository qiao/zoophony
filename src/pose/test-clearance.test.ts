import { describe, expect, it } from 'vitest';

import { MathUtils, Quaternion, Vector3 } from 'three';

import { MeshBuilder, blendSkin, transform } from '../models/mesh.ts';
import { buildPlayer } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import { tube } from '../models/primitives.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import type { Vec3 } from '../models/tuples.ts';
import { createMaterials } from '../scene/geometry.ts';
import { applyPose, createPlayerGeometry, createPlayerMesh } from '../scene/player.ts';
import { BIND_ROTATIONS } from './frames.ts';
import { posedPart, signedDistance } from './test-clearance.ts';
import { poseSkeleton } from './test-kinematics.ts';
import type { AnimalPose } from './types.ts';

/** The radius of the tube of {@link testArmModel}, in meters. */
const RADIUS = 0.03;

/** The half width of the elbow band of {@link testArmModel}, in meters. */
const ELBOW_BAND = 0.04;

/**
 * Builds the rabbit with the violin and a test arm: one closed tube of 8 sides from the right
 * wrist to the right shoulder. Its corners blend `upperArmR` and `forearmR` in a band around the
 * elbow, so the triangles of each of the two bones are an open surface.
 *
 * @returns The model.
 */
function testArmModel(): PlayerModel {
  const model = buildPlayer('rabbit', 'violin');
  const at = (bone: BoneName): Vec3 => model.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0];
  const [x, elbow, z] = at('forearmR');
  const wrist = at('handR')[1];
  const shoulder = at('upperArmR')[1];

  const heights = [wrist, (wrist + elbow) / 2, elbow - 0.02, elbow, elbow + 0.02, shoulder];
  const rings = heights.map((y, i) => ({ radius: RADIUS, y, turn: (i % 2) * 0.5 }));
  const builder = new MeshBuilder();
  builder.addMesh(model.mesh, transform());
  builder.add(tube(rings, 8), {
    color: [1, 1, 1],
    at: transform([x, 0, z]),
    skin: ([, y]) =>
      blendSkin(
        boneIndex('upperArmR'),
        boneIndex('forearmR'),
        MathUtils.smoothstep(elbow - y, -ELBOW_BAND, ELBOW_BAND),
      ),
  });
  return { ...model, mesh: builder.build() };
}

/**
 * Makes a pose that bends the right elbow forward.
 *
 * @param degrees The bend, in degrees.
 * @returns The pose, with open eyes.
 */
function bentElbow(degrees: number): AnimalPose {
  const rotations = Float32Array.from(BIND_ROTATIONS);
  new Quaternion()
    .setFromAxisAngle(new Vector3(1, 0, 0), degrees * MathUtils.DEG2RAD)
    .toArray(rotations, boneIndex('forearmR') * 4);
  return { rotations, rootOffset: [0, 0, 0], slideOffset: [0, 0, 0], blink: 0 };
}

describe('posedPart', () => {
  it('poses each corner with its two bones, as the skin of three.js does', () => {
    const model = testArmModel();
    const mesh = createPlayerMesh(model, createPlayerGeometry(model), createMaterials());
    const pose = bentElbow(90);
    applyPose(mesh, pose);
    mesh.updateMatrixWorld(true);
    const part = posedPart(poseSkeleton(model, pose), ['upperArmR', 'forearmR']);

    // The triangles of the two bones, in the order of the mesh, against the vertices of three.js.
    const wanted = new Set([boneIndex('upperArmR'), boneIndex('forearmR')]);
    const firsts = [];
    for (let v = 0; v < model.mesh.bones.length; v += 3) {
      if (wanted.has(model.mesh.bones[v] ?? -1)) {
        firsts.push(v);
      }
    }
    expect(part.triangles).toHaveLength(firsts.length);
    const vertex = new Vector3();
    let largest = 0;
    let blended = 0;
    for (const [i, v] of firsts.entries()) {
      const triangle = part.triangles[i];
      for (const [k, corner] of [triangle?.a, triangle?.b, triangle?.c].entries()) {
        mesh.getVertexPosition(v + k, vertex);
        largest = Math.max(largest, vertex.distanceTo(corner ?? new Vector3()));
        if ((model.mesh.blendWeights[v + k] ?? 0) > 0.2) {
          blended++;
        }
      }
    }
    expect(blended).toBeGreaterThan(0);
    expect(largest).toBeLessThan(1e-6);
  });

  it('measures a welded tube on two bones as one closed surface', () => {
    const model = testArmModel();
    const posed = poseSkeleton(model, bentElbow(0));
    const at = (bone: BoneName): Vec3 => model.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0];
    const [x, elbow, z] = at('forearmR');
    const shoulder = at('upperArmR')[1];

    // A point in the upper half of the tube is inside the closed tube, also for the triangles of
    // the forearm alone: a ray up from it leaves the tube through the cap on the upper arm.
    const point = new Vector3(x, (elbow + shoulder) / 2, z);
    const forearm = posedPart(posed, ['forearmR']);
    expect(signedDistance(forearm, point)).toBeLessThan(-0.9 * RADIUS);
  });
});

/**
 * Gives a model the skin of four bones of a rigged body, from its main bones and second bones.
 *
 * @param model The model.
 * @returns The model with the skin of a rigged body.
 */
function asRigged(model: PlayerModel): PlayerModel {
  const { mesh } = model;
  const indices = new Uint8Array(mesh.bones.length * 4);
  const weights = new Float32Array(mesh.bones.length * 4);
  for (let c = 0; c < mesh.bones.length; c++) {
    const w = mesh.blendWeights[c] ?? 0;
    indices.set([mesh.bones[c] ?? 0, mesh.blendBones[c] ?? 0, 0, 0], c * 4);
    weights.set([1 - w, w, 0, 0], c * 4);
  }
  return { ...model, mesh: { ...mesh, skin: { indices, weights } } };
}

describe('signedDistance in a rigged body (design 4.4)', () => {
  it('puts a point in the part that owns the nearest triangle of the closed shell', () => {
    const model = asRigged(testArmModel());
    const posed = poseSkeleton(model, bentElbow(0));
    const at = (bone: BoneName): Vec3 => model.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0];
    const [x, elbow, z] = at('forearmR');
    const shoulder = at('upperArmR')[1];

    // The point is in the upper half of the tube: the upper arm owns it, and the forearm does not.
    const point = new Vector3(x, (elbow + shoulder) / 2, z);
    expect(signedDistance(posedPart(posed, ['upperArmR']), point)).toBeLessThan(-0.9 * RADIUS);
    expect(signedDistance(posedPart(posed, ['forearmR']), point)).toBeGreaterThan(0);
  });
});
