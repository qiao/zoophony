/**
 * Counts the folded faces of the skin of the studio body of a role (design 4.4). It poses the
 * body as the app does, over each demo of the role. The test of a fold is the test of the
 * studio. The bind normal of a face moves by the mean of the skin matrices of its corners. The
 * face is folded when its posed normal is more than 90° from that normal. For each sample set,
 * the tool prints the samples, the samples with a fold, their share, and the most folded faces.
 * Then it prints the main bone of the folded faces. With `--faces <n>`, it also prints the `n`
 * faces that fold in the most samples, with their places, their corner angles, and the weights of
 * their corners. The method comes from
 * `docs/research/2026-10-12-studio-polar-bear/measure-folds.ts`.
 *
 * Usage: pnpm fold-probe <role> [--demo <id>]... [--step <seconds>] [--faces <n>] [--glb <file>]
 */
import { runTool, speciesAnimal, takeGlb, withGlbBody } from './glb-swap.ts';
import { patchedDemos } from './patch-demos.ts';
import type { DemoFile } from './patch-demos.ts';
import { CONDUCTOR, SECTION_INSTRUMENTS, SECTION_SPECIES } from '../src/models/cast.ts';
import type { PlayingSection } from '../src/models/cast.ts';
import type { InstrumentId } from '../src/models/instruments/types.ts';
import type { PlayerModel } from '../src/models/player.ts';
import type { SpeciesId } from '../src/models/species.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
import type { StudioMesh } from '../src/models/studio-format.ts';
import {
  createStudioPose,
  poseStudioBones,
  skinStudioMesh,
  studioOffsets,
} from '../src/models/studio-rig.ts';
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
      /**
       * The species of the role. The rabbits of the first violins and the red foxes of the second
       * violins play one instrument with two studio bodies, so each body has a role of its own.
       */
      readonly species: readonly SpeciesId[];
    };

/** The roles with a studio body. A new role of route 3 adds one entry. */
export const FOLD_ROLES: ReadonlyMap<string, RoleSource> = new Map<string, RoleSource>([
  ['conductor', { kind: 'conductor' }],
  ['pianist', { kind: 'player', instrument: 'piano', species: ['polar-bear'] }],
  ['violinist', { kind: 'player', instrument: 'violin', species: ['rabbit'] }],
  ['fox-violinist', { kind: 'player', instrument: 'violin', species: ['fox-red'] }],
]);

/**
 * Gives the species of a role: the conductor, or the species of the role in each section with the
 * instrument of the role.
 *
 * @param role The role.
 * @returns The species.
 */
export function roleSpecies(role: RoleSource): SpeciesId[] {
  if (role.kind === 'conductor') {
    return [CONDUCTOR.species];
  }
  return Object.keys(SECTION_INSTRUMENTS)
    .filter((section): section is PlayingSection => section in SECTION_SPECIES)
    .filter((section) =>
      SECTION_INSTRUMENTS[section].some((instrument) => instrument === role.instrument),
    )
    .flatMap((section) => SECTION_SPECIES[section])
    .filter((species) => role.species.includes(species));
}

/**
 * Gives the animal of the studio body of a role (`tools/glb-swap.ts`).
 *
 * @param role The role.
 * @returns The animal, such as `rabbit` for the violinist.
 * @throws Error if no species of the role has a studio body, or more than one has.
 */
export function roleAnimal(role: RoleSource): string {
  const animals = [
    ...new Set(roleSpecies(role).flatMap((species) => speciesAnimal(species) ?? [])),
  ];
  const [animal] = animals;
  if (animal === undefined || animals.length > 1) {
    throw new Error(`The role has the studio bodies of ${animals.join(', ') || 'no animal'}.`);
  }
  return animal;
}

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
  /** The number of samples in which each folded face folds, by the index of the face. */
  readonly byFace: Map<number, number>;
}

/** The folds of a role over its demos. */
export interface FoldReport {
  /** The demos that have the role. */
  readonly demos: string[];
  /** The number of faces of the studio body. */
  faces: number;
  /**
   * The bind mesh of the first studio body of the role, or `null` when no demo has the role. The
   * bodies of a role share their faces, so the facts of a face come from this mesh.
   */
  mesh: StudioMesh | null;
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
 * Finds the folded faces of a posed studio mesh. The bind normal of a face moves by the mean of
 * the skin matrices of its corners. The face is folded when its posed normal is more than 90°
 * from that normal.
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
  return { samples: 0, withFold: 0, most: 0, worst: '', bones: new Map(), byFace: new Map() };
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
    studioOffsets(pose),
    1,
    createStudioPose(),
  );
  const folded = foldedFaces(rig.mesh, studio.matrices, skinStudioMesh(rig.mesh, studio));
  for (const face of folded) {
    const bone = mainBone(rig.mesh, face);
    count.bones.set(bone, (count.bones.get(bone) ?? 0) + 1);
    count.byFace.set(face, (count.byFace.get(face) ?? 0) + 1);
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
 * Finds the studio bodies of a role in a scene: the first player of each model of a species of the
 * role. The violin seats of a demo hold many rabbits with one model, so the first of them stands
 * for all.
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
    const { species, instrument, kettles, support } = place.cast;
    if (instrument !== role.instrument || !role.species.includes(species)) {
      continue;
    }
    const model = scene.models.get(species, instrument, kettles, support);
    if (model.studio && !bodies.some((b) => b.model === model)) {
      bodies.push({ index, model });
    }
  }
  return bodies;
}

/**
 * Counts the folded faces of the studio body of a role over demos. Each demo has three sample
 * sets. The rest pose is the pose before the start. The play goes from the count-in to the end
 * at each step. The lift of the arms takes the first 3 s of wall time after the start.
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
    mesh: null,
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
    report.mesh ??= bodies[0]?.model.studio?.mesh ?? null;

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

/** One bone of a corner of a face, with its weight. */
export interface CornerWeight {
  /** The name of the studio bone. */
  readonly bone: string;
  /** The weight, from 0 to 1. */
  readonly weight: number;
}

/** The facts of one face of a studio mesh in the bind pose. */
export interface FaceFacts {
  /** The index of the triangle in the mesh. */
  readonly face: number;
  /** The main studio bone of the face ({@link mainBone}). */
  readonly bone: string;
  /** The middle of the face: the mean of its three corners, in meters. */
  readonly middle: Vec3;
  /** The angle at each corner, in degrees, in the order of the corners. */
  readonly angles: readonly [number, number, number];
  /**
   * The bones of each corner with a weight above 0, the largest weight first: at most 4 for each
   * corner.
   */
  readonly weights: readonly (readonly CornerWeight[])[];
}

/**
 * Gives the facts of one face of a studio mesh in the bind pose: its main bone, its middle, the
 * angle at each corner, and the weights of each corner.
 *
 * @param mesh The studio mesh in the bind pose.
 * @param face The index of the triangle.
 * @returns The facts.
 */
export function faceFacts(
  mesh: Pick<StudioMesh, 'positions' | 'joints' | 'weights' | 'corners'>,
  face: number,
): FaceFacts {
  const corners = [0, 1, 2].map((k) => mesh.corners[face * 3 + k] ?? 0);
  const points = corners.map((v): Vec3 => [
    mesh.positions[v * 3] ?? 0,
    mesh.positions[v * 3 + 1] ?? 0,
    mesh.positions[v * 3 + 2] ?? 0,
  ]);
  const mean = (axis: 0 | 1 | 2): number => points.reduce((sum, p) => sum + p[axis], 0) / 3;
  const middle: Vec3 = [mean(0), mean(1), mean(2)];
  const angle = (k: number): number => {
    const p = points[k] ?? [0, 0, 0];
    const a = (points[(k + 1) % 3] ?? p).map((x, axis) => x - (p[axis] ?? 0));
    const b = (points[(k + 2) % 3] ?? p).map((x, axis) => x - (p[axis] ?? 0));
    const dot = a.reduce((sum, x, axis) => sum + x * (b[axis] ?? 0), 0);
    const cos = dot / (Math.hypot(...a) * Math.hypot(...b));
    return Math.acos(Math.min(1, Math.max(-1, cos))) * (180 / Math.PI);
  };
  const weights = corners.map((v) =>
    [0, 1, 2, 3]
      .map((k) => ({
        bone: STUDIO_BONES[mesh.joints[v * 4 + k] ?? 0] ?? '',
        weight: mesh.weights[v * 4 + k] ?? 0,
      }))
      .filter((entry) => entry.weight > 0)
      .toSorted((x, y) => y.weight - x.weight),
  );
  return {
    face,
    bone: mainBone(mesh, face),
    middle,
    angles: [angle(0), angle(1), angle(2)],
    weights,
  };
}

/**
 * Writes the faces that fold in the most samples of all sample sets as a table: for each face,
 * its index, the share of the samples of each set in which it folds, and its facts
 * ({@link faceFacts}).
 *
 * @param report The report.
 * @param count The number of faces.
 * @returns The lines, or a line that names no face when no face folds.
 */
export function faceLines(report: FoldReport, count: number): string[] {
  const totals = new Map<number, number>();
  for (const set of SAMPLE_SETS) {
    for (const [face, n] of report.sets[set].byFace) {
      totals.set(face, (totals.get(face) ?? 0) + n);
    }
  }
  const top = [...totals]
    .toSorted((x, y) => y[1] - x[1] || x[0] - y[0])
    .slice(0, count)
    .map(([face]) => face);
  if (!report.mesh || top.length === 0) {
    return ['No face folds.'];
  }

  const share = (set: SampleSet, face: number): string => {
    const { byFace, samples } = report.sets[set];
    return `${((100 * (byFace.get(face) ?? 0)) / Math.max(1, samples)).toFixed(1)}%`;
  };
  const mesh = report.mesh;
  return [
    `The ${top.length} faces that fold in the most samples, with the places and the weights of the bind pose:`,
    '',
    `| Face | ${SAMPLE_SETS.map((set) => `${set[0]?.toUpperCase()}${set.slice(1)}`).join(' | ')} | Main bone | Middle (m) | Corner angles | Corner weights |`,
    `|---:|${SAMPLE_SETS.map(() => '---:|').join('')}---|---|---|---|`,
    ...top.map((face) => {
      const facts = faceFacts(mesh, face);
      const middle = facts.middle.map((x) => x.toFixed(3)).join(', ');
      const angles = facts.angles.map((a) => `${a.toFixed(1)}°`).join(', ');
      const weights = facts.weights
        .map((corner) => corner.map((w) => `${w.bone} ${w.weight.toFixed(2)}`).join(' '))
        .join(' / ');
      return `| ${face} | ${SAMPLE_SETS.map((set) => share(set, face)).join(' | ')} | ${facts.bone} | ${middle} | ${angles} | ${weights} |`;
    }),
  ];
}

/**
 * Runs the probe: `node tools/fold-probe.ts <role> [--demo <id>]... [--step <seconds>]`. With
 * `--glb <file>`, the role gets the studio body that the export makes from the file, in a copy of
 * `src/` (`tools/glb-swap.ts`).
 */
async function main(): Promise<void> {
  const { glb, rest: args } = takeGlb(process.argv.slice(2));
  const name = args[0] ?? '';
  const role = FOLD_ROLES.get(name);
  if (!role) {
    throw new Error(
      `Usage: pnpm fold-probe <role> [--demo <id>]... [--step <seconds>] [--faces <n>] [--glb <file>], with a role of: ${[...FOLD_ROLES.keys()].join(', ')}.`,
    );
  }
  if (glb) {
    process.exitCode = await withGlbBody(roleAnimal(role), glb, (dir) =>
      runTool(dir, 'fold-probe.ts', args),
    );
    return;
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
  const facesAt = args.indexOf('--faces');
  const faces = facesAt >= 0 ? Number(args[facesAt + 1]) : 0;
  if (!Number.isInteger(faces) || faces < 0) {
    throw new Error('The option --faces takes a whole number of faces.');
  }

  const all = await patchedDemos();
  const unknown = chosen.filter((file) => !all.some((demo) => demo.file === file));
  if (unknown.length > 0) {
    throw new Error(`No demo has the name ${unknown.join(', ')}.`);
  }
  const demos = chosen.length > 0 ? all.filter((demo) => chosen.includes(demo.file)) : all;
  const report = probeFolds(role, demos, step);
  console.log(foldLines(name, report, step).join('\n'));
  if (faces > 0) {
    console.log(['', ...faceLines(report, faces)].join('\n'));
  }
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
