import { Quaternion, Vector3 } from 'three';

import { placePoint } from '../src/models/instruments/hold.ts';
import { STRING_SCALES, VIOLIN } from '../src/models/instruments/strings.ts';
import { buildPlayer } from '../src/models/player.ts';
import type { PlayerModel } from '../src/models/player.ts';
import { boneIndex } from '../src/models/rig.ts';
import { SPECIES, SPECIES_IDS, isSpeciesId } from '../src/models/species.ts';
import type { SpeciesId, SpeciesParams } from '../src/models/species.ts';
import { toVec3 } from '../src/models/tuples.ts';
import type { Vec3 } from '../src/models/tuples.ts';
import { SPECIES_HOLDS, bowedRig, holdOf, playingFrames } from '../src/pose/bowed-rig.ts';
import { createBowPlaces, instrumentAt } from '../src/pose/bowed.ts';
import { poseShoulder } from '../src/pose/ik.ts';
import { setHolds } from './hold-sets.ts';

/** An instrument that the player holds under the chin. */
export type ChinInstrument = 'violin' | 'viola';

/** A support of the player that `pnpm hold-reach` takes. */
export type ReachSupport = 'chair' | 'stand';

/**
 * The total lengths of the smallest and the largest violin of the size chart of a violin teacher,
 * in meters (`docs/research/2026-10-13-studio-rabbit.md`, section 5).
 */
const REAL_VIOLINS = { smallest: 0.33, largest: 0.59 } as const;

/** The reach of the arms of a player against its instrument under the chin, in meters. */
export interface HoldReach {
  /**
   * The arm of each side along its joints: from the shoulder joint over the elbow and the wrist
   * to the middle of the palm.
   */
  readonly arms: Readonly<Record<'L' | 'R', number>>;
  /** The length of the instrument, from the tail end to the scroll. */
  readonly length: number;
  /**
   * The scale of the instrument, as a factor of the instrument of the app. For a violin, it is
   * the `violinScale` of the species.
   */
  readonly scale: number;
  /** The distance from the left shoulder joint to the scroll, in the playing pose of the hold. */
  readonly scroll: number;
  /** The reached part of the fingerboard, from 0 at the nut to 1 at the end (`stopRange`). */
  readonly stopRange: readonly [low: number, high: number];
  /** The reached part of the bow hair, from the frog end (`bowRange`). */
  readonly bowRange: readonly [low: number, high: number];
  /** The length of the bow hair. */
  readonly hairLength: number;
  /**
   * The factor of the length that puts the scroll in the middle of the palm of the extended left
   * arm, the rule of a violin shop. It is `null` when no length does.
   */
  readonly ruleFactor: number | null;
}

/**
 * Solves the rule of a violin shop on a line: the instrument grows from its tail end, which stays
 * in place, and its scroll comes to the middle of the palm of the extended left arm. The scroll
 * is then `arm` from the shoulder joint.
 *
 * @param tail The tail end, in the playing pose.
 * @param scroll The scroll at the current length, in the playing pose.
 * @param shoulder The left shoulder joint, in the playing pose.
 * @param arm The arm from the shoulder joint to the middle of the palm.
 * @returns The largest factor `f > 0` of the current length that puts the scroll at
 *   `tail + f (scroll - tail)` at the distance `arm` from the shoulder joint, or `null` when no
 *   factor does.
 */
export function ruleFactor(tail: Vec3, scroll: Vec3, shoulder: Vec3, arm: number): number | null {
  const d = new Vector3(...scroll).sub(new Vector3(...tail));
  const e = new Vector3(...tail).sub(new Vector3(...shoulder));
  const a = d.lengthSq();
  const b = d.dot(e);
  const disc = b * b - a * (e.lengthSq() - arm * arm);
  if (a === 0 || disc < 0) {
    return null;
  }

  const factor = (-b + Math.sqrt(disc)) / a;
  return factor > 0 ? factor : null;
}

/**
 * Gives the length of an arm of a player along its joints: from the shoulder joint over the elbow
 * and the wrist to the middle of the palm. The rule of a violin shop measures the extended arm.
 *
 * @param model The player.
 * @param side The side of the arm.
 * @returns The length, in meters.
 */
function armLength(model: PlayerModel, side: 'L' | 'R'): number {
  const joint = (bone: 'upperArm' | 'forearm' | 'hand'): Vector3 =>
    new Vector3(...(model.skeleton.positions[boneIndex(`${bone}${side}`)] ?? [0, 0, 0]));
  const palm = new Vector3(...(side === 'L' ? model.body.palmL : model.body.palmR));
  return (
    joint('upperArm').distanceTo(joint('forearm')) +
    joint('forearm').distanceTo(joint('hand')) +
    joint('hand').distanceTo(palm)
  );
}

/**
 * Measures the reach of the arms of a species against its violin or viola in the playing pose of
 * its hold (`holdOf()`), with no idle motion.
 *
 * @param species The species.
 * @param instrument The instrument.
 * @param support The support of the player.
 * @returns The reach.
 * @throws Error if the instrument has no fingerboard.
 */
export function holdReach(
  species: SpeciesId,
  instrument: ChinInstrument,
  support: ReachSupport,
): HoldReach {
  const model = buildPlayer(species, instrument, 4, support);
  const rig = bowedRig(model, instrument, holdOf(species, instrument));
  const frames = playingFrames(rig);
  const { place } = createBowPlaces();
  instrumentAt(rig, frames, 1, place);
  const posed = (at: Vec3): Vector3 =>
    new Vector3(...placePoint(model.pieces, { bone: 'instrument', at }))
      .sub(new Vector3(...rig.pivot))
      .applyQuaternion(place.rotation)
      .add(place.pivot);

  // The piece of the instrument scales around its origin, the tail end. The nut of the
  // fingerboard thus gives the size of the piece.
  const board = model.instrument.targets.find((target) => target.kind === 'fingerboard');
  if (!board) {
    throw new Error(`The ${instrument} has no fingerboard.`);
  }
  const size = board.from[0] / VIOLIN.nut;
  const tail = posed([0, 0, 0]);
  const scroll = posed([VIOLIN.length * size, VIOLIN.stringHeight * size, 0]);
  const shoulder = poseShoulder(rig.armL, frames.chest, rig.chestBind, new Quaternion()).position;
  const arms = { L: armLength(model, 'L'), R: armLength(model, 'R') };

  return {
    arms,
    length: VIOLIN.length * size,
    scale: size / STRING_SCALES[instrument],
    scroll: scroll.distanceTo(shoulder),
    stopRange: rig.stopRange,
    bowRange: rig.bowRange,
    hairLength: rig.hairLength,
    ruleFactor: ruleFactor(toVec3(tail), toVec3(scroll), toVec3(shoulder), arms.L),
  };
}

/**
 * Measures the reach with another `violinScale` of the species, in memory. The source files do
 * not change, and the old value comes back after the measure.
 *
 * @param species The species.
 * @param support The support of the player.
 * @param scale The scale of the violin and its bow.
 * @returns The reach of the violin at the scale.
 */
export function violinReachAt(species: SpeciesId, support: ReachSupport, scale: number): HoldReach {
  const params: SpeciesParams = SPECIES[species];
  const had = Object.hasOwn(params, 'violinScale');
  const old = params.violinScale;
  Reflect.set(params, 'violinScale', scale);
  try {
    return holdReach(species, 'violin', support);
  } finally {
    if (had) {
      Reflect.set(params, 'violinScale', old);
    } else {
      Reflect.deleteProperty(params, 'violinScale');
    }
  }
}

/** The texts of the reached parts of a reach. */
interface RangeTexts {
  /** The reached part of the fingerboard. */
  readonly stop: string;
  /** The reached part of the bow hair. */
  readonly bow: string;
}

/**
 * Writes a part of the fingerboard and a part of the bow hair.
 *
 * @param reach The reach.
 * @returns The two texts.
 */
function rangeTexts(reach: HoldReach): RangeTexts {
  const [stopLow, stopHigh] = reach.stopRange;
  const [bowLow, bowHigh] = reach.bowRange;
  return {
    stop: `${stopLow.toFixed(2)} to ${stopHigh.toFixed(2)}`,
    bow: `${bowLow.toFixed(3)} to ${bowHigh.toFixed(3)} m of ${reach.hairLength.toFixed(3)} m`,
  };
}

/**
 * Writes the report of `pnpm hold-reach`.
 *
 * @param species The species.
 * @param instrument The instrument.
 * @param support The support of the player.
 * @returns The lines.
 */
export function holdReachLines(
  species: SpeciesId,
  instrument: ChinInstrument,
  support: ReachSupport,
): string[] {
  const reach = holdReach(species, instrument, support);
  const own = SPECIES_HOLDS[species]?.[instrument] !== undefined;
  const ranges = rangeTexts(reach);
  const m = (value: number): string => `${value.toFixed(3)} m`;
  const spare = reach.arms.L - reach.scroll;
  const name = instrument === 'violin' ? 'Violin' : 'Viola';
  const lines = [
    `${species} with the ${instrument} on the ${support}, hold ${own ? `${instrument}@${species} (SPECIES_HOLDS)` : `${instrument} (BOWED_HOLDS)`}:`,
    `  Arm from the shoulder joint to the middle of the palm: L ${m(reach.arms.L)}, R ${m(reach.arms.R)}`,
    `  ${name}: ${m(reach.length)}, scale ${reach.scale.toFixed(3)} of the ${instrument} of the app${instrument === 'violin' ? ' (violinScale)' : ''}`,
    `  Left shoulder joint to the scroll in the playing pose: ${m(reach.scroll)} (arm L less this: ${Math.abs(spare) < 5e-4 ? '0.000' : spare.toFixed(3)} m)`,
    `  Reached part of the fingerboard (stopRange, 0 at the nut, 1 at the end): ${ranges.stop}`,
    `  Reached part of the bow hair (bowRange, from the frog end): ${ranges.bow}`,
    '  Rule of a violin shop (the scroll in the middle of the palm of the extended left arm):',
  ];
  if (reach.ruleFactor === null) {
    lines.push('    No length of the instrument puts the scroll in the palm.');
    return lines;
  }

  const ruleScale = reach.scale * reach.ruleFactor;
  const ruleLength = reach.length * reach.ruleFactor;
  lines.push(`    scale ${ruleScale.toFixed(3)}, ${instrument} ${m(ruleLength)}`);
  if (instrument === 'viola') {
    lines.push(
      '    The app has no scale of the viola (buildInstrument scales only the violin), so the',
      '    tool does not rebuild the player at this scale.',
    );
    return lines;
  }

  const fits =
    ruleLength < REAL_VIOLINS.smallest
      ? 'smaller than the smallest real violin'
      : ruleLength > REAL_VIOLINS.largest
        ? 'larger than the largest real violin'
        : 'a real violin size';
  lines.push(
    `    Real violins: ${m(REAL_VIOLINS.smallest)} (1/32) to ${m(REAL_VIOLINS.largest)} (4/4), so this is ${fits}.`,
  );
  const check = violinReachAt(species, support, ruleScale);
  const checked = rangeTexts(check);
  lines.push(
    `  Check, rebuilt with violinScale ${ruleScale.toFixed(3)}: scroll ${m(check.scroll)} (arm L ${m(check.arms.L)}),`,
    `    stopRange ${checked.stop}, bowRange ${checked.bow}`,
  );
  return lines;
}

/** The options of `pnpm hold-reach <species>`. */
export interface ReachOptions {
  /** The instrument under the chin. */
  readonly instrument: ChinInstrument;
  /** The support of the player. */
  readonly support: ReachSupport;
  /**
   * The variants of `--set`, each a list of hold changes separated by `;`, as in
   * `pnpm pose-depth`. The report gives the base first, then each variant.
   */
  readonly sets: readonly string[];
}

/** The usage text of `pnpm hold-reach`. */
const USAGE =
  'Usage: pnpm hold-reach <species> [--instrument violin|viola] [--support chair|stand] [--set <path>=<value>[;<path>=<value>]...]...';

/**
 * Reads the options after the species. Each option has one value, and `--set` can come more than
 * one time.
 *
 * @param args The arguments after the species.
 * @returns The options. The first permitted value of an option is its default.
 * @throws Error if an option is not known, has no value, or has a value that is not permitted.
 */
export function parseReachOptions(args: readonly string[]): ReachOptions {
  let instrument: ChinInstrument = 'violin';
  let support: ReachSupport = 'chair';
  const sets: string[] = [];
  const pick = <T extends string>(flag: string, text: string, values: readonly T[]): T => {
    const value = values.find((v) => v === text);
    if (value === undefined) {
      throw new Error(`${flag} takes one of: ${values.join(', ')}.`);
    }
    return value;
  };
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i] ?? '';
    const value = args[i + 1];
    if (value === undefined) {
      throw new Error(`The option "${flag}" has no value.\n${USAGE}`);
    }
    switch (flag) {
      case '--instrument':
        instrument = pick(flag, value, ['violin', 'viola'] as const);
        break;
      case '--support':
        support = pick(flag, value, ['chair', 'stand'] as const);
        break;
      case '--set':
        sets.push(value);
        break;
      default:
        throw new Error(`The option "${flag}" is not known.\n${USAGE}`);
    }
  }
  return { instrument, support, sets };
}

/**
 * Writes the report of `pnpm hold-reach` for the base and for each variant of `--set`. Each
 * variant changes the holds in memory, as `pnpm pose-depth --set` does, and the old values come
 * back after its report.
 *
 * @param species The species.
 * @param options The options.
 * @returns The lines. With variants, each report starts with the line of its changes.
 * @throws Error if a variant names an unknown key or a value that does not fit, before the first
 *   report.
 */
export function holdReachVariantLines(species: SpeciesId, options: ReachOptions): string[] {
  for (const set of options.sets) {
    setHolds(set).undo();
  }

  const lines: string[] = [];
  for (const set of ['', ...options.sets]) {
    const { undo, text } = setHolds(set);
    try {
      if (options.sets.length > 0) {
        lines.push(`${text || 'base'}:`);
      }
      lines.push(...holdReachLines(species, options.instrument, options.support));
    } finally {
      undo();
    }
  }
  return lines;
}

function main(): void {
  const [species = '', ...args] = process.argv.slice(2);
  if (!isSpeciesId(species)) {
    console.error(`${USAGE}, with a species of: ${SPECIES_IDS.join(', ')}.`);
    process.exit(1);
  }

  console.log(holdReachVariantLines(species, parseReachOptions(args)).join('\n'));
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
