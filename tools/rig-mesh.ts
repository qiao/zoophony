import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Side } from '../src/models/studio-format.ts';
import type { Vec3 } from '../src/models/tuples.ts';
import { FOLD_ROLES, SAMPLE_SETS, readFoldJson, roleAnimal, roleSpecies } from './fold-probe.ts';
import type { FoldCounts } from './fold-probe.ts';
import { animalSpecies, runTool, withGlbBody } from './glb-swap.ts';
import { measureLines, measureRig, triangleLine } from './rig-mesh-check.ts';
import { trackChild, trackFolder } from './stop-cleanup.ts';
import { gzipSize } from './studio-budgets.ts';
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

/** A value of the JSON text of a config of a mesh rig. */
export type ConfigValue = number | string | boolean | null | ConfigValue[] | ConfigObject;

/** An object of the JSON text of a config of a mesh rig. */
export interface ConfigObject {
  /** The value of each key. */
  [key: string]: ConfigValue;
}

/**
 * Gives the kind of a value of a config.
 *
 * @param value The value.
 * @returns The kind: `number`, `string`, `boolean`, `null`, `list`, or `object`.
 */
function kindOf(value: ConfigValue): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'list';
  }
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- a config is JSON from a file, an I/O boundary.
  return typeof value;
}

/**
 * Parses the new value of a change of a config from its text, with the kind of the old value.
 *
 * @param text The text of the new value.
 * @param old The old value.
 * @param path The path, for the message.
 * @returns The new value.
 * @throws Error if the text does not give a value of the kind of the old value.
 */
function parseConfigValue(text: string, old: ConfigValue, path: string): ConfigValue {
  const kind = kindOf(old);
  const fault = new Error(`The value "${text}" of ${path} is not a ${kind} as the old value.`);
  const number = (part: string): number => {
    const value = Number(part);
    if (part.trim() === '' || !Number.isFinite(value)) {
      throw fault;
    }
    return value;
  };
  if (kind === 'number') {
    return number(text);
  }
  if (kind === 'boolean') {
    if (text !== 'true' && text !== 'false') {
      throw fault;
    }
    return text === 'true';
  }
  if (kind === 'string') {
    return text;
  }
  if (Array.isArray(old) && old.length > 0 && old.every((v) => kindOf(v) === 'number')) {
    const list = text
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map(number);
    if (list.length !== old.length) {
      throw new Error(`${path} has ${old.length} numbers, and "${text}" has ${list.length}.`);
    }
    return list;
  }

  let value: ConfigValue;
  try {
    // SAFETY: JSON.parse gives a JSON value, and the check of the kind follows.
    value = JSON.parse(text) as ConfigValue;
  } catch {
    throw fault;
  }
  if (kind !== 'null' && kindOf(value) !== kind) {
    throw fault;
  }
  return value;
}

/**
 * Changes one value of a config in place, such as `weights.haunch.height=0.16,0.27` or
 * `armFactor=1.08`. The path names the keys from the top of the config, and the index of an item
 * of a list is a key too. The new value has the kind of the old value: a number, `true` or
 * `false`, a text, numbers separated by commas for a list of the same count of numbers, or JSON
 * text for another list or an object.
 *
 * @param config The config.
 * @param change The change.
 * @throws Error if the path names no value of the config, or if the value does not fit the old
 *   value.
 */
function setConfigValue(config: ConfigObject, change: ConfigChange): void {
  const { path, text } = change;
  const keys = path.split('.');
  let node: ConfigValue = config;
  for (const [i, key] of keys.entries()) {
    const old = childOf(node, key);
    if (old === undefined) {
      throw new Error(`The key "${key}" of ${path} is not known.`);
    }
    if (i < keys.length - 1) {
      node = old;
    } else {
      setChild(node, key, parseConfigValue(text, old, path));
    }
  }
}

/**
 * Gives the value of a key of an object of a config, or of an index of a list.
 *
 * @param node The object or the list.
 * @param key The key, or the index as text.
 * @returns The value, or `undefined` when the node has no such key or index.
 */
function childOf(node: ConfigValue, key: string): ConfigValue | undefined {
  if (Array.isArray(node)) {
    return /^\d+$/.test(key) ? node[Number(key)] : undefined;
  }
  return node instanceof Object && Object.hasOwn(node, key) ? node[key] : undefined;
}

/**
 * Sets the value of a key of an object of a config, or of an index of a list.
 *
 * @param node The object or the list.
 * @param key The key, or the index as text.
 * @param value The value.
 */
function setChild(node: ConfigValue, key: string, value: ConfigValue): void {
  if (Array.isArray(node)) {
    node[Number(key)] = value;
  } else if (node instanceof Object) {
    node[key] = value;
  }
}

/** One change of a config: the path of a value and the text of its new value. */
export interface ConfigChange {
  /** The path, such as `weights.haunch.height`. */
  readonly path: string;
  /** The text of the new value, such as `0.16,0.27`. */
  readonly text: string;
}

/**
 * Reads the changes of a variant of `--set`, separated by `;`.
 *
 * @param list The changes, such as `weights.haunch.height=0.16,0.27;armFactor=1.08`.
 * @returns The changes, in their order.
 * @throws Error if a change is not `<path>=<value>`, or if the variant has no change.
 */
export function configChanges(list: string): ConfigChange[] {
  const changes = list
    .split(';')
    .map((change) => change.trim())
    .filter((change) => change !== '')
    .map((change) => {
      const equals = change.indexOf('=');
      if (equals < 1) {
        throw new Error(`The change "${change}" is not <path>=<value>.`);
      }
      return { path: change.slice(0, equals), text: change.slice(equals + 1) };
    });
  if (changes.length === 0) {
    throw new Error(`The variant "${list}" has no change. Each --set needs <path>=<value>.`);
  }
  return changes;
}

/**
 * Applies a list of changes, separated by `;`, to the JSON text of a config, as
 * {@link setConfigValue} does. The text of the input does not change.
 *
 * @param text The JSON text of the config.
 * @param list The changes, such as `weights.haunch.height=0.16,0.27;armFactor=1.08`.
 * @returns The JSON text of the changed config.
 * @throws Error if the list has no change, if a change names no value of the config, or if a
 *   value does not fit the old value.
 */
export function setConfig(text: string, list: string): string {
  // SAFETY: a config file of tools/mesh-rigs/ holds one JSON object.
  const config = JSON.parse(text) as ConfigObject;
  for (const change of configChanges(list)) {
    setConfigValue(config, change);
  }
  return `${JSON.stringify(config, null, 2)}\n`;
}

/**
 * Gives the reason why a change of a path of a config changes only the printed text of
 * `--check`, with the place of the real value. These paths change no rig and no measure of the
 * table:
 * - `output`: the check writes the rig into its temporary folder.
 * - `app.reach`: the target of the printed reach line.
 * - `app` and `app.shoulders` of an animal of `ANIMALS`: the export takes the scale from its
 *   entry in `ANIMALS`.
 * - A note: a key `note`, or a key whose name ends with `Note`.
 *
 * @param path The path of the change.
 * @param known True for an animal of `ANIMALS` of `tools/studio-body.ts`.
 * @returns The reason, or `null` when the change can change the rig or its measures.
 */
export function printedOnly(path: string, known: boolean): string | null {
  const last = path.split('.').at(-1) ?? '';
  if (path === 'output') {
    return 'the check writes the rig into its temporary folder, and output names only the file in the text of the module. A run with no --check writes the file of output.';
  }
  if (path === 'app.reach') {
    return 'app.reach is only the target of the reach line. The reach of the rig comes from armFactor.';
  }
  if (known && (path === 'app' || path === 'app.shoulders')) {
    return 'the export takes the scale of the animal from its entry in ANIMALS of tools/studio-body.ts, and app.shoulders sets only the scale of the reach line and of the log of Blender.';
  }
  if (last === 'note' || last.endsWith('Note')) {
    return 'a note changes no value that the rig or the check reads.';
  }
  return null;
}

/**
 * Gives the JSON text of a variant of `--set` of `--check`.
 *
 * @param text The JSON text of the config.
 * @param list The changes of the variant ({@link setConfig}).
 * @param known True for an animal of `ANIMALS` of `tools/studio-body.ts`.
 * @returns The JSON text of the changed config.
 * @throws Error if the variant has no change, if a change changes only the printed text of the
 *   check ({@link printedOnly}), if a change does not fit the config, or if the changed config
 *   fails the checks of {@link parseConfig}.
 */
export function variantText(text: string, list: string, known: boolean): string {
  for (const { path } of configChanges(list)) {
    const reason = printedOnly(path, known);
    if (reason) {
      throw new Error(`--set ${path} changes only the printed text of the check: ${reason}`);
    }
  }
  const changed = setConfig(text, list);
  parseConfig(changed);
  return changed;
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
      `Reach ${side}: ${armReach(config, side, 1).toFixed(4)} m with no factor, ${armReach(config, side).toFixed(4)} m with ${config.armFactor}, and the factor ${targetFactor(config, side).toFixed(4)} gives ${config.app.reach} m.`,
  );
  return [
    `Shoulder joint at ${shoulder[1]} u, ${scale.toFixed(4)} m for each unit.`,
    ...sides,
  ].join(' ');
}

/** The arguments of `pnpm rig-mesh`. */
export interface RigMeshArgs {
  /** The id of the animal: the name of its config in `tools/mesh-rigs/`. */
  readonly animal: string;
  /** The folder of the preview images, or `null` for no preview. */
  readonly preview: string | null;
  /** True for `--check`: the rig goes into a temporary folder, and the tool measures it. */
  readonly check: boolean;
  /**
   * The variants of `--set` for `--check`: each is a list of changes of the config, separated by
   * `;` ({@link setConfig}). The check runs the base first, then each variant.
   */
  readonly sets: readonly string[];
}

/** The usage text of `pnpm rig-mesh`. */
const USAGE =
  'Usage: node tools/rig-mesh.ts <animal> [--preview <dir>] [--check [--set <path>=<value>[;<path>=<value>]...]...]';

/**
 * Reads the arguments of `pnpm rig-mesh <animal> [--preview <dir>] [--check] [--set <changes>]...`.
 *
 * @param args The arguments after the script.
 * @returns The animal, the preview folder, the check flag, and the variants.
 * @throws Error with the usage for other arguments, or for `--set` with no `--check`.
 */
export function parseArgs(args: readonly string[]): RigMeshArgs {
  let preview: string | null = null;
  let check = false;
  const sets: string[] = [];
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (arg === '--check') {
      check = true;
      continue;
    }
    if (arg !== '--preview' && arg !== '--set') {
      rest.push(arg);
      continue;
    }
    const value = args[i + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(USAGE);
    }
    i++;
    if (arg === '--preview') {
      preview = value;
    } else {
      sets.push(value);
    }
  }
  const [animal] = rest;
  if (!animal || rest.length !== 1 || animal.startsWith('--') || (sets.length > 0 && !check)) {
    throw new Error(USAGE);
  }
  return { animal, preview, check, sets };
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

/**
 * Gives the SHA-256 of the bytes of a file, so that a check shows if a rig gives the bytes of the
 * GLB file in the repository.
 *
 * @param bytes The bytes.
 * @returns The hash, as hex.
 */
function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
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
      // A new animal has no measured crease angle yet. The angle 0 keeps the normal of each face
      // only in the bind pose. In a pose, the GPU skin turns the three normals of a face by
      // different blends, so a new body needs its measured angle before it goes into the scene.
      crease: 0,
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

/** The folds of one role of the app with the body of a rig. */
export interface RoleFolds {
  /** The role, a key of `FOLD_ROLES`. */
  readonly role: string;
  /** The counts of each sample set of `pnpm fold-probe`. */
  readonly counts: FoldCounts;
}

/** The measures of one rig of `--check`, for the table of the variants. */
export interface CheckMeasures {
  /** The triangles of the packed mesh. */
  readonly triangles: number;
  /** The size of the packed mesh after gzip, in bytes. */
  readonly meshGzip: number;
  /** The height of the seat, in meters, or `null` for a body that stands. */
  readonly seat: number | null;
  /** The depth of the chair, in meters, or `null`. */
  readonly chair: number | null;
  /** The arm of each side from the shoulder joint to the middle of the palm, in meters. */
  readonly reach: Readonly<Record<Side, number | null>>;
  /** The largest error of the standing body against the long-armed source, in meters. */
  readonly standing: number;
  /** The folds of each role of the animal. */
  readonly folds: readonly RoleFolds[];
}

/** One row of the table of `--check`: a variant and its measures or its failure. */
export interface CheckRow {
  /** The changes of the variant, or empty for the base. */
  readonly variant: string;
  /** The measures, or `null` when the variant failed. */
  readonly measures: CheckMeasures | null;
  /** The message of the failure, or `null`. */
  readonly error: string | null;
}

/**
 * Writes the table of the variants of `--check`: one row for each variant, with the triangles, the
 * gzip size of the packed mesh, the seat, the chair depth, the reach of each arm, the error of the
 * standing body, and the share of the samples with a fold in the play, the lift, and the rest pose
 * of each role. A variant that failed gives its message.
 *
 * @param rows The rows, the base first.
 * @returns The lines.
 */
export function checkTable(rows: readonly CheckRow[]): string[] {
  const roles = [
    ...new Set(rows.flatMap((row) => row.measures?.folds.map((fold) => fold.role) ?? [])),
  ];
  const sets = ['play', 'lift', 'rest'] as const satisfies readonly (typeof SAMPLE_SETS)[number][];
  const header = [
    'Variant',
    'Triangles',
    'Mesh gzip B',
    'Seat m',
    'Chair m',
    'Reach L m',
    'Reach R m',
    'Standing mm',
    ...roles.flatMap((role) => sets.map((set) => `${role} ${set}`)),
  ];
  const m = (value: number | null): string => (value === null ? 'none' : value.toFixed(3));
  const lines = [`| ${header.join(' | ')} |`, `|${header.map(() => '---').join('|')}|`];
  for (const { variant, measures, error } of rows) {
    if (!measures) {
      const cells = header.slice(2).map(() => '-');
      lines.push(
        `| ${variant || 'base'} | failed: ${error ?? 'no measures'} | ${cells.join(' | ')} |`,
      );
      continue;
    }
    const folds = roles.flatMap((role) =>
      sets.map((set) => {
        const count = measures.folds.find((fold) => fold.role === role)?.counts[set];
        return count ? `${((100 * count.withFold) / Math.max(1, count.samples)).toFixed(1)}%` : '-';
      }),
    );
    const cells = [
      variant || 'base',
      String(measures.triangles),
      String(measures.meshGzip),
      m(measures.seat),
      m(measures.chair),
      m(measures.reach.L),
      m(measures.reach.R),
      (measures.standing * 1000).toFixed(3),
      ...folds,
    ];
    lines.push(`| ${cells.join(' | ')} |`);
  }
  return lines;
}

/**
 * Gives the JSON text of the config of each row of `--check`: the text of the base as the tool
 * read it, then the text of each variant from it ({@link variantText}). The base and the variants
 * thus come from one read of the config file, and each variant fits before the first rig.
 *
 * @param text The JSON text of the config, read one time at the start.
 * @param sets The variants of `--set`.
 * @param known True for an animal of `ANIMALS` of `tools/studio-body.ts`.
 * @returns The text of the base, then the text of each variant.
 * @throws Error if a variant does not fit.
 */
export function checkTexts(text: string, sets: readonly string[], known: boolean): string[] {
  return [text, ...sets.map((set) => variantText(text, set, known))];
}

/**
 * Rigs a mesh into a temporary folder and measures the rig, with no write into the repository
 * (`--check`). The JSON text of the config goes into the folder, and the rig reads it from there,
 * so that the base and each variant read the text that the tool read at its start. The app checks run on a copy of `src/` with the body of the rig: the violin by the rule
 * of a violin shop for the violinist, and the folds of each role of the animal. The folder goes
 * away at the end, also after a failure. After a stop (INT or TERM), `tools/stop-cleanup.ts` stops
 * Blender and the probes first, then removes the folder.
 *
 * @param animal The animal.
 * @param text The JSON text of the config of the base or of a variant ({@link variantText}).
 * @param preview The folder of the preview images, or `null`.
 * @returns The measures.
 * @throws Error if the config has no rule of the thin faces, if the rig fails, if it is above the
 *   triangle budget, or if a probe fails.
 */
async function checkRig(
  animal: string,
  text: string,
  preview: string | null,
): Promise<CheckMeasures> {
  const config = parseConfig(text);
  const thin = config.check?.thin;
  if (!thin) {
    throw new Error(`The config of ${animal} has no check.thin: angle, length, and near.`);
  }
  console.log(reachLine(config));

  const dir = mkdtempSync(join(tmpdir(), 'rig-mesh-check-'));
  const release = trackFolder(dir);
  try {
    const path = join(dir, `${animal}.json`);
    await writeFile(path, text);
    const output = join(dir, `${animal}.rig.glb`);
    const obj = join(dir, 'source-long-arms.obj');
    await runBlender(blenderArgs(path, output, preview, obj));
    const bytes = new Uint8Array(await readFile(output));
    console.log(`Rig: ${bytes.byteLength} B, sha256 ${sha256(bytes)}.`);
    const { settings, known } = rigSettings(animal, config);
    if (!known) {
      console.log(`ANIMALS has no ${animal}, so the check takes a seated role that also stands.`);
    }

    const measures = measureRig(bytes, config.output, settings, await readFile(obj, 'utf8'), thin);
    console.log(triangleLine(measures.triangles));
    const module = join(dir, `${animal}.ts`);
    await writeStudioModule(module, animal, settings.constant, measures.body);
    console.log(measureLines(measures, await readFile(module, 'utf8'), thin).join('\n'));
    const result = {
      triangles: measures.triangles,
      meshGzip: gzipSize(measures.body.mesh),
      seat: measures.body.seatHeight,
      chair: measures.body.chairDepth,
      reach: measures.arms,
      standing: measures.standing.worst,
    };

    const roles = known ? animalRoles(animal) : [];
    if (roles.length === 0) {
      console.log(`No role of the app has the body of ${animal}, so the app checks do not run.`);
      return { ...result, folds: [] };
    }
    const folds: RoleFolds[] = [];
    await withGlbBody(animal, output, async (copy) => {
      for (const { role, species } of roles) {
        const json = join(dir, `folds-${role}.json`);
        const runs: [string, string[]][] = [['fold-probe.ts', [role, '--json', json]]];
        const source = FOLD_ROLES.get(role);
        if (source?.kind === 'player' && source.instrument === 'violin') {
          runs.unshift(['hold-reach.ts', [species]]);
        }
        for (const [script, args] of runs) {
          console.log(`\n${script.replace('.ts', '')} ${args[0]} with the body of the rig:`);
          const code = await runTool(copy, script, args);
          if (code !== 0) {
            throw new Error(`${script} failed with the status ${code}.`);
          }
        }
        folds.push({ role, counts: readFoldJson(await readFile(json, 'utf8')) });
      }
    });
    return { ...result, folds };
  } finally {
    await rm(dir, { recursive: true, force: true });
    release();
  }
}

/**
 * Checks the base and each variant of the config of an animal, one rig at a time, and prints the
 * table of the variants ({@link checkTable}). Each variant must fit ({@link variantText}) before
 * the first rig. A variant whose rig or probe fails prints its message, and the next variant runs.
 *
 * @param animal The animal.
 * @param text The JSON text of the config, read one time at the start.
 * @param sets The variants of `--set`.
 * @param preview The folder of the preview images, or `null`. With variants, each rig writes into
 *   a folder of its own in it: `base`, `variant-1`, and so on.
 * @returns True when each variant passed.
 * @throws Error if a variant does not fit, before the first rig.
 */
async function checkVariants(
  animal: string,
  text: string,
  sets: readonly string[],
  preview: string | null,
): Promise<boolean> {
  const texts = checkTexts(text, sets, ANIMALS.has(animal));
  const rows: CheckRow[] = [];
  for (const [k, variant] of ['', ...sets].entries()) {
    if (sets.length > 0) {
      console.log(`\n${variant || 'base'}:`);
    }
    const folder =
      preview && sets.length > 0 ? join(preview, k === 0 ? 'base' : `variant-${k}`) : preview;
    try {
      const measures = await checkRig(animal, texts[k] ?? text, folder);
      rows.push({ variant, measures, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      rows.push({ variant, measures: null, error: message });
    }
  }
  console.log(['', ...checkTable(rows)].join('\n'));
  return rows.every((row) => row.measures);
}

/**
 * Rigs the mesh of the user of an animal into the format of a studio body (route 3 of
 * `AGENTS.md`): `node tools/rig-mesh.ts <animal> [--preview <dir>] [--check [--set <changes>]...]`.
 * It checks the arm factor of `tools/mesh-rigs/<animal>.json`, and runs
 * `tools/blender/rig_mesh.py`, which writes the GLB file of the config. With `--preview`, the
 * script also writes the images of the rig into the folder. With `--check`, the rig goes into a
 * temporary folder, and the tool measures it with no write into the repository. Each `--set` of
 * `--check` is a variant of the config in memory, and the tool checks the base and each variant.
 * Blender comes from the environment variable `BLENDER`, or `blender` on the path.
 */
async function main(): Promise<void> {
  const { animal, preview, check, sets } = parseArgs(process.argv.slice(2));
  const configPath = join(CONFIG_DIR, `${animal}.json`);
  const text = await readFile(configPath, 'utf8');
  const config = parseConfig(text);
  if (check) {
    if (!(await checkVariants(animal, text, sets, preview))) {
      process.exitCode = 1;
    }
    return;
  }
  const reach = checkReach(config);
  console.log(`Arm factor ${config.armFactor}: reach ${reach.toFixed(4)} m in the app.`);

  const output = join(ROOT, config.output);
  await runBlender(blenderArgs(configPath, output, preview));
  const bytes = await readFile(output);
  console.log(`Wrote ${config.output}: ${bytes.byteLength} B, sha256 ${sha256(bytes)}.`);
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
