import { describe, expect, it } from 'vitest';

import { Quaternion, Vector3 } from 'three';

import type { BodyBoneName, BodyBones } from './biped.ts';
import { bodyFrame, seated } from './body-frame.ts';
import type { Stance } from './body-frame.ts';
import { MeshBuilder } from './mesh.ts';
import { BONE_NAMES, makeSkeleton } from './rig.ts';
import type { BoneName } from './rig.ts';
import { buildRigged } from './rigged-body.ts';
import { RIGGED_JOINTS } from './rigged.ts';
import { FOX_RED_RIGGED } from './rigged/fox-red.ts';
import { SPECIES } from './species.ts';
import { BOW_GRIP } from './instruments/strings.ts';
import type { Vec3 } from './tuples.ts';

/** The head height of the red fox, in meters (design 4.3). */
const H = 0.327;

/**
 * Builds the rigged fox in a stance, with the frame of the red fox.
 *
 * @param builder The mesh that gets the body.
 * @param stance The stance.
 * @returns The bones, or `null` when the body does not fit the stance.
 */
function foxIn(builder: MeshBuilder, stance: Stance): BodyBones | null {
  return buildRigged(builder, FOX_RED_RIGGED, bodyFrame(SPECIES['fox-red'], stance), stance);
}

/** The rigged fox on a chair, and the mesh that holds it. */
interface ChairFox {
  /** The bones and the body points. */
  readonly body: BodyBones;
  /** The mesh. */
  readonly builder: MeshBuilder;
}

/**
 * Builds the rigged fox on a chair, 0.02 m forward on the seat.
 *
 * @returns The bones and the mesh.
 */
function chairFox(): ChairFox {
  const builder = new MeshBuilder();
  const body = foxIn(builder, seated(0.35, 0, 0.02));
  if (!body) {
    throw new Error('The rigged fox does not fit the chair.');
  }
  return { body, builder };
}

/**
 * Gives the bind position of a body bone, or of an instrument bone at the chest.
 *
 * @param body The bones.
 * @returns The positions of all bones.
 */
function allPositions(body: BodyBones): Record<BoneName, Vec3> {
  // SAFETY: the entries hold each name of BONE_NAMES once.
  return Object.fromEntries(
    BONE_NAMES.map((name) => [
      name,
      name in body.positions ? body.positions[name as BodyBoneName] : body.positions.chest,
    ]),
  ) as Record<BoneName, Vec3>;
}

describe('buildRigged', () => {
  const { body, builder } = chairFox();
  const skeleton = makeSkeleton(allPositions(body), 'chest', body.meshBind);
  const frames = skeleton.meshBind ?? [];

  it('fits each seat with the drop of its model sheet, and no other stance', () => {
    expect(foxIn(new MeshBuilder(), seated(0.7, 0.35))).not.toBeNull();
    expect(foxIn(new MeshBuilder(), seated(0.45))).toBeNull();
    expect(foxIn(new MeshBuilder(), { kind: 'standing' })).toBeNull();
    expect(builder.triangleCount).toBeGreaterThan(1800);
  });

  it('binds each bone of the mesh at the joint of the rig, moved forward on the seat', () => {
    for (const joint of RIGGED_JOINTS) {
      const frame = frames[BONE_NAMES.indexOf(joint)];
      const [x, y, z] = FOX_RED_RIGGED.joints[joint];
      expect(frame?.position[0]).toBeCloseTo(x, 9);
      expect(frame?.position[1]).toBeCloseTo(y, 9);
      expect(frame?.position[2]).toBeCloseTo(z - 0.02, 9);
    }
  });

  it('gives bind frames that a pose of the rest skeleton reaches (design 4.7)', () => {
    // Each bone keeps its place on its parent: the frame of a bone is the frame of its parent
    // times the rest offset of the bone from the parent.
    const joints = new Set<string>(RIGGED_JOINTS);
    for (const [i, name] of BONE_NAMES.entries()) {
      const parent = skeleton.parents[i] ?? -1;
      const own = frames[i];
      const above = frames[parent];
      if (parent < 0 || !own || !above || !joints.has(name)) {
        continue;
      }
      const offset = new Vector3(...(skeleton.positions[i] ?? [0, 0, 0]))
        .sub(new Vector3(...(skeleton.positions[parent] ?? [0, 0, 0])))
        .applyQuaternion(new Quaternion(...above.rotation))
        .add(new Vector3(...above.position));
      expect(offset.distanceTo(new Vector3(...own.position)), name).toBeLessThan(1e-9);
    }
  });

  it('hangs each arm of the rest skeleton straight down with the lengths of the rig', () => {
    for (const side of ['L', 'R'] as const) {
      const at = (bone: BodyBoneName): Vector3 => new Vector3(...body.positions[bone]);
      const rig = (joint: (typeof RIGGED_JOINTS)[number]): Vector3 =>
        new Vector3(...FOX_RED_RIGGED.joints[joint]);
      const shoulder = at(`upperArm${side}`);
      const elbow = at(`forearm${side}`);
      const wrist = at(`hand${side}`);

      expect(elbow.x).toBeCloseTo(shoulder.x, 9);
      expect(wrist.z).toBeCloseTo(shoulder.z, 9);
      expect(elbow.distanceTo(shoulder)).toBeCloseTo(
        rig(`forearm${side}`).distanceTo(rig(`upperArm${side}`)),
        9,
      );
      expect(wrist.distanceTo(elbow)).toBeCloseTo(
        rig(`hand${side}`).distanceTo(rig(`forearm${side}`)),
        9,
      );
    }
  });

  it('puts each palm on the palm side of the middle of the paw, at its height', () => {
    // The palm faces the body in the rest skeleton: -x for the right hand. The bow grip lies
    // further to the palm side (`BOW_GRIP`), and the stick keeps 0.02 H from the paw
    // (`pose/bowed.test.ts`).
    for (const side of ['L', 'R'] as const) {
      const palm = new Vector3(...body[`palm${side}`]);
      const middle = new Vector3(...body[`fingerBlock${side}`]);
      const inward = side === 'L' ? 1 : -1;

      expect(palm.y).toBeCloseTo(middle.y, 9);
      expect((palm.x - middle.x) * inward).toBeGreaterThan(0);
      expect((palm.x - middle.x) * inward).toBeLessThan(-BOW_GRIP[0] * H);
    }
  });

  it('puts the left palm on the line from the middle of the paw to the palm side', () => {
    expect(body.palmL[2]).toBeCloseTo(body.fingerBlockL[2], 9);
  });

  it('puts the head center between the eyes, behind them, at the height of the skeleton', () => {
    const center = new Vector3(...body.headCenter);
    const eyeL = new Vector3(...body.positions.eyeL);
    const eyeR = new Vector3(...body.positions.eyeR);

    expect(center.x).toBeCloseTo((eyeL.x + eyeR.x) / 2, 9);
    // The skeleton of the red fox puts the head center 2.05 H above the seat (design 4.3).
    expect(center.y).toBeCloseTo(0.35 + 2.05 * H, 9);
    expect(eyeL.z).toBeCloseTo(eyeR.z, 2);
    expect(center.z - eyeL.z).toBeGreaterThan(0.3 * H);
    expect(center.z - eyeL.z).toBeLessThan(0.6 * H);
    expect(body.mouth[2]).toBeLessThan(eyeL.z);
  });
});
