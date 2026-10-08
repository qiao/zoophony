import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

import { FINISH_ORDER } from '../src/models/mesh.ts';
import type { Finish } from '../src/models/mesh.ts';
import { BONE_NAMES } from '../src/models/rig.ts';
import type { BoneName } from '../src/models/rig.ts';
import { MAX_BLEND, SCULPT_STEP, WEIGHT_STEPS } from '../src/models/sculpt.ts';
import type { Sculpt, SculptLegs, SculptRegion } from '../src/models/sculpt.ts';
import { SPECIES } from '../src/models/species.ts';
import type { SpeciesId } from '../src/models/species.ts';
import { SCULPT_STANCES, sculptRig } from './sculpt-rig.ts';
import type { SculptRig, SculptStanceName } from './sculpt-rig.ts';

/** The folder of the sculpt modules (design 4.4). */
export const SCULPTS_DIR = join(import.meta.dirname, '..', 'src', 'models', 'sculpts');

/** The Blender build script. */
const BUILD_SCRIPT = join(import.meta.dirname, 'blender', 'build_sculpt.py');

/** One shell of the Blender output: a closed surface on one bone or a chain of bones. */
export interface RawShell {
  /** The name of the shell, such as `trunk` or `armR`. */
  readonly name: string;
  /** The position of each vertex, in the axes of the model. */
  readonly vertices: readonly (readonly [number, number, number])[];
  /** The bone, the second bone, and the weight of the second bone of each vertex. */
  readonly skin: readonly (readonly [string, string, number])[];
  /** The three vertices of each triangle, counterclockwise from outside. */
  readonly triangles: readonly (readonly [number, number, number])[];
  /** The color region of each triangle. */
  readonly regions: readonly string[];
}

/** The Blender output of a species (`tools/blender/kit.py`, `export()`). */
export interface RawSculpt {
  /** The species. */
  readonly species: string;
  /** The color and the finish of each region, by name. */
  readonly regions: Readonly<Record<string, { readonly color: string; readonly finish: string }>>;
  /** The shells above the legs, in the axes of the first stance. */
  readonly body: readonly RawShell[];
  /** The shells of the legs of each stance, by the name of the stance. */
  readonly stances: Readonly<Record<string, readonly RawShell[]>>;
}

/**
 * Checks that a name is a finish.
 *
 * @param name The name.
 * @returns True for a finish of `FINISH_ORDER`.
 */
function isFinish(name: string): name is Finish {
  return FINISH_ORDER.some((finish) => finish === name);
}

/**
 * Checks that a name is a bone.
 *
 * @param name The name.
 * @returns True for a bone of `BONE_NAMES`.
 */
function isBone(name: string): name is BoneName {
  return BONE_NAMES.some((bone) => bone === name);
}

/**
 * Gives the index of a bone.
 *
 * @param name The bone name.
 * @returns The index in `BONE_NAMES`.
 * @throws Error if the name is not a bone.
 */
function boneOf(name: string): number {
  if (!isBone(name)) {
    throw new Error(`The bone "${name}" is not a bone of the rig.`);
  }
  return BONE_NAMES.indexOf(name);
}

/**
 * Packs a coordinate in steps of `SCULPT_STEP`, with the same rounding on each side of 0.
 *
 * @param value The coordinate, in meters.
 * @returns The number of steps.
 */
function packCoordinate(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value) / SCULPT_STEP);
}

/**
 * Adds an unsigned LEB128 number to a byte list.
 *
 * @param out The bytes.
 * @param value The number, an integer of at least 0.
 * @throws Error if the number is not an integer of at least 0.
 */
function writeVarint(out: number[], value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`The number ${value} is not an integer of at least 0.`);
  }

  let rest = value;
  while (rest >= 0x80) {
    out.push((rest % 0x80) | 0x80);
    rest = Math.floor(rest / 0x80);
  }
  out.push(rest);
}

/**
 * Gives the zigzag number of a signed number: 0, -1, 1, -2 give 0, 1, 2, 3.
 *
 * @param value The signed integer.
 * @returns The zigzag number.
 */
function zigzag(value: number): number {
  return value < 0 ? -2 * value - 1 : 2 * value;
}

/**
 * Tells if a triangle has no area after the packing of its corners. Such a triangle adds nothing
 * to the surface, and it has no normal.
 *
 * @param corners The three corners, in meters.
 * @returns True for a triangle with no area.
 */
function flat(corners: readonly (readonly number[])[]): boolean {
  const [a, b, c] = corners.map((corner) => corner.map(packCoordinate));
  if (!a || !b || !c) {
    return true;
  }

  const u = [0, 1, 2].map((k) => (b[k] ?? 0) - (a[k] ?? 0));
  const v = [0, 1, 2].map((k) => (c[k] ?? 0) - (a[k] ?? 0));
  const [ux = 0, uy = 0, uz = 0] = u;
  const [vx = 0, vy = 0, vz = 0] = v;
  return uy * vz - uz * vy === 0 && uz * vx - ux * vz === 0 && ux * vy - uy * vx === 0;
}

/**
 * Packs some shells into one packed mesh, in the format of `decodePacked()` of
 * `models/sculpt.ts`.
 *
 * @param shells The shells.
 * @param regionIndex The index of each region name.
 * @returns The packed mesh as base64.
 * @throws Error if a skin breaks the rule of design 4.7, or a triangle has no known region.
 */
export function packShells(
  shells: readonly RawShell[],
  regionIndex: ReadonlyMap<string, number>,
): string {
  const vertices = shells.flatMap((shell) => shell.vertices);
  const skins = shells.flatMap((shell) => shell.skin);
  const triangles: number[] = [];
  const regions: number[] = [];
  let first = 0;
  for (const shell of shells) {
    for (const [i, triangle] of shell.triangles.entries()) {
      const corners = triangle.map((vertex) => first + vertex);
      if (flat(corners.map((vertex) => vertices[vertex] ?? [0, 0, 0]))) {
        continue;
      }
      triangles.push(...corners);
      const region = regionIndex.get(shell.regions[i] ?? '');
      if (region === undefined) {
        throw new Error(`Triangle ${i} of ${shell.name} has no known region.`);
      }
      regions.push(region);
    }
    first += shell.vertices.length;
  }

  // The vertices in the order of their first use, so that the corners and the position
  // differences are small numbers.
  const order: number[] = [];
  const newIndex = new Map<number, number>();
  for (const vertex of triangles) {
    if (!newIndex.has(vertex)) {
      newIndex.set(vertex, order.length);
      order.push(vertex);
    }
  }

  const out: number[] = [];
  writeVarint(out, order.length);
  writeVarint(out, regions.length);
  const last = [0, 0, 0];
  for (const vertex of order) {
    for (let axis = 0; axis < 3; axis++) {
      const value = packCoordinate(vertices[vertex]?.[axis] ?? 0);
      writeVarint(out, zigzag(value - (last[axis] ?? 0)));
      last[axis] = value;
    }
  }
  for (const vertex of order) {
    const [bone = '', blendBone = '', weight = 0] = skins[vertex] ?? [];
    if (!(weight >= 0 && weight <= MAX_BLEND)) {
      throw new Error(`The weight ${weight} of the second bone is not from 0 to 0.5.`);
    }
    out.push(boneOf(bone), boneOf(weight > 0 ? blendBone : bone));
    out.push(Math.round((weight / MAX_BLEND) * WEIGHT_STEPS));
  }
  let next = 0;
  for (const vertex of triangles) {
    const index = newIndex.get(vertex) ?? 0;
    writeVarint(out, index === next ? 0 : next - index);
    if (index === next) {
      next += 1;
    }
  }
  out.push(...regions);
  return Buffer.from(out).toString('base64');
}

/**
 * Packs the Blender output of a species into a sculpt.
 *
 * @param rig The rig that the Blender build used.
 * @param raw The Blender output.
 * @returns The sculpt.
 * @throws Error if a region has no known finish, or a stance is not a stance of a sculpt.
 */
export function packSculpt(rig: SculptRig, raw: RawSculpt): Sculpt {
  const regions: SculptRegion[] = [];
  const regionIndex = new Map<string, number>();
  for (const [name, region] of Object.entries(raw.regions)) {
    if (!isFinish(region.finish)) {
      throw new Error(
        `The region "${name}" has the finish "${region.finish}", which is not known.`,
      );
    }
    regionIndex.set(name, regions.length);
    regions.push({ color: region.color, finish: region.finish });
  }

  const names = Object.keys(raw.stances);
  const stances = names.map((name): SculptLegs => {
    if (!(name in SCULPT_STANCES) || !names[0] || !(names[0] in SCULPT_STANCES)) {
      throw new Error(`The stance "${name}" is not a stance of a sculpt.`);
    }
    // SAFETY: the `in` checks above make the names keys of SCULPT_STANCES.
    const [stanceName, firstName] = [name as SculptStanceName, names[0] as SculptStanceName];
    const stance = SCULPT_STANCES[stanceName];
    const hips = rig.stances[stanceName].bones.hips;
    const firstHips = rig.stances[firstName].bones.hips;
    return {
      stance:
        stance.kind === 'seated'
          ? { kind: 'seated', seatHeight: stance.seatHeight }
          : { kind: 'standing' },
      bones: rig.stances[stanceName].bones,
      bodyOffset: [hips[0] - firstHips[0], hips[1] - firstHips[1], hips[2] - firstHips[2]],
      legs: packShells(raw.stances[name] ?? [], regionIndex),
    };
  });
  return { h: rig.h, regions, body: packShells(raw.body, regionIndex), stances };
}

/**
 * Gives the name of the constant of a sculpt module, such as `FOX_RED_SCULPT`.
 *
 * @param species The species.
 * @returns The name.
 */
export function sculptConstant(species: SpeciesId): string {
  return `${species.toUpperCase().replaceAll('-', '_')}_SCULPT`;
}

/**
 * Writes the TypeScript module of a sculpt.
 *
 * @param species The species.
 * @param sculpt The sculpt.
 * @returns The source text.
 */
export function sculptModule(species: SpeciesId, sculpt: Sculpt): string {
  const round = (value: number): number => Math.round(value * 1e6) / 1e6;
  const stances = sculpt.stances.map((legs) => ({
    ...legs,
    bones: Object.fromEntries(Object.entries(legs.bones).map(([name, p]) => [name, p.map(round)])),
    bodyOffset: legs.bodyOffset.map(round),
  }));
  const body = JSON.stringify({ ...sculpt, stances }, null, 2);
  return [
    `import type { Sculpt } from '../sculpt.ts';`,
    '',
    '/**',
    ` * The sculpt of the species \`${species}\` (design 4.4): the Blender build of`,
    ` * \`tools/blender/${species.replaceAll('-', '_')}.py\`. \`node tools/build-sculpt.ts ${species}\` writes this`,
    ' * file. Do not change it by hand.',
    ' */',
    `export const ${sculptConstant(species)}: Sculpt = ${body};`,
    '',
  ].join('\n');
}

/**
 * Runs a command, and fails when it fails.
 *
 * @param command The program.
 * @param args The arguments.
 * @throws Error if the command fails.
 */
function run(command: string, args: readonly string[]): void {
  const result = spawnSync(command, args, {
    stdio: ['ignore', 'pipe', 'inherit'],
    encoding: 'utf8',
  });
  const lines = result.stdout.split('\n').filter((line) => line.includes(' triangles'));
  for (const line of lines) {
    console.log(line);
  }
  if (result.status !== 0) {
    throw new Error(`${command} failed with the status ${String(result.status)}.`);
  }
}

/**
 * Builds the sculpt of a species: `node tools/build-sculpt.ts <species> [--render <dir>]`.
 * Blender comes from the environment variable `BLENDER`, or `blender` on the path.
 */
async function main(): Promise<void> {
  const [species, flag, renderDir] = process.argv.slice(2);
  if (!species || !(species in SPECIES)) {
    throw new Error('Usage: node tools/build-sculpt.ts <species> [--render <dir>]');
  }
  // SAFETY: the `in` check above makes the name a key of SPECIES.
  const id = species as SpeciesId;

  const work = await mkdtemp(join(tmpdir(), 'zoophony-sculpt-'));
  try {
    const rig = sculptRig(id);
    const rigPath = join(work, `${id}.rig.json`);
    await writeFile(rigPath, JSON.stringify(rig));
    const out = flag === '--render' && renderDir ? renderDir : work;
    const blender = process.env['BLENDER'] ?? 'blender';
    const render = flag === '--render' ? ['--render'] : [];
    run(blender, [
      '-b',
      '--factory-startup',
      '--python',
      BUILD_SCRIPT,
      '--',
      rigPath,
      out,
      ...render,
    ]);

    // SAFETY: the file is the JSON output of `export()` of `tools/blender/kit.py`.
    const raw = JSON.parse(await readFile(join(out, `${id}.json`), 'utf8')) as RawSculpt;
    const source = sculptModule(id, packSculpt(rig, raw));
    const file = join(SCULPTS_DIR, `${id}.ts`);
    await writeFile(file, source);
    run(join(import.meta.dirname, '..', 'node_modules', '.bin', 'oxfmt'), [file]);
    const formatted = await readFile(file);
    console.log(
      `${file}: ${formatted.byteLength} B, ${gzipSync(formatted).byteLength} B after gzip`,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  await main();
}
