import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

import { SPECIES_COLORS } from '../src/models/colors.ts';
import {
  MAX_BLEND,
  UV_STEPS,
  WEIGHT_STEPS,
  packCoordinate,
  packMesh,
} from '../src/models/packed-mesh.ts';
import type { PackedVertex } from '../src/models/packed-mesh.ts';
import { BONE_NAMES } from '../src/models/rig.ts';
import type { BoneName } from '../src/models/rig.ts';
import { RIGGED_BONES, RIGGED_EYE_BONES } from '../src/models/rigged-format.ts';
import type { RiggedBody, RiggedBone, RiggedEye } from '../src/models/rigged-format.ts';
import { isSpeciesId } from '../src/models/species.ts';
import type { SpeciesId } from '../src/models/species.ts';
import type { Vec3 } from '../src/models/tuples.ts';

/** The repository root. */
const ROOT = join(import.meta.dirname, '..');

/** The folder of the modules of the rigged bodies (design 4.4). */
export const RIGGED_DIR = join(ROOT, 'src', 'models', 'rigged');

/** The folder of the configs of the GLB bodies. */
const CONFIG_DIR = join(ROOT, 'tools', 'glb-bodies');

/** The Blender script that prepares the skinned mesh. */
const RIG_SCRIPT = join(ROOT, 'tools', 'blender', 'rig_body.py');

/** The Blender script that renders the skin and the main bones of the prepared mesh. */
const PREVIEW_SCRIPT = join(ROOT, 'tools', 'blender', 'preview_rig.py');

/**
 * A bone that the source skeleton does not have (`tools/blender/rig_body.py`). The packer reads
 * the tail of each `fingers` bone, the end of its finger block.
 */
interface ExtraBone {
  /** The bone of the player. */
  readonly bone: RiggedBone;
  /** The head of the bone, in the axes and the units of Blender. */
  readonly head: Vec3;
  /** The tail of the bone. */
  readonly tail: Vec3;
}

/**
 * The config of a GLB body: `tools/glb-bodies/<species>.json`. The points are in the axes and the
 * units of Blender after the import of the GLB file: +x is the left side of the animal, -y is the
 * front, and +z is up. The Blender script reads the other fields.
 */
export interface BodyConfig {
  /** The GLB file, relative to the repository. */
  readonly source: string;
  /** The height of the body in the app, from the soles to the top, in meters. */
  readonly height: number;
  /** The middle of the head. */
  readonly headCenter: Vec3;
  /** The head height `H`, from the chin to the top of the skull. */
  readonly headHeight: number;
  /** The bones that the source skeleton does not have. */
  readonly extraBones: readonly ExtraBone[];
}

/** The output of `tools/blender/rig_body.py`, in the axes and the units of Blender. */
export interface RigOutput {
  /** The height of the soles. */
  readonly floor: number;
  /** The height of the top of the mesh. */
  readonly top: number;
  /** The place of each vertex. */
  readonly vertices: readonly Vec3[];
  /** The three vertices of each triangle. */
  readonly faces: readonly (readonly number[])[];
  /** u, v of each corner of each triangle in the skin texture, from 0 to 1. */
  readonly uvs: readonly (readonly (readonly number[])[])[];
  /** The two largest weights of each vertex: a bone of the player and its weight. */
  readonly weights: readonly (readonly (readonly [string, number])[])[];
  /** The head of each bone of the player. */
  readonly heads: Readonly<Record<string, Vec3>>;
  /** The eyes, from the dark faces of the texture. */
  readonly eyes: Readonly<Record<'eyeL' | 'eyeR', RiggedEye>>;
  /** The tip of the nose. */
  readonly nose: Vec3;
}

/** A rigged body before its module: the module gives the URL of the skin. */
export type PackedRig = Omit<RiggedBody, 'skin'>;

/**
 * Tells if a name is a bone that a vertex of a rigged body can follow.
 *
 * @param name The name.
 * @returns True for a bone of {@link RIGGED_BONES} or {@link RIGGED_EYE_BONES}.
 */
function isSkinBone(name: string): name is BoneName {
  return [...RIGGED_BONES, ...RIGGED_EYE_BONES].some((bone) => bone === name);
}

/**
 * Rounds a value to 1e-6, so that the module stays short.
 *
 * @param value The value.
 * @returns The rounded value.
 */
function round(value: number): number {
  return Math.round(value * 1e6) / 1e6 + 0;
}

/**
 * Packs the output of the Blender script into a rigged body (design 4.4). The body gets the height
 * of the config, the axes of the model (the animal faces -z, and its left side is -x), the soles
 * on y = 0, and the hips on z = 0. The middle plane of the source mesh stays on x = 0, and the
 * bones of the middle of the body and the tip of the nose go onto it. A vertex with two skin
 * coordinates, on a seam of the skin, becomes two vertices. A triangle with no area after the
 * packing goes away.
 *
 * @param rig The output of the Blender script.
 * @param config The config of the body.
 * @returns The rigged body with no skin URL.
 * @throws Error if a weight names a bone that a rigged body does not place, if a bone has no
 *   head, or if a triangle has no skin coordinates.
 */
export function packRig(rig: RigOutput, config: BodyConfig): PackedRig {
  const scale = config.height / (rig.top - rig.floor);
  const hips = rig.heads['hips'];
  if (!hips) {
    throw new Error('The rig has no hips.');
  }

  // The turn from the axes of Blender to the axes of the model is a rotation, so the faces keep
  // their order of corners.
  const place = (p: Vec3): Vec3 => [
    round(-p[0] * scale),
    round((p[2] - rig.floor) * scale),
    round((p[1] - hips[1]) * scale),
  ];
  const direction = (n: Vec3): Vec3 => [round(-n[0]), round(n[2]), round(n[1])];

  const skins = rig.vertices.map((p, v): Omit<PackedVertex, 'uv'> => {
    const point = place(p);
    const [first, second] = rig.weights[v] ?? [];
    if (!first) {
      throw new Error(`The vertex ${v} has no weight.`);
    }
    const index = (name: string): number => {
      if (!isSkinBone(name)) {
        throw new Error(`The vertex ${v} follows "${name}", a bone that the body does not place.`);
      }
      return BONE_NAMES.indexOf(name);
    };
    const bone = index(first[0]);
    const blend = second ? second[1] / (first[1] + second[1]) : 0;
    return {
      steps: [packCoordinate(point[0]), packCoordinate(point[1]), packCoordinate(point[2])],
      bone,
      blendBone: second ? index(second[0]) : bone,
      blendStep: Math.round((Math.min(blend, MAX_BLEND) / MAX_BLEND) * WEIGHT_STEPS),
    };
  });

  // Each pair of a source vertex and its skin coordinates becomes one packed vertex.
  const vertices: PackedVertex[] = [];
  const known = new Map<string, number>();
  const triangles: number[] = [];
  for (const [t, face] of rig.faces.entries()) {
    const corners = face.map((v): Vec3 => skins[v]?.steps ?? [0, 0, 0]);
    if (face.length !== 3 || noArea(corners)) {
      continue;
    }
    for (const [k, v] of face.entries()) {
      const at = rig.uvs[t]?.[k];
      const skin = skins[v];
      if (!at || !skin) {
        throw new Error(`The corner ${k} of the triangle ${t} has no skin coordinates.`);
      }
      const uv = [
        Math.round((at[0] ?? 0) * UV_STEPS),
        Math.round((at[1] ?? 0) * UV_STEPS),
      ] as const;
      const key = `${v} ${uv[0]} ${uv[1]}`;
      let index = known.get(key);
      if (index === undefined) {
        index = vertices.length;
        known.set(key, index);
        vertices.push({ ...skin, uv });
      }
      triangles.push(index);
    }
  }

  const joints = Object.fromEntries(
    RIGGED_BONES.map((bone): [RiggedBone, Vec3] => {
      const head = rig.heads[bone];
      if (!head) {
        throw new Error(`The rig has no head of the bone "${bone}".`);
      }
      // A bone of the middle of the body goes onto the middle plane. The source skeleton can be a
      // few millimeters off it.
      const [x, y, z] = place(head);
      return [bone, [bone.endsWith('L') || bone.endsWith('R') ? x : 0, y, z]];
    }),
  );
  const [, noseY, noseZ] = place(rig.nose);
  const tip = (bone: 'fingersL' | 'fingersR'): Vec3 => {
    const extra = config.extraBones.find((e) => e.bone === bone);
    if (!extra) {
      throw new Error(`The config has no extra bone "${bone}".`);
    }
    return place(extra.tail);
  };
  const eye = (e: RiggedEye): RiggedEye => ({
    middle: place(e.middle),
    normal: direction(e.normal),
    radius: round(e.radius * scale),
  });

  return {
    headHeight: round(config.headHeight * scale),
    headCenter: place(config.headCenter),
    nose: [0, noseY, noseZ],
    // SAFETY: the entries hold each bone of RIGGED_BONES one time.
    joints: joints as Record<RiggedBone, Vec3>,
    fingerTips: { fingersL: tip('fingersL'), fingersR: tip('fingersR') },
    eyes: { eyeL: eye(rig.eyes.eyeL), eyeR: eye(rig.eyes.eyeR) },
    mesh: packMesh(vertices, triangles),
  };
}

/**
 * Tells if a triangle has no area in packed steps.
 *
 * @param corners The three corners, in packed steps.
 * @returns True for a triangle with no area.
 */
function noArea(corners: readonly Vec3[]): boolean {
  const [a, b, c] = corners;
  if (!a || !b || !c) {
    return true;
  }

  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as const;
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]] as const;
  return (
    u[1] * v[2] - u[2] * v[1] === 0 &&
    u[2] * v[0] - u[0] * v[2] === 0 &&
    u[0] * v[1] - u[1] * v[0] === 0
  );
}

/**
 * Gives the name of the constant of a rigged module, such as `RABBIT_RIGGED`.
 *
 * @param species The species.
 * @returns The name.
 */
export function riggedConstant(species: SpeciesId): string {
  return `${species.toUpperCase().replaceAll('-', '_')}_RIGGED`;
}

/**
 * Gives the file name of the skin texture of a species, in {@link RIGGED_DIR}.
 *
 * @param species The species.
 * @returns The name, such as `rabbit-skin.webp`.
 */
export function skinFile(species: SpeciesId): string {
  return `${species}-skin.webp`;
}

/**
 * Writes the TypeScript module of a rigged body. The URL of the skin comes from
 * `import.meta.url`, so that Vite serves the texture with the module.
 *
 * @param species The species.
 * @param source The GLB file, relative to the repository.
 * @param body The rigged body.
 * @returns The source text.
 */
export function riggedModule(species: SpeciesId, source: string, body: PackedRig): string {
  const fields = JSON.stringify(body, null, 2).slice(1);
  return [
    `import type { RiggedBody } from '../rigged-format.ts';`,
    '',
    `/** The skin texture of the species \`${species}\` (design 4.4). */`,
    `const SKIN = new URL('./${skinFile(species)}', import.meta.url).href;`,
    '',
    '/**',
    ` * The rigged body of the species \`${species}\` (design 4.4), from \`${source}\`. The`,
    ` * command \`pnpm rig-body ${species}\` writes this file and its skin. Do not change them by`,
    ' * hand.',
    ' */',
    `export const ${riggedConstant(species)}: RiggedBody = {\n  skin: SKIN,${fields};`,
    '',
  ].join('\n');
}

/**
 * Runs a command, and prints the lines of its output that start with `rig_body:` or
 * `preview_rig:`.
 *
 * @param command The command.
 * @param args The arguments.
 * @throws Error if the command fails.
 */
function run(command: string, args: readonly string[]): void {
  const result = spawnSync(command, args, {
    stdio: ['ignore', 'pipe', 'inherit'],
    encoding: 'utf8',
  });
  for (const line of result.stdout.split('\n').filter((l) => /^(rig_body|preview_rig):/.test(l))) {
    console.log(line);
  }
  if (result.status !== 0) {
    throw new Error(`${command} failed with the status ${String(result.status)}.`);
  }
}

/**
 * Prepares the GLB body of a species with Blender and writes its module and its skin texture:
 * `node tools/rig-body.ts <species> [--preview <dir>]`. The fur and the accent of the palette of
 * the config move to the colors of the species in the skin (design 4.5, species colors). With
 * `--preview`, it also writes the images of the skin and of the main bones into the folder.
 * Blender comes from the environment variable `BLENDER`, or `blender` on the path.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const previewAt = args.indexOf('--preview');
  const preview = previewAt >= 0 ? args[previewAt + 1] : undefined;
  const id = args[0];
  if (!id || !isSpeciesId(id) || (previewAt >= 0 && !preview)) {
    throw new Error('Usage: node tools/rig-body.ts <species> [--preview <dir>]');
  }

  const configText = await readFile(join(CONFIG_DIR, `${id}.json`), 'utf8');
  // SAFETY: the configs in tools/glb-bodies/ hold the fields of BodyConfig.
  const config = JSON.parse(configText) as BodyConfig;
  const work = await mkdtemp(join(tmpdir(), 'zoophony-rig-'));
  try {
    // The job of the Blender script: the config, and the target colors of the skin.
    const job = join(work, 'job.json');
    const { fur, accent } = SPECIES_COLORS[id];
    const raw: unknown = JSON.parse(configText);
    await writeFile(job, JSON.stringify({ ...Object(raw), targets: { fur, accent } }));
    const out = join(work, 'rig.json');
    const blender = process.env['BLENDER'] ?? 'blender';
    run(blender, ['-b', '--factory-startup', '--python', RIG_SCRIPT, '--', job, out]);
    // SAFETY: the file is the JSON output of tools/blender/rig_body.py.
    const rig = JSON.parse(await readFile(out, 'utf8')) as RigOutput;
    if (preview) {
      run(blender, ['-b', '--factory-startup', '--python', PREVIEW_SCRIPT, '--', out, preview]);
    }
    const file = join(RIGGED_DIR, `${id}.ts`);
    await mkdir(RIGGED_DIR, { recursive: true });
    await writeFile(file, riggedModule(id, config.source, packRig(rig, config)));
    const skin = join(RIGGED_DIR, skinFile(id));
    await copyFile(join(work, 'skin.webp'), skin);
    console.log(`${skin}: ${(await readFile(skin)).byteLength} B`);
    spawnSync(join(ROOT, 'node_modules', '.bin', 'oxfmt'), [file], { stdio: 'inherit' });
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
