import { describe, expect, it } from 'vitest';

import { MathUtils, Matrix4, Quaternion, Vector3 } from 'three';

import { MeshBuilder, blendSkin, transform } from '../models/mesh.ts';
import { ModelCache } from '../models/model-cache.ts';
import { INSTRUMENT_SUPPORTS, buildPlayer } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import { tube } from '../models/primitives.ts';
import { boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import type { Vec3 } from '../models/tuples.ts';
import { BIND_ROTATIONS } from '../pose/frames.ts';
import type { AnimalPose } from '../pose/types.ts';
import { createMaterials } from './geometry.ts';
import {
  CLOSED_EYE_SCALE,
  applyPose,
  applyScenePose,
  createPlayerGeometry,
  createPlayerMesh,
  createPlayers,
} from './player.ts';
import type { PlayerSpot } from './player.ts';

/** Makes a player spot at a place. */
function spot(species: PlayerSpot['species'], instrument: PlayerSpot['instrument']): PlayerSpot {
  return {
    species,
    instrument,
    kettles: 4,
    support: INSTRUMENT_SUPPORTS[instrument],
    position: [1, 0, 2],
    facing: 0.5,
  };
}

/** The half width of the elbow band of {@link testArmModel}, in meters. */
const ELBOW_BAND = 0.04;

/**
 * Builds the rabbit with the violin and a test arm: a tube of 8 sides from the right wrist to
 * the right shoulder. Its corners blend `upperArmR` and `forearmR` in a band around the elbow,
 * and the other parts stay rigid.
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
  const rings = heights.map((y, i) => ({ radius: 0.03, y, turn: (i % 2) * 0.5 }));
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

describe('createPlayerGeometry', () => {
  it('gives each vertex its main bone and its second bone, with weights that add up to 1', () => {
    const model = testArmModel();
    const geometry = createPlayerGeometry(model);
    const { bones, blendBones, blendWeights } = model.mesh;

    const index = geometry.getAttribute('skinIndex');
    const weight = geometry.getAttribute('skinWeight');
    const actual = Array.from(bones, (_, v) => [
      index.getX(v),
      index.getY(v),
      index.getZ(v),
      index.getW(v),
      weight.getX(v),
      weight.getY(v),
      weight.getZ(v),
      weight.getW(v),
    ]);
    const expected = Array.from(bones, (bone, v) => {
      const w = blendWeights[v] ?? 0;
      return [bone, blendBones[v], 0, 0, Math.fround(1 - w), w, 0, 0];
    });
    expect(actual).toEqual(expected);
    // The test arm blends some vertices, and each rigid vertex has the weights 1 and 0.
    expect(blendWeights.some((w) => w > 0.2)).toBe(true);
    expect(actual.every(([, , , , a = 0, b = 0]) => Math.abs(a + b - 1) < 1e-6)).toBe(true);
  });
});

describe('createPlayers', () => {
  it('shares one geometry for each kind of player, and the two materials', () => {
    const materials = createMaterials();
    const asked: string[] = [];
    /** A cache that records each kind of player that the scene asks for. */
    class RecordingCache extends ModelCache {
      override get(...args: Parameters<ModelCache['get']>) {
        const [species, instrument, kettles = 4] = args;
        asked.push(`${species} ${instrument} ${kettles}`);
        return super.get(...args);
      }
    }
    const meshes = createPlayers(
      [spot('rabbit', 'violin'), spot('cat', 'viola'), spot('rabbit', 'violin')],
      materials,
      new RecordingCache(),
    );
    // The models come from the cache of the score (audit 2026-10-05-pose-scene, finding 8).
    expect(asked).toEqual(['rabbit violin 4', 'cat viola 4', 'rabbit violin 4']);
    expect(meshes).toHaveLength(3);
    const [a, b, c] = meshes;
    expect(a?.geometry).toBe(c?.geometry);
    expect(a?.geometry).not.toBe(b?.geometry);
    expect(a?.skeleton).not.toBe(c?.skeleton);
    for (const mesh of meshes) {
      expect(mesh.material).toEqual(materials);
      expect(mesh.position.toArray()).toEqual([1, 0, 2]);
      expect(mesh.rotation.y).toBe(0.5);
    }
  });
});

describe('applyScenePose', () => {
  it('gives each player its pose, and the last mesh the pose of the conductor', () => {
    const meshes = createPlayers(
      [spot('rabbit', 'violin'), spot('cat', 'viola'), spot('bear', 'baton')],
      createMaterials(),
      new ModelCache(),
    );
    const head = boneIndex('head');
    /** Makes a pose that turns the head about x by an angle. */
    const turned = (angle: number): AnimalPose => {
      const rotations = Float32Array.from(BIND_ROTATIONS);
      rotations.set([Math.sin(angle / 2), 0, 0, Math.cos(angle / 2)], head * 4);
      return { rotations, rootOffset: [0, 0, 0], slideOffset: [0, 0, 0], blink: 0 };
    };
    applyScenePose(meshes, { players: [turned(0.1), turned(0.2)], conductor: turned(0.3) });
    const angles = meshes.map(
      (mesh) => 2 * Math.asin(mesh.skeleton.bones[head]?.quaternion.x ?? 0),
    );
    expect(angles[0]).toBeCloseTo(0.1, 6);
    expect(angles[1]).toBeCloseTo(0.2, 6);
    expect(angles[2]).toBeCloseTo(0.3, 6);
  });
});

describe('applyPose', () => {
  it('moves the trombone slide along its axis from its bind place (design 5.1)', () => {
    const model = buildPlayer('pig', 'trombone');
    const mesh = createPlayerMesh(model, createPlayerGeometry(model), createMaterials());
    const slide = mesh.skeleton.bones[boneIndex('slide')];
    const bind = slide?.position.toArray();
    const pose = {
      rotations: BIND_ROTATIONS,
      rootOffset: [0, 0, 0] as const,
      slideOffset: [0.1, -0.02, 0.05] as const,
      blink: 0,
    };
    applyPose(mesh, pose);
    expect(slide?.position.x).toBeCloseTo((bind?.[0] ?? 0) + 0.1, 9);
    expect(slide?.position.y).toBeCloseTo((bind?.[1] ?? 0) - 0.02, 9);
    expect(slide?.position.z).toBeCloseTo((bind?.[2] ?? 0) + 0.05, 9);
    // A later pose starts from the bind place again.
    applyPose(mesh, { ...pose, slideOffset: [0, 0, 0] });
    expect(slide?.position.toArray()).toEqual(bind);
  });

  it('closes the eyes on y by the blink, with no other scale (design 4.7, 5.1)', () => {
    const model = buildPlayer('rabbit', 'violin');
    const mesh = createPlayerMesh(model, createPlayerGeometry(model), createMaterials());
    const bones = mesh.skeleton.bones;
    const eyes = [bones[boneIndex('eyeL')], bones[boneIndex('eyeR')]];
    const pose = (blink: number): AnimalPose => ({
      rotations: BIND_ROTATIONS,
      rootOffset: [0, 0, 0],
      slideOffset: [0, 0, 0],
      blink,
    });
    applyPose(mesh, pose(0.6));
    for (const eye of eyes) {
      expect(eye?.scale.y).toBeCloseTo(0.4, 6);
      expect(eye?.scale.x).toBe(1);
      expect(eye?.scale.z).toBe(1);
    }
    // A closed eye keeps a thin line, so that the bone matrix stays valid.
    applyPose(mesh, pose(1));
    for (const eye of eyes) {
      expect(eye?.scale.y).toBe(CLOSED_EYE_SCALE);
    }
    applyPose(mesh, pose(0));
    for (const eye of eyes) {
      expect(eye?.scale.y).toBe(1);
    }
    const others = bones.filter((bone) => !eyes.includes(bone));
    expect(others.every((bone) => bone.scale.equals(eyes[0]?.scale ?? bone.scale))).toBe(true);
  });

  it('writes the quaternions with no update of the Euler angles (review of step 5, F13)', () => {
    const model = buildPlayer('rabbit', 'violin');
    const mesh = createPlayerMesh(model, createPlayerGeometry(model), createMaterials());
    const head = mesh.skeleton.bones[boneIndex('head')];
    const rotations = Float32Array.from(BIND_ROTATIONS);
    rotations.set([Math.sin(0.2), 0, 0, Math.cos(0.2)], boneIndex('head') * 4);
    applyPose(mesh, { rotations, rootOffset: [0, 0, 0], slideOffset: [0, 0, 0], blink: 0 });
    expect(head?.quaternion.x).toBeCloseTo(Math.sin(0.2), 6);
    // The Euler angles stay at the bind pose, because no code reads them.
    expect(head?.rotation.x).toBe(0);
    // The matrix of the bone follows the quaternion.
    head?.updateMatrix();
    const turned = new Vector3(0, 0, -1).applyQuaternion(head?.quaternion ?? new Quaternion());
    const fromMatrix = new Vector3(0, 0, -1).transformDirection(head?.matrix ?? new Matrix4());
    expect(fromMatrix.distanceTo(turned)).toBeLessThan(1e-6);
  });
});
