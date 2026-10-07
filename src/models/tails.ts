import { MathUtils, Vector3 } from 'three';
import { partColor, unknownValue } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { blendSkin, transform } from './mesh.ts';
import { toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import type { CornerSkin, MeshBuilder } from './mesh.ts';
import { ball } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { SpeciesParams } from './species.ts';
import { sweep } from './sweep.ts';
import type { SweepRing } from './sweep.ts';

/**
 * The half width of the band of the tail joint, in H (plan 2.3 of the skinned bodies): the skin
 * blends from `tail1` to `tail2` with `smoothstep(-0.08, 0.08)` around the joint.
 */
const TAIL_BAND = 0.08;

/** The place of the rings close to a tail joint, as a part of the gap to the next ring. */
const JOINT_RING = 0.4;

/**
 * The largest distance of the rings close to a tail joint from the joint, as a part of the radius
 * of the joint ring. Close rings keep the bend of a thin tail round: with 1.5 of the radius, the
 * faces of the thin tail turned by 44° at the joint.
 */
const JOINT_NEAR = 0.75;

/**
 * The sides and the rings of the ball of a puff tail. The faceted icosahedron of 20 faces before
 * showed hard facets under the crease angle.
 */
const PUFF_SIDES = 10;

/** The rings of the ball of a puff tail, from pole to pole. */
const PUFF_RINGS = 5;

/**
 * The path of a tail of two bones: the direction and the length in H of each segment. The tail
 * leaves the body at the seat, goes back through the open back under the top rail of the chair,
 * and hangs down.
 */
interface TailPath {
  readonly first: Vec3;
  readonly firstLength: number;
  readonly second: Vec3;
  readonly secondLength: number;
}

/**
 * The space between the tip of a bushy tail and the floor, in meters. The tip stays above the
 * tripod legs of the music stands of the next row. With 0.03 m, the stands of the clarinets of the
 * reference composition touched the tails of the foxes, and `S` became 6.76 m in place of 6.6 m.
 */
const TAIL_FLOOR_GAP = 0.12;

/**
 * Gives the path of a tail of two bones (design 4.5: bushy 1.3, thin 0.7, flat 0.5 H).
 *
 * @param tail The tail type.
 * @param base The point where the tail leaves the body.
 * @param h The head height `H`, in meters.
 * @returns The path.
 */
function tailPath(tail: 'bushy' | 'thin' | 'flat', base: Vec3, h: number): TailPath {
  switch (tail) {
    case 'bushy': {
      // The brush hangs down to the floor behind the seat. It hangs less steeply when the base
      // is low, as on a standing player, so that its tip stays above the floor.
      const first: Vec3 = [0, -0.6, 1];
      const firstLength = 0.3;
      const secondLength = 0.8;
      const joint = base[1] - (0.6 / Math.hypot(0.6, 1)) * firstLength * h;
      const down = Math.min(0.97, (joint - TAIL_FLOOR_GAP) / (secondLength * h));
      const back = Math.max(0.08, Math.sqrt(Math.max(0, 1 - down * down - 0.08 * 0.08)));
      return { first, firstLength, second: [0.08, -down, back], secondLength };
    }
    case 'thin':
      return { first: [0, -0.35, 1], firstLength: 0.3, second: [0.15, -1, 0.3], secondLength: 0.4 };
    case 'flat':
      return { first: [0, -0.2, 1], firstLength: 0.15, second: [0, -1, 0.35], secondLength: 0.35 };
    default:
      throw unknownValue('tail type', tail);
  }
}

/** One ring of a tail on one segment of its path: its place, its radius, and its flatness. */
interface TailStation {
  /** The distance of the ring along the segment, in H. */
  readonly along: number;
  /** The radius of the ring, in H. 0 makes the round tip. */
  readonly radius: number;
  /** The scale of the ring from the front to the back. Default 1. */
  readonly flat?: number;
}

/** The rings of a tail of two bones: the rings of its first and second segments. */
interface TailForm {
  /** The rings of the first segment, from the base, before the joint. */
  readonly first: readonly TailStation[];
  /** The ring at the joint. Its `along` does not count. */
  readonly joint: TailStation;
  /** The rings of the second segment, after the joint, to the tip. */
  readonly second: readonly TailStation[];
  /** The number of sides of the tube. */
  readonly sides: number;
  /** The index of the ring in the second segment from which the tip has the belly color. */
  readonly bellyFrom?: number;
}

/**
 * Gives the rings of a tail of two bones, in H (design 4.5). The tip of a tail is a round point.
 *
 * @param tail The tail type.
 * @param path The path of the tail.
 * @returns The rings.
 */
function tailForm(tail: 'bushy' | 'thin' | 'flat', path: TailPath): TailForm {
  const l1 = path.firstLength;
  const l2 = path.secondLength;
  switch (tail) {
    case 'thin':
      return {
        first: [
          { along: 0, radius: 0.05 },
          { along: l1 / 2, radius: 0.045 },
        ],
        joint: { along: l1, radius: 0.04 },
        second: [
          { along: 0.5 * l2, radius: 0.034 },
          { along: 0.92 * l2, radius: 0.025 },
          { along: l2, radius: 0 },
        ],
        sides: 8,
      };
    case 'bushy':
      // A large brush, 0.54 H wide, with a tip of the belly color, as the tail of the fox in
      // `animals.webp`.
      return {
        first: [
          { along: 0, radius: 0.08 },
          { along: 0.6 * l1, radius: 0.2 },
        ],
        joint: { along: l1, radius: 0.22 },
        second: [
          { along: 0.35 * l2, radius: 0.27 },
          { along: 0.55 * l2, radius: 0.22 },
          { along: 0.8 * l2, radius: 0.14 },
          { along: l2, radius: 0 },
        ],
        sides: 10,
        bellyFrom: 1,
      };
    case 'flat':
      // A short stalk and a flat paddle of 0.45 H wide and 0.06 H thick, with its broad face to
      // the back.
      return {
        first: [
          { along: 0, radius: 0.06 },
          { along: l1 / 2, radius: 0.06 },
        ],
        joint: { along: l1, radius: 0.06 },
        second: [
          { along: 0.15 * l2, radius: 0.2, flat: 0.15 },
          { along: 0.55 * l2, radius: 0.225, flat: 0.133 },
          { along: 0.8 * l2, radius: 0.16, flat: 0.15 },
          { along: l2, radius: 0 },
        ],
        sides: 8,
      };
    default:
      throw unknownValue('tail type', tail);
  }
}

/**
 * Gives a ring of a tail close to its joint: at {@link JOINT_RING} of the gap to the next ring,
 * and at most {@link JOINT_NEAR} of the joint radius from the joint, with the radius and the
 * flatness between the two rings.
 *
 * @param joint The ring at the joint.
 * @param next The next ring away from the joint.
 * @param gap The distance from the joint to the next ring along the segment, in H: negative on
 *   the first segment, positive on the second.
 * @returns The ring, with its distance from the joint along the segment.
 */
function nearJoint(joint: TailStation, next: TailStation, gap: number): TailStation {
  const along = Math.sign(gap) * Math.min(JOINT_NEAR * joint.radius, JOINT_RING * Math.abs(gap));
  const part = along / gap;
  const radius = joint.radius + (next.radius - joint.radius) * part;
  const flat = (joint.flat ?? 1) + ((next.flat ?? 1) - (joint.flat ?? 1)) * part;
  return flat === 1 ? { along, radius } : { along, radius, flat };
}

/**
 * Adds a tail of two bones along its path: one round skinned tube of rings, which blends from
 * `tail1` to `tail2` at the joint. The ring at the joint turns half way between the two segments.
 *
 * @param builder The mesh that gets the parts.
 * @param tail The tail type.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @param base The point where the tail leaves the body.
 * @param joint The point where the second bone starts.
 */
function addLongTail(
  builder: MeshBuilder,
  tail: 'bushy' | 'thin' | 'flat',
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  base: Vec3,
  joint: Vec3,
): void {
  const path = tailPath(tail, base, h);
  const form = tailForm(tail, path);
  const color = partColor(species, colors, 'tail');
  const first = new Vector3(...path.first).normalize();
  const second = new Vector3(...path.second).normalize();
  // Two rings close to the joint, on each side of the joint ring, keep the bend of the tube round.
  const before = form.first.at(-1) ?? form.joint;
  const after = form.second[0] ?? form.joint;
  const places: readonly (readonly [Vec3, Vector3, TailStation])[] = [
    ...form.first.map((station) => [base, first, station] as const),
    [joint, first, nearJoint(form.joint, before, -(form.joint.along - before.along))],
    [joint, first.clone().add(second).normalize(), { ...form.joint, along: 0 }],
    [joint, second, nearJoint(form.joint, after, after.along)],
    ...form.second.map((station) => [joint, second, station] as const),
  ];
  const rings = places.map(([from, axis, station], i): SweepRing => {
    const at = toVec3(new Vector3(...from).addScaledVector(axis, station.along * h));
    const turn = i % 2 === 0 ? 0 : 0.5;
    if (station.flat === undefined) {
      return { at, axis: toVec3(axis), radius: station.radius * h, turn };
    }
    return { at, axis: toVec3(axis), radius: station.radius * h, turn, flat: station.flat };
  });

  // The skin blends from `tail1` to `tail2` in the band of the joint, by the distance of a
  // corner past the plane of the joint ring. Thus the ring at the joint follows both bones with
  // the weight 0.5, and a turn of `tail2` bends the tail smoothly.
  const across = first.clone().add(second).normalize();
  const band = TAIL_BAND * h;
  const tail1 = boneIndex('tail1');
  const tail2 = boneIndex('tail2');
  const skin = (p: Vec3): CornerSkin => {
    const past = new Vector3(...p).sub(new Vector3(...joint)).dot(across);
    const weight = MathUtils.smoothstep(past, -band, band);
    // A corner of the joint ring can miss the plane by a rounding error.
    return blendSkin(tail1, tail2, Math.abs(weight - 0.5) < 1e-6 ? 0.5 : weight);
  };

  const belly =
    form.bellyFrom === undefined ? rings.length - 1 : form.first.length + 1 + form.bellyFrom;
  // The side direction is the normal of the plane of the bend, so the rings do not twist.
  const normal = new Vector3().crossVectors(first, second);
  const side: Vec3 = normal.lengthSq() > 1e-9 ? toVec3(normal.normalize()) : [1, 0, 0];
  const options = { sides: form.sides, side };
  const tip = belly < rings.length - 1;
  builder.add(sweep(rings.slice(0, belly + 1), { ...options, end: tip ? 'open' : 'cap' }), {
    color,
    skin,
    finish: 'fur',
  });
  if (tip) {
    builder.add(sweep(rings.slice(belly), { ...options, start: 'open' }), {
      color: colors.belly,
      skin,
      finish: 'fur',
    });
  }
}

/**
 * Adds the tail of a species behind the hips (design 4.3, 4.5). The tail has the fur color, or
 * the accent color if the accent parts include the tail.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param h The head height `H`, in meters.
 * @param base The point where the tail leaves the body.
 * @returns The bind positions of the `tail1` and `tail2` bones.
 */
export function addTail(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  base: Vec3,
): [Vec3, Vec3] {
  const tail = species.tail;
  switch (tail) {
    case 'none':
      return [base, toVec3(new Vector3(...base).add(new Vector3(0, 0, 0.1 * h)))];
    case 'puff':
      // A round ball of 0.42 H on one bone (design 4.5), low on the back and 0.26 H behind the
      // root of the tail, so that it stands out of the round back and shows under the top rail of
      // the chair, as in `animals.webp`.
      builder.add(ball(0.21 * h, PUFF_SIDES, PUFF_RINGS), {
        color: partColor(species, colors, 'tail'),
        bone: boneIndex('tail1'),
        at: transform(toVec3(new Vector3(...base).add(new Vector3(0, -0.08 * h, 0.26 * h)))),
        finish: 'fur',
      });
      return [base, toVec3(new Vector3(...base).add(new Vector3(0, 0, 0.1 * h)))];
    case 'bushy':
    case 'thin':
    case 'flat': {
      const path = tailPath(tail, base, h);
      const joint = toVec3(
        new Vector3(...base).addScaledVector(
          new Vector3(...path.first).normalize(),
          path.firstLength * h,
        ),
      );
      addLongTail(builder, tail, species, colors, h, base, joint);
      return [base, joint];
    }
    default:
      throw unknownValue('tail type', tail);
  }
}
