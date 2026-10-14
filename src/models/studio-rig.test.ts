import { Matrix3, Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { BONE_NAMES, boneIndex, makeSkeleton } from './rig.ts';
import type { BoneName } from './rig.ts';
import { STUDIO_BONES, STUDIO_LEG_BONES } from './studio-format.ts';
import type { RequiredStudioBone, StudioBone } from './studio-format.ts';
import {
  NO_OFFSETS,
  PAW_TURN,
  STUDIO_FOLLOWS,
  TWIST_SHARE,
  createStudioPose,
  poseStudioBones,
  studioRig,
  twistAngle,
} from './studio-rig.ts';
import { STUDIO_BEAR } from './studio/bear.ts';
import { STUDIO_RABBIT } from './studio/rabbit.ts';

const rig = studioRig(STUDIO_BEAR);
const positions = rig.positions;
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

/** The world rotation of each bone of the player in a pose of world rotations. */
type WorldTurns = ReadonlyMap<BoneName, Quaternion>;

/**
 * Makes the local rotations of a pose from the world rotations of some bones. Each other bone
 * keeps the rotation of its parent.
 */
function localPose(world: WorldTurns): Float32Array {
  const rotations = new Float32Array(BONE_NAMES.length * 4);
  const worlds: Quaternion[] = [];
  for (const [i, name] of BONE_NAMES.entries()) {
    const parent = worlds[skeleton.parents[i] ?? -1] ?? new Quaternion();
    const own = world.get(name) ?? parent;
    parent
      .clone()
      .invert()
      .multiply(own)
      .toArray(rotations, i * 4);
    worlds.push(own);
  }
  return rotations;
}

/** Poses the bones of the studio bear with the local rotations of the player. */
function pose(rotations: Float32Array, eyeScale = 1) {
  return poseStudioBones(rig, skeleton, rotations, NO_OFFSETS, eyeScale, createStudioPose());
}

/** Gives the matrix of a studio bone. */
function matrixOf(out: ReturnType<typeof pose>, bone: StudioBone): Matrix4 {
  return new Matrix4().fromArray(out.matrices, STUDIO_BONES.indexOf(bone) * 16);
}

/** Gives the rotation of a studio bone. */
function turnOf(out: ReturnType<typeof pose>, bone: StudioBone): Quaternion {
  return new Quaternion().setFromRotationMatrix(matrixOf(out, bone));
}

/** Moves the bind head of a studio bone with the matrix of a bone. */
function moved(out: ReturnType<typeof pose>, bone: StudioBone, head: RequiredStudioBone): Vector3 {
  return new Vector3(...STUDIO_BEAR.heads[head]).applyMatrix4(matrixOf(out, bone));
}

/** A raised right arm of a conductor: the elbow down and out, the wrist up and forward. */
function raisedArm(handTwist = 0): WorldTurns {
  const shoulder = new Vector3(...positions.upperArmR);
  const elbow = new Vector3(...positions.forearmR);
  const wrist = new Vector3(...positions.handR);
  const upperTo = new Vector3(0.5, -0.4, -0.6).normalize();
  const foreTo = new Vector3(-0.1, 0.8, -0.6).normalize();
  const upper = new Quaternion().setFromUnitVectors(
    elbow.clone().sub(shoulder).normalize(),
    upperTo,
  );
  const fore = new Quaternion().setFromUnitVectors(wrist.clone().sub(elbow).normalize(), foreTo);
  const hand = new Quaternion().setFromAxisAngle(foreTo, handTwist).multiply(fore);
  return new Map<BoneName, Quaternion>([
    ['upperArmR', upper],
    ['forearmR', fore],
    ['handR', hand],
    ['fingersR', hand],
  ]);
}

describe('poseStudioBones (design 4.4)', () => {
  it('moves the trunk, the head, the legs, and the tail with their bones of the player', () => {
    const turns = new Map<BoneName, Quaternion>([
      ['spine', new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.3)],
      ['head', new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.5)],
    ]);
    const out = pose(localPose(turns));
    for (const bone of [
      'hips',
      'spine',
      'spine1',
      'chest',
      'neck',
      'head',
      'ear_L',
      'tail',
    ] as const) {
      const player = boneIndex(STUDIO_FOLLOWS[bone]);
      const expected = new Matrix4().fromArray(out.matrices, (STUDIO_BONES.length + player) * 16);
      expect(matrixOf(out, bone).elements, bone).toEqual(
        expected.elements.map((e) => expect.closeTo(e, 6)),
      );
    }
  });

  it('puts the elbow and the wrist of the studio on the joints of the player', () => {
    const turns = raisedArm();
    const out = pose(localPose(turns));
    const shoulder = new Vector3(...positions.upperArmR);
    const elbow = new Vector3(...positions.forearmR)
      .sub(shoulder)
      .applyQuaternion(turns.get('upperArmR') ?? new Quaternion())
      .add(shoulder);
    const wrist = new Vector3(...positions.handR)
      .sub(new Vector3(...positions.forearmR))
      .applyQuaternion(turns.get('forearmR') ?? new Quaternion())
      .add(elbow);
    expect(moved(out, 'upper_arm_R', 'forearm_R').distanceTo(elbow)).toBeLessThan(1e-5);
    expect(moved(out, 'forearm_R', 'hand_R').distanceTo(wrist)).toBeLessThan(1e-5);
    expect(moved(out, 'forearm_twist_R', 'hand_R').distanceTo(wrist)).toBeLessThan(1e-5);
    // The axis of the elbow of the studio stands square to the plane of the arm.
    const hinge = new Vector3(...rig.arms.R.hinge).applyQuaternion(turnOf(out, 'upper_arm_R'));
    const plane = elbow.clone().sub(shoulder).cross(wrist.clone().sub(elbow)).normalize();
    expect(Math.abs(hinge.dot(plane))).toBeCloseTo(1, 5);
  });

  it(`gives the forearm twist bone ${TWIST_SHARE} of the twist of the paw`, () => {
    const out = pose(localPose(raisedArm(1.2)));
    const fore = turnOf(out, 'forearm_R');
    const axis = new Vector3(...rig.arms.R.fore);
    const paw = twistAngle(fore.clone().invert().multiply(turnOf(out, 'hand_R')), axis);
    const twist = twistAngle(fore.clone().invert().multiply(turnOf(out, 'forearm_twist_R')), axis);
    expect(Math.abs(paw)).toBeGreaterThan(0.5);
    expect(twist).toBeCloseTo(TWIST_SHARE * paw, 5);
  });

  it('turns a paw in the plane of its palm toward the forearm, by at most the limit', () => {
    // With no turn, the fingers of the player hang straight down from a level forearm.
    const forward = new Vector3(0, 0, -1);
    const level = new Quaternion().setFromUnitVectors(new Vector3(0, -1, 0), forward);
    const out = pose(
      localPose(
        new Map<BoneName, Quaternion>([
          ['upperArmL', level],
          ['forearmL', level],
          ['handL', new Quaternion()],
          ['fingersL', new Quaternion()],
        ]),
      ),
    );
    const h = STUDIO_BEAR.heads;
    const paw = new Vector3(...h.fingers_L)
      .sub(new Vector3(...h.hand_L))
      .normalize()
      .applyQuaternion(turnOf(out, 'hand_L'));
    // The fingers of the player point 90° from the forearm. The paw of the studio turns by the
    // limit toward it.
    expect(paw.angleTo(forward)).toBeCloseTo(Math.PI / 2 - PAW_TURN.max, 1);
  });

  it('gives the corrective shape of an arm the weight 0 in the bind pose of the studio and 1 in the pose of the sheet', () => {
    const upperOf = (direction: Vector3): Float32Array => {
      const shoulder = new Vector3(...positions.upperArmL);
      const elbow = new Vector3(...positions.forearmL);
      const upper = new Quaternion().setFromUnitVectors(
        elbow.clone().sub(shoulder).normalize(),
        direction,
      );
      return localPose(new Map<BoneName, Quaternion>([['upperArmL', upper]]));
    };
    expect(pose(upperOf(new Vector3(...rig.arms.L.upper))).correctives[0]).toBeCloseTo(0, 5);
    expect(pose(upperOf(new Vector3(...rig.arms.L.sheet))).correctives[0]).toBeCloseTo(1, 5);
  });

  it('scales the eyes on y for a blink', () => {
    const open = pose(localPose(new Map()), 1);
    const closed = pose(localPose(new Map()), 0.05);
    const eye = new Vector3(...STUDIO_BEAR.heads.eye_L);
    const above = eye.clone().add(new Vector3(0, 0.01, 0));
    expect(above.clone().applyMatrix4(matrixOf(open, 'eye_L')).y - eye.y).toBeCloseTo(0.01, 6);
    expect(above.clone().applyMatrix4(matrixOf(closed, 'eye_L')).y - eye.y).toBeCloseTo(0.0005, 6);
  });
});

describe('studioRig (design 4.4, 4.7)', () => {
  it('hangs the arms of the player straight down, with the lengths of the arms of the studio', () => {
    const h = STUDIO_BEAR.heads;
    const length = (a: RequiredStudioBone, b: RequiredStudioBone): number =>
      new Vector3(...h[a]).distanceTo(new Vector3(...h[b]));
    const p = rig.positions;
    expect(p.upperArmR).toEqual(h.upper_arm_R);
    expect(p.upperArmR[1] - p.forearmR[1]).toBeCloseTo(length('upper_arm_R', 'forearm_R'), 6);
    expect(p.forearmR[1] - p.handR[1]).toBeCloseTo(length('forearm_R', 'hand_R'), 6);
    expect(p.forearmR[0]).toBe(p.upperArmR[0]);
    expect(p.handL[2]).toBe(p.upperArmL[2]);
  });
});

describe('poseStudioBones with the offsets of a pose (design 5.1)', () => {
  it('moves the instrument and the slide by their offsets, as the scene moves them', () => {
    const rotations = localPose(new Map());
    const offset = poseStudioBones(
      rig,
      skeleton,
      rotations,
      { root: [0, 0, 0], instrument: [0.1, 0.2, 0.3], slide: [0, 0, -0.4] },
      1,
      createStudioPose(),
    );
    const still = poseStudioBones(rig, skeleton, rotations, NO_OFFSETS, 1, createStudioPose());
    const placeOf = (out: ReturnType<typeof pose>, bone: BoneName): Vector3 =>
      new Vector3().setFromMatrixPosition(
        new Matrix4().fromArray(out.matrices, (STUDIO_BONES.length + boneIndex(bone)) * 16),
      );
    // The bind pose turns no bone, so each offset moves its bone in the model axes.
    expect(placeOf(offset, 'instrument').sub(placeOf(still, 'instrument')).toArray()).toEqual([
      expect.closeTo(0.1, 6),
      expect.closeTo(0.2, 6),
      expect.closeTo(0.3, 6),
    ]);
    expect(placeOf(offset, 'slide').sub(placeOf(still, 'slide')).toArray()).toEqual([
      expect.closeTo(0.1, 6),
      expect.closeTo(0.2, 6),
      expect.closeTo(-0.1, 6),
    ]);
    expect(placeOf(offset, 'chest').distanceTo(placeOf(still, 'chest'))).toBe(0);
  });
});

describe('studioRig for a player that stands (design 4.4)', () => {
  it('keeps the stance of the role for a body with no standing pose', () => {
    const standing = studioRig(STUDIO_BEAR, true);
    expect(standing.positions).toEqual(rig.positions);
    expect([...standing.mesh.positions]).toEqual([...rig.mesh.positions]);
    expect(standing.mesh.correctives).toHaveLength(2);
  });
});

describe('studioRig for a seated body that also stands (design 4.4)', () => {
  const seated = studioRig(STUDIO_RABBIT, false);
  const standing = studioRig(STUDIO_RABBIT, true);
  const lowest = (places: Float32Array): number => {
    let low = Infinity;
    for (let v = 1; v < places.length; v += 3) {
      low = Math.min(low, places[v] ?? 0);
    }
    return low;
  };

  it('puts the soles on the floor in each stance', () => {
    expect(Math.abs(lowest(seated.mesh.positions))).toBeLessThan(0.005);
    expect(Math.abs(lowest(standing.mesh.positions))).toBeLessThan(0.005);
    expect(standing.body.floor).toEqual([0, 0, 0]);
    expect(standing.body.seatHeight).toBeNull();
  });

  it('straightens the legs under the hips', () => {
    for (const side of ['L', 'R'] as const) {
      const hip = new Vector3(...standing.positions[`thigh${side}`]);
      const knee = new Vector3(...standing.positions[`shin${side}`]);
      const ankle = new Vector3(...standing.positions[`foot${side}`]);
      // The thigh and the shin point down within 25° of the vertical, as the legs of the mesh of
      // the user: its shin slants 20° back from the knee to the ankle (tools/mesh-rigs/rabbit.json).
      for (const [from, to] of [
        [hip, knee],
        [knee, ankle],
      ] as const) {
        const down = to.clone().sub(from).normalize();
        expect(down.y, side).toBeLessThan(-Math.cos((25 * Math.PI) / 180));
      }
    }
    // The shoulders stand at the landmark of the export, above the seated shoulders.
    expect(standing.positions.upperArmL[1]).toBeGreaterThan(seated.positions.upperArmL[1]);
  });

  it('turns no face of the legs over against the mean turn of its corners', () => {
    // The fold test of the studio and of `pnpm fold-probe`: the seated normal of a face turns by
    // the mean of the turns of its corners. A face at the groin follows the thigh, the shin, and
    // the hips, so the turn of one bone does not give its standing normal.
    const turns = new Map(
      STUDIO_LEG_BONES.map((bone) => [
        STUDIO_BONES.indexOf(bone),
        new Matrix3().setFromMatrix4(
          new Matrix4().makeRotationFromQuaternion(
            new Quaternion(...(STUDIO_RABBIT.standing?.turns[bone] ?? [0, 0, 0, 1])),
          ),
        ),
      ]),
    );
    const { corners, joints, weights } = seated.mesh;
    const normal = (places: Float32Array, t: number): Vector3 => {
      const [a, b, c] = [0, 1, 2].map((k) =>
        new Vector3().fromArray(places, (corners[t * 3 + k] ?? 0) * 3),
      );
      return (b ?? new Vector3())
        .clone()
        .sub(a ?? new Vector3())
        .cross((c ?? new Vector3()).clone().sub(a ?? new Vector3()))
        .normalize();
    };
    let folded = 0;
    for (let t = 0; t < corners.length / 3; t++) {
      const mean = new Matrix3().set(0, 0, 0, 0, 0, 0, 0, 0, 0);
      for (let k = 0; k < 3; k++) {
        const v = corners[t * 3 + k] ?? 0;
        for (let j = 0; j < 4; j++) {
          const turn = turns.get(joints[v * 4 + j] ?? 0) ?? new Matrix3();
          const w = (weights[v * 4 + j] ?? 0) / 3;
          for (const [e, value] of turn.elements.entries()) {
            mean.elements[e] = (mean.elements[e] ?? 0) + w * value;
          }
        }
      }
      const before = normal(seated.mesh.positions, t).applyMatrix3(mean.invert().transpose());
      folded += before.dot(normal(standing.mesh.positions, t)) < 0 ? 1 : 0;
    }
    expect(folded).toBe(0);
  });

  it('keeps the arm corrective shapes only', () => {
    expect(seated.mesh.correctives).toHaveLength(2);
    expect(standing.mesh.correctives).toHaveLength(2);
  });
});

describe('studioRig for a body with a tail of two bones (design 4.4)', () => {
  const root = STUDIO_RABBIT.heads.tail;
  const tip: [number, number, number] = [root[0], root[1] - 0.05, root[2] + 0.1];
  const turn = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.8);
  const standing = STUDIO_RABBIT.standing;
  if (!standing) {
    throw new Error('The rabbit has no standing pose.');
  }
  const body = {
    ...STUDIO_RABBIT,
    heads: { ...STUDIO_RABBIT.heads, tail_tip: tip },
    standing: {
      ...standing,
      tailTurns: {
        tail: [turn.x, turn.y, turn.z, turn.w] as const,
        tail_tip: [0, 0, 0, 1] as const,
      },
    },
  };

  it('drives the tip of the tail with the second tail bone of the player', () => {
    expect(STUDIO_FOLLOWS.tail_tip).toBe('tail2');
    expect(studioRig(body).positions.tail2).toEqual(tip);
    expect(studioRig(STUDIO_RABBIT).positions.tail2).toEqual(root);
  });

  it('turns the tail of a standing body by the tail turns of its standing pose', () => {
    const seated = studioRig(body).body.heads;
    const stood = studioRig(body, true).body.heads;
    const lift = new Vector3(...stood.tail).sub(new Vector3(...seated.tail));
    const expected = new Vector3(...tip)
      .sub(new Vector3(...root))
      .applyQuaternion(turn)
      .add(new Vector3(...root))
      .add(lift);
    expect(new Vector3(...(stood.tail_tip ?? [0, 0, 0])).distanceTo(expected)).toBeLessThan(1e-9);
    expect(studioRig(STUDIO_RABBIT, true).body.heads.tail_tip).toBeUndefined();
  });
});
