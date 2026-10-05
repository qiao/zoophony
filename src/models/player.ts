import { buildBiped } from './biped.ts';
import type { BodyBones } from './biped.ts';
import { DEG, add, basisRotation, cross, normalize, reject, scale, transform } from './math.ts';
import type { Vec3 } from './math.ts';
import { MeshBuilder } from './mesh.ts';
import type { MeshData } from './mesh.ts';
import { CHAIR } from './props.ts';
import { boneIndex, makeSkeleton } from './rig.ts';
import type { Skeleton } from './rig.ts';
import { SPECIES } from './species.ts';
import type { SpeciesId } from './species.ts';
import { BOW, INSTRUMENT_SCALE, addBow, addViolin } from './instruments/strings.ts';
import type { BowAnchors, ViolinAnchors } from './instruments/strings.ts';

/** The instruments that the generator builds. Step 4 adds the others of design 4.6. */
export type InstrumentId = 'violin';

/**
 * The hold of the violin under the chin (design 4.6), in the bind pose. The values fit the
 * players of the reference image.
 */
export const VIOLIN_HOLD = {
  /** The tail end of the violin from the head center, in head heights: left, down, and front. */
  offset: [-0.1, -0.6, -0.3] as const,
  /** The turn of the violin to the left of the front. */
  yaw: 70 * DEG,
  /** The tilt of the scroll below the horizontal. */
  pitch: 8 * DEG,
  /** The turn of the top plate from up to the front. */
  roll: 50 * DEG,
} as const;

/** One player: an animal, its instrument, and its bow as one skinned mesh (design 4.4). */
export interface PlayerModel {
  readonly mesh: MeshData;
  readonly skeleton: Skeleton;
  readonly body: BodyBones;
  readonly violin: ViolinAnchors;
  readonly bow: BowAnchors;
}

/** The axes of the violin in the axes of the model. */
interface ViolinAxes {
  /** The unit axis from the tail end to the scroll. */
  readonly axis: Vec3;
  /** The unit normal of the top plate. */
  readonly top: Vec3;
}

/**
 * Calculates the axes of the violin from the hold values.
 *
 * @returns The axes.
 */
function violinAxes(): ViolinAxes {
  const h = VIOLIN_HOLD;
  const axis: Vec3 = [
    -Math.sin(h.yaw) * Math.cos(h.pitch),
    -Math.sin(h.pitch),
    -Math.cos(h.yaw) * Math.cos(h.pitch),
  ];
  const up = normalize(reject([0, 1, 0], axis));
  // `front` is normal to the axis and to up, on the side of the audience.
  const front = normalize(cross(axis, up));
  return {
    axis,
    top: normalize(add(scale(up, Math.cos(h.roll)), scale(front, Math.sin(h.roll)))),
  };
}

/**
 * Builds one player as one skinned mesh: the body of its species, the instrument, and the bow
 * (design 4.4, 4.7). The mesh is in its seated bind pose. The player faces -z, and the floor
 * under the seat is at y = 0.
 *
 * @param species The species of the player.
 * @param instrument The instrument of the player.
 * @returns The mesh data, the skeleton, and the points that the pose needs.
 */
export function buildPlayer(species: SpeciesId, instrument: InstrumentId): PlayerModel {
  const builder = new MeshBuilder();
  const body = buildBiped(builder, SPECIES[species], CHAIR.seatHeight);
  const h = body.headHeight;

  switch (instrument) {
    case 'violin': {
      const { axis, top } = violinAxes();
      const [ox, oy, oz] = VIOLIN_HOLD.offset;
      const origin = add(body.headCenter, [ox * h, oy * h, oz * h]);
      const size: Vec3 = [INSTRUMENT_SCALE, INSTRUMENT_SCALE, INSTRUMENT_SCALE];
      const violin = addViolin(
        builder,
        transform(origin, basisRotation(axis, top), size),
        boneIndex('instrument'),
      );
      // In the bind pose, the bow lies in the hanging right hand and points to the left (-x),
      // with the hair down.
      const grip = add(body.palmR, [0, 0, -0.07 * h]);
      const bowHold = transform(
        add(grip, [BOW.grip * INSTRUMENT_SCALE, 0, 0]),
        basisRotation([-1, 0, 0], [0, 1, 0]),
        size,
      );
      const bow = addBow(builder, bowHold, boneIndex('bow'));
      const p = body.positions;
      const skeleton = makeSkeleton(
        {
          ...p,
          instrument: origin,
          bow: bow.grip,
          malletL: body.palmL,
          malletR: body.palmR,
          baton: body.palmR,
          slide: origin,
        },
        'chest',
      );
      return { mesh: builder.build(), skeleton, body, violin, bow };
    }
    default: {
      // A new member of InstrumentId fails the TypeScript check here.
      const unhandled: never = instrument;
      throw new Error(`The instrument "${String(unhandled)}" is not known.`);
    }
  }
}
