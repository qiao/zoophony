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
import { runTool, speciesAnimal, takeGlb, withGlbBody } from './glb-swap.ts';
import { setHolds } from './hold-sets.ts';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { armReach, parseConfig } from './rig-mesh.ts';

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
  const { model, rig, size, tail, scroll, shoulder } = posedViolin(species, instrument, support);
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

/** The player with its instrument under the chin, in the playing pose of its hold. */
interface PosedViolin {
  /** The player. */
  readonly model: PlayerModel;
  /** The rig of the hold. */
  readonly rig: ReturnType<typeof bowedRig>;
  /** The size of the piece of the instrument, as a factor of `VIOLIN`. */
  readonly size: number;
  /** The tail end, in the playing pose. */
  readonly tail: Vector3;
  /** The scroll, in the playing pose. */
  readonly scroll: Vector3;
  /** The left shoulder joint, in the playing pose. */
  readonly shoulder: Vector3;
}

/**
 * Poses a species with its violin or viola in the playing pose of its hold (`holdOf()`), with no
 * idle motion.
 *
 * @param species The species.
 * @param instrument The instrument.
 * @param support The support of the player.
 * @returns The player, the rig, the size of the instrument, and the posed points.
 * @throws Error if the instrument has no fingerboard.
 */
function posedViolin(
  species: SpeciesId,
  instrument: ChinInstrument,
  support: ReachSupport,
): PosedViolin {
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
  return { model, rig, size, tail, scroll, shoulder };
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

/**
 * Gives the distance from the shoulder joint to the scroll of a longer or shorter instrument: the
 * tail end stays in its place, and the instrument grows along its axis.
 *
 * @param tail The tail end, in the playing pose.
 * @param scroll The scroll at the current length, in the playing pose.
 * @param shoulder The left shoulder joint, in the playing pose.
 * @param factor The factor of the current length.
 * @returns The distance from the shoulder joint to `tail + factor (scroll - tail)`.
 */
export function scrollReach(tail: Vec3, scroll: Vec3, shoulder: Vec3, factor: number): number {
  return new Vector3(...scroll)
    .sub(new Vector3(...tail))
    .multiplyScalar(factor)
    .add(new Vector3(...tail))
    .distanceTo(new Vector3(...shoulder));
}

/**
 * Gives the factor of the upper arm and the forearm that gives an arm a reach: the paw keeps its
 * size, as the arm factor of `pnpm rig-mesh` does.
 *
 * @param reach The reach to give, from the shoulder joint to the middle of the palm.
 * @param arm The current reach of the arm.
 * @param paw The part of the arm from the wrist to the middle of the palm.
 * @returns The factor.
 */
export function armFactorFor(reach: number, arm: number, paw: number): number {
  return (reach - paw) / (arm - paw);
}

/** The reach that one size of the violin needs in the hold of a species. */
export interface SizeReach {
  /** The scale of the violin, as a factor of the violin of the app (`violinScale`). */
  readonly scale: number;
  /** The length of the violin from the tail end to the scroll, in meters. */
  readonly length: number;
  /**
   * The reach that puts the scroll in the middle of the palm of the extended left arm: the
   * distance from the left shoulder joint to the scroll, with the tail end in its place in the
   * playing pose and the violin longer or shorter along its axis ({@link scrollReach}).
   */
  readonly reach: number;
  /**
   * The distance from the left shoulder joint to the scroll with the player rebuilt at the scale,
   * as a check of `reach`.
   */
  readonly rebuilt: number;
  /** The factor of the current upper arm and forearm that gives the reach ({@link armFactorFor}). */
  readonly factor: number;
  /**
   * The arm factor of the mesh rig of the species (`pnpm rig-mesh`) that gives the reach, or
   * `null` with no config of a mesh rig.
   */
  readonly rigFactor: number | null;
}

/** The arm of a mesh rig, in the meters of the app. */
export interface RigArm {
  /** The config file, relative to the repository. */
  readonly file: string;
  /** The arm factor of the config. */
  readonly armFactor: number;
  /** The reach of the left arm with the factor 1. */
  readonly short: number;
  /** The part of the left arm from the wrist to the middle of the palm. */
  readonly paw: number;
}

/**
 * Reads the arm of the mesh rig of a species from `tools/mesh-rigs/<animal>.json`.
 *
 * @param species The species.
 * @returns The arm, or `null` when the species has no mesh rig config next to this script, as in
 *   the copy of `--glb`.
 */
function rigArm(species: SpeciesId): RigArm | null {
  const animal = speciesAnimal(species);
  const path = animal ? join(import.meta.dirname, 'mesh-rigs', `${animal}.json`) : '';
  if (!animal || !existsSync(path)) {
    return null;
  }
  const config = parseConfig(readFileSync(path, 'utf8'));
  return {
    file: `tools/mesh-rigs/${animal}.json`,
    armFactor: config.armFactor,
    short: armReach(config, 'L', 1),
    paw: armReach(config, 'L', 0),
  };
}

/** The reach that each size of the violin needs in the hold of a species. */
export interface SizeReport {
  /** The reach of the left arm now, from the shoulder joint to the middle of the palm. */
  readonly arm: number;
  /** The part of the left arm from the wrist to the middle of the palm. */
  readonly paw: number;
  /** The scale of the violin now (`violinScale`). */
  readonly scale: number;
  /** The length of the violin now, in meters. */
  readonly length: number;
  /** The arm of the mesh rig of the species, or `null`. */
  readonly rig: RigArm | null;
  /** The reach of each size, in the order of the scales. */
  readonly sizes: readonly SizeReach[];
}

/**
 * Measures the reach and the arm factor that each size of the violin needs in the hold of a
 * species (`--size`). The violin grows from its tail end along its axis in the playing pose, and
 * its scroll comes to the middle of the palm of the extended left arm, the rule of a violin shop.
 * A check rebuilds the player at each scale. With `--glb`, the body of the file gives the arm, so
 * the factor of the current arm is 1 at the size that the arm of the file fits.
 *
 * @param species The species.
 * @param support The support of the player.
 * @param scales The scales of the violin (`violinScale`).
 * @returns The report.
 */
export function sizeReach(
  species: SpeciesId,
  support: ReachSupport,
  scales: readonly number[],
): SizeReport {
  const { model, size, tail, scroll, shoulder } = posedViolin(species, 'violin', support);
  const arm = armLength(model, 'L');
  const paw = new Vector3(
    ...(model.skeleton.positions[boneIndex('handL')] ?? [0, 0, 0]),
  ).distanceTo(new Vector3(...model.body.palmL));
  const scale = size / STRING_SCALES.violin;
  const rig = rigArm(species);
  const sizes: SizeReach[] = scales.map((wanted) => {
    const reach = scrollReach(toVec3(tail), toVec3(scroll), toVec3(shoulder), wanted / scale);
    return {
      scale: wanted,
      length: (VIOLIN.length * size * wanted) / scale,
      reach,
      rebuilt: violinReachAt(species, support, wanted).scroll,
      factor: armFactorFor(reach, arm, paw),
      rigFactor: rig ? armFactorFor(reach, rig.short, rig.paw) : null,
    };
  });
  return { arm, paw, scale, length: VIOLIN.length * size, rig, sizes };
}

/**
 * Writes the report of `--size` ({@link sizeReach}).
 *
 * @param species The species.
 * @param support The support of the player.
 * @param scales The scales of the violin (`violinScale`).
 * @returns The lines.
 */
export function sizeReachLines(
  species: SpeciesId,
  support: ReachSupport,
  scales: readonly number[],
): string[] {
  const { arm, paw, scale, length, rig, sizes } = sizeReach(species, support, scales);
  const m = (value: number): string => `${value.toFixed(3)} m`;
  return [
    `Violin sizes of ${species} on the ${support} (--size): the tail end stays in its place in the playing pose, and the violin grows along its axis.`,
    `  Arm L now ${m(arm)}, with a paw of ${m(paw)} from the wrist to the middle of the palm. Violin now ${m(length)}, scale ${scale.toFixed(3)}.`,
    rig
      ? `  Mesh rig ${rig.file}: arm factor ${rig.armFactor}, arm L ${m(rig.short)} with the factor 1, paw ${m(rig.paw)}.`
      : '  No config of a mesh rig next to the script (the copy of --glb holds none), so the table gives only the factor of the current arm: 1 at the size that the arm fits.',
    '',
    '| Scale | Violin m | Reach m | Rebuilt m | Arm factor of the rig | Factor of the current arm |',
    '|---:|---:|---:|---:|---:|---:|',
    ...sizes.map(
      (row) =>
        `| ${row.scale.toFixed(3)} | ${row.length.toFixed(3)} | ${row.reach.toFixed(3)} | ${row.rebuilt.toFixed(3)} | ${row.rigFactor === null ? '-' : row.rigFactor.toFixed(3)} | ${row.factor.toFixed(3)} |`,
    ),
  ];
}

/** The arguments of `pnpm hold-reach` with the option `--size` taken out. */
export interface SizeArgs {
  /** The scales of `--size`, or none with no option. */
  readonly sizes: readonly number[];
  /** The other arguments, in their order. */
  readonly rest: readonly string[];
}

/**
 * Takes the option `--size <scale>[,<scale>]...` out of the arguments of `pnpm hold-reach`.
 *
 * @param args The arguments.
 * @returns The scales and the other arguments.
 * @throws Error if the option has no value, comes more than one time, or has a scale that is not
 *   a number above 0.
 */
export function takeSizes(args: readonly string[]): SizeArgs {
  const at = args.indexOf('--size');
  if (at < 0) {
    return { sizes: [], rest: args };
  }

  const text = args[at + 1];
  const rest = args.filter((...[, i]) => i !== at && i !== at + 1);
  if (text === undefined || text.startsWith('--') || rest.includes('--size')) {
    throw new Error('The option --size comes one time, with scales of the violin, such as 0.85,1.');
  }
  const sizes = text.split(',').map((part) => (part.trim() === '' ? Number.NaN : Number(part)));
  if (!sizes.every((size) => Number.isFinite(size) && size > 0)) {
    throw new Error(`The option --size takes scales above 0, and "${text}" has another value.`);
  }
  return { sizes, rest };
}

/** The size of the instrument by the rule of a violin shop. */
export interface RuleSize {
  /** The scale, as a factor of the instrument of the app (`violinScale` for a violin). */
  readonly scale: number;
  /** The length from the tail end to the scroll, in meters. */
  readonly length: number;
}

/**
 * Gives the size of the instrument by the rule of a violin shop: the current scale and length,
 * times the factor of the rule.
 *
 * @param reach The reach.
 * @returns The size, or `null` when no length puts the scroll in the palm.
 */
export function ruleSize(reach: HoldReach): RuleSize | null {
  if (reach.ruleFactor === null) {
    return null;
  }
  return { scale: reach.scale * reach.ruleFactor, length: reach.length * reach.ruleFactor };
}

/** The texts of the reached parts of a reach. */
export interface RangeTexts {
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
export function rangeTexts(reach: HoldReach): RangeTexts {
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
  const rule = ruleSize(reach);
  if (!rule) {
    lines.push('    No length of the instrument puts the scroll in the palm.');
    return lines;
  }

  const { scale: ruleScale, length: ruleLength } = rule;
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
  'Usage: pnpm hold-reach <species> [--instrument violin|viola] [--support chair|stand] [--set <path>=<value>[;<path>=<value>]...]... [--glb <file>]';

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

/**
 * Runs the tool: `node tools/hold-reach.ts <species> [options]`. With `--glb <file>`, the species
 * gets the studio body that the export makes from the file, in a copy of `src/`
 * (`tools/glb-swap.ts`).
 */
async function main(): Promise<void> {
  const [species = '', ...args] = process.argv.slice(2);
  if (!isSpeciesId(species)) {
    console.error(`${USAGE}, with a species of: ${SPECIES_IDS.join(', ')}.`);
    process.exit(1);
  }

  const { glb, rest } = takeGlb(args);
  const { sizes, rest: others } = takeSizes(rest);
  const options = parseReachOptions(others);
  if (sizes.length > 0 && options.instrument !== 'violin') {
    throw new Error('The option --size takes the violin only.');
  }
  if (glb) {
    const animal = speciesAnimal(species);
    if (!animal) {
      throw new Error(`The species ${species} has no studio body, so --glb does not apply.`);
    }
    process.exitCode = await withGlbBody(animal, glb, (dir) =>
      runTool(dir, 'hold-reach.ts', [species, ...rest]),
    );
    return;
  }
  console.log(holdReachVariantLines(species, options).join('\n'));
  if (sizes.length > 0) {
    console.log(['', ...sizeReachLines(species, options.support, sizes)].join('\n'));
  }
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
