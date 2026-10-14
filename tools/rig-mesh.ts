import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Side } from '../src/models/studio-format.ts';
import type { Vec3 } from '../src/models/tuples.ts';

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
      const short = armReach(config, side, 1);
      const paw = armReach(config, side, 0);
      const factor = (config.app.reach - paw) / (short - paw);
      throw new Error(
        `The arm factor ${config.armFactor} gives a reach of ${reach.toFixed(4)} m, not ${config.app.reach} m. The factor ${factor.toFixed(4)} gives the target.`,
      );
    }
  }
  return armReach(config, 'L');
}

/** The arguments of `pnpm rig-mesh`. */
export interface RigMeshArgs {
  /** The id of the animal: the name of its config in `tools/mesh-rigs/`. */
  readonly animal: string;
  /** The folder of the preview images, or `null` for no preview. */
  readonly preview: string | null;
}

/**
 * Reads the arguments of `pnpm rig-mesh <animal> [--preview <dir>]`.
 *
 * @param args The arguments after the script.
 * @returns The animal and the preview folder.
 * @throws Error with the usage for other arguments.
 */
export function parseArgs(args: readonly string[]): RigMeshArgs {
  const usage = new Error('Usage: node tools/rig-mesh.ts <animal> [--preview <dir>]');
  const previewAt = args.indexOf('--preview');
  const preview = previewAt >= 0 ? args[previewAt + 1] : undefined;
  const rest = args.filter((_, i) => previewAt < 0 || (i !== previewAt && i !== previewAt + 1));
  const [animal] = rest;
  if (!animal || rest.length !== 1 || animal.startsWith('--') || (previewAt >= 0 && !preview)) {
    throw usage;
  }
  return { animal, preview: preview ?? null };
}

/**
 * Gives the arguments of the run of Blender for a rig.
 *
 * @param config The path of the config.
 * @param output The path of the rigged GLB file.
 * @param preview The folder of the preview images, or `null`.
 * @returns The arguments of `blender`.
 */
export function blenderArgs(config: string, output: string, preview: string | null): string[] {
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
  return preview ? [...args, '--preview', preview] : args;
}

/**
 * Rigs the mesh of the user of an animal into the format of a studio body (route 3 of
 * `AGENTS.md`): `node tools/rig-mesh.ts <animal> [--preview <dir>]`. It checks the arm factor of
 * `tools/mesh-rigs/<animal>.json`, and runs `tools/blender/rig_mesh.py`, which writes the GLB file
 * of the config. With `--preview`, the script also writes the images of the rig into the folder.
 * Blender comes from the environment variable `BLENDER`, or `blender` on the path.
 */
async function main(): Promise<void> {
  const { animal, preview } = parseArgs(process.argv.slice(2));
  const configPath = join(CONFIG_DIR, `${animal}.json`);
  const config = parseConfig(await readFile(configPath, 'utf8'));
  const reach = checkReach(config);
  console.log(`Arm factor ${config.armFactor}: reach ${reach.toFixed(4)} m in the app.`);

  const output = join(ROOT, config.output);
  const blender = process.env['BLENDER'] ?? 'blender';
  const result = spawnSync(blender, blenderArgs(configPath, output, preview), {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'inherit'],
    encoding: 'utf8',
  });
  for (const line of result.stdout.split('\n').filter((l) => l.startsWith('rig_mesh:'))) {
    console.log(line);
  }
  if (result.status !== 0) {
    throw new Error(`${blender} failed with the status ${String(result.status)}.`);
  }
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
