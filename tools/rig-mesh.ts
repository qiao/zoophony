import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Side } from '../src/models/studio-format.ts';
import type { Vec3 } from '../src/models/tuples.ts';
import { FOLD_ROLES, roleAnimal, roleSpecies } from './fold-probe.ts';
import { animalSpecies, runTool, withGlbBody } from './glb-swap.ts';
import { measureLines, measureRig, triangleLine } from './rig-mesh-check.ts';
import { trackChild, trackFolder } from './stop-cleanup.ts';
import type { ThinRule } from './rig-mesh-check.ts';
import { ANIMALS, writeStudioModule } from './studio-body.ts';
import type { AnimalSettings } from './studio-body.ts';

/** The repository root. */
const ROOT = join(import.meta.dirname, '..');

/** The folder of the configs of the mesh rigs. */
const CONFIG_DIR = join(ROOT, 'tools', 'mesh-rigs');

/** The Blender script that rigs a mesh into the format of a studio body. */
const RIG_SCRIPT = join(ROOT, 'tools', 'blender', 'rig_mesh.py');

/** The largest part of the target by which the reach of the arms may differ from it. */
export const REACH_TOLERANCE = 0.01;

/** One joint of the config of a mesh rig, in the pose of the source. */
export interface MeshRigJoint {
  /** The head of the bone, in the units and the axes of the studio. */
  readonly head: Vec3;
  /** The tail of the bone: the name of the joint at its end, or a point of its own. */
  readonly tail: string | Vec3;
  /** The hint of the z axis of the bone, or `palm` for the normal of the palm. */
  readonly roll?: 'palm' | Vec3;
}

/**
 * The config of a mesh rig: `tools/mesh-rigs/<animal>.json`. The fields here are the fields that
 * the wrapper reads. `tools/blender/rig_mesh.py` reads the other fields: the weight rules, the
 * color rules, the seat and the bind arms of the studio, and the chair.
 */
export interface MeshRigConfig {
  /** The GLB file of the user, relative to the repository. */
  readonly source: string;
  /** The rigged GLB file, relative to the repository. */
  readonly output: string;
  /** The landmark of the scale in the app, and the target of the reach of the arms. */
  readonly app: {
    /** The height of the standing shoulder joints in the app, in meters. */
    readonly shoulders: number;
    /** The reach of each arm from the shoulder joint to the middle of the palm, in meters. */
    readonly reach: number;
  };
  /** The factor of the length of the upper arm and of the forearm. */
  readonly armFactor: number;
  /** The joints of the middle and of the left side. The right side mirrors the left side. */
  readonly joints: Readonly<Record<string, MeshRigJoint>>;
  /** The rules of `--check`. */
  readonly check?: {
    /** The thin faces near the joints of the limbs that the check lists. */
    readonly thin: ThinRule;
  };
}

/** The joints of the middle and of the left side that a config gives: the 30 body bones. */
export const CONFIG_JOINTS = [
  'root',
  'hips',
  'spine',
  'spine1',
  'chest',
  'neck',
  'head',
  'ear_L',
  'clavicle_L',
  'upper_arm_L',
  'forearm_L',
  'forearm_twist_L',
  'hand_L',
  'fingers_L',
  'thigh_L',
  'shin_L',
  'foot_L',
  'toes_L',
  'tail',
] as const;

/**
 * Reads the text of a config file of a mesh rig, and checks the fields that the wrapper reads.
 *
 * @param text The text of the JSON file.
 * @returns The config.
 * @throws Error if a number of the app or the arm factor is not a positive number, or if the
 *   config lacks a joint of {@link CONFIG_JOINTS}.
 */
export function parseConfig(text: string): MeshRigConfig {
  // SAFETY: the configs in tools/mesh-rigs/ hold the fields of MeshRigConfig, and the checks below
  // read the fields that the wrapper uses.
  const config = JSON.parse(text) as MeshRigConfig;
  const numbers = [config.armFactor, config.app.shoulders, config.app.reach];
  if (!numbers.every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error('The arm factor, app.shoulders, and app.reach must be positive numbers.');
  }
  const missing = CONFIG_JOINTS.filter((name) => config.joints[name]?.head.length !== 3);
  if (missing.length > 0) {
    throw new Error(`The config lacks the joints ${missing.join(', ')}.`);
  }
  return config;
}

/**
 * Gives the head of a joint of a config. A joint of the right side mirrors its left joint.
 *
 * @param config The config.
 * @param name The name of the joint, such as `hand_R`.
 * @returns The head, in the units and the axes of the studio.
 * @throws Error if the config has no joint of the name or of its left side.
 */
export function jointHead(config: MeshRigConfig, name: string): Vec3 {
  const own = config.joints[name];
  if (own) {
    return own.head;
  }
  const left = config.joints[name.replace(/_R$/, '_L')];
  if (!name.endsWith('_R') || !left) {
    throw new Error(`The config has no joint "${name}".`);
  }
  return [-left.head[0], left.head[1], left.head[2]];
}

/**
 * Gives the distance of two points.
 *
 * @param a The first point.
 * @param b The second point.
 * @returns The distance.
 */
function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * Measures the reach of an arm of the rig in the app, as `pnpm studio-body --inspect` does: from
 * the shoulder joint over the elbow and the wrist to the middle of the palm, the midpoint of the
 * wrist and the finger joint. The upper arm and the forearm take the factor, and the paw keeps
 * its size (`tools/blender/rig_mesh.py`). The scale puts the shoulder joint at the height of the
 * app.
 *
 * @param config The config.
 * @param side The side of the arm.
 * @param factor The factor of the upper arm and the forearm.
 * @returns The reach, in meters.
 */
export function armReach(config: MeshRigConfig, side: Side, factor = config.armFactor): number {
  const shoulder = jointHead(config, `upper_arm_${side}`);
  const elbow = jointHead(config, `forearm_${side}`);
  const wrist = jointHead(config, `hand_${side}`);
  const fingers = jointHead(config, `fingers_${side}`);
  const palm: Vec3 = [
    (wrist[0] + fingers[0]) / 2,
    (wrist[1] + fingers[1]) / 2,
    (wrist[2] + fingers[2]) / 2,
  ];
  const units =
    factor * (distance(shoulder, elbow) + distance(elbow, wrist)) + distance(wrist, palm);
  return (units * config.app.shoulders) / shoulder[1];
}

/**
 * Checks that the arm factor of a config gives the reach of the app.
 *
 * @param config The config.
 * @returns The reach of the left arm, in meters.
 * @throws Error if the reach of an arm differs from the target by more than
 *   {@link REACH_TOLERANCE} of it. The message gives the factor that gives the target.
 */
export function checkReach(config: MeshRigConfig): number {
  for (const side of ['L', 'R'] as const) {
    const reach = armReach(config, side);
    if (Math.abs(reach - config.app.reach) > REACH_TOLERANCE * config.app.reach) {
      throw new Error(
        `The arm factor ${config.armFactor} gives a reach of ${reach.toFixed(4)} m, not ${config.app.reach} m. The factor ${targetFactor(config, side).toFixed(4)} gives the target.`,
      );
    }
  }
  return armReach(config, 'L');
}

/**
 * Gives the arm factor that gives the reach of the app: the upper arm and the forearm take the
 * factor, and the paw keeps its size.
 *
 * @param config The config.
 * @param side The side of the arm.
 * @returns The factor.
 */
export function targetFactor(config: MeshRigConfig, side: Side): number {
  const short = armReach(config, side, 1);
  const paw = armReach(config, side, 0);
  return (config.app.reach - paw) / (short - paw);
}

/**
 * Writes the line of the reach of `--check`, which goes on when the reach misses the target. The
 * question to the user about the arms gives this measured factor (`docs/briefs/studio-body.md`).
 *
 * @param config The config.
 * @returns The line.
 */
export function reachLine(config: MeshRigConfig): string {
  const shoulder = jointHead(config, 'upper_arm_L');
  const scale = config.app.shoulders / shoulder[1];
  const sides = (['L', 'R'] as const).map(
    (side) =>
      `${side} ${armReach(config, side, 1).toFixed(4)} m with no factor, ${armReach(config, side).toFixed(4)} m with ${config.armFactor}, the factor ${targetFactor(config, side).toFixed(4)} gives ${config.app.reach} m`,
  );
  return `Shoulder joint at ${shoulder[1]} u, ${scale.toFixed(4)} m for each unit. Reach: ${sides.join('; ')}.`;
}

/** The arguments of `pnpm rig-mesh`. */
export interface RigMeshArgs {
  /** The id of the animal: the name of its config in `tools/mesh-rigs/`. */
  readonly animal: string;
  /** The folder of the preview images, or `null` for no preview. */
  readonly preview: string | null;
  /** True for `--check`: the rig goes into a temporary folder, and the tool measures it. */
  readonly check: boolean;
}

/**
 * Reads the arguments of `pnpm rig-mesh <animal> [--preview <dir>] [--check]`.
 *
 * @param args The arguments after the script.
 * @returns The animal, the preview folder, and the check flag.
 * @throws Error with the usage for other arguments.
 */
export function parseArgs(args: readonly string[]): RigMeshArgs {
  const usage = new Error('Usage: node tools/rig-mesh.ts <animal> [--preview <dir>] [--check]');
  const previewAt = args.indexOf('--preview');
  const preview = previewAt >= 0 ? args[previewAt + 1] : undefined;
  const check = args.includes('--check');
  const rest = args.filter(
    (arg, i) => arg !== '--check' && (previewAt < 0 || (i !== previewAt && i !== previewAt + 1)),
  );
  const [animal] = rest;
  if (!animal || rest.length !== 1 || animal.startsWith('--') || (previewAt >= 0 && !preview)) {
    throw usage;
  }
  return { animal, preview: preview ?? null, check };
}

/**
 * Gives the arguments of the run of Blender for a rig.
 *
 * @param config The path of the config.
 * @param output The path of the rigged GLB file.
 * @param preview The folder of the preview images, or `null`.
 * @param obj The OBJ file of the long-armed source, or `null` for none.
 * @returns The arguments of `blender`.
 */
export function blenderArgs(
  config: string,
  output: string,
  preview: string | null,
  obj: string | null = null,
): string[] {
  // A Python error of the script gives the exit code 1. Blender gives 0 by default, and the
  // rig then seems to pass with the old file.
  const args = [
    '-b',
    '--factory-startup',
    '--python-exit-code',
    '1',
    '--python',
    RIG_SCRIPT,
    '--',
    config,
    output,
  ];
  return [...args, ...(preview ? ['--preview', preview] : []), ...(obj ? ['--obj', obj] : [])];
}

/**
 * Runs the rig script of Blender, and prints the lines of its log. A stop signal (INT or TERM)
 * stops Blender first (`tools/stop-cleanup.ts`).
 *
 * @param args The arguments of `blender` ({@link blenderArgs}).
 * @returns A promise of the end of the run.
 * @throws Error if Blender fails.
 */
function runBlender(args: readonly string[]): Promise<void> {
  const blender = process.env['BLENDER'] ?? 'blender';
  return new Promise((done, fail) => {
    const child = trackChild(
      spawn(blender, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] }),
    );
    let out = '';
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (text: string) => {
      out += text;
    });
    child.on('error', fail);
    child.on('close', (code) => {
      for (const line of out.split('\n').filter((l) => l.startsWith('rig_mesh:'))) {
        console.log(line);
      }
      if (code === 0) {
        done();
      } else {
        fail(new Error(`${blender} failed with the status ${String(code)}.`));
      }
    });
  });
}

/** The settings of the animal of a rig. */
export interface RigSettings {
  /** The settings of the export. */
  readonly settings: AnimalSettings;
  /** True when the settings come from `ANIMALS`. */
  readonly known: boolean;
}

/** A role of the app with the studio body of an animal. */
export interface AnimalRole {
  /** The role, a key of `FOLD_ROLES`. */
  readonly role: string;
  /** The species of the role with the body. */
  readonly species: string;
}

/**
 * Gives the settings of the animal of a rig: its entry of `ANIMALS`, or the settings of a seated
 * role that also stands, at the shoulders of the config.
 *
 * @param animal The animal.
 * @param config The config.
 * @returns The settings, and true when they come from `ANIMALS`.
 */
export function rigSettings(animal: string, config: MeshRigConfig): RigSettings {
  const known = ANIMALS.get(animal);
  if (known) {
    return { settings: known, known: true };
  }
  const constant = `STUDIO_${animal.toUpperCase().replaceAll('-', '_')}`;
  return {
    settings: {
      landmark: 'shoulders',
      height: config.app.shoulders,
      seated: true,
      soloist: true,
      constant,
    },
    known: false,
  };
}

/**
 * Gives the roles of the app with the studio body of an animal, with the species of each role
 * that has the body.
 *
 * @param animal The animal.
 * @returns The name and the species of each role.
 */
export function animalRoles(animal: string): AnimalRole[] {
  const own = animalSpecies(animal);
  return [...FOLD_ROLES].flatMap(([role, source]) => {
    const species = roleSpecies(source).find((s) => own.includes(s));
    return species && roleAnimal(source) === animal ? [{ role, species }] : [];
  });
}

/**
 * Rigs a mesh into a temporary folder and measures the rig, with no write into the repository
 * (`--check`). The app checks run on a copy of \`src/\` with the body of the rig: the violin by
 * the rule of a violin shop for the violinist, and the folds of each role of the animal.
 *
 * @param animal The animal.
 * @param configPath The path of the config.
 * @param config The config.
 * @param preview The folder of the preview images, or `null`.
 * @throws Error if the rig fails, if it is above the triangle budget, or if a probe fails.
 */
async function checkRig(
  animal: string,
  configPath: string,
  config: MeshRigConfig,
  preview: string | null,
): Promise<void> {
  const thin = config.check?.thin;
  if (!thin) {
    throw new Error(`The config of ${animal} has no check.thin: angle, length, and near.`);
  }
  console.log(reachLine(config));

  const dir = mkdtempSync(join(tmpdir(), 'rig-mesh-check-'));
  const release = trackFolder(dir);
  try {
    const output = join(dir, `${animal}.rig.glb`);
    const obj = join(dir, 'source-long-arms.obj');
    await runBlender(blenderArgs(configPath, output, preview, obj));
    const bytes = new Uint8Array(await readFile(output));
    const { settings, known } = rigSettings(animal, config);
    if (!known) {
      console.log(`ANIMALS has no ${animal}, so the check takes a seated role that also stands.`);
    }

    const measures = measureRig(bytes, config.output, settings, await readFile(obj, 'utf8'), thin);
    console.log(triangleLine(measures.triangles));
    const module = join(dir, `${animal}.ts`);
    await writeStudioModule(module, animal, settings.constant, measures.body);
    console.log(measureLines(measures, await readFile(module, 'utf8'), thin).join('\n'));

    const roles = known ? animalRoles(animal) : [];
    if (roles.length === 0) {
      console.log(`No role of the app has the body of ${animal}, so the app checks do not run.`);
      return;
    }
    await withGlbBody(animal, output, async (copy) => {
      for (const { role, species } of roles) {
        const runs: [string, string[]][] = [['fold-probe.ts', [role]]];
        if (role === 'violinist') {
          runs.unshift(['hold-reach.ts', [species]]);
        }
        for (const [script, args] of runs) {
          console.log(`\n${script.replace('.ts', '')} ${args.join(' ')} with the body of the rig:`);
          const code = await runTool(copy, script, args);
          if (code !== 0) {
            throw new Error(`${script} failed with the status ${code}.`);
          }
        }
      }
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
    release();
  }
}

/**
 * Rigs the mesh of the user of an animal into the format of a studio body (route 3 of
 * `AGENTS.md`): `node tools/rig-mesh.ts <animal> [--preview <dir>] [--check]`. It checks the arm
 * factor of `tools/mesh-rigs/<animal>.json`, and runs `tools/blender/rig_mesh.py`, which writes the
 * GLB file of the config. With `--preview`, the script also writes the images of the rig into the
 * folder. With `--check`, the rig goes into a temporary folder, and the tool measures it with no
 * write into the repository. Blender comes from the environment variable `BLENDER`, or `blender`
 * on the path.
 */
async function main(): Promise<void> {
  const { animal, preview, check } = parseArgs(process.argv.slice(2));
  const configPath = join(CONFIG_DIR, `${animal}.json`);
  const config = parseConfig(await readFile(configPath, 'utf8'));
  if (check) {
    await checkRig(animal, configPath, config, preview);
    return;
  }
  const reach = checkReach(config);
  console.log(`Arm factor ${config.armFactor}: reach ${reach.toFixed(4)} m in the app.`);

  const output = join(ROOT, config.output);
  await runBlender(blenderArgs(configPath, output, preview));
  const bytes = await readFile(output);
  const sha = createHash('sha256').update(bytes).digest('hex');
  console.log(`Wrote ${config.output}: ${bytes.byteLength} B, sha256 ${sha}.`);
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
