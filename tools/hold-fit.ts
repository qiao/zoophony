/**
 * Fits the hold of a role of a studio body in one run (route 3 of `AGENTS.md`): for the base and
 * for each variant of `--set`, it gives the folds of `pnpm fold-probe`, the deepest point of each
 * sample set of the sweep of `pnpm pose-depth`, and, for a violin role, the reach of
 * `pnpm hold-reach`. It prints one table with one row for each variant. The source files do not
 * change.
 *
 * `--grid '<path>=<a>:<b>:<step>'` adds the variants of a range of values, and several `--grid`
 * options give the product of their ranges, up to {@link GRID_LIMIT} variants. A run with a grid
 * sorts the rows of the variants by the play folds, then by the deepest point. With `--faces <n>`,
 * the faces that fold most in the base and in the best variant follow the table, as
 * `pnpm fold-probe --faces` writes them.
 *
 * With `--base <ref>`, the commit and the working tree run at the same time, each in a child
 * process. The table then starts with the row of the commit, and one compare of the deepest
 * points in the H of each body follows for each variant.
 *
 * Usage: pnpm hold-fit <role> [--set <path>=<value>[;<path>=<value>]...]...
 * [--grid <path>=<a>:<b>:<step>]... [--demo <id>|all]... [--step <seconds>] [--faces <n>]
 * [--base <ref>] [--json <file>]
 */
import { writeFileSync } from 'node:fs';

import { FOLD_ROLES, faceLines, probeFolds, roleBodies } from './fold-probe.ts';
import type { FoldCount, FoldReport, RoleSource } from './fold-probe.ts';
import { holdReach, rangeTexts, ruleSize } from './hold-reach.ts';
import type { ChinInstrument, HoldReach } from './hold-reach.ts';
import { setHolds } from './hold-sets.ts';
import { patchedDemos } from './patch-demos.ts';
import type { DemoFile } from './patch-demos.ts';
import { compareDepths, restoreDepth, restoreResult, sweepDemos } from './pose-depth.ts';
import type { DemoResult, StoredDepth, StoredResult } from './pose-depth.ts';
import { probeBeside, shortHash, withoutOptions } from './ref-tree.ts';
import type { SpeciesId } from '../src/models/species.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import type { TestScene } from '../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
import { depthLimit, pairText } from '../src/pose/test-sweep.ts';
import type { PairDepth, RoleSweep } from '../src/pose/test-sweep.ts';

/**
 * The demos of a run with no `--demo`: the demos of the deepest point of each sample set of the
 * red fox in the sweep of 2026-10-14 (`docs/research/2026-10-14-fox-retro.md`). One variant of
 * `fox-violinist` over all 14 demos takes about 173 s. A role with none of these demos takes all
 * its demos, and `--demo all` takes all demos of the role.
 */
export const FIT_DEMOS: readonly string[] = [
  'bach-bwv1050',
  'beethoven-8',
  'boulanger-matin',
  'mozart-k525',
];

/** The step of the song time of the play folds by default, in seconds. */
export const FIT_STEP = 1;

/**
 * The largest share of the play samples with a fold: the goal of a mesh rig
 * (`docs/briefs/studio-body.md`, section 7).
 */
export const PLAY_FOLD_GOAL = 0.01;

/** The largest number of variants of the grids of a run. One variant takes 45 s to 90 s. */
export const GRID_LIMIT = 40;

/** The usage text of `pnpm hold-fit`. */
const USAGE = `Usage: pnpm hold-fit <${[...FOLD_ROLES.keys()].join(' | ')}> [--set <path>=<value>[;<path>=<value>]...]... [--grid <path>=<a>:<b>:<step>]... [--demo <id>|all]... [--step <seconds>] [--faces <n>] [--base <ref>] [--json <file>]`;

/**
 * Gives the values of one grid: from the first value to the last value at each step, with both
 * ends. A value with the unit `deg` is an angle in degrees, as in `--set`.
 *
 * @param grid The grid, as `<path>=<a>:<b>:<step>`, such as `violin@fox-red.lean=10deg:20deg:5deg`.
 * @returns The changes, one for each value, such as `violin@fox-red.lean=10deg`.
 * @throws Error if the grid is not `<path>=<a>:<b>:<step>`, if a number is not a number, if the
 *   numbers mix the unit `deg` with no unit, or if the step is not above 0.
 */
export function gridChanges(grid: string): string[] {
  const equals = grid.indexOf('=');
  const parts = grid.slice(equals + 1).split(':');
  if (equals < 1 || parts.length !== 3) {
    throw new Error(`The grid "${grid}" is not <path>=<a>:<b>:<step>.`);
  }
  const path = grid.slice(0, equals);
  const degrees = parts.map((part) => part.endsWith('deg'));
  if (degrees.some((d) => d !== degrees[0])) {
    throw new Error(`The numbers of the grid "${grid}" all have the unit deg, or none has it.`);
  }
  const unit = degrees[0] ? 'deg' : '';
  const [a = Number.NaN, b = Number.NaN, step = Number.NaN] = parts.map((part) =>
    part.trim() === '' ? Number.NaN : Number(unit ? part.slice(0, -3) : part),
  );
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(step)) {
    throw new Error(`The grid "${grid}" has a value that is not a number.`);
  }
  if (!(step > 0)) {
    throw new Error(`The step of the grid "${grid}" must be above 0.`);
  }

  const count = Math.floor(Math.abs(b - a) / step + 1e-9) + 1;
  const direction = b < a ? -1 : 1;
  return Array.from({ length: count }, (...[, i]) => {
    const value = Number((a + direction * i * step).toFixed(9));
    return `${path}=${value}${unit}`;
  });
}

/**
 * Gives the variants of the grids of a run: the product of the values of each grid, with the
 * changes of each variant separated by `;`.
 *
 * @param grids The grids ({@link gridChanges}).
 * @returns The variants, the first grid outermost, or none with no grid.
 * @throws Error if a grid does not fit, or if the product has more than {@link GRID_LIMIT}
 *   variants.
 */
export function gridVariants(grids: readonly string[]): string[] {
  if (grids.length === 0) {
    return [];
  }
  const ranges = grids.map(gridChanges);
  const total = ranges.reduce((product, range) => product * range.length, 1);
  if (total > GRID_LIMIT) {
    throw new Error(
      `The grids give ${ranges.map((range) => range.length).join(' × ')} = ${total} variants, more than the limit of ${GRID_LIMIT}.`,
    );
  }
  return ranges
    .reduce<string[]>(
      (variants, range) => variants.flatMap((variant) => range.map((c) => `${variant};${c}`)),
      [''],
    )
    .map((variant) => variant.slice(1));
}

/** The options of `pnpm hold-fit`. */
export interface FitOptions {
  /** The name of the role, a key of `FOLD_ROLES`. */
  readonly name: string;
  /** The role. */
  readonly role: RoleSource;
  /**
   * The variants: each is a list of changes of the holds. The first is the base, with none, then
   * the variants of `--set`, then the variants of the grids.
   */
  readonly variants: readonly string[];
  /** The grids of `--grid`, as `<path>=<a>:<b>:<step>`. */
  readonly grids: readonly string[];
  /** The number of faces of `--faces` for the base and the best variant, or 0 for none. */
  readonly faces: number;
  /**
   * The demos, by the name of the file with no `.mid`, or `all`. The demos of {@link FIT_DEMOS}
   * when empty.
   */
  readonly demos: readonly string[];
  /** The step of the song time of the play folds, in seconds. */
  readonly step: number;
  /** The file into which the tool writes its rows as JSON, or `null` for none. */
  readonly json: string | null;
  /** The commit, the branch, or the tag to compare with the working tree, or `null`. */
  readonly base: string | null;
}

/**
 * Reads the options of `pnpm hold-fit`. Each change of a variant must fit before the first run,
 * so that a typing fault stops the tool at once.
 *
 * @param args The arguments after the script.
 * @returns The options.
 * @throws Error if the role or an option is not known, if an option has no value, if the step is
 *   not above 0, or if a change of `--set` does not fit a hold.
 */
export function parseFitOptions(args: readonly string[]): FitOptions {
  const [name = '', ...rest] = args;
  const role = FOLD_ROLES.get(name);
  if (!role) {
    throw new Error(USAGE);
  }
  const variants = [''];
  const grids: string[] = [];
  const demos: string[] = [];
  let step = FIT_STEP;
  let faces = 0;
  let json: string | null = null;
  let base: string | null = null;
  for (let i = 0; i < rest.length; i += 2) {
    const value = rest[i + 1];
    if (value === undefined) {
      throw new Error(`The option "${rest[i]}" has no value.\n${USAGE}`);
    }
    switch (rest[i]) {
      case '--set':
        variants.push(value);
        break;
      case '--grid':
        grids.push(value);
        break;
      case '--faces':
        faces = Number(value);
        if (!Number.isInteger(faces) || faces < 1) {
          throw new Error('The option --faces takes a whole number of faces above 0.');
        }
        break;
      case '--demo':
        demos.push(value.replace(/\.mid$/, ''));
        break;
      case '--json':
        json = value;
        break;
      case '--base':
        base = value;
        break;
      case '--step':
        step = Number(value);
        if (!(step > 0)) {
          throw new Error('The step must be a number of seconds above 0.');
        }
        break;
      default:
        throw new Error(`The option "${rest[i]}" is not known.\n${USAGE}`);
    }
  }
  variants.push(...gridVariants(grids));
  for (const variant of variants) {
    setHolds(variant).undo();
  }
  if (base !== null && json !== null) {
    throw new Error(`The options --base and --json do not go together.\n${USAGE}`);
  }
  return { name, role, variants, grids, faces, demos, step, json, base };
}

/**
 * Gives the sweep of a fold role: the role of `SWEEP_ROLES` whose players in a scene are bodies of
 * the fold role, with only these players. The violinist sweep holds the rabbits and the red foxes,
 * so the fold role `fox-violinist` sweeps only the red foxes. A new role of both tables thus needs
 * no entry here.
 *
 * @param role The fold role.
 * @param scene A scene with a body of the role.
 * @returns The sweep, or `null` when no sweep role has a body of the role.
 */
export function fitSweep(role: RoleSource, scene: TestScene): RoleSweep | null {
  const models = new Set(roleBodies(role, scene).map((body) => body.model));
  const sweep = Object.values(SWEEP_ROLES).find((candidate) =>
    candidate.players(scene).some((player) => models.has(player.model)),
  );
  if (!sweep) {
    return null;
  }
  return {
    ...sweep,
    players: (other) => {
      const own = new Set(roleBodies(role, other).map((body) => body.model));
      return sweep.players(other).filter((player) => own.has(player.model));
    },
  };
}

/** The pair of a sample set that is nearest to its limit, or most over it. */
export interface SetWorst {
  /** The name of the sample set, such as `lift`. */
  readonly set: string;
  /** The demo and the player of the deepest point, such as
   * `beethoven-8 violinist 3 (fox-red, chair)`. */
  readonly demo: string;
  /** The deepest point of the pair. */
  readonly pair: PairDepth;
  /** The limit of the pair in the set, in meters. */
  readonly limit: number;
}

/**
 * Finds the deepest point of each sample set over the demos: the pair with the largest depth
 * less its limit (`depthLimit()`), so that a pair over its limit always shows. With one limit for
 * each pair, it is the deepest pair. The sets keep the order of their first result.
 *
 * @param role The sweep.
 * @param results The results of each demo.
 * @returns The pair of each set.
 */
export function worstPairs(role: RoleSweep, results: readonly DemoResult[]): SetWorst[] {
  const worst = new Map<string, SetWorst>();
  for (const { demo, sets } of results) {
    for (const { name, pairs } of sets) {
      for (const pair of pairs) {
        const limit = depthLimit(role, pair, name).depth;
        const best = worst.get(name);
        if (!best || pair.depth - limit > best.pair.depth - best.limit) {
          worst.set(name, { set: name, demo, pair, limit });
        }
      }
    }
  }
  return [...worst.values()];
}

/** The samples of a set and the samples with a fold. */
export type FoldShare = Readonly<Pick<FoldCount, 'samples' | 'withFold'>>;

/** The shares of the samples with a fold in the play and in the lift. */
export type FoldShares = Readonly<Record<'play' | 'lift', FoldShare>>;

/**
 * Gives the shares of the samples with a fold of a fold report, in plain numbers.
 *
 * @param report The folds.
 * @returns The samples and the samples with a fold of the play and of the lift.
 */
export function foldShares(report: FoldReport): FoldShares {
  const { play, lift } = report.sets;
  return {
    play: { samples: play.samples, withFold: play.withFold },
    lift: { samples: lift.samples, withFold: lift.withFold },
  };
}

/** The results of one variant. */
export interface FitRow {
  /** The text of the changes, or empty for the base. */
  readonly variant: string;
  /** The folds of the variant. */
  readonly folds: FoldShares;
  /** The deepest point of each sample set of the sweep, or none for a role with no sweep. */
  readonly depths: readonly SetWorst[];
  /** The reach of a violin role, or `null`. */
  readonly reach: HoldReach | null;
  /** The time of the run of the variant, in seconds. */
  readonly seconds: number;
  /** The results of the sweep in each demo, for the compare of `--base`. */
  readonly results: readonly DemoResult[];
  /** The table of the faces that fold most (`faceLines()` of `pnpm fold-probe`), or none. */
  readonly faces: readonly string[];
}

/** The JSON text of {@link fitJson}. JSON writes the place `NaN` of a depth as `null`. */
interface StoredFit {
  /** The demos of the run. */
  readonly demos: readonly string[];
  /** The rows, the base first. */
  readonly rows: readonly (Omit<FitRow, 'depths' | 'results'> & {
    /** The deepest point of each sample set. */
    readonly depths: readonly (Omit<SetWorst, 'pair'> & {
      /** The deepest point of the pair. */
      readonly pair: StoredDepth;
    })[];
    /** The results of the sweep in each demo. */
    readonly results: readonly StoredResult[];
  })[];
}

/** The rows of a run and its demos. */
export interface FitRun {
  /** The demos of the run. */
  readonly demos: readonly string[];
  /** The rows, the base first. */
  readonly rows: readonly FitRow[];
}

/**
 * Writes the rows of a run as JSON (`--json`).
 *
 * @param run The demos and the rows.
 * @returns The text.
 */
export function fitJson(run: FitRun): string {
  return JSON.stringify(run);
}

/**
 * Reads the rows of a run from the text of {@link fitJson}, with `NaN` in place of `null`.
 *
 * @param text The text.
 * @returns The demos and the rows.
 */
export function readFit(text: string): FitRun {
  // SAFETY: the text comes from fitJson() of this tool, in the probe of a commit or of the
  // working tree.
  const stored = JSON.parse(text) as StoredFit;
  return {
    demos: stored.demos,
    rows: stored.rows.map((row) => ({
      variant: row.variant,
      folds: row.folds,
      depths: row.depths.map((worst) => ({
        set: worst.set,
        demo: worst.demo,
        pair: restoreDepth(worst.pair),
        limit: worst.limit,
      })),
      reach: row.reach,
      seconds: row.seconds,
      results: row.results.map(restoreResult),
      faces: row.faces,
    })),
  };
}

/**
 * Writes the share of the samples of a set with a fold.
 *
 * @param folds The folds.
 * @param set The sample set.
 * @param goal The largest share without a mark, or `null` for no mark.
 * @returns The text, such as `2.3% (103/4454) OVER`.
 */
function foldCell(folds: FoldShares, set: 'play' | 'lift', goal: number | null): string {
  const { withFold, samples } = folds[set];
  const share = withFold / Math.max(1, samples);
  const mark = goal !== null && share > goal ? ' OVER' : '';
  return `${(100 * share).toFixed(1)}% (${withFold}/${samples})${mark}`;
}

/**
 * Writes the table of `pnpm hold-fit`: one row for each variant, with the play folds and the lift
 * folds, the deepest point of each sample set in cm with its pair and its limit, and the reach of
 * a violin role. A mark `OVER` follows a depth over its limit and play folds over
 * {@link PLAY_FOLD_GOAL}.
 *
 * @param rows The rows, the base first.
 * @returns The lines.
 */
export function fitTable(rows: readonly FitRow[]): string[] {
  const sets = [...new Set(rows.flatMap((row) => row.depths.map((d) => d.set)))];
  const violin = rows.some((row) => row.reach);
  const header = [
    'Variant',
    'Play folds',
    'Lift folds',
    ...sets.map((set) => `${set} depth cm (limit)`),
    ...(violin ? ['Rule scale', 'Violin m', 'stopRange', 'bowRange'] : []),
  ];
  const lines = [`| ${header.join(' | ')} |`, `|${header.map(() => '---').join('|')}|`];
  for (const row of rows) {
    const depths = sets.map((set) => {
      const worst = row.depths.find((d) => d.set === set);
      if (!worst) {
        return '-';
      }
      const { pair, limit } = worst;
      const mark = pair.depth > limit ? ' OVER' : '';
      return `${(pair.depth * 100).toFixed(1)} ${pair.part}>${pair.into} (${(limit * 100).toFixed(1)})${mark}`;
    });
    const reach = row.reach;
    const rule = reach ? ruleSize(reach) : null;
    const ranges = reach ? rangeTexts(reach) : null;
    const cells = [
      row.variant || 'base',
      foldCell(row.folds, 'play', PLAY_FOLD_GOAL),
      foldCell(row.folds, 'lift', null),
      ...depths,
      ...(violin
        ? [
            rule ? rule.scale.toFixed(3) : 'none',
            reach ? reach.length.toFixed(3) : '-',
            ranges?.stop ?? '-',
            ranges?.bow ?? '-',
          ]
        : []),
    ];
    lines.push(`| ${cells.join(' | ')} |`);
  }
  return lines;
}

/**
 * Sorts the rows of a run: the base first, then the variants by the share of the play samples
 * with a fold, and at the same share by the deepest point: the largest depth less its limit over
 * the sample sets. A variant with no sweep has the deepest point 0.
 *
 * @param rows The rows, the base first.
 * @returns The sorted rows.
 */
export function sortFitRows(rows: readonly FitRow[]): FitRow[] {
  const [base, ...variants] = rows;
  const share = (row: FitRow): number =>
    row.folds.play.withFold / Math.max(1, row.folds.play.samples);
  const margin = (row: FitRow): number =>
    row.depths.length > 0 ? Math.max(...row.depths.map((d) => d.pair.depth - d.limit)) : 0;
  return [
    ...(base ? [base] : []),
    ...variants.toSorted((a, b) => share(a) - share(b) || margin(a) - margin(b)),
  ];
}

/**
 * Writes the faces of `--faces` for the base and for the best variant: the first variant of
 * {@link sortFitRows}.
 *
 * @param base The row of the base, such as the row of the commit of `--base`.
 * @param baseName The name of the base.
 * @param rows The rows of the working tree, the base first.
 * @returns The lines, or none when no row has faces.
 */
export function faceSections(
  base: FitRow | undefined,
  baseName: string,
  rows: readonly FitRow[],
): string[] {
  const best = sortFitRows(rows)[1];
  const sections: [string, FitRow | undefined][] = [
    [baseName, base],
    [`the best variant, ${best?.variant ?? ''}`, best],
  ];
  const lines: string[] = [];
  for (const [name, row] of sections) {
    if (row && row.faces.length > 0) {
      lines.push('', `Faces of ${name}:`, '', ...row.faces);
    }
  }
  return lines;
}

/**
 * Writes the size of the grids of a run.
 *
 * @param grids The grids.
 * @returns The text, such as `Grids: 3 × 4 = 12 variants (the limit is 40).`, or empty with no
 *   grid.
 */
function gridText(grids: readonly string[]): string {
  if (grids.length === 0) {
    return '';
  }
  const counts = grids.map((grid) => gridChanges(grid).length);
  const total = counts.reduce((product, n) => product * n, 1);
  return `Grids: ${counts.join(' × ')} = ${total} variants (the limit is ${GRID_LIMIT}), sorted by the play folds, then by the deepest point.`;
}

/**
 * Gives the instrument under the chin of a role, for the reach of `pnpm hold-reach`.
 *
 * @param role The role.
 * @returns The species and the instrument, or `null` for a role with no violin or viola.
 */
function chinOf(
  role: RoleSource,
): { readonly species: SpeciesId; readonly instrument: ChinInstrument } | null {
  if (role.kind !== 'player' || (role.instrument !== 'violin' && role.instrument !== 'viola')) {
    return null;
  }
  const [species] = role.species;
  return species ? { species, instrument: role.instrument } : null;
}

/**
 * Chooses the demo ids of a run.
 *
 * @param asked The demos of `--demo`, with no `.mid`, or `all`.
 * @param withRole The ids of the demos with a body of the role.
 * @returns The ids of `--demo`, all ids of the role with `all`, or the ids of {@link FIT_DEMOS}
 *   with the role. When no demo of {@link FIT_DEMOS} has the role, all ids of the role.
 */
export function chooseDemos(asked: readonly string[], withRole: readonly string[]): string[] {
  if (asked.includes('all')) {
    return [...withRole];
  }
  if (asked.length > 0) {
    return withRole.filter((id) => asked.includes(id));
  }
  const fit = withRole.filter((id) => FIT_DEMOS.includes(id));
  return fit.length > 0 ? fit : [...withRole];
}

/**
 * Gives the demos of the options ({@link chooseDemos}).
 *
 * @param options The options.
 * @returns The demo files, and the scene of the first one.
 * @throws Error if a demo of `--demo` does not exist or has no body of the role, or if no demo
 *   has the role.
 */
async function fitDemos(
  options: FitOptions,
): Promise<{ readonly demos: DemoFile[]; readonly first: TestScene }> {
  const all = await patchedDemos();
  const id = (demo: DemoFile): string => demo.file.replace(/\.mid$/, '');
  const unknown = options.demos.filter(
    (name) => name !== 'all' && !all.some((demo) => id(demo) === name),
  );
  if (unknown.length > 0) {
    throw new Error(`No demo has the name ${unknown.join(', ')}.`);
  }
  const scenes = new Map<string, TestScene>();
  for (const demo of all) {
    const scene = sceneOf(demo.bytes);
    if (roleBodies(options.role, scene).length > 0) {
      scenes.set(id(demo), scene);
    }
  }
  const missing = options.demos.filter((name) => name !== 'all' && !scenes.has(name));
  if (missing.length > 0) {
    throw new Error(`The demos ${missing.join(', ')} have no body of the ${options.name}.`);
  }
  const ids = chooseDemos(options.demos, [...scenes.keys()]);
  const first = scenes.get(ids[0] ?? '');
  if (!first) {
    throw new Error(`No demo has the role ${options.name}.`);
  }
  return { demos: all.filter((demo) => ids.includes(id(demo))), first };
}

/**
 * Writes the time and the deepest point of each sample set of a row.
 *
 * @param row The row.
 */
function printRow(row: FitRow): void {
  console.log(`${row.variant || 'base'} (${row.seconds.toFixed(1)} s):`);
  for (const { set, demo, pair } of row.depths) {
    console.log(`  ${set}: ${pairText(pair)}, ${demo}`);
  }
}

/**
 * Fits the commit of `--base` and the working tree at the same time, each in a child process
 * (`probeBeside()`). The commit runs the base with no change. Then the tool writes the table with
 * the row of the commit first, and one compare of the deepest points of each variant with the
 * commit, in the H of each body (`compareDepths()`).
 *
 * @param options The options.
 * @param ref The commit, the branch, or the tag.
 */
async function compareFit(options: FitOptions, ref: string): Promise<void> {
  const label = `${ref} (${shortHash(ref)})`;
  const args = withoutOptions(process.argv.slice(2), ['--base']);
  const started = performance.now();
  const texts = await probeBeside(
    ref,
    'hold-fit.ts',
    { base: withoutOptions(args, ['--set', '--grid']), tree: args },
    { prefix: 'hold-fit-' },
  );
  const base = readFit(texts.base);
  const tree = readFit(texts.tree);
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`Hold fit of the ${options.name} on ${label} and on the working tree: ${seconds} s.`);
  console.log(`Demos of ${label}: ${base.demos.join(', ')}`);
  console.log(`Demos of the working tree: ${tree.demos.join(', ')}`);
  const grid = gridText(options.grids);
  if (grid) {
    console.log(grid);
  }
  const [first] = base.rows;
  const rows = options.grids.length > 0 ? sortFitRows(tree.rows) : [...tree.rows];
  for (const row of rows) {
    printRow(row);
  }
  console.log(
    ['', ...fitTable([...(first ? [{ ...first, variant: label }] : []), ...rows])].join('\n'),
  );
  if (options.faces > 0) {
    console.log(faceSections(first, label, tree.rows).join('\n'));
  }
  for (const { variant, results } of rows) {
    console.log(`\nThe depths of ${label} and of the working tree with ${variant || 'no change'}:`);
    console.log(compareDepths(label, first?.results ?? [], results).join('\n'));
  }
}

/** Runs the tool: `node tools/hold-fit.ts <role> [options]`. */
async function main(): Promise<void> {
  const options = parseFitOptions(process.argv.slice(2));
  if (options.base !== null) {
    await compareFit(options, options.base);
    return;
  }
  const { demos, first } = await fitDemos(options);
  const sweep = fitSweep(options.role, first);
  const chin = chinOf(options.role);
  const ids = demos.map((demo) => demo.file.replace(/\.mid$/, ''));
  console.log(
    `Hold fit of the ${options.name}: play folds at a step of ${options.step} s, ${sweep ? `the sweep of the ${sweep.role} with the bodies of the role` : 'no sweep (folds only)'}${chin ? `, and the reach of ${chin.species} with the ${chin.instrument}` : ''}.`,
  );
  console.log(`Demos: ${ids.join(', ')}`);
  const grid = gridText(options.grids);
  if (grid) {
    console.log(grid);
  }

  const rows: FitRow[] = [];
  for (const variant of options.variants) {
    const started = performance.now();
    const { undo, text } = setHolds(variant);
    try {
      const report = probeFolds(options.role, demos, options.step);
      const results = sweep
        ? await sweepDemos({ demos: ids, times: null, gaps: false }, sweep)
        : [];
      const row: FitRow = {
        variant: text,
        folds: foldShares(report),
        depths: sweep ? worstPairs(sweep, results) : [],
        reach: chin ? holdReach(chin.species, chin.instrument, 'chair') : null,
        seconds: (performance.now() - started) / 1000,
        results,
        faces: options.faces > 0 ? faceLines(report, options.faces) : [],
      };
      rows.push(row);
      printRow(row);
    } finally {
      undo();
    }
  }
  const table = options.grids.length > 0 ? sortFitRows(rows) : rows;
  console.log(['', ...fitTable(table)].join('\n'));
  if (options.faces > 0) {
    console.log(faceSections(rows[0], 'the base', rows).join('\n'));
  }
  if (options.json !== null) {
    writeFileSync(options.json, fitJson({ demos: ids, rows }));
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
