/**
 * Prints the rest joints and a hash of the body mesh of each species on each support, and the
 * skeleton and a hash of the mesh of each player of the section cast and of the conductor (design
 * 4.3, 4.4). Two runs on two commits show if a change moved a body: the output of the same code
 * is the same, byte for byte.
 *
 * Usage: pnpm body-probe [--out <file>]
 *        pnpm body-probe --compare <base.json> <new.json>
 *        pnpm body-probe --base <ref>
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { rmSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildBiped } from '../src/models/biped.ts';
import type { BodyBones } from '../src/models/biped.ts';
import { CONDUCTOR, SECTION_INSTRUMENTS, SECTION_SPECIES } from '../src/models/cast.ts';
import type { InstrumentId } from '../src/models/instruments/types.ts';
import { MeshBuilder } from '../src/models/mesh.ts';
import type { MeshData } from '../src/models/mesh.ts';
import { INSTRUMENT_SUPPORTS, buildPlayer, stanceOn } from '../src/models/player.ts';
import type { Support } from '../src/models/props.ts';
import { BONE_NAMES } from '../src/models/rig.ts';
import { SPECIES } from '../src/models/species.ts';
import type { SpeciesId, SpeciesParams } from '../src/models/species.ts';
import type { Vec3 } from '../src/models/tuples.ts';

/** The supports of each species in the probe: each seat, and standing. */
export const PROBE_SUPPORTS = [
  'chair',
  'stool',
  'high-stool',
  'bench',
  'stand',
] as const satisfies readonly Support[];

/** The rest joints and the landmarks of a body by name, and its head height. */
export type JointTable = Record<string, Vec3 | number>;

/** The probe of one body on one support. */
export interface BodyProbe {
  /** The rest joints and the landmarks of the body, rounded to micrometers. */
  readonly joints: Readonly<JointTable>;
  /** The number of triangles of the body. */
  readonly triangles: number;
  /** The hash of the mesh of the body. */
  readonly mesh: string;
}

/** The probe of one player: the body, the instrument, and its support. */
export interface PlayerProbe {
  /** The position of each bone of the skeleton, by name, rounded to micrometers. */
  readonly skeleton: Readonly<Record<string, Vec3>>;
  /** The number of triangles of the player. */
  readonly triangles: number;
  /** The hash of the mesh of the player. */
  readonly mesh: string;
}

/** The output of the probe. */
export interface Probe {
  /** The body of each species on each support. */
  readonly species: Readonly<Record<string, Readonly<Record<string, BodyProbe>>>>;
  /** Each player of the section cast and the conductor, by section, species, and instrument. */
  readonly players: Readonly<Record<string, PlayerProbe>>;
}

/**
 * Rounds a number to micrometers, so that the noise of a refactor below that does not count.
 *
 * @param value The number.
 * @returns The rounded number, with no negative zero.
 */
export function round(value: number): number {
  const rounded = Math.round(value * 1e6) / 1e6;
  return rounded === 0 ? 0 : rounded;
}

/**
 * Rounds the three values of a point.
 *
 * @param point The point.
 * @returns The rounded point.
 */
function roundPoint(point: Vec3): Vec3 {
  return [round(point[0]), round(point[1]), round(point[2])];
}

/**
 * Gives a hash of the parts of a mesh that make its look and its motion: the places, the colors,
 * the bones, the blend weights, and the finishes. Each value is rounded to micrometers first.
 *
 * @param mesh The mesh data.
 * @returns The hash, as 16 hex digits.
 */
export function meshHash(mesh: MeshData): string {
  const hash = createHash('sha256');
  const add = (label: string, values: ArrayLike<number>, exact: boolean): void => {
    hash.update(`${label}:${values.length};`);
    const rounded = Array.from(values, (v) => (exact ? v : round(v)));
    hash.update(rounded.join(','));
  };
  add('positions', mesh.positions, false);
  add('colors', mesh.colors, false);
  add('bones', mesh.bones, true);
  add('blendBones', mesh.blendBones, true);
  add('blendWeights', mesh.blendWeights, false);
  add('finishes', mesh.finishes, true);
  return hash.digest('hex').slice(0, 16);
}

/**
 * Gives the rest joints and the landmarks of a body, rounded.
 *
 * @param bones The body bones.
 * @returns The joints by name, and the head height.
 */
export function jointsOf(bones: BodyBones): JointTable {
  const sorted = Object.entries(bones.positions).toSorted(([a], [b]) => a.localeCompare(b));
  const landmarks = [
    'headCenter',
    'mouth',
    'floor',
    'palmL',
    'palmR',
    'fingerBlockL',
    'fingerBlockR',
  ] as const;
  return Object.fromEntries([
    ['headHeight', round(bones.headHeight)],
    ...sorted.map(([name, point]) => [name, roundPoint(point)] as const),
    ...landmarks.map((name) => [name, roundPoint(bones[name])] as const),
  ]);
}

/**
 * Probes the body of one species on one support.
 *
 * @param species The species parameters.
 * @param support The support.
 * @returns The probe.
 */
function probeBody(species: SpeciesParams, support: Support): BodyProbe {
  const builder = new MeshBuilder();
  const bones = buildBiped(builder, species, stanceOn(support, species));
  const mesh = builder.build();
  return { joints: jointsOf(bones), triangles: mesh.finishes.length, mesh: meshHash(mesh) };
}

/**
 * Probes all bodies and all players.
 *
 * @returns The probe.
 */
export function runProbe(): Probe {
  const species: Record<string, Record<string, BodyProbe>> = {};
  for (const [id, params] of Object.entries<SpeciesParams>(SPECIES)) {
    const bySupport: Record<string, BodyProbe> = {};
    for (const support of PROBE_SUPPORTS) {
      bySupport[support] = probeBody(params, support);
    }
    species[id] = bySupport;
  }

  const players: Record<string, PlayerProbe> = {};
  const instruments = new Map<string, readonly InstrumentId[]>(Object.entries(SECTION_INSTRUMENTS));
  const cast: { key: string; id: SpeciesId; instrument: InstrumentId }[] = Object.entries(
    SECTION_SPECIES,
  ).flatMap(([section, list]) =>
    list.flatMap((id) =>
      (instruments.get(section) ?? []).map((instrument) => ({
        key: `${section}/${id}/${instrument}`,
        id,
        instrument,
      })),
    ),
  );
  cast.push({
    key: `conductor/${CONDUCTOR.species}/${CONDUCTOR.instrument}`,
    id: CONDUCTOR.species,
    instrument: CONDUCTOR.instrument,
  });
  for (const { key, id, instrument } of cast) {
    const player = buildPlayer(id, instrument, 4, INSTRUMENT_SUPPORTS[instrument]);
    const skeleton: Record<string, Vec3> = {};
    BONE_NAMES.forEach((name, i) => {
      const point = player.skeleton.positions[i];
      if (point) {
        skeleton[name] = roundPoint(point);
      }
    });
    players[key] = {
      skeleton,
      triangles: player.mesh.finishes.length,
      mesh: meshHash(player.mesh),
    };
  }
  return { species, players };
}

/**
 * Compares two probes, and gives the counts of equal bodies and players and a line for each
 * difference.
 *
 * @param base The probe of the base.
 * @param next The probe to check.
 * @returns The report lines: the counts first, then one line for each difference.
 */
export function compareProbes(base: Probe, next: Probe): string[] {
  const same = (a: JointTable | Vec3 | undefined, b: JointTable | Vec3 | undefined): boolean =>
    JSON.stringify(a) === JSON.stringify(b);
  const lines: string[] = [];
  let bodies = 0;
  let equalBodies = 0;
  const ids = [...new Set([...Object.keys(base.species), ...Object.keys(next.species)])];
  for (const id of ids) {
    const supports = new Set([
      ...Object.keys(base.species[id] ?? {}),
      ...Object.keys(next.species[id] ?? {}),
    ]);
    for (const support of supports) {
      const a = base.species[id]?.[support];
      const b = next.species[id]?.[support];
      bodies += 1;
      const mesh = a?.mesh === b?.mesh;
      const joints = same(a?.joints, b?.joints);
      if (a && b && mesh && joints) {
        equalBodies += 1;
      } else {
        lines.push(
          `body ${id} ${support}: mesh ${mesh ? 'same' : 'differs'}, joints ${joints ? 'same' : 'differ'}`,
        );
      }
    }
  }
  let players = 0;
  let equalPlayers = 0;
  for (const key of new Set([...Object.keys(base.players), ...Object.keys(next.players)])) {
    const a = base.players[key];
    const b = next.players[key];
    players += 1;
    if (a && b && a.mesh === b.mesh && same(a.skeleton, b.skeleton)) {
      equalPlayers += 1;
      continue;
    }
    const moved =
      a && b
        ? Object.keys(a.skeleton).filter((name) => !same(a.skeleton[name], b.skeleton[name]))
        : [];
    const mesh = a?.mesh === b?.mesh ? 'same' : 'differs';
    lines.push(
      `player ${key}: mesh ${mesh}, moved bones: ${moved.join(' ') || (a && b ? 'none' : 'missing')}`,
    );
  }
  return [
    `bodies equal: ${equalBodies} of ${bodies}`,
    `players equal: ${equalPlayers} of ${players}`,
    ...lines,
  ];
}

/**
 * Reads a probe file that this tool wrote.
 *
 * @param file The path of the file.
 * @returns The probe.
 */
async function readProbe(file: string): Promise<Probe> {
  // SAFETY: the file is the output of this tool, which writes a Probe as JSON.
  return JSON.parse(await readFile(file, 'utf8')) as Probe;
}

/** The repository root. */
const ROOT = join(import.meta.dirname, '..');

/**
 * Runs a command, and stops on a failure.
 *
 * @param command The command.
 * @param args The arguments.
 * @param cwd The folder of the command.
 * @throws Error if the command fails, with the end of its error output.
 */
function run(command: string, args: readonly string[], cwd: string): void {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    const reason = result.error?.message ?? result.stderr.trim().split('\n').slice(-5).join('\n');
    throw new Error(`${command} ${args.join(' ')} failed: ${reason}`);
  }
}

/**
 * Probes the bodies of a commit. It extracts `src/` and `package.json` of the commit into a new
 * folder, with a copy of this tool and a link to the `node_modules` of the repository. Then it
 * runs the probe there. The folder goes away at the end, also after a failure or a stop (INT or TERM).
 *
 * @param ref The commit, a branch, or a tag.
 * @param parent The folder that holds the temporary folder.
 * @returns The probe of the commit.
 * @throws Error if git does not know the ref, or the probe fails on the code of the commit.
 */
export async function probeRef(ref: string, parent: string = tmpdir()): Promise<Probe> {
  const dir = await mkdtemp(join(parent, 'body-probe-'));
  const stop = (): void => {
    rmSync(dir, { recursive: true, force: true });
    process.exit(130);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    run('git', ['archive', '--output', join(dir, 'ref.tar'), ref, 'src', 'package.json'], ROOT);
    run('tar', ['-xf', 'ref.tar'], dir);
    await mkdir(join(dir, 'tools'));
    await copyFile(join(ROOT, 'tools', 'body-probe.ts'), join(dir, 'tools', 'body-probe.ts'));
    await symlink(join(ROOT, 'node_modules'), join(dir, 'node_modules'), 'dir');
    const out = join(dir, 'probe.json');
    run(process.execPath, [join('tools', 'body-probe.ts'), '--out', out], dir);
    return await readProbe(out);
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    await rm(dir, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const baseAt = args.indexOf('--base');
  if (baseAt >= 0) {
    const ref = args[baseAt + 1];
    if (!ref || ref.startsWith('--')) {
      throw new Error('Usage: pnpm body-probe --base <ref>');
    }
    const lines = compareProbes(await probeRef(ref), runProbe());
    console.log([`base ${ref}, new: the working tree`, ...lines].join('\n'));
    process.exit(lines.length > 2 ? 1 : 0);
  }
  const compare = args.indexOf('--compare');
  if (compare >= 0) {
    const [baseFile, nextFile] = [args[compare + 1], args[compare + 2]];
    if (!baseFile || !nextFile) {
      throw new Error('Usage: pnpm body-probe --compare <base.json> <new.json>');
    }
    const lines = compareProbes(await readProbe(baseFile), await readProbe(nextFile));
    console.log(lines.join('\n'));
    process.exit(lines.length > 2 ? 1 : 0);
  }
  const outIndex = args.indexOf('--out');
  const text = `${JSON.stringify(runProbe(), null, 1)}\n`;
  const out = outIndex >= 0 ? args[outIndex + 1] : undefined;
  if (out) {
    await writeFile(out, text);
    console.log(`Wrote ${out}.`);
  } else {
    process.stdout.write(text);
  }
}
