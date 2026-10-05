import {
  DEG,
  IDENTITY,
  add,
  axisAngle,
  basisRotation,
  cross,
  invert,
  length,
  multiply,
  normalize,
  reject,
  rotate,
  rotationBetween,
  scale,
  sub,
} from '../models/math.ts';
import type { Quat, Vec3 } from '../models/math.ts';
import type { PlayerModel } from '../models/player.ts';
import { BONE_NAMES, boneIndex } from '../models/rig.ts';
import type { BoneName } from '../models/rig.ts';
import { INSTRUMENT_SCALE } from '../models/violin.ts';
import type { AnimalPose } from './types.ts';

/** The values of the static playing pose of a violin player. */
export const VIOLIN_POSE = {
  /** The distance along the bow from the right hand to the strings, in meters (design 4.7). */
  bowFromGrip: 0.14 * INSTRUMENT_SCALE,
  /** The distance of the left palm below the neck, in meters. */
  palmBelowNeck: 0.025 * INSTRUMENT_SCALE,
  /** The curl of the fingers of each hand. */
  curlL: 40 * DEG,
  curlR: 30 * DEG,
  /** The directions to which the elbows point. */
  poleL: [-0.3, -1, 0] as const,
  poleR: [1, -1, 0.3] as const,
} as const;

/** The elbow and the wrist of an arm after the two-bone solution. */
interface ArmJoints {
  readonly elbow: Vec3;
  readonly wrist: Vec3;
}

/**
 * Places the elbow of an arm so that the wrist reaches a target. If the target is out of reach,
 * the arm points straight to it.
 */
function solveArm(
  shoulder: Vec3,
  target: Vec3,
  upperLength: number,
  lowerLength: number,
  pole: Vec3,
): ArmJoints {
  const toTarget = sub(target, shoulder);
  const direction = normalize(toTarget);
  const reach = Math.min(
    Math.max(length(toTarget), Math.abs(upperLength - lowerLength) + 1e-6),
    upperLength + lowerLength - 1e-6,
  );
  const along = (upperLength ** 2 - lowerLength ** 2 + reach ** 2) / (2 * reach);
  const side = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  const bend = normalize(reject(pole, direction));
  const elbow = add(shoulder, add(scale(direction, along), scale(bend, side)));
  return { elbow, wrist: add(shoulder, scale(direction, reach)) };
}

/**
 * Calculates the static playing pose of a violin player: the violin under the chin, the left
 * hand on the neck, and the bow on the strings in the right hand. Step 3 shows this pose. The
 * pose function of step 5 replaces it.
 *
 * @param model The player model with a violin.
 * @returns The pose, with one rotation for each bone relative to its parent.
 */
export function violinPlayingPose(model: PlayerModel): AnimalPose {
  const at = (name: BoneName): Vec3 => model.skeleton.positions[boneIndex(name)] ?? [0, 0, 0];
  const p = VIOLIN_POSE;
  const { violin, bow } = model;

  // The strings run along the violin axis. The bow crosses them in the plane of the strings, with
  // its tip up, and its hair on the strings.
  let across = normalize(cross(violin.top, violin.axis));
  if (across[1] < 0) {
    across = scale(across, -1);
  }
  const handR = basisRotation(across, violin.top);
  const bowBind = basisRotation(bow.axis, scale(bow.hairSide, -1));
  const worldHandR = multiply(handR, invert(bowBind));
  const grip = add(
    add(violin.bowContact, scale(violin.top, bow.hairGap)),
    scale(across, -p.bowFromGrip),
  );
  const wristR = sub(grip, rotate(worldHandR, sub(bow.grip, at('handR'))));

  // The left palm is under the neck and faces it. The fingers point across the neck.
  const worldHandL = basisRotation(violin.top, scale(across, -1));
  const palmL = sub(violin.neckGrip, scale(violin.top, p.palmBelowNeck));
  const wristL = sub(palmL, rotate(worldHandL, sub(model.body.palmL, at('handL'))));

  const world = new Map<BoneName, Quat>();
  for (const [side, wrist, hand, pole] of [
    ['L', wristL, worldHandL, p.poleL],
    ['R', wristR, worldHandR, p.poleR],
  ] as const) {
    const shoulder = at(`upperArm${side}`);
    const elbowBind = at(`forearm${side}`);
    const wristBind = at(`hand${side}`);
    const joints = solveArm(
      shoulder,
      wrist,
      length(sub(elbowBind, shoulder)),
      length(sub(wristBind, elbowBind)),
      pole,
    );
    world.set(
      `upperArm${side}`,
      rotationBetween(sub(elbowBind, shoulder), sub(joints.elbow, shoulder)),
    );
    world.set(
      `forearm${side}`,
      rotationBetween(sub(wristBind, elbowBind), sub(joints.wrist, joints.elbow)),
    );
    world.set(`hand${side}`, hand);
  }

  // The fingers curl toward the palm: the palm of the left hand faces +x and the right -x.
  const local = new Map<BoneName, Quat>([
    ['fingersL', axisAngle([0, 0, 1], p.curlL)],
    ['fingersR', axisAngle([0, 0, 1], -p.curlR)],
  ]);

  const rotations = new Float32Array(BONE_NAMES.length * 4);
  const worldOf: Quat[] = [];
  for (const [i, name] of BONE_NAMES.entries()) {
    const parent = model.skeleton.parents[i] ?? -1;
    const parentWorld = parent >= 0 ? (worldOf[parent] ?? IDENTITY) : IDENTITY;
    const target = world.get(name);
    const turn = target ? multiply(invert(parentWorld), target) : (local.get(name) ?? IDENTITY);
    worldOf.push(target ?? multiply(parentWorld, turn));
    rotations.set(turn, i * 4);
  }
  return { rotations, rootOffset: [0, 0, 0], blink: 0 };
}
