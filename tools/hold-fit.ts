/**
 * Fits the hold of a role of a studio body in one run (route 3 of `AGENTS.md`): for the base and
 * for each variant of `--set`, it gives the folds of `pnpm fold-probe`, the deepest point of each
 * sample set of the sweep of `pnpm pose-depth`, and, for a violin role, the reach of
 * `pnpm hold-reach`. It prints one table with one row for each variant. The source files do not
 * change.
 *
 * Usage: pnpm hold-fit <role> [--set <path>=<value>[;<path>=<value>]...]... [--demo <id>|all]...
 * [--step <seconds>]
 */
import { FOLD_ROLES, probeFolds, roleBodies } from './fold-probe.ts';
import type { FoldReport, RoleSource } from './fold-probe.ts';
import { holdReach, rangeTexts, ruleSize } from './hold-reach.ts';
import type { ChinInstrument, HoldReach } from './hold-reach.ts';
import { setHolds } from './hold-sets.ts';
import { patchedDemos } from './patch-demos.ts';
import type { DemoFile } from './patch-demos.ts';
import { sweepDemos } from './pose-depth.ts';
import type { DemoResult } from './pose-depth.ts';
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

/** The usage text of `pnpm hold-fit`. */
const USAGE = `Usage: pnpm hold-fit <${[...FOLD_ROLES.keys()].join(' | ')}> [--set <path>=<value>[;<path>=<value>]...]... [--demo <id>|all]... [--step <seconds>]`;

/** The options of `pnpm hold-fit`. */
export interface FitOptions {
  /** The name of the role, a key of `FOLD_ROLES`. */
  readonly name: string;
  /** The role. */
  readonly role: RoleSource;
  /** The variants: each is a list of changes of the holds. The first is the base, with none. */
  readonly variants: readonly string[];
  /**
   * The demos, by the name of the file with no `.mid`, or `all`. The demos of {@link FIT_DEMOS}
   * when empty.
   */
  readonly demos: readonly string[];
  /** The step of the song time of the play folds, in seconds. */
  readonly step: number;
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
  const demos: string[] = [];
  let step = FIT_STEP;
  for (let i = 0; i < rest.length; i += 2) {
    const value = rest[i + 1];
    if (value === undefined) {
      throw new Error(`The option "${rest[i]}" has no value.\n${USAGE}`);
    }
    switch (rest[i]) {
      case '--set':
        variants.push(value);
        break;
      case '--demo':
        demos.push(value.replace(/\.mid$/, ''));
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
  for (const variant of variants) {
    setHolds(variant).undo();
  }
  return { name, role, variants, demos, step };
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
  /** The demo and the player of the deepest point, such as `beethoven-8 violinist 3 (chair)`. */
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

/** The results of one variant. */
export interface FitRow {
  /** The text of the changes, or empty for the base. */
  readonly variant: string;
  /** The folds of the variant. */
  readonly folds: FoldReport;
  /** The deepest point of each sample set of the sweep, or none for a role with no sweep. */
  readonly depths: readonly SetWorst[];
  /** The reach of a violin role, or `null`. */
  readonly reach: HoldReach | null;
  /** The time of the run of the variant, in seconds. */
  readonly seconds: number;
}

/**
 * Writes the share of the samples of a set with a fold.
 *
 * @param folds The folds.
 * @param set The sample set.
 * @param goal The largest share without a mark, or `null` for no mark.
 * @returns The text, such as `2.3% (103/4454) OVER`.
 */
function foldCell(folds: FoldReport, set: 'play' | 'lift', goal: number | null): string {
  const { withFold, samples } = folds.sets[set];
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

/** Runs the tool: `node tools/hold-fit.ts <role> [options]`. */
async function main(): Promise<void> {
  const options = parseFitOptions(process.argv.slice(2));
  const { demos, first } = await fitDemos(options);
  const sweep = fitSweep(options.role, first);
  const chin = chinOf(options.role);
  const ids = demos.map((demo) => demo.file.replace(/\.mid$/, ''));
  console.log(
    `Hold fit of the ${options.name}: play folds at a step of ${options.step} s, ${sweep ? `the sweep of the ${sweep.role} with the bodies of the role` : 'no sweep (folds only)'}${chin ? `, and the reach of ${chin.species} with the ${chin.instrument}` : ''}.`,
  );
  console.log(`Demos: ${ids.join(', ')}`);

  const rows: FitRow[] = [];
  for (const variant of options.variants) {
    const started = performance.now();
    const { undo, text } = setHolds(variant);
    try {
      const folds = probeFolds(options.role, demos, options.step);
      const results = sweep
        ? await sweepDemos({ demos: ids, times: null, gaps: false }, sweep)
        : [];
      rows.push({
        variant: text,
        folds,
        depths: sweep ? worstPairs(sweep, results) : [],
        reach: chin ? holdReach(chin.species, chin.instrument, 'chair') : null,
        seconds: (performance.now() - started) / 1000,
      });
    } finally {
      undo();
    }
    const row = rows.at(-1);
    console.log(`${text || 'base'} (${row?.seconds.toFixed(1)} s):`);
    for (const { set, demo, pair } of row?.depths ?? []) {
      console.log(`  ${set}: ${pairText(pair)}, ${demo}`);
    }
  }
  console.log(['', ...fitTable(rows)].join('\n'));
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
