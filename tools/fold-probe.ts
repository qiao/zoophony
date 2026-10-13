/**
 * Counts the folded faces of the skin of the studio body of a role in the poses of the app, over
 * the demos of the role (design 4.4). A face is folded when its posed normal is more than 90° from
 * its bind normal moved by the mean of the skin matrices of its corners: the test of the studio.
 * It prints the samples, the samples with a fold, their share, and the most folded faces of each
 * sample set, and the main bone of the folded faces. The method comes from
 * `docs/research/2026-10-12-studio-polar-bear/measure-folds.ts`.
 *
 * Usage: pnpm fold-probe <role> [--demo <id>]... [--step <seconds>]
 */
import { patchedDemos } from './patch-demos.ts';
import type { DemoFile } from './patch-demos.ts';
import { CONDUCTOR } from '../src/models/cast.ts';
import type { InstrumentId } from '../src/models/instruments/types.ts';
import type { PlayerModel } from '../src/models/player.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
import type { StudioMesh } from '../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, skinStudioMesh } from '../src/models/studio-rig.ts';
import type { Vec3 } from '../src/models/tuples.ts';
import { countInAt } from '../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../src/pose/pose-at.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from '../src/pose/test-scene.ts';
import type { TestScene } from '../src/pose/test-scene.ts';
import type { AnimalPose, Transport } from '../src/pose/types.ts';

/** The source of the body of a role: the conductor, or each player of an instrument. */
export type RoleSource =
  | {
      /** The conductor of the plan. */
      readonly kind: 'conductor';
    }
  | {
      /** Each player of the instrument with a studio body. */
      readonly kind: 'player';
      /** The instrument of the players. */
      readonly instrument: InstrumentId;
    };

/** The roles with a studio body. A new role of route 3 adds one entry. */
export const FOLD_ROLES: ReadonlyMap<string, RoleSource> = new Map<string, RoleSource>([
  ['conductor', { kind: 'conductor' }],
  ['pianist', { kind: 'player', instrument: 'piano' }],
]);

/** The names of the sample sets: the rest pose, the play, and the lift of the arms at the start. */
export const SAMPLE_SETS = ['rest', 'play', 'lift'] as const;

/** One set of samples. */
export type SampleSet = (typeof SAMPLE_SETS)[number];

/** The folds of one set of samples. */
export interface FoldCount {
  /** The number of posed bodies. */
  samples: number;
  /** The number of posed bodies with one folded face or more. */
  withFold: number;
  /** The most folded faces of one posed body. */
  most: number;
  /** The demo and the time of the posed body with the most folded faces. */
  worst: string;
  /** The folded faces of all samples, by the main studio bone of the face. */
  readonly bones: Map<string, number>;
}

/** The folds of a role over its demos. */
export interface FoldReport {
  /** The demos that have the role. */
  readonly demos: string[];
  /** The number of faces of the studio body. */
  faces: number;
  /** The folds of each sample set. */
  readonly sets: Readonly<Record<SampleSet, FoldCount>>;
}

/**
 * Gives the normal of a triangle of a flat array of places, with the length of twice its area.
 *
 * @param p The places, three numbers for each vertex.
 * @param a The first corner.
 * @param b The second corner.
 * @param c The third corner.
 * @returns The normal.
 */
function normal(p: ArrayLike<number>, a: number, b: number, c: number): Vec3 {
  const u = [0, 1, 2].map((k) => (p[b * 3 + k] ?? 0) - (p[a * 3 + k] ?? 0));
  const v = [0, 1, 2].map((k) => (p[c * 3 + k] ?? 0) - (p[a * 3 + k] ?? 0));
  const [ux = 0, uy = 0, uz = 0] = u;
  const [vx = 0, vy = 0, vz = 0] = v;
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

/**
 * Moves a normal by the cofactor of a 3 × 3 linear part, which keeps a normal at right angles to
 * its moved face.
 *
 * @param m The linear part, column by column.
 * @param n The normal.
 * @returns The moved normal.
 */
function cofactor(m: readonly number[], n: Vec3): Vec3 {
  const [a = 0, d = 0, g = 0, b = 0, e = 0, h = 0, c = 0, f = 0, i = 0] = m;
  const [x, y, z] = n;
  return [
    (e * i - f * h) * x - (d * i - f * g) * y + (d * h - e * g) * z,
    -(b * i - c * h) * x + (a * i - c * g) * y - (a * h - b * g) * z,
    (b * f - c * e) * x - (a * f - c * d) * y + (a * e - b * d) * z,
  ];
}

/**
 * Finds the folded faces of a posed studio mesh: each face whose posed normal is more than 90°
 * from its bind normal moved by the mean of the skin matrices of its corners.
 *
 * @param mesh The studio mesh in the bind pose.
 * @param matrices The skin matrices, 16 numbers for each bone, column by column.
 * @param posed The posed places, three numbers for each vertex.
 * @returns The folded faces, as indices of the triangles of the mesh.
 */
export function foldedFaces(
  mesh: Pick<StudioMesh, 'positions' | 'joints' | 'weights' | 'corners'>,
  matrices: ArrayLike<number>,
  posed: ArrayLike<number>,
): number[] {
  const folded: number[] = [];
  const linear = Array.from({ length: 9 }, () => 0);
  for (let t = 0; t < mesh.corners.length / 3; t++) {
    const corners = [0, 1, 2].map((k) => mesh.corners[t * 3 + k] ?? 0);
    linear.fill(0);
    for (const v of corners) {
      for (let k = 0; k < 4; k++) {
        const w = mesh.weights[v * 4 + k] ?? 0;
        const j = (mesh.joints[v * 4 + k] ?? 0) * 16;
        for (let col = 0; col < 3; col++) {
          for (let row = 0; row < 3; row++) {
            linear[col * 3 + row] =
              (linear[col * 3 + row] ?? 0) + (w / 3) * (matrices[j + col * 4 + row] ?? 0);
          }
        }
      }
    }
    const [a = 0, b = 0, c = 0] = corners;
    const expected = cofactor(linear, normal(mesh.positions, a, b, c));
    const now = normal(posed, a, b, c);
    if (now[0] * expected[0] + now[1] * expected[1] + now[2] * expected[2] < 0) {
      folded.push(t);
    }
  }
  return folded;
}

/**
 * Gives the main studio bone of a face: the bone with the largest weight over its three corners.
 *
 * @param mesh The studio mesh.
 * @param face The index of the triangle.
 * @returns The name of the bone.
 */
export function mainBone(
  mesh: Pick<StudioMesh, 'joints' | 'weights' | 'corners'>,
  face: number,
): string {
  const sums = new Map<number, number>();
  for (let k = 0; k < 3; k++) {
    const v = mesh.corners[face * 3 + k] ?? 0;
    for (let s = 0; s < 4; s++) {
      const bone = mesh.joints[v * 4 + s] ?? 0;
      sums.set(bone, (sums.get(bone) ?? 0) + (mesh.weights[v * 4 + s] ?? 0));
    }
  }
  const [best] = [...sums].toSorted((x, y) => y[1] - x[1]);
  return STUDIO_BONES[best?.[0] ?? 0] ?? '';
}

/**
 * Makes an empty count of folds.
 *
 * @returns The count.
 */
function emptyCount(): FoldCount {
  return { samples: 0, withFold: 0, most: 0, worst: '', bones: new Map() };
}

/**
 * Counts the folded faces of one posed body into a count.
 *
 * @param model The player model with its studio rig.
 * @param pose The pose of the player.
 * @param label The demo and the time of the sample.
 * @param count The count to update.
 */
function countPose(model: PlayerModel, pose: AnimalPose, label: string, count: FoldCount): void {
  const rig = model.studio;
  if (!rig) {
    return;
  }
  const studio = poseStudioBones(
    rig,
    model.skeleton,
    pose.rotations,
    pose.rootOffset,
    1,
    createStudioPose(),
  );
  const folded = foldedFaces(rig.mesh, studio.matrices, skinStudioMesh(rig.mesh, studio));
  for (const face of folded) {
    const bone = mainBone(rig.mesh, face);
    count.bones.set(bone, (count.bones.get(bone) ?? 0) + 1);
  }
  count.samples += 1;
  if (folded.length > 0) {
    count.withFold += 1;
  }
  if (folded.length > count.most) {
    count.most = folded.length;
    count.worst = label;
  }
}

/** One studio body of a role in a scene. */
interface RoleBody {
  /** The index of the player in the layout, or `null` for the conductor. */
  readonly index: number | null;
  /** The player model, with its studio rig. */
  readonly model: PlayerModel;
}

/**
 * Finds the studio bodies of a role in a scene.
 *
 * @param role The role.
 * @param scene The scene of a demo.
 * @returns The bodies with a studio rig, or none when the scene has no body of the role.
 */
function roleBodies(role: RoleSource, scene: TestScene): RoleBody[] {
  if (role.kind === 'conductor') {
    const model = scene.models.get(CONDUCTOR.species, CONDUCTOR.instrument, 4);
    return scene.plan.conductor && model.studio ? [{ index: null, model }] : [];
  }
  const bodies: RoleBody[] = [];
  for (const [index, place] of scene.layout.players.entries()) {
    const { species, instrument, kettles } = place.cast;
    const model = scene.models.get(species, instrument, kettles);
    if (instrument === role.instrument && model.studio) {
      bodies.push({ index, model });
    }
  }
  return bodies;
}

/**
 * Counts the folded faces of the studio body of a role over demos. The samples of each demo are
 * the rest pose before the start, the play from the count-in to the end at each step, and the
 * lift of the arms in the first 3 s of wall time after the start.
 *
 * @param role The role.
 * @param demos The demos. A demo with no body of the role adds nothing.
 * @param step The step of the song time of the play, in seconds.
 * @returns The report.
 */
export function probeFolds(role: RoleSource, demos: readonly DemoFile[], step: number): FoldReport {
  const report: FoldReport = {
    demos: [],
    faces: 0,
    sets: { rest: emptyCount(), play: emptyCount(), lift: emptyCount() },
  };
  for (const demo of demos) {
    const scene = sceneOf(demo.bytes);
    const bodies = roleBodies(role, scene);
    if (bodies.length === 0) {
      continue;
    }
    report.demos.push(demo.file);
    report.faces = (bodies[0]?.model.studio?.mesh.corners.length ?? 0) / 3;

    const audible = allAudible(scene.score);
    const buffer = createScenePose(scene.plan);
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    const samples: [SampleSet, number, number, Transport, string][] = [
      ['rest', start, 10, NOT_STARTED, 'rest'],
    ];
    for (let song = start; song <= scene.score.durationSec; song += step) {
      samples.push(['play', song, 10 + song - start, PLAYING, `${song.toFixed(2)} s`]);
    }
    const lift: Transport = { ...PLAYING, changedAtWall: 10 };
    for (let wall = 10; wall < 13; wall += 0.1) {
      const song = Math.min(0, start + wall - 10);
      samples.push(['lift', song, wall, lift, `wall ${(wall - 10).toFixed(1)} s`]);
    }
    for (const [set, song, wall, transport, label] of samples) {
      const frame = poseAt(scene.plan, song, wall, transport, audible, buffer);
      for (const { index, model } of bodies) {
        const pose = index === null ? frame.conductor : frame.players[index];
        const who = bodies.length > 1 ? ` player ${index ?? ''}` : '';
        if (pose) {
          countPose(model, pose, `${demo.file}${who} ${label}`, report.sets[set]);
        }
      }
    }
  }
  return report;
}

/**
 * Writes a report as lines: a table of the sample sets, and the bones of the folded faces.
 *
 * @param name The name of the role.
 * @param report The report.
 * @param step The step of the song time of the play, in seconds.
 * @returns The lines.
 */
export function foldLines(name: string, report: FoldReport, step: number): string[] {
  const all = emptyCount();
  for (const set of SAMPLE_SETS) {
    const count = report.sets[set];
    all.samples += count.samples;
    all.withFold += count.withFold;
    if (count.most > all.most) {
      all.most = count.most;
      all.worst = count.worst;
    }
    for (const [bone, n] of count.bones) {
      all.bones.set(bone, (all.bones.get(bone) ?? 0) + n);
    }
  }
  const row = (set: string, count: FoldCount): string => {
    const share = (100 * count.withFold) / Math.max(1, count.samples);
    return `| ${set} | ${count.samples} | ${count.withFold} | ${share.toFixed(1)}% | ${count.most} | ${count.worst || '-'} |`;
  };
  const bones = [...all.bones].toSorted((a, b) => b[1] - a[1]).map(([bone, n]) => `${bone} ${n}`);
  return [
    `Folded faces of the studio body of the ${name} (${report.faces} faces), play step ${step} s.`,
    `Demos: ${report.demos.join(', ') || 'none'}`,
    '',
    '| Set | Samples | With a fold | Share | Most faces | Worst sample |',
    '|---|---:|---:|---:|---:|---|',
    ...SAMPLE_SETS.map((set) => row(set, report.sets[set])),
    row('all', all),
    '',
    `Folded faces of all samples by the main studio bone: ${bones.join(', ') || 'none'}`,
  ];
}

/**
 * Runs the probe: `node tools/fold-probe.ts <role> [--demo <id>]... [--step <seconds>]`.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const name = args[0] ?? '';
  const role = FOLD_ROLES.get(name);
  if (!role) {
    throw new Error(
      `Usage: pnpm fold-probe <role> [--demo <id>]... [--step <seconds>], with a role of: ${[...FOLD_ROLES.keys()].join(', ')}.`,
    );
  }
  // A demo is its file name, with or without `.mid`, as in `pnpm pose-depth`.
  const chosen = args.flatMap((arg, i) =>
    args[i - 1] === '--demo' ? [arg.endsWith('.mid') ? arg : `${arg}.mid`] : [],
  );
  const stepAt = args.indexOf('--step');
  const step = stepAt >= 0 ? Number(args[stepAt + 1]) : 0.25;
  if (!(step > 0)) {
    throw new Error('The step must be a number of seconds above 0.');
  }

  const all = await patchedDemos();
  const unknown = chosen.filter((file) => !all.some((demo) => demo.file === file));
  if (unknown.length > 0) {
    throw new Error(`No demo has the name ${unknown.join(', ')}.`);
  }
  const demos = chosen.length > 0 ? all.filter((demo) => chosen.includes(demo.file)) : all;
  console.log(foldLines(name, probeFolds(role, demos, step), step).join('\n'));
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
