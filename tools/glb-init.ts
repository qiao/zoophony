import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';

import { buildBiped } from '../src/models/biped.ts';
import { MeshBuilder } from '../src/models/mesh.ts';
import type { RiggedBone } from '../src/models/rigged-format.ts';
import { SPECIES, isSpeciesId } from '../src/models/species.ts';
import type { SpeciesId } from '../src/models/species.ts';
import type { Vec3 } from '../src/models/tuples.ts';

/** The repository root. */
const ROOT = join(import.meta.dirname, '..');

/** The output of `tools/blender/inspect_glb.py`, in the axes and the units of Blender. */
export interface GlbInspection {
  /** The height of the soles. */
  readonly floor: number;
  /** The height of the top of the mesh. */
  readonly top: number;
  /** The head of each joint in the rest pose, by the name of the joint. */
  readonly heads: Readonly<Record<string, Vec3>>;
  /** The welded vertices. */
  readonly vertices: readonly Vec3[];
  /** The three vertices of each triangle. */
  readonly faces: readonly (readonly number[])[];
  /** The median sRGB color of the texture on each triangle, from 0 to 1. */
  readonly colors: readonly Vec3[];
}

/** A bone that the source skeleton does not have, in the config of `pnpm rig-body`. */
export interface ExtraBoneConfig {
  /** The bone of the player. */
  readonly bone: RiggedBone;
  /** The bone of the player that gives a part of its weight to this bone. */
  readonly takes: RiggedBone;
  /** The head of the bone, in the axes and the units of Blender. */
  readonly head: Vec3;
  /** The tail of the bone. */
  readonly tail: Vec3;
  /** 1 for a bone of the left side (+x), -1 for the right side. A middle bone has none. */
  readonly side?: 1 | -1;
  /** The distance along the bone over which the share of the weight grows from 0 to 1. */
  readonly ramp: number;
  /** The largest distance of a vertex from the head. 0 gives the bone no vertex. */
  readonly reach: number;
}

/** The bone of the player of each joint of a GLB file, by the name of the joint. */
export type JointMap = Readonly<Record<string, RiggedBone>>;

/** The config of a GLB body for `pnpm rig-body` (`tools/glb-bodies/<species>.json`). */
export interface GlbBodyConfig {
  /** The GLB file, relative to the repository. */
  readonly source: string;
  /** The height of the body in the app, from the soles to the top, in meters. */
  readonly height: number;
  /** The triangle budget of the mesh, before the eye plates of the app. */
  readonly triangles: number;
  /** The middle of the head. */
  readonly headCenter: Vec3;
  /** The head height `H`. */
  readonly headHeight: number;
  /** The color rules of `tools/blender/rig_body.py`. */
  readonly colors: {
    /** The texture color of each region, as a CSS hex color in sRGB. */
    readonly palette: { readonly fur: string; readonly accent: string; readonly dark: string };
    /** The luma below which a face in the box of the eyes is a part of an eye. */
    readonly eyeLuma: number;
    /** The box of the eyes: two corners. */
    readonly eyeBox: readonly [Vec3, Vec3];
    /** The box of the nose: two corners. */
    readonly noseBox: readonly [Vec3, Vec3];
  };
  /** The bone of the player of each joint of the file. */
  readonly joints: JointMap;
  /** The bones that the file does not have. */
  readonly extraBones: readonly ExtraBoneConfig[];
}

/**
 * The bone of the player of each joint of a Mixamo skeleton, by the name after the prefix
 * `mixamorig:`. The order puts the joint whose head is the place of a bone first: `Spine` before
 * `Spine1`, and `Head` before `HeadTop_End`. `headfront` is the end joint of the head of some
 * riggers.
 */
const MIXAMO_JOINTS: readonly (readonly [string, RiggedBone])[] = [
  ['Hips', 'hips'],
  ['Spine', 'spine'],
  ['Spine1', 'spine'],
  ['Spine2', 'chest'],
  ['Neck', 'neck'],
  ['Head', 'head'],
  ['HeadTop_End', 'head'],
  ['headfront', 'head'],
  ...(['L', 'R'] as const).flatMap((s): (readonly [string, RiggedBone])[] => {
    const side = s === 'L' ? 'Left' : 'Right';
    return [
      [`${side}Shoulder`, `shoulder${s}`],
      [`${side}Arm`, `upperArm${s}`],
      [`${side}ForeArm`, `forearm${s}`],
      [`${side}Hand`, `hand${s}`],
      [`${side}UpLeg`, `thigh${s}`],
      [`${side}Leg`, `shin${s}`],
      [`${side}Foot`, `foot${s}`],
      [`${side}ToeBase`, `foot${s}`],
      [`${side}Toe_End`, `foot${s}`],
    ];
  }),
];

/** The finger joints of a Mixamo hand. They join the hand, and the extra fingers bone takes them. */
const MIXAMO_FINGER = /^(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)\d$/;

/**
 * The triangle budget of a rigged body before its eye plates and a tail ball: 2,600 less the
 * plates (120 triangles) and the ball (80 triangles).
 */
const TRIANGLES = 2400;

/**
 * Gives the name of a Mixamo joint after its prefix: `mixamorig:Hips` and `mixamorig1:Hips` give
 * `Hips`.
 *
 * @param name The name of the joint.
 * @returns The name after the prefix.
 */
function bareName(name: string): string {
  return name.replace(/^mixamorig\d*:/, '');
}

/**
 * Maps the joints of a Mixamo skeleton onto the bones of the player, in the order of
 * {@link MIXAMO_JOINTS}, then the finger joints in the order of the names.
 *
 * @param names The names of the joints of the file.
 * @returns The bone of the player of each joint.
 * @throws Error if a joint is not a joint of a Mixamo skeleton.
 */
export function jointMap(names: readonly string[]): JointMap {
  const unknown = names.filter(
    (name) =>
      !MIXAMO_JOINTS.some(([joint]) => joint === bareName(name)) &&
      !MIXAMO_FINGER.test(bareName(name)),
  );
  if (unknown.length > 0) {
    throw new Error(
      `These joints are not joints of a Mixamo skeleton: ${unknown.join(', ')}. Write the joint ` +
        'map of the config by hand.',
    );
  }

  const entries: [string, RiggedBone][] = [];
  for (const [joint, bone] of MIXAMO_JOINTS) {
    for (const name of names.filter((n) => bareName(n) === joint)) {
      entries.push([name, bone]);
    }
  }
  for (const name of names.filter((n) => MIXAMO_FINGER.test(bareName(n))).toSorted()) {
    entries.push([name, bareName(name).startsWith('Left') ? 'handL' : 'handR']);
  }
  return Object.fromEntries(entries);
}

/**
 * Gives the luma of an sRGB color.
 *
 * @param c The color.
 * @returns The luma, from 0 to 1.
 */
function luma(c: Vec3): number {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/**
 * Gives the squared distance between two points.
 *
 * @param a The first point.
 * @param b The second point.
 * @returns The squared distance.
 */
function distance2(a: Vec3, b: Vec3): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

/** A cluster of colors: its mean color and its number of faces. */
interface ColorCluster {
  /** The mean color. */
  readonly center: Vec3;
  /** The number of faces. */
  readonly count: number;
}

/**
 * Clusters the face colors with k-means. The first center is the mean of the most common
 * bucket of colors, and each next center is the color farthest from the centers before it, so
 * that the result is the same on each run.
 *
 * @param colors The color of each face.
 * @param k The number of clusters.
 * @returns The clusters that keep at least one face.
 */
export function colorClusters(colors: readonly Vec3[], k: number): ColorCluster[] {
  const buckets = new Map<string, Vec3[]>();
  for (const c of colors) {
    const key = c.map((v) => Math.min(7, Math.floor(v * 8))).join(' ');
    buckets.set(key, [...(buckets.get(key) ?? []), c]);
  }
  const biggest = [...buckets.values()].reduce((a, b) => (b.length > a.length ? b : a), []);
  const mean = (list: readonly Vec3[]): Vec3 => {
    const sum = list.reduce<Vec3>((s, c) => [s[0] + c[0], s[1] + c[1], s[2] + c[2]], [0, 0, 0]);
    return [sum[0] / list.length, sum[1] / list.length, sum[2] / list.length];
  };
  let centers: Vec3[] = [mean(biggest)];
  while (centers.length < k) {
    let far: Vec3 | null = null;
    let farDistance = 0;
    for (const c of colors) {
      const d = Math.min(...centers.map((center) => distance2(c, center)));
      if (d > farDistance) {
        far = c;
        farDistance = d;
      }
    }
    if (!far) {
      break;
    }
    centers.push(far);
  }

  let members: Vec3[][] = [];
  for (let pass = 0; pass < 12; pass++) {
    members = centers.map(() => []);
    for (const c of colors) {
      const nearest = centers.reduce(
        (best, center, i) =>
          distance2(c, center) < distance2(c, centers[best] ?? center) ? i : best,
        0,
      );
      members[nearest]?.push(c);
    }
    centers = centers.map((center, i) => {
      const list = members[i] ?? [];
      return list.length > 0 ? mean(list) : center;
    });
  }
  return centers
    .map((center, i) => ({ center, count: members[i]?.length ?? 0 }))
    .filter((cluster) => cluster.count > 0);
}

/**
 * Gives a CSS hex color of an sRGB color.
 *
 * @param c The color, from 0 to 1.
 * @returns The hex color.
 */
function hex(c: Vec3): string {
  return `#${c
    .map((v) =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/**
 * Rounds a value to 1e-4, so that the config stays short.
 *
 * @param value The value.
 * @returns The rounded value.
 */
function round(value: number): number {
  return Math.round(value * 1e4) / 1e4 + 0;
}

/**
 * Rounds a point to 1e-4.
 *
 * @param p The point.
 * @returns The rounded point.
 */
function roundPoint(p: Vec3): Vec3 {
  return [round(p[0]), round(p[1]), round(p[2])];
}

/**
 * Proposes the config of `pnpm rig-body` for the body of a Mixamo GLB file (design 4.4). The
 * proposal comes from the joints, the shape, and the colors of the mesh:
 *
 * - The head height `H` runs from the `Neck` joint to the crown, the top of the mesh on the middle
 *   plane above the neck. The head center is half of it above the neck, at the depth of the `Head`
 *   joint.
 * - The palette comes from five clusters of the face colors: the fur is the largest cluster, the
 *   dark region the darkest, and the accent the cluster farthest from the fur of the others with
 *   at least 0.5% of the faces and 60% of the luma of the fur.
 * - The eyes are the dark faces on the front half of the head, off the middle plane, on both
 *   sides. The nose is the front of the head near the middle plane.
 * - Each ear is the part of the mesh above the crown on its side, and its bone runs from the crown
 *   to the highest point of the side. A side with no part above the crown gets an ear bone with
 *   no vertex.
 * - Each finger block runs from 45% of the paw to the far end of the paw, along the arm.
 * - The tail bones get no vertex: a model with a tail needs a reach in the config.
 * - The height of the body puts its head center at the height of the head center of the current
 *   body of the species.
 *
 * @param inspection The facts of the GLB file.
 * @param source The GLB file, relative to the repository.
 * @param headCenterTarget The height of the head center of the current body, in meters.
 * @returns The config.
 * @throws Error if the skeleton is not a Mixamo skeleton, or if no dark eye faces are on both
 *   sides of the head.
 */
export function proposeConfig(
  inspection: GlbInspection,
  source: string,
  headCenterTarget: number,
): GlbBodyConfig {
  const joints = jointMap(Object.keys(inspection.heads));
  const place = (bone: RiggedBone): Vec3 => {
    const name = Object.keys(joints).find((joint) => joints[joint] === bone);
    const head = name === undefined ? undefined : inspection.heads[name];
    if (!head) {
      throw new Error(`The skeleton has no joint of the bone "${bone}".`);
    }
    return head;
  };
  const { vertices, floor, top } = inspection;
  const tall = top - floor;
  const neck = place('neck');
  const headJoint = place('head');

  const middle = vertices.filter((v) => Math.abs(v[0]) < 0.02 * tall && v[2] > neck[2]);
  const crown = Math.max(...middle.map((v) => v[2]));
  const h = crown - neck[2];
  const band = vertices.filter((v) => v[2] > neck[2] + 0.25 * h && v[2] < neck[2] + 0.75 * h);
  const halfWidth = Math.max(...band.map((v) => Math.abs(v[0])));
  const headCenter: Vec3 = [0, headJoint[1], neck[2] + h / 2];

  const clusters = colorClusters(inspection.colors, 5);
  const fur = clusters.reduce((a, b) => (b.count > a.count ? b : a));
  const dark = clusters.reduce((a, b) => (luma(b.center) < luma(a.center) ? b : a));
  // A dark cluster, such as the rim of an eye, is no accent.
  const others = clusters.filter(
    (c) => c !== fur && c !== dark && luma(c.center) >= 0.6 * luma(fur.center),
  );
  const large = others.filter((c) => c.count >= 0.005 * inspection.colors.length);
  const accent = (large.length > 0 ? large : others).reduce<ColorCluster>(
    (a, b) => (distance2(b.center, fur.center) > distance2(a.center, fur.center) ? b : a),
    others[0] ?? fur,
  );
  const eyeLuma = round(Math.min(0.35, 0.65 * luma(fur.center)));

  const centerOf = (face: readonly number[]): Vec3 => {
    const corners = face.map((v): Vec3 => vertices[v] ?? [0, 0, 0]);
    const sum = corners.reduce<Vec3>((s, c) => [s[0] + c[0], s[1] + c[1], s[2] + c[2]], [0, 0, 0]);
    return [sum[0] / corners.length, sum[1] / corners.length, sum[2] / corners.length];
  };
  const eyes = inspection.faces
    .map((face, f) => ({ center: centerOf(face), color: inspection.colors[f] ?? fur.center }))
    .filter(
      ({ center, color }) =>
        luma(color) < eyeLuma &&
        center[2] > neck[2] + 0.2 * h &&
        center[1] < headJoint[1] &&
        Math.abs(center[0]) > 0.2 * halfWidth,
    )
    .map(({ center }) => center);
  if (!eyes.some((c) => c[0] > 0) || !eyes.some((c) => c[0] < 0)) {
    throw new Error('No dark eye faces are on both sides of the head. Write the eye box by hand.');
  }
  const pad = 0.12 * h;
  const span = (axis: 0 | 1 | 2): [number, number] => [
    Math.min(...eyes.map((c) => c[axis])) - pad,
    Math.max(...eyes.map((c) => c[axis])) + pad,
  ];
  const eyeX = Math.max(...eyes.map((c) => Math.abs(c[0]))) + pad;
  const [eyeY0, eyeY1] = span(1);
  const [eyeZ0, eyeZ1] = span(2);

  const minY = Math.min(...vertices.map((v) => v[1]));
  const extraBones: ExtraBoneConfig[] = [];
  for (const side of [1, -1] as const) {
    const s = side > 0 ? 'L' : 'R';
    const above = vertices.filter((v) => v[2] > crown && v[0] * side > 0.2 * halfWidth);
    if (above.length >= 3) {
      const tip = above.reduce((a, b) => (b[2] > a[2] ? b : a));
      const low = above.filter((v) => v[2] < crown + 0.3 * (tip[2] - crown));
      const base = low.length > 0 ? low : above;
      const head: Vec3 = [
        base.reduce((sum, v) => sum + v[0], 0) / base.length,
        base.reduce((sum, v) => sum + v[1], 0) / base.length,
        crown,
      ];
      const length = Math.sqrt(distance2(head, tip));
      extraBones.push({
        bone: `ear${s}`,
        takes: 'head',
        head: roundPoint(head),
        tail: roundPoint(tip),
        side,
        ramp: round(Math.max(0.01, 0.15 * length)),
        reach: round(1.3 * length),
      });
    } else {
      const head: Vec3 = [side * 0.5 * halfWidth, headJoint[1], crown];
      extraBones.push({
        bone: `ear${s}`,
        takes: 'head',
        head: roundPoint(head),
        tail: roundPoint([head[0], head[1], head[2] + 0.01]),
        side,
        ramp: 0.01,
        reach: 0,
      });
    }
  }
  for (const side of [1, -1] as const) {
    const s = side > 0 ? 'L' : 'R';
    const shoulder = place(`upperArm${s}`);
    const wrist = place(`hand${s}`);
    const length = Math.sqrt(distance2(shoulder, wrist));
    const axis: Vec3 = [
      (wrist[0] - shoulder[0]) / length,
      (wrist[1] - shoulder[1]) / length,
      (wrist[2] - shoulder[2]) / length,
    ];
    const along = (v: Vec3): number =>
      (v[0] - wrist[0]) * axis[0] + (v[1] - wrist[1]) * axis[1] + (v[2] - wrist[2]) * axis[2];
    const paw = Math.max(...vertices.filter((v) => v[0] * side > 0).map(along));
    const at = (t: number): Vec3 => [
      wrist[0] + axis[0] * paw * t,
      wrist[1] + axis[1] * paw * t,
      wrist[2] + axis[2] * paw * t,
    ];
    extraBones.push({
      bone: `fingers${s}`,
      takes: `hand${s}`,
      head: roundPoint(at(0.45)),
      tail: roundPoint(at(1)),
      side,
      ramp: round(0.2 * 0.55 * paw),
      reach: round(1.5 * paw),
    });
  }
  const hips = place('hips');
  const lower = vertices.filter(
    (v) => Math.abs(v[0]) < 0.3 * halfWidth && v[2] > hips[2] - 0.3 * h && v[2] < hips[2] + 0.5 * h,
  );
  const back = lower.reduce((a, b) => (b[1] > a[1] ? b : a), hips);
  extraBones.push(
    {
      bone: 'tail1',
      takes: 'hips',
      head: roundPoint([0, back[1], back[2]]),
      tail: roundPoint([0, back[1] + 0.05 * h, back[2]]),
      ramp: 1,
      reach: 0,
    },
    {
      bone: 'tail2',
      takes: 'tail1',
      head: roundPoint([0, back[1] + 0.05 * h, back[2]]),
      tail: roundPoint([0, back[1] + 0.1 * h, back[2]]),
      ramp: 1,
      reach: 0,
    },
  );

  return {
    source,
    height: round((tall * headCenterTarget) / (headCenter[2] - floor)),
    triangles: TRIANGLES,
    headCenter: roundPoint(headCenter),
    headHeight: round(h),
    colors: {
      palette: { fur: hex(fur.center), accent: hex(accent.center), dark: hex(dark.center) },
      eyeLuma,
      eyeBox: [roundPoint([-eyeX, eyeY0, eyeZ0]), roundPoint([eyeX, eyeY1, eyeZ1])],
      noseBox: [
        roundPoint([-0.2 * halfWidth, minY - 1, neck[2]]),
        roundPoint([0.2 * halfWidth, headJoint[1], crown]),
      ],
    },
    joints,
    extraBones,
  };
}

/**
 * Writes the README of the asset folder of a GLB body.
 *
 * @param species The species.
 * @param file The name of the file that the user gave.
 * @param size The size of the file, in bytes.
 * @param sha256 The SHA-256 of the file.
 * @param date The date, as YYYY-MM-DD.
 * @returns The text.
 */
export function assetReadme(
  species: SpeciesId,
  file: string,
  size: number,
  sha256: string,
  date: string,
): string {
  return [
    `# ${species} model`,
    '',
    `\`${species}.glb\` is the source of the body of the ${species} (design 4.4). \`pnpm rig-body ${species}\``,
    `makes the packed body \`src/models/rigged/${species}.ts\` from it. The app does not serve this`,
    'file. Since 2026-10-11, the app has no rigged body, and no species uses the packed body.',
    '',
    '| Item | Value |',
    '|---|---|',
    `| File | \`${species}.glb\`, ${size.toLocaleString('en-US')} bytes |`,
    `| SHA-256 | \`${sha256}\` |`,
    `| Source | Generated by the user, who gave it to this project on ${date} as \`${file}\` |`,
    '| License | The user generated the model and holds its rights. It is no third-party file, so the third-party license file (design 7.3) has no entry for it |',
    '',
    'To check the file:',
    '',
    '```bash',
    `shasum -a 256 assets/models/${species}/${species}.glb`,
    '```',
    '',
    `\`tools/glb-bodies/${species}.json\` gives the scale, the map from the joints of the file to the`,
    'bones of the player, the bones that the file does not have, and the color rules.',
    '',
  ].join('\n');
}

/**
 * Gives the height of the head center of the current body of a species, standing: the
 * parametric body.
 *
 * @param species The species.
 * @returns The height, in meters.
 */
function headCenterOf(species: SpeciesId): number {
  return buildBiped(new MeshBuilder(), SPECIES[species], { kind: 'standing' }).headCenter[1];
}

/**
 * Runs a command, prints its lines that start with a tag, and stops on a failure.
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
  for (const line of result.stdout
    .split('\n')
    .filter((l) => /^(inspect_glb|rig_body|preview_rig):/.test(l))) {
    console.log(line);
  }
  if (result.status !== 0) {
    throw new Error(`${command} failed with the status ${String(result.status)}.`);
  }
}

/**
 * Starts the GLB body of a species: `node tools/glb-init.ts <species> <glb> [--force]
 * [--preview <dir>]`. It copies the file into `assets/models/<species>/` with its README, inspects
 * it with Blender, and writes the proposed config into `tools/glb-bodies/<species>.json`. With
 * `--preview`, it also writes images of the skin and of the main bones into the folder.
 * Blender comes from the environment variable `BLENDER`, or `blender` on the path.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const previewAt = args.indexOf('--preview');
  const preview = previewAt >= 0 ? args[previewAt + 1] : undefined;
  const [id, glb] = args.filter(
    (a, i) => !a.startsWith('--') && (previewAt < 0 || i !== previewAt + 1),
  );
  if (!id || !isSpeciesId(id) || !glb) {
    throw new Error('Usage: node tools/glb-init.ts <species> <glb> [--force] [--preview <dir>]');
  }

  const folder = join(ROOT, 'assets', 'models', id);
  const asset = join(folder, `${id}.glb`);
  const configPath = join(ROOT, 'tools', 'glb-bodies', `${id}.json`);
  const exists = async (path: string): Promise<boolean> =>
    stat(path).then(
      () => true,
      () => false,
    );
  if (!force && ((await exists(configPath)) || (await exists(join(folder, 'README.md'))))) {
    throw new Error(
      `${id} has a config or an asset README already. Pass --force to write them again.`,
    );
  }

  await mkdir(folder, { recursive: true });
  if (resolve(glb) !== resolve(asset)) {
    await copyFile(glb, asset);
  }
  const bytes = await readFile(asset);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const date = new Date().toISOString().slice(0, 10);
  await writeFile(
    join(folder, 'README.md'),
    assetReadme(id, basename(glb), bytes.byteLength, sha256, date),
  );

  const blender = process.env['BLENDER'] ?? 'blender';
  const work = await mkdtemp(join(tmpdir(), 'zoophony-glb-init-'));
  try {
    const inspected = join(work, 'inspect.json');
    run(blender, [
      '-b',
      '--factory-startup',
      '--python',
      join(ROOT, 'tools', 'blender', 'inspect_glb.py'),
      '--',
      asset,
      inspected,
    ]);
    // SAFETY: the file is the JSON output of tools/blender/inspect_glb.py.
    const inspection = JSON.parse(await readFile(inspected, 'utf8')) as GlbInspection;
    const config = proposeConfig(inspection, relative(ROOT, asset), headCenterOf(id));
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
    console.log(
      `${relative(ROOT, configPath)}: height ${config.height} m, palette ${JSON.stringify(config.colors.palette)}`,
    );

    if (preview) {
      const rig = join(work, 'rig.json');
      run(blender, [
        '-b',
        '--factory-startup',
        '--python',
        join(ROOT, 'tools', 'blender', 'rig_body.py'),
        '--',
        configPath,
        rig,
      ]);
      run(blender, [
        '-b',
        '--factory-startup',
        '--python',
        join(ROOT, 'tools', 'blender', 'preview_rig.py'),
        '--',
        rig,
        preview,
      ]);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
  console.log(`Next: check the preview, run pnpm rig-body ${id}, and give the species \`rigged\`.`);
}

if (import.meta.main) {
  await main();
}
