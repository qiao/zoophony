import { patchedDemos } from './patch-demos.ts';
import { setHolds } from './hold-sets.ts';
import { scoreOf } from '../src/score/test-score.ts';
import { CONDUCTOR } from '../src/models/cast.ts';
import type { PlayerModel } from '../src/models/player.ts';
import { BONE_NAMES } from '../src/models/rig.ts';
import type { BoneName } from '../src/models/rig.ts';
import type { SpeciesId } from '../src/models/species.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import type { TestScene } from '../src/pose/test-scene.ts';
import {
  depthLimit,
  gapPairs,
  gapSweep,
  gapText,
  pairText,
  sweepDepths,
  targetErrors,
} from '../src/pose/test-sweep.ts';
import type {
  AcceptedDepth,
  PairDepth,
  PairGap,
  RoleSweep,
  SampleSet,
  TargetError,
} from '../src/pose/test-sweep.ts';
import { SWEEP_ROLES, playSample } from '../src/pose/test-sweep-roles.ts';

/** The options of the command. */
export interface Options {
  /** The role of the first argument. */
  readonly role: RoleSweep;
  /** The demos, by the name of the file with no `.mid`. All demos of the role when empty. */
  readonly demos: readonly string[];
  /** The variants: each is a list of changes of the holds. The first is the base, with none. */
  readonly variants: readonly string[];
  /** The bones of the moving parts, one part for each bone, or `null` for the parts of the role. */
  readonly bones: readonly BoneName[] | null;
  /** The obstacles, or `null` for all obstacles of the role. */
  readonly into: readonly string[] | null;
  /**
   * The song times of a play, with the limits of a play, or `null` for the sample sets of the
   * role.
   */
  readonly times: readonly number[] | null;
  /** True to also measure the smallest gap of the head to each obstacle and of each paw to the body. */
  readonly gaps: boolean;
}

/** The text of the usage. */
const USAGE = `Usage: pnpm pose-depth <${Object.keys(SWEEP_ROLES).join(' | ')}> [--demo <id>]... [--set <path>=<value>[;<path>=<value>]...]... [--bones <list>] [--into <list>] [--times <list>] [--gaps]`;

/**
 * Tells if a text is the name of a bone.
 *
 * @param name The text.
 * @returns True for a bone name.
 */
function isBone(name: string): name is BoneName {
  return BONE_NAMES.some((bone) => bone === name);
}

/**
 * Reads the options from the arguments of the command.
 *
 * @param args The arguments.
 * @returns The options.
 * @throws Error if an option is not known, or a value does not fit.
 */
export function parseOptions(args: readonly string[]): Options {
  const [name, ...rest] = args;
  const role = Object.entries(SWEEP_ROLES).find(([key]) => key === name)?.[1];
  if (!role) {
    throw new Error(USAGE);
  }
  const demos: string[] = [];
  const variants = [''];
  let bones: BoneName[] | null = null;
  let into: string[] | null = null;
  let times: number[] | null = null;
  // The flag --gaps has no value. Each other option has one.
  const gaps = rest.includes('--gaps');
  const valued = rest.filter((arg) => arg !== '--gaps');
  for (let i = 0; i < valued.length; i += 2) {
    const value = valued[i + 1];
    if (value === undefined) {
      throw new Error(`The option "${valued[i]}" has no value.\n${USAGE}`);
    }
    const list = value.split(',');
    switch (valued[i]) {
      case '--demo':
        demos.push(value.replace(/\.mid$/, ''));
        break;
      case '--set':
        variants.push(value);
        break;
      case '--bones':
        bones = list.map((bone) => {
          if (!isBone(bone)) {
            throw new Error(`The bone "${bone}" is not known.`);
          }
          return bone;
        });
        break;
      case '--into':
        into = list.map((obstacle) => {
          if (!role.obstacles.some((o) => o.name === obstacle)) {
            throw new Error(
              `The part "${obstacle}" is not an obstacle of the ${role.role}: ${role.obstacles.map((o) => o.name).join(', ')}.`,
            );
          }
          return obstacle;
        });
        break;
      case '--times':
        times = list.map(Number);
        if (times.some((t) => !Number.isFinite(t))) {
          throw new Error(`The times "${value}" are not numbers.`);
        }
        break;
      default:
        throw new Error(`The option "${valued[i]}" is not known.\n${USAGE}`);
    }
  }
  // Each change must fit before the first sweep, so that a typing fault stops the run at once.
  for (const variant of variants) {
    setHolds(variant).undo();
  }
  return { role, demos, variants, bones, into, times, gaps };
}

/** The results of one variant in one demo. */
export interface DemoResult {
  /** The demo and the player with its species, such as `bach-bwv1048 pianist 20 (polar-bear)`. */
  readonly demo: string;
  /** The species of the player, or `null` when the scene has no player with its model. */
  readonly species: SpeciesId | null;
  /** The head height H of the body of the player, in meters. */
  readonly headHeight: number;
  /** The deepest point of each pair in each set of samples. */
  readonly sets: readonly SetResult[];
  /** The largest note-target error of each hand. */
  readonly targets: readonly TargetError[];
}

/** The deepest point and the smallest gap of each pair in one set of samples. */
export interface SetResult {
  /** The name of the set, such as `play`. */
  readonly name: string;
  /** The deepest point of each pair of a moving part and an obstacle. */
  readonly pairs: readonly PairDepth[];
  /** The smallest gap of each pair of {@link gapPairs}, or none with no `--gaps`. */
  readonly gaps: readonly PairGap[];
}

/**
 * Finds the species of the model of a player in a scene. The models of a scene come from one
 * cache, so each kind of player has one model object: the model of a place of the layout, or of
 * the conductor.
 *
 * @param scene The scene.
 * @param model The model of the player.
 * @returns The species, or `null` when no place and no conductor has the model.
 */
export function speciesOf(scene: TestScene, model: PlayerModel): SpeciesId | null {
  for (const { cast } of scene.layout.players) {
    if (scene.models.get(cast.species, cast.instrument, cast.kettles, cast.support) === model) {
      return cast.species;
    }
  }
  const conductor = scene.plan.conductor
    ? scene.models.get(CONDUCTOR.species, CONDUCTOR.instrument, 4)
    : null;
  return conductor === model ? CONDUCTOR.species : null;
}

/**
 * Adds the species to the name of a player in the sweep, in the parentheses of the name when it
 * has them.
 *
 * @param name The name of the player, such as `violinist 4 (chair)` or `pianist 20`.
 * @param species The species, or `null` for none.
 * @returns The label, such as `violinist 4 (fox-red, chair)` or `pianist 20 (polar-bear)`.
 */
export function playerLabel(name: string, species: SpeciesId | null): string {
  if (!species) {
    return name;
  }
  const inner = /^(.*) \((.*)\)$/.exec(name);
  return inner ? `${inner[1]} (${species}, ${inner[2]})` : `${name} (${species})`;
}

/**
 * Sweeps the players of the role in the demos with the holds of now. Each player gets the sample
 * sets of the role. `pnpm hold-fit` runs it too.
 *
 * @param options The demos, the song times, and the flag of the gaps.
 * @param role The role, with the parts and the obstacles of the options.
 * @returns The results of each demo.
 */
export async function sweepDemos(
  options: Pick<Options, 'demos' | 'times' | 'gaps'>,
  role: RoleSweep,
): Promise<DemoResult[]> {
  const results: DemoResult[] = [];
  for (const demo of await patchedDemos()) {
    const id = demo.file.replace(/\.mid$/, '');
    if (options.demos.length > 0 && !options.demos.includes(id)) {
      continue;
    }
    if (!role.hasRole(scoreOf(demo.bytes))) {
      continue;
    }
    const scene = sceneOf(demo.bytes);
    const times = options.times;
    for (const player of role.players(scene)) {
      // Each player gets its own sample sets: a set can be a generator, which one sweep uses up.
      const sets: readonly SampleSet[] = times
        ? [{ name: 'play', samples: times.map((song) => playSample(scene, song)) }]
        : role.sampleSets(scene);
      const species = speciesOf(scene, player.model);
      results.push({
        demo: `${id} ${playerLabel(player.name, species)}`,
        species,
        headHeight: player.model.body.headHeight,
        sets: sets.map(({ name, samples }) => {
          const gaps = options.gaps ? gapSweep(gapPairs(role)) : null;
          return {
            name,
            pairs: sweepDepths(role, player, samples, gaps?.visit),
            gaps: gaps?.gaps() ?? [],
          };
        }),
        targets: times ? [] : targetErrors(player),
      });
    }
  }
  return results;
}

/**
 * Writes the results of one variant: the deepest point of each pair in each set, with its limit,
 * the smallest gap of each pair of `--gaps`, and the largest note-target error of each hand.
 *
 * @param role The role.
 * @param results The results of each demo.
 */
function printDetails(role: RoleSweep, results: readonly DemoResult[]): void {
  for (const { demo, sets, targets } of results) {
    console.log(`  ${demo}`);
    for (const { name, pairs, gaps } of sets) {
      for (const pair of pairs) {
        const limit = depthLimit(role, pair, name);
        const mark = pair.depth > limit.depth ? ' OVER' : '';
        console.log(
          `    ${name}: ${pairText(pair)}; limit ${(limit.depth * 100).toFixed(1)} cm${mark}`,
        );
      }
      for (const gap of gaps) {
        console.log(`    ${name}: gap of the ${gapText(gap)}`);
      }
    }
    for (const { side, error, song } of targets) {
      console.log(
        `    target ${side}: ${(error * 1000).toFixed(2)} mm at song ${song.toFixed(2)} s`,
      );
    }
  }
}

/**
 * Writes one table with one row for each variant: the deepest point of each pair in each set over
 * all demos, in cm, the smallest gap of each pair of `--gaps` over all demos, in cm, and the
 * largest note-target error of each hand, in mm. A column of depths or errors with 0 in each row
 * is left out.
 *
 * @param rows The variant and the results of each row.
 */
function printTable(rows: readonly { variant: string; results: readonly DemoResult[] }[]): void {
  const columns = new Map<string, number[]>();
  const gapColumns = new Set<string>();
  const add = (column: string, row: number, value: number): void => {
    const values = columns.get(column) ?? rows.map(() => 0);
    values[row] = Math.max(values[row] ?? 0, value);
    columns.set(column, values);
  };
  const addGap = (column: string, row: number, value: number): void => {
    const values = columns.get(column) ?? rows.map(() => Infinity);
    values[row] = Math.min(values[row] ?? Infinity, value);
    columns.set(column, values);
    gapColumns.add(column);
  };
  for (const [row, { results }] of rows.entries()) {
    for (const { sets, targets } of results) {
      for (const { name, pairs, gaps } of sets) {
        for (const pair of pairs) {
          add(`${name} ${pair.part}>${pair.into} cm`, row, pair.depth * 100);
        }
        for (const gap of gaps) {
          addGap(`${name} ${gap.part}~${gap.into} gap cm`, row, gap.gap * 100);
        }
      }
      for (const { side, error } of targets) {
        add(`target ${side} mm`, row, error * 1000);
      }
    }
  }
  for (const [column, values] of columns) {
    if (!gapColumns.has(column) && values.every((v) => v < 0.05)) {
      columns.delete(column);
    }
  }
  const header = ['variant', ...columns.keys()];
  console.log(`| ${header.join(' | ')} |`);
  console.log(`|${header.map(() => '---').join('|')}|`);
  for (const [row, { variant }] of rows.entries()) {
    const cells = [...columns.values()].map((values) => (values[row] ?? 0).toFixed(1));
    console.log(`| ${variant || 'base'} | ${cells.join(' | ')} |`);
  }
}

/**
 * Gives the role of the options: one part for each bone of `--bones`, with the accepted depths of
 * the part of the role that holds the bone, and the obstacles of `--into`.
 *
 * @param options The options.
 * @returns The role.
 */
function roleOf(options: Options): RoleSweep {
  const { role, bones, into } = options;
  const obstacles = role.obstacles.filter((o) => !into || into.includes(o.name));
  if (!bones) {
    return { ...role, obstacles };
  }
  const holder = (bone: BoneName): string | undefined =>
    role.parts.find((part) => part.bones.includes(bone))?.name;
  return {
    ...role,
    parts: bones.map((bone) => ({ name: bone, bones: [bone] })),
    obstacles,
    accepted: role.accepted.flatMap((entry) =>
      bones
        .filter((bone) => holder(bone) === entry.part)
        .map((bone): AcceptedDepth => ({
          part: bone,
          into: entry.into,
          samples: entry.samples,
          depth: entry.depth,
          reason: entry.reason,
          decision: entry.decision,
        })),
    ),
  };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const role = roleOf(options);
  const rows: { variant: string; results: DemoResult[] }[] = [];
  for (const variant of options.variants) {
    const { undo, text } = setHolds(variant);
    const started = performance.now();
    try {
      rows.push({ variant: text, results: await sweepDemos(options, role) });
    } finally {
      undo();
    }
    const seconds = ((performance.now() - started) / 1000).toFixed(1);
    console.log(`${text || 'base'} (${seconds} s):`);
    printDetails(role, rows.at(-1)?.results ?? []);
  }
  printTable(rows);
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
