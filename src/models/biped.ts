import { bodyFrame, tailBase } from './body-frame.ts';
import type { Stance } from './body-frame.ts';
import { bodyColors } from './body-parts.ts';
import type { Vec3 } from './tuples.ts';
import type { MeshBuilder } from './mesh.ts';
import type { BoneName } from './rig.ts';
import type { SpeciesParams } from './species.ts';
import { addTail } from './tails.ts';
import { buildArms } from './arms.ts';
import { buildLegs } from './legs.ts';
import { buildTrunk } from './trunk.ts';
import { buildFoxBody } from './fox/fox-body.ts';

/** The bones that the body places. The instrument generators place the other bones. */
export type BodyBoneName = Exclude<
  BoneName,
  'instrument' | 'bow' | 'malletL' | 'malletR' | 'baton' | 'slide'
>;

/** The bind positions of the body bones, and the points that the instruments need. */
export interface BodyBones {
  /** The bind position of each body bone. */
  readonly positions: Readonly<Record<BodyBoneName, Vec3>>;
  /** The head height `H` of the species, in meters (design 4.5, body proportions). */
  readonly headHeight: number;
  /** The center of the head. */
  readonly headCenter: Vec3;
  /** The middle of the mouth, at the front of the snout or the beak (design 4.6). */
  readonly mouth: Vec3;
  /** The point on the floor under the middle of the body. */
  readonly floor: Vec3;
  /** The point in the middle of the palm of the left hand. */
  readonly palmL: Vec3;
  /** The point in the middle of the palm of the right hand. */
  readonly palmR: Vec3;
  /** The middle of the finger block of the left hand, on its `fingers` bone. */
  readonly fingerBlockL: Vec3;
  /** The middle of the finger block of the right hand, on its `fingers` bone. */
  readonly fingerBlockR: Vec3;
}

/**
 * Builds the body of the parametric biped in its bind pose, and adds its parts to a mesh (design
 * 4.3, 4.5). The animal faces -z, its left side is -x, and the floor is at y = 0. The arms hang
 * down beside the body. Each part follows one bone (design 4.4).
 *
 * The function makes the frame of the body (`body-frame.ts`), then adds the trunk
 * (`trunk.ts`), the tail (`tails.ts`), the arms (`arms.ts`), and the legs (`legs.ts`), in this
 * order. Each area reads the joint places of the frame, and no area reads another area.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param stance The seat under the body, or no seat.
 * @returns The bind positions of the body bones.
 */
export function buildBiped(
  builder: MeshBuilder,
  species: SpeciesParams,
  stance: Stance,
): BodyBones {
  if (species.body === 'fox') {
    return buildFoxBody(builder, species, stance);
  }

  const frame = bodyFrame(species, stance);
  const colors = bodyColors(species);

  const trunk = buildTrunk(builder, species, colors, frame);
  const [tail1, tail2] = addTail(builder, species, colors, frame.h, tailBase(frame));
  const arms = buildArms(builder, species, colors, frame);
  const legs = buildLegs(builder, species, colors, frame);

  return {
    headHeight: frame.h,
    headCenter: trunk.headCenter,
    mouth: trunk.mouth,
    floor: [0, 0, -frame.forward],
    palmL: arms.palmL,
    palmR: arms.palmR,
    fingerBlockL: arms.fingerBlockL,
    fingerBlockR: arms.fingerBlockR,
    positions: {
      root: [0, 0, 0],
      hips: trunk.positions.hips,
      spine: trunk.positions.spine,
      chest: trunk.positions.chest,
      neck: trunk.positions.neck,
      head: trunk.positions.head,
      jaw: trunk.positions.jaw,
      eyeL: trunk.positions.eyeL,
      eyeR: trunk.positions.eyeR,
      earL: trunk.positions.earL,
      earR: trunk.positions.earR,
      tail1,
      tail2,
      trunk1: trunk.positions.trunk1,
      trunk2: trunk.positions.trunk2,
      trunk3: trunk.positions.trunk3,
      shoulderL: arms.positions.shoulderL,
      upperArmL: arms.positions.upperArmL,
      forearmL: arms.positions.forearmL,
      handL: arms.positions.handL,
      fingersL: arms.positions.fingersL,
      shoulderR: arms.positions.shoulderR,
      upperArmR: arms.positions.upperArmR,
      forearmR: arms.positions.forearmR,
      handR: arms.positions.handR,
      fingersR: arms.positions.fingersR,
      thighL: legs.thighL,
      shinL: legs.shinL,
      footL: legs.footL,
      thighR: legs.thighR,
      shinR: legs.shinR,
      footR: legs.footR,
    },
  };
}
