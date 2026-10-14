/**
 * Runs a probe on the studio body that the export makes from another GLB file (`--glb <file>`),
 * with no edit of `ANIMALS` and no written module in `src/` (route 3 of `AGENTS.md`). The pure
 * core keeps no state: the probe runs in a child process on a copy of `src/` that holds the module
 * of the file, as `pnpm body-probe --base` runs the probe of a commit.
 */
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

import { SPECIES, isSpeciesId } from '../src/models/species.ts';
import type { SpeciesId, SpeciesParams } from '../src/models/species.ts';
import { STUDIO_BODIES } from '../src/models/studio-body.ts';
import type { StudioBodyName } from '../src/models/studio-body.ts';
import type { StudioBody } from '../src/models/studio-format.ts';
import { ANIMALS, studioBody, studioModule } from './studio-body.ts';
import type { AnimalSettings } from './studio-body.ts';

/** The repository root. */
const ROOT = join(import.meta.dirname, '..');

/** The paths of the working tree that the copy holds as files. */
const COPIED = ['src', 'package.json'] as const;

/** The folders of the working tree that the copy links: the packages and the demo files. */
const LINKED = ['node_modules', 'demos'] as const;

/** The arguments of a probe with the option `--glb` taken out. */
export interface GlbArgs {
  /** The GLB file of `--glb`, as an absolute path, or `null` with no option. */
  readonly glb: string | null;
  /** The other arguments, in their order. */
  readonly rest: readonly string[];
}

/**
 * Takes the option `--glb <file>` out of the arguments of a probe.
 *
 * @param args The arguments.
 * @param cwd The folder that a relative path of the file starts from.
 * @returns The absolute path of the file, or `null`, and the other arguments.
 * @throws Error if the option has no value or comes more than one time.
 */
export function takeGlb(args: readonly string[], cwd: string = process.cwd()): GlbArgs {
  const at = args.indexOf('--glb');
  if (at < 0) {
    return { glb: null, rest: args };
  }

  const file = args[at + 1];
  if (file === undefined || file.startsWith('--')) {
    throw new Error('The option --glb takes a GLB file.');
  }
  const rest = args.filter((_, i) => i !== at && i !== at + 1);
  if (rest.includes('--glb')) {
    throw new Error('The option --glb comes more than one time.');
  }
  return { glb: resolve(cwd, file), rest };
}

/**
 * Tells if a value of `SpeciesParams.body` names a studio body.
 *
 * @param body The value.
 * @returns True for a key of `STUDIO_BODIES`.
 */
function isStudioBody(body: string | undefined): body is StudioBodyName {
  return body !== undefined && Object.hasOwn(STUDIO_BODIES, body);
}

/**
 * Gives the animal of a studio body: its id in `ANIMALS` and the name of its module in
 * `src/models/studio/`. The body `studio-<animal>` comes from the module `studio/<animal>.ts`.
 *
 * @param body The studio body.
 * @returns The animal, such as `rabbit`.
 */
export function studioAnimal(body: StudioBodyName): string {
  return body.replace(/^studio-/, '');
}

/**
 * Gives the animal of the studio body of a species.
 *
 * @param species The species.
 * @returns The animal, or `null` when the species has no studio body.
 */
export function speciesAnimal(species: SpeciesId): string | null {
  const params: SpeciesParams = SPECIES[species];
  return isStudioBody(params.body) ? studioAnimal(params.body) : null;
}

/**
 * Gives the species with the studio body of an animal.
 *
 * @param animal The animal.
 * @returns The species, in the order of `SPECIES`.
 */
export function animalSpecies(animal: string): SpeciesId[] {
  return Object.keys(SPECIES).filter(
    (id): id is SpeciesId => isSpeciesId(id) && speciesAnimal(id) === animal,
  );
}

/**
 * Gives the settings of an animal of `ANIMALS` with another GLB file.
 *
 * @param animal The animal.
 * @param file The absolute path of the GLB file.
 * @returns The settings.
 * @throws Error if `ANIMALS` has no such animal.
 */
export function glbSettings(animal: string, file: string): AnimalSettings {
  const settings = ANIMALS.get(animal);
  if (!settings) {
    throw new Error(
      `ANIMALS of tools/studio-body.ts has no animal ${animal}. The animals are: ${[...ANIMALS.keys()].join(', ')}.`,
    );
  }
  return { ...settings, glb: relative(ROOT, file) };
}

/** The studio body of a GLB file, and the text of its module. */
export interface GlbModule {
  /** The body that the export makes from the file. */
  readonly body: StudioBody;
  /** The text of the module, before the formatter of the repository. */
  readonly text: string;
}

/**
 * Makes the studio body of an animal from another GLB file, in memory, as `pnpm studio-body`
 * does.
 *
 * @param animal The animal of `ANIMALS`.
 * @param file The absolute path of the GLB file.
 * @param bytes The bytes of the file.
 * @returns The body and the text of its module.
 */
export function glbModule(animal: string, file: string, bytes: Uint8Array): GlbModule {
  const settings = glbSettings(animal, file);
  const { body } = studioBody(bytes, settings.glb ?? '', settings);
  return { body, text: studioModule(animal, settings.constant, body) };
}

/**
 * Makes a copy of the working tree in which the studio body of an animal comes from another GLB
 * file, runs a work in it, and removes it. The copy holds `src/`, `package.json`, and the scripts
 * of `tools/`, with links to `node_modules/` and `demos/`. Its module of the animal is the export
 * of the file. The folder goes away at the end, also after a failure or a stop (INT or TERM).
 *
 * @param animal The animal of `ANIMALS`.
 * @param file The absolute path of the GLB file.
 * @param work The work, which gets the folder of the copy.
 * @param parent The folder that holds the temporary folder.
 * @returns The result of the work.
 * @throws Error if the file does not exist, or if the export of the file fails.
 */
export async function withGlbBody<T>(
  animal: string,
  file: string,
  work: (dir: string) => Promise<T>,
  parent: string = tmpdir(),
): Promise<T> {
  const { text } = glbModule(animal, file, new Uint8Array(await readFile(file)));
  const dir = mkdtempSync(join(parent, 'glb-swap-'));
  const stop = (): void => {
    rmSync(dir, { recursive: true, force: true });
    process.exit(130);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    for (const path of COPIED) {
      cpSync(join(ROOT, path), join(dir, path), { recursive: true });
    }
    cpSync(join(ROOT, 'tools'), join(dir, 'tools'), {
      recursive: true,
      filter: (source) => source === join(ROOT, 'tools') || source.endsWith('.ts'),
    });
    for (const path of LINKED) {
      symlinkSync(join(ROOT, path), join(dir, path), 'dir');
    }
    await writeFile(join(dir, 'src', 'models', 'studio', `${animal}.ts`), text);
    return await work(dir);
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Runs a script of `tools/` of a copy in a child process, with the output of the caller and the
 * folder of the caller, so that the relative paths of its arguments stay true.
 *
 * @param dir The folder of the copy ({@link withGlbBody}).
 * @param script The script, such as `hold-reach.ts`.
 * @param args The arguments of the script.
 * @returns The exit code of the child.
 */
export function runTool(dir: string, script: string, args: readonly string[]): Promise<number> {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, [join(dir, 'tools', script), ...args], {
      stdio: 'inherit',
    });
    child.on('error', fail);
    child.on('close', (code) => done(code ?? 1));
  });
}
