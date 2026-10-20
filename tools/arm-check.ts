/**
 * Checks the arms of the studio body of each role against one table of limits ({@link ARM_LIMITS},
 * design 4.4), so that a change of a hold, a rig, a pose, an instrument size, or a seat that twists
 * or deforms an arm stops before its merge. Five rounds each met their own measure and moved the
 * fault to a joint that no measure read (`docs/decisions/2026-10-19-arm-gate.md`). So the gate
 * reads the measures of `pnpm fold-probe`, `pnpm arm-shape`, and `pnpm hold-fit` together, for
 * each arm, over the rest, play, and lift samples of `probeFolds()` of `tools/fold-probe.ts`:
 *
 * - `folds`: the folded faces of the arm ({@link armFaces}), as `pnpm fold-probe` finds them. The
 *   value is the 95th percentile of the count.
 * - `twist`: the largest roll step of the skin from the chest along the upper arm, over the rings
 *   of {@link ARM_RINGS}, as `measureArm()` of `tools/arm-shape.ts` gives it. `forearm twist`: the
 *   same step from the elbow ring to the wrist ring, which a turn of the paw makes larger.
 * - `flat`: the narrow axis of the flattest ring as a share of its bind value. The value is the 5th
 *   percentile.
 * - `paw twist` and `paw swing`: the turn of the paw on its forearm from the bind pose, split into
 *   the twist around the forearm and the swing, as `pawAngles()` of `tools/hold-fit.ts` gives them
 *   for the mean turn.
 * - `paw jumps`: the share of the play samples whose paw twist changes by more than
 *   {@link JUMP_ANGLE} from the sample before, as the flips of the bow paw of the hippo did.
 * - `stretch`: the largest growth of an edge of the faces of the forearm and the paw, as a share of
 *   the length of the upper arm, such as a spike from the paw to the upper arm.
 *
 * The other values are the 95th percentiles of the samples. Each value has a p50, a p95 (a p5 for
 * the flat share), and its worst sample (the demo and the time) in each sample set. The value of
 * the gate comes from the worst sample set.
 *
 * With `--base <ref>`, the commit runs beside the working tree, each role in a child process
 * (`probeBeside()` of `tools/ref-tree.ts`), and the JSON of the commit goes into the cache by tree.
 * Each value then has a verdict ({@link verdictOf}): `FAIL` when it is over its limit and the base
 * is not, or when it is worse than the base by more than its margin; `OPEN` when it is over its
 * limit and not worse than the base (a known open item); else `PASS`. With no `--base`, each value
 * over its limit fails. A role that the commit does not have has no base. The
 * exit code is 1 when a value fails.
 *
 * The tool imports only the modules and the exports that the trees since 2026-10-18 have, because
 * a probe of an old commit copies it into the tree of the commit (`withProbeTree()`). A tree before
 * the label of the fold visit gets the labels of its samples from the plan of the demo.
 *
 * `--views <dir>` renders the worst play sample of each arm that fails, or of each arm with
 * `--views-all`, a strike, and a rest of the player, with `pnpm close-views play --at <species>`,
 * and writes `<dir>/<role>-arms.webp`: a 2x crop of the arm in each view, the commit on the left
 * and the working tree on the right (`tools/arm-views.ts`).
 *
 * Usage: pnpm arm-check <role>... | --all [--base <ref>] [--set <changes>]... [--glb <file>]
 * [--views <dir> [--views-all]] [--demo <id>]... [--step <seconds>] [--jobs <n>] [--long]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { Matrix4, Quaternion, Vector3 } from 'three';

import { FOLD_ROLES, SAMPLE_SETS, probeFolds, roleAnimal, roleBodies } from './fold-probe.ts';
import type { RoleSource, SampleSet } from './fold-probe.ts';
import { runTool, takeGlb, withGlbBody } from './glb-swap.ts';
import { setHolds } from './hold-sets.ts';
import { patchedDemos } from './patch-demos.ts';
import type { DemoFile } from './patch-demos.ts';
import { ROOT, probeBeside, runChild, withTempFolder } from './ref-tree.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
import type { Side, StudioBone, StudioMesh } from '../src/models/studio-format.ts';
import { twistAngle } from '../src/models/studio-rig.ts';
import type { StudioRig } from '../src/models/studio-rig.ts';
import { countInAt } from '../src/pose/count-in.ts';
import { sceneOf } from '../src/pose/test-scene.ts';

/** The sides of the arms. */
const SIDES = ['L', 'R'] as const;

/** The measures of the gate. */
export const MEASURES = [
  'folds',
  'twist',
  'foreTwist',
  'flat',
  'pawTwist',
  'pawSwing',
  'pawJump',
  'stretch',
] as const;

/** A measure of the gate. */
export type Measure = (typeof MEASURES)[number];

/** The limit of one measure of the gate. */
export interface ArmLimit {
  /** The name of the measure in the tables. */
  readonly name: string;
  /** The value of a sample set that the limit reads: a share of the samples, or a percentile. */
  readonly stat: 'share' | 'p95' | 'p5';
  /** The limit of the value. */
  readonly limit: number;
  /** True when a larger value is worse, false when a smaller value is worse. */
  readonly up: boolean;
  /** The change from the base above which a value over its limit is worse than the base. */
  readonly margin: number;
  /** The number of digits of the value in the tables. */
  readonly digits: number;
  /** The source of the limit. */
  readonly source: string;
}

/**
 * The limits of the gate. Each limit comes from the arms that look good on `main` at 2026-10-19
 * (the rabbit and the red fox of `pnpm arm-shape`, and the other roles with no open arm item), or
 * from anatomy, with a margin above the good arms. `docs/decisions/2026-10-19-arm-gate.md` gives
 * the rows, and `docs/research/2026-10-19-arm-gate.md` the measures.
 */
export const ARM_LIMITS: Readonly<Record<Measure, ArmLimit>> = {
  folds: {
    name: 'folds p95',
    stat: 'p95',
    limit: 8,
    up: true,
    margin: 2,
    digits: 0,
    source: 'good arms: up to 6 faces (red fox) and 8 (tan fox); the hippo shoulder folded 12',
  },
  twist: {
    name: 'twist p95',
    stat: 'p95',
    limit: 55,
    up: true,
    margin: 10,
    digits: 0,
    source: 'good upper arms up to 51° (rabbit bow arm); the twist band of the hippo 60°',
  },
  foreTwist: {
    name: 'forearm twist p95',
    stat: 'p95',
    limit: 80,
    up: true,
    margin: 15,
    digits: 0,
    source: 'good forearms up to 77° (rabbit left arm in the lift)',
  },
  flat: {
    name: 'flat p5',
    stat: 'p5',
    limit: 0.55,
    up: false,
    margin: 0.05,
    digits: 2,
    source: 'good arms 0.56 and more (red fox, polar bear); the hippo band 0.53',
  },
  pawTwist: {
    name: 'paw twist p95',
    stat: 'p95',
    limit: 170,
    up: true,
    margin: 30,
    digits: 0,
    source: 'good paws up to 168° from the bind (red fox); the bind paw is no neutral wrist',
  },
  pawSwing: {
    name: 'paw swing p95',
    stat: 'p95',
    limit: 70,
    up: true,
    margin: 15,
    digits: 0,
    source: 'anatomy: a wrist bends about 70°; good paws up to 64° (bear conductor)',
  },
  pawJump: {
    name: 'paw jumps',
    stat: 'share',
    limit: 0.005,
    up: true,
    margin: 0.005,
    digits: 3,
    source: 'a paw twist of more than 90° in one play step is a flip; good paws have none',
  },
  stretch: {
    name: 'stretch p95',
    stat: 'p95',
    limit: 0.35,
    up: true,
    margin: 0.05,
    digits: 2,
    source: 'good forearms and paws up to 0.32 of the upper arm (dog cellist)',
  },
};

/** The paw twist change between two samples above which the change is a jump, in degrees. */
export const JUMP_ANGLE = 90;

/**
 * The smallest share of the weight of the three corners of a face on the bones of one arm, from
 * the clavicle to the fingers, that makes the face a face of that arm.
 */
export const ARM_FACE_SHARE = 0.5;

/** A ring of the arm skin: the bone of its axis and its place along the bone. */
export interface ArmRing {
  /** The name of the ring. */
  readonly name: 'shoulder' | 'upper' | 'elbow' | 'forearm' | 'wrist';
  /** The bone of the axis: the upper arm or the forearm. */
  readonly bone: 'upper' | 'fore';
  /** The place along the bone, from 0 at its head to 1 at the head of the next bone. */
  readonly at: number;
}

/**
 * The rings of each arm, from the shoulder out: the four rings of `ARM_RINGS` of
 * `tools/arm-shape.ts`, and a ring near the wrist, because a forearm can go flat with a round
 * upper arm.
 */
export const ARM_RINGS: readonly ArmRing[] = [
  { name: 'shoulder', bone: 'upper', at: 0.15 },
  { name: 'upper', bone: 'upper', at: 0.5 },
  { name: 'elbow', bone: 'upper', at: 0.85 },
  { name: 'forearm', bone: 'fore', at: 0.5 },
  { name: 'wrist', bone: 'fore', at: 0.85 },
];

/** The smallest weight of a crossing of a ring on the bones of its arm (`RING_WEIGHT`). */
const RING_WEIGHT = 0.25;

/** The largest distance of a crossing from the axis, as a factor of the median (`RING_REACH`). */
const RING_REACH = 2;

/** The earliest song time of a view, in seconds, after the seek lead of `pnpm close-views play`. */
const VIEW_FROM_SEC = 5;

/** The bind facts of one ring of one arm. */
interface RingBind {
  /** The ring. */
  readonly ring: ArmRing;
  /** The two vertices of each edge that crosses the plane of the ring. */
  readonly edges: Uint32Array;
  /** The place of each crossing along its edge, from 0 at its first vertex to 1. */
  readonly along: Float32Array;
  /** The bind vector of each crossing from the axis, normal to the axis. */
  readonly radial: Float32Array;
  /** The narrowest axis of the bind ring. */
  readonly narrow: number;
}

/** The bind facts of one arm. */
interface ArmBind {
  /** The indices of the chest and the arm bones in `STUDIO_BONES`. */
  readonly bones: Readonly<Record<'chest' | 'upper' | 'fore' | 'hand', number>>;
  /** The bind heads of the shoulder, the elbow, and the wrist. */
  readonly joints: Readonly<Record<'shoulder' | 'elbow' | 'wrist', Vector3>>;
  /** The rings of {@link ARM_RINGS}. */
  readonly rings: readonly RingBind[];
  /** The faces of the arm ({@link armFaces}). */
  readonly faces: ReadonlySet<number>;
  /** The three vertices of each face of the arm. */
  readonly corners: Uint32Array;
  /** The three vertices of each face of the forearm and the paw ({@link armFaces}). */
  readonly lower: Uint32Array;
  /** The bind length of the three edges of each face of {@link ArmBind.lower}. */
  readonly lengths: Float32Array;
  /** The bind length of the upper arm. */
  readonly upper: number;
}

/** The values of one arm in one sample, by measure. */
export type ArmSample = Readonly<Record<Measure, number>> & {
  /** The signed twist of the paw on its forearm, in degrees, for the jumps. */
  readonly pawRoll: number;
};

/**
 * Gives the skin joints of one arm: the studio bones from the upper arm to the fingers, the
 * clavicle when asked, and each extra joint that follows the upper arm, such as the twist bone of
 * the upper arm (`StudioRig.follows`).
 *
 * @param rig The studio rig.
 * @param side The side.
 * @param clavicle True to add the clavicle.
 * @returns The indices of the skin joints.
 */
export function armJoints(rig: StudioRig, side: Side, clavicle: boolean): number[] {
  const names: StudioBone[] = [
    ...(clavicle ? [`clavicle_${side}` as const] : []),
    `upper_arm_${side}`,
    `forearm_${side}`,
    `forearm_twist_${side}`,
    `hand_${side}`,
    `fingers_${side}`,
  ];
  const own = names.map((name) => STUDIO_BONES.indexOf(name));
  const upper = rig.follows[STUDIO_BONES.indexOf(`upper_arm_${side}`)];
  const extra = [...rig.follows.keys()].filter(
    (j) => j >= STUDIO_BONES.length && rig.follows[j] === upper,
  );
  return [...own, ...extra];
}

/**
 * Gives the weight of a vertex on some joints.
 *
 * @param mesh The skin.
 * @param v The vertex.
 * @param joints The joints.
 * @returns The sum of the weights.
 */
function weightOn(
  mesh: Pick<StudioMesh, 'joints' | 'weights'>,
  v: number,
  joints: readonly number[],
): number {
  let sum = 0;
  for (let k = 0; k < 4; k++) {
    if (joints.includes(mesh.joints[v * 4 + k] ?? -1)) {
      sum += mesh.weights[v * 4 + k] ?? 0;
    }
  }
  return sum;
}

/**
 * Finds the faces of one arm: the faces whose corners hold {@link ARM_FACE_SHARE} of their weight
 * or more on the joints of the arm, from the clavicle to the fingers.
 *
 * @param mesh The skin.
 * @param joints The joints of the arm.
 * @returns The indices of the faces.
 */
export function armFaces(
  mesh: Pick<StudioMesh, 'joints' | 'weights' | 'corners'>,
  joints: readonly number[],
): Set<number> {
  const faces = new Set<number>();
  for (let f = 0; f < mesh.corners.length / 3; f++) {
    let sum = 0;
    for (let k = 0; k < 3; k++) {
      sum += weightOn(mesh, mesh.corners[f * 3 + k] ?? 0, joints);
    }
    if (sum >= 3 * ARM_FACE_SHARE) {
      faces.add(f);
    }
  }
  return faces;
}

/**
 * Gives the root of the smaller principal value of some vectors in the plane normal to an axis
 * (`narrowAxis()` of `tools/arm-shape.ts`).
 *
 * @param vectors The vectors, x, y, z of each one.
 * @param axis The unit axis.
 * @returns The root, in the units of the vectors.
 */
function narrowAxis(vectors: ArrayLike<number>, axis: Vector3): number {
  const e1 = new Vector3(1, 0, 0);
  if (Math.abs(axis.x) > 0.9) {
    e1.set(0, 1, 0);
  }
  e1.addScaledVector(axis, -e1.dot(axis)).normalize();
  const e2 = new Vector3().crossVectors(axis, e1);
  const count = vectors.length / 3;
  const p = new Vector3();
  let mx = 0;
  let my = 0;
  for (let i = 0; i < count; i++) {
    p.fromArray(vectors, i * 3);
    mx += p.dot(e1) / count;
    my += p.dot(e2) / count;
  }
  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (let i = 0; i < count; i++) {
    p.fromArray(vectors, i * 3);
    const a = p.dot(e1) - mx;
    const b = p.dot(e2) - my;
    xx += (a * a) / count;
    yy += (b * b) / count;
    xy += (a * b) / count;
  }
  const half = (xx + yy) / 2;
  const root = Math.sqrt(Math.max(0, half * half - (xx * yy - xy * xy)));
  return Math.sqrt(Math.max(0, half - root));
}

/**
 * Finds the bind facts of one ring: the crossings of the mesh edges with the plane of the ring,
 * normal to the bone, as `ringBind()` of `tools/arm-shape.ts` finds them.
 *
 * @param mesh The skin.
 * @param edges The two vertices of each edge of the mesh.
 * @param ring The ring.
 * @param head The bind head of the bone.
 * @param tail The bind head of the next bone.
 * @param joints The joints of the arm, from the upper arm out.
 * @returns The facts.
 */
function ringBind(
  mesh: Pick<StudioMesh, 'positions' | 'joints' | 'weights'>,
  edges: Uint32Array,
  ring: ArmRing,
  head: Vector3,
  tail: Vector3,
  joints: readonly number[],
): RingBind {
  const axis = tail.clone().sub(head);
  const length = axis.length();
  axis.normalize();
  const center = head.clone().addScaledVector(axis, ring.at * length);
  const a = new Vector3();
  const b = new Vector3();
  const found: { i: number; j: number; t: number; r: Vector3; arm: number }[] = [];
  for (let e = 0; e < edges.length; e += 2) {
    const i = edges[e] ?? 0;
    const j = edges[e + 1] ?? 0;
    const si = a
      .fromArray(mesh.positions, i * 3)
      .sub(center)
      .dot(axis);
    const sj = b
      .fromArray(mesh.positions, j * 3)
      .sub(center)
      .dot(axis);
    if (si * sj >= 0) {
      continue;
    }
    const t = si / (si - sj);
    const q = a.fromArray(mesh.positions, i * 3).lerp(b.fromArray(mesh.positions, j * 3), t);
    q.sub(center);
    const arm = (1 - t) * weightOn(mesh, i, joints) + t * weightOn(mesh, j, joints);
    if (arm >= RING_WEIGHT) {
      found.push({ i, j, t, r: q.clone().addScaledVector(axis, -q.dot(axis)), arm });
    }
  }
  const core = found.filter((f) => f.arm >= 0.5);
  const sorted = (core.length > 0 ? core : found)
    .map((f) => f.r.length())
    .toSorted((x, y) => x - y);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const kept = found.filter((f) => f.r.length() <= RING_REACH * median);
  const radial = new Float32Array(kept.length * 3);
  for (const [k, f] of kept.entries()) {
    f.r.toArray(radial, k * 3);
  }
  return {
    ring,
    edges: Uint32Array.from(kept.flatMap((f) => [f.i, f.j])),
    along: Float32Array.from(kept.map((f) => f.t)),
    radial,
    narrow: narrowAxis(radial, axis),
  };
}

/**
 * Gives each edge of some faces one time.
 *
 * @param corners The three vertices of each triangle.
 * @param faces The faces, or `null` for all.
 * @returns The two vertices of each edge, the smaller index first.
 */
function faceEdges(corners: Uint32Array, faces: ReadonlySet<number> | null): Uint32Array {
  const seen = new Set<number>();
  const out: number[] = [];
  for (let f = 0; f < corners.length / 3; f++) {
    if (faces && !faces.has(f)) {
      continue;
    }
    for (let k = 0; k < 3; k++) {
      const a = corners[f * 3 + k] ?? 0;
      const b = corners[f * 3 + ((k + 1) % 3)] ?? 0;
      const key = Math.min(a, b) * 0x10000 + Math.max(a, b);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(Math.min(a, b), Math.max(a, b));
      }
    }
  }
  return Uint32Array.from(out);
}

/**
 * Finds the bind facts of one arm.
 *
 * @param rig The studio rig.
 * @param side The side.
 * @returns The facts.
 */
function armBind(rig: StudioRig, side: Side): ArmBind {
  const { mesh } = rig;
  const h = rig.body.heads;
  const joints = {
    shoulder: new Vector3(...h[`upper_arm_${side}`]),
    elbow: new Vector3(...h[`forearm_${side}`]),
    wrist: new Vector3(...h[`hand_${side}`]),
  };
  const bones = {
    chest: STUDIO_BONES.indexOf('chest'),
    upper: STUDIO_BONES.indexOf(`upper_arm_${side}`),
    fore: STUDIO_BONES.indexOf(`forearm_${side}`),
    hand: STUDIO_BONES.indexOf(`hand_${side}`),
  };
  const arm = armJoints(rig, side, false);
  const all = faceEdges(mesh.corners, null);
  const rings = ARM_RINGS.map((ring) =>
    ringBind(
      mesh,
      all,
      ring,
      ring.bone === 'upper' ? joints.shoulder : joints.elbow,
      ring.bone === 'upper' ? joints.elbow : joints.wrist,
      arm,
    ),
  );
  const faces = armFaces(mesh, armJoints(rig, side, true));
  const cornersOf = (set: ReadonlySet<number>): Uint32Array =>
    Uint32Array.from([...set].flatMap((f) => [0, 1, 2].map((k) => mesh.corners[f * 3 + k] ?? 0)));
  const corners = cornersOf(faces);
  const lowerJoints = (['forearm', 'forearm_twist', 'hand', 'fingers'] as const).map((bone) =>
    STUDIO_BONES.indexOf(`${bone}_${side}`),
  );
  const lower = cornersOf(armFaces(mesh, lowerJoints));
  return {
    bones,
    joints,
    rings,
    faces,
    corners,
    lower,
    lengths: edgeLengths(mesh.positions, lower),
    upper: joints.elbow.distanceTo(joints.shoulder),
  };
}

/**
 * Gives the length of the three edges of each triangle, from each corner to the next.
 *
 * @param positions The places of the vertices.
 * @param corners The three vertices of each triangle.
 * @returns The lengths.
 */
function edgeLengths(positions: ArrayLike<number>, corners: Uint32Array): Float32Array {
  const lengths = new Float32Array(corners.length);
  const a = new Vector3();
  const b = new Vector3();
  for (let f = 0; f < corners.length / 3; f++) {
    for (let k = 0; k < 3; k++) {
      a.fromArray(positions, (corners[f * 3 + k] ?? 0) * 3);
      b.fromArray(positions, (corners[f * 3 + ((k + 1) % 3)] ?? 0) * 3);
      lengths[f * 3 + k] = a.distanceTo(b);
    }
  }
  return lengths;
}

/** The bind facts of the arms of each rig. */
const binds = new WeakMap<StudioRig, Readonly<Record<Side, ArmBind>>>();

/**
 * Gives the bind facts of both arms of a rig, made one time for each rig.
 *
 * @param rig The rig.
 * @returns The facts of each side.
 */
function armBinds(rig: StudioRig): Readonly<Record<Side, ArmBind>> {
  let found = binds.get(rig);
  if (!found) {
    found = { L: armBind(rig, 'L'), R: armBind(rig, 'R') };
    binds.set(rig, found);
  }
  return found;
}

/**
 * Gives the vertices of the faces of one arm ({@link armFaces}), such as for the box of the arm in
 * a view.
 *
 * @param rig The studio rig.
 * @param side The side.
 * @returns The indices of the vertices.
 */
export function armVertices(rig: StudioRig, side: Side): number[] {
  return [...new Set(armBinds(rig)[side].corners)];
}

/**
 * Gives the turn of a bone from the skin matrices of a pose.
 *
 * @param matrices The skin matrices.
 * @param bone The index of the bone.
 * @returns The turn.
 */
function turnOf(matrices: ArrayLike<number>, bone: number): Quaternion {
  return new Quaternion().setFromRotationMatrix(matrixOf(matrices, bone));
}

/**
 * Gives the skin matrix of a bone.
 *
 * @param matrices The skin matrices.
 * @param bone The index of the bone.
 * @returns The matrix.
 */
function matrixOf(matrices: ArrayLike<number>, bone: number): Matrix4 {
  return new Matrix4().fromArray(
    Array.from({ length: 16 }, (...[, k]) => matrices[bone * 16 + k] ?? 0),
  );
}

/**
 * Wraps an angle into -180° to 180°.
 *
 * @param degrees The angle.
 * @returns The wrapped angle.
 */
function wrap(degrees: number): number {
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

/**
 * Measures one arm of a posed body. The rolls of the rings of the upper arm are turns around the
 * posed axis against the chest swung onto the upper arm, and the rolls of the rings of the forearm
 * against the upper arm swung onto the forearm, as in `measureArm()` of `tools/arm-shape.ts`. The
 * twist is the largest step from the chest to the shoulder ring, between the rings of the upper
 * arm, from the elbow ring to the forearm ring (both against the upper arm bone), and between the
 * rings of the forearm.
 *
 * @param arm The bind facts of the arm.
 * @param matrices The skin matrices of the pose.
 * @param posed The posed places of the vertices.
 * @param folded The folded faces of the body.
 * @returns The values.
 */
export function measureArm(
  arm: ArmBind,
  matrices: ArrayLike<number>,
  posed: ArrayLike<number>,
  folded: readonly number[],
): ArmSample {
  const chest = turnOf(matrices, arm.bones.chest);
  const upperTurn = turnOf(matrices, arm.bones.upper);
  const foreTurn = turnOf(matrices, arm.bones.fore);
  const place = (joint: Vector3, bone: number): Vector3 =>
    joint.clone().applyMatrix4(matrixOf(matrices, bone));
  const shoulder = place(arm.joints.shoulder, arm.bones.upper);
  const elbow = place(arm.joints.elbow, arm.bones.fore);
  const wrist = place(arm.joints.wrist, arm.bones.hand);
  const upperBind = arm.joints.elbow.clone().sub(arm.joints.shoulder).normalize();
  const foreBind = arm.joints.wrist.clone().sub(arm.joints.elbow).normalize();
  const upperAxis = elbow.clone().sub(shoulder).normalize();
  const foreAxis = wrist.clone().sub(elbow).normalize();
  const upperFrame = new Quaternion()
    .setFromUnitVectors(upperBind.clone().applyQuaternion(chest), upperAxis)
    .multiply(chest);
  const foreFrame = new Quaternion()
    .setFromUnitVectors(foreBind.clone().applyQuaternion(upperTurn), foreAxis)
    .multiply(upperTurn);
  const boneRoll =
    (twistAngle(upperFrame.clone().invert().multiply(upperTurn), upperBind) * 180) / Math.PI;

  const rolls: number[] = [];
  let flat = Infinity;
  const p = new Vector3();
  const q = new Vector3();
  const r = new Vector3();
  const ref = new Vector3();
  const cross = new Vector3();
  for (const ring of arm.rings) {
    const upper = ring.ring.bone === 'upper';
    const frame = upper ? upperFrame : foreFrame;
    const axis = upper ? upperAxis : foreAxis;
    const origin = upper ? shoulder : elbow;
    const count = ring.along.length;
    const moved = new Float32Array(count * 3);
    let sin = 0;
    let cos = 0;
    for (let k = 0; k < count; k++) {
      p.fromArray(posed, (ring.edges[k * 2] ?? 0) * 3)
        .lerp(q.fromArray(posed, (ring.edges[k * 2 + 1] ?? 0) * 3), ring.along[k] ?? 0)
        .sub(origin);
      r.copy(p).addScaledVector(axis, -p.dot(axis));
      r.toArray(moved, k * 3);
      ref.fromArray(ring.radial, k * 3).applyQuaternion(frame);
      const angle = Math.atan2(cross.crossVectors(ref, r).dot(axis), ref.dot(r));
      sin += ref.length() * Math.sin(angle);
      cos += ref.length() * Math.cos(angle);
    }
    rolls.push(count > 0 ? (Math.atan2(sin, cos) * 180) / Math.PI : 0);
    if (ring.narrow > 0 && count > 2) {
      flat = Math.min(flat, narrowAxis(moved, axis) / ring.narrow);
    }
  }
  const [shoulderRoll = 0, upperRoll = 0, elbowRoll = 0, foreRoll = 0, wristRoll = 0] = rolls;
  const step = (from: number, to: number): number => Math.abs(wrap(to - from));
  const twist = Math.max(
    step(0, shoulderRoll),
    step(shoulderRoll, upperRoll),
    step(upperRoll, elbowRoll),
  );
  const foreTwist = Math.max(step(elbowRoll - boneRoll, foreRoll), step(foreRoll, wristRoll));

  const paw = foreTurn.clone().invert().multiply(turnOf(matrices, arm.bones.hand));
  const pawTwist = twistAngle(paw, foreBind);
  const swing = paw.clone().multiply(new Quaternion().setFromAxisAngle(foreBind, -pawTwist));
  const pawSwing = (2 * Math.acos(Math.min(1, Math.abs(swing.w))) * 180) / Math.PI;

  const posedLengths = edgeLengths(posed, arm.lower);
  let stretch = 0;
  for (let k = 0; k < arm.lengths.length; k++) {
    stretch = Math.max(stretch, (posedLengths[k] ?? 0) - (arm.lengths[k] ?? 0));
  }
  return {
    folds: folded.filter((face) => arm.faces.has(face)).length,
    twist,
    foreTwist,
    flat: Number.isFinite(flat) ? flat : 1,
    pawTwist: Math.abs((pawTwist * 180) / Math.PI),
    pawSwing,
    pawJump: 0,
    stretch: stretch / arm.upper,
    pawRoll: (pawTwist * 180) / Math.PI,
  };
}

/** The summary of the values of one measure of one arm in one sample set. */
export interface SetStats {
  /** The number of samples. */
  readonly samples: number;
  /** The median. */
  readonly p50: number;
  /** The 95th percentile. */
  readonly p95: number;
  /** The 5th percentile. */
  readonly p5: number;
  /** The share of the samples with a value above 0, for a count of faces. */
  readonly share: number;
  /** The worst value: the largest, or the smallest for a measure whose smaller values are worse. */
  readonly worst: number;
  /** The demo and the time of the worst value. */
  readonly at: string;
  /**
   * The demo and the time of the worst play sample at or after {@link VIEW_FROM_SEC}, for
   * `--views`, or empty when the play has no such sample.
   */
  readonly view: string;
}

/**
 * Gives a quantile of some values.
 *
 * @param sorted The values, sorted up.
 * @param share The share, from 0 to 1.
 * @returns The value at the share, or `NaN` with no value.
 */
function quantile(sorted: readonly number[], share: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))] ?? Number.NaN;
}

/**
 * Gives the song time of a play label, such as `beethoven-9.mid 12.25 s`.
 *
 * @param label The label of a sample.
 * @returns The song time, in seconds, or `null` for a label of the rest or the lift.
 */
export function labelTime(label: string): number | null {
  const found = /^\S+\.mid (-?\d+(?:\.\d+)?) s$/.exec(label);
  return found ? Number(found[1]) : null;
}

/**
 * Sums up the values of one measure in one sample set.
 *
 * @param values The value of each sample.
 * @param labels The label of each sample.
 * @param up True when a larger value is worse.
 * @returns The summary.
 */
export function setStats(
  values: readonly number[],
  labels: readonly string[],
  up: boolean,
): SetStats {
  const sorted = values.toSorted((x, y) => x - y);
  let worstAt = -1;
  let viewAt = -1;
  for (const [i, value] of values.entries()) {
    const better = (k: number): boolean =>
      k < 0 || (up ? value > (values[k] ?? 0) : value < (values[k] ?? 0));
    if (better(worstAt)) {
      worstAt = i;
    }
    const time = labelTime(labels[i] ?? '');
    if (time !== null && time >= VIEW_FROM_SEC && better(viewAt)) {
      viewAt = i;
    }
  }
  return {
    samples: values.length,
    p50: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    p5: quantile(sorted, 0.05),
    share: values.filter((value) => value > 0).length / Math.max(1, values.length),
    worst: values[worstAt] ?? Number.NaN,
    at: labels[worstAt] ?? '',
    view: labels[viewAt] ?? '',
  };
}

/** The summaries of one arm: by measure, then by sample set. */
export type ArmStats = Readonly<Record<Measure, Partial<Record<SampleSet, SetStats>>>>;

/** The report of one role. */
export interface RoleReport {
  /** The demos with the role. */
  readonly demos: readonly string[];
  /** The summaries of each arm. */
  readonly arms: Readonly<Record<Side, ArmStats>>;
}

/** The JSON text of a run of the tool for one tree (`--json`). */
export interface ArmJson {
  /** The format version (`probeFormat()` of `tools/ref-tree.ts`). */
  readonly version: number;
  /** The oldest version that this version only adds fields to. */
  readonly since: number;
  /** The report of each role. */
  readonly roles: Readonly<Partial<Record<string, RoleReport>>>;
  /** The roles that the tree does not have. */
  readonly missing: readonly string[];
}

/** The format version of {@link ArmJson}. */
export const ARM_FORMAT = 1;

/** The values and the labels of the samples of one role, by sample set. */
interface Samples {
  /** The label of each sample. */
  readonly labels: string[];
  /** The values of each arm, one list for each measure. */
  readonly values: Readonly<Record<Side, Readonly<Record<Measure, number[]>>>>;
}

/**
 * Makes the store of the samples of one sample set.
 *
 * @returns The empty store.
 */
function emptySamples(): Samples {
  const lists = (): Readonly<Record<Measure, number[]>> => ({
    folds: [],
    twist: [],
    foreTwist: [],
    flat: [],
    pawTwist: [],
    pawSwing: [],
    pawJump: [],
    stretch: [],
  });
  return { labels: [], values: { L: lists(), R: lists() } };
}

/**
 * Gives the labels of the samples of `probeFolds()` for a tree whose fold visit gives no label:
 * the rest, each play time from the count-in at the step, and the lift times of 0.1 s.
 *
 * @param role The role.
 * @param demo The demo.
 * @param step The step of the play, in seconds.
 * @returns A function that gives the label of the visit of a sample set, by its index.
 */
function planLabels(
  role: RoleSource,
  demo: DemoFile,
  step: number,
): (set: SampleSet, index: number) => string {
  const scene = sceneOf(demo.bytes);
  const bodies = Math.max(1, roleBodies(role, scene).length);
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  return (set, index) => {
    const k = Math.floor(index / bodies);
    if (set === 'rest') {
      return `${demo.file} rest`;
    }
    return set === 'play'
      ? `${demo.file} ${(start + k * step).toFixed(2)} s`
      : `${demo.file} wall ${(k * 0.1).toFixed(1)} s`;
  };
}

/**
 * Measures the arms of the studio body of a role over demos.
 *
 * @param role The role.
 * @param demos The demos. A demo with no body of the role adds nothing.
 * @param step The step of the song time of the play, in seconds.
 * @returns The report.
 */
export function probeRole(role: RoleSource, demos: readonly DemoFile[], step: number): RoleReport {
  const sets: Record<SampleSet, Samples> = {
    rest: emptySamples(),
    play: emptySamples(),
    lift: emptySamples(),
  };
  const found: string[] = [];
  for (const demo of demos) {
    const counts: Record<SampleSet, number> = { rest: 0, play: 0, lift: 0 };
    const none = (): Record<Side, number | null> => ({ L: null, R: null });
    const last: Record<SampleSet, Record<Side, number | null>> = {
      rest: none(),
      play: none(),
      lift: none(),
    };
    let plan: ((set: SampleSet, index: number) => string) | null = null;
    const report = probeFolds(role, [demo], step, (...visit) => {
      const [rig, studio, posed, folded, set] = visit;
      // A tree before the label of the visit passes five arguments.
      const given: string | undefined = visit[5];
      plan ??= given === undefined ? planLabels(role, demo, step) : null;
      const label = given ?? plan?.(set, counts[set]) ?? '';
      counts[set] += 1;
      const arms = armBinds(rig);
      const store = sets[set];
      store.labels.push(label);
      for (const side of SIDES) {
        const sample = measureArm(arms[side], studio.matrices, posed, folded);
        for (const measure of MEASURES) {
          store.values[side][measure].push(sample[measure]);
        }
        const before = set === 'play' ? last[set][side] : null;
        const jump = before === null ? 0 : Math.abs(wrap(sample.pawRoll - before));
        store.values[side].pawJump[store.values[side].pawJump.length - 1] =
          jump > JUMP_ANGLE ? jump : 0;
        last[set][side] = sample.pawRoll;
      }
    });
    found.push(...report.demos);
  }
  const armStats = (side: Side): ArmStats => {
    const of = (measure: Measure): Partial<Record<SampleSet, SetStats>> =>
      Object.fromEntries(
        SAMPLE_SETS.filter((set) => sets[set].labels.length > 0).map((set) => [
          set,
          setStats(sets[set].values[side][measure], sets[set].labels, ARM_LIMITS[measure].up),
        ]),
      );
    return {
      folds: of('folds'),
      twist: of('twist'),
      foreTwist: of('foreTwist'),
      flat: of('flat'),
      pawTwist: of('pawTwist'),
      pawSwing: of('pawSwing'),
      pawJump: of('pawJump'),
      stretch: of('stretch'),
    };
  };
  return { demos: found, arms: { L: armStats('L'), R: armStats('R') } };
}

/**
 * Gives the value of the gate of one measure of one arm: the value of {@link ArmLimit.stat} of
 * the worst sample set, with the set.
 *
 * @param stats The summaries of the measure by sample set.
 * @param limit The limit of the measure.
 * @returns The value and the set, or `null` with no sample.
 */
export function gateValue(
  stats: Partial<Record<SampleSet, SetStats>>,
  limit: ArmLimit,
): { readonly value: number; readonly set: SampleSet } | null {
  let found: { readonly value: number; readonly set: SampleSet } | null = null;
  for (const set of SAMPLE_SETS) {
    const of = stats[set];
    if (!of || of.samples === 0) {
      continue;
    }
    const value = of[limit.stat];
    if (!found || (limit.up ? value > found.value : value < found.value)) {
      found = { value, set };
    }
  }
  return found;
}

/** The verdict of one value of the gate. */
export type Verdict = 'PASS' | 'OPEN' | 'FAIL';

/**
 * Gives the verdict of one value against its limit and the base. A value that is worse than the
 * base by more than the margin fails, also within its limit, because a goal on one measure can
 * move a twist to a joint that no goal measures. A value over its limit fails when the base has no
 * value or is within the limit, and else it is open: a known item that the change does not make
 * worse. Each other value passes.
 *
 * @param value The value of the working tree.
 * @param base The value of the base, or `null` with no base.
 * @param limit The limit.
 * @returns The verdict.
 */
export function verdictOf(value: number, base: number | null, limit: ArmLimit): Verdict {
  const over = (v: number): boolean => (limit.up ? v > limit.limit : v < limit.limit);
  const worse = base !== null && (limit.up ? value - base : base - value) > limit.margin;
  if (worse || (over(value) && (base === null || !over(base)))) {
    return 'FAIL';
  }
  return over(value) ? 'OPEN' : 'PASS';
}

/** One value of the gate: one measure of one arm of one role. */
export interface GateRow {
  /** The role. */
  readonly role: string;
  /** The arm. */
  readonly side: Side;
  /** The measure. */
  readonly measure: Measure;
  /** The worst sample set. */
  readonly set: SampleSet;
  /** The summary of the worst sample set. */
  readonly stats: SetStats;
  /** The value of the gate. */
  readonly value: number;
  /** The value of the gate of the base, or `null` with no base. */
  readonly base: number | null;
  /** The verdict. */
  readonly verdict: Verdict;
}

/**
 * Gives the values of the gate of one role.
 *
 * @param role The role.
 * @param tree The report of the working tree.
 * @param base The report of the base, or `null` with no base or when the base has no such role.
 * @returns The values, by arm and measure.
 */
export function gateRows(role: string, tree: RoleReport, base: RoleReport | null): GateRow[] {
  return SIDES.flatMap((side) =>
    MEASURES.flatMap((measure): GateRow[] => {
      const limit = ARM_LIMITS[measure];
      const stats = tree.arms[side][measure];
      const found = gateValue(stats, limit);
      const of = found ? stats[found.set] : undefined;
      if (!found || !of) {
        return [];
      }
      const before = base ? gateValue(base.arms[side][measure], limit) : null;
      const value = found.value;
      const baseValue = before?.value ?? null;
      const verdict = verdictOf(value, baseValue, limit);
      return [{ role, side, measure, set: found.set, stats: of, value, base: baseValue, verdict }];
    }),
  );
}

/**
 * Writes a number of a measure.
 *
 * @param value The value.
 * @param measure The measure.
 * @returns The text: a share as a percent for a count measure, else the digits of the limit.
 */
function show(value: number | null, measure: Measure): string {
  if (value === null || !Number.isFinite(value)) {
    return '-';
  }
  const limit = ARM_LIMITS[measure];
  return limit.stat === 'share' ? `${(100 * value).toFixed(1)}%` : value.toFixed(limit.digits);
}

/**
 * Writes the table of the gate: one row for each arm of each role, with the value of each
 * measure, its base in parentheses, and the mark of a value that does not pass.
 *
 * @param rows The values of the gate.
 * @param base True when the run has a base.
 * @returns The lines of the table.
 */
export function summaryLines(rows: readonly GateRow[], base: boolean): string[] {
  const head = MEASURES.map((m) => `${ARM_LIMITS[m].name} (${show(ARM_LIMITS[m].limit, m)})`);
  const lines = [
    `| Role | Arm | ${head.join(' | ')} | Verdict |`,
    `|---|---|${MEASURES.map(() => '---').join('|')}|---|`,
  ];
  const keys = [...new Set(rows.map((row) => `${row.role} ${row.side}`))];
  for (const key of keys) {
    const own = rows.filter((row) => `${row.role} ${row.side}` === key);
    const cells = MEASURES.map((measure) => {
      const row = own.find((r) => r.measure === measure);
      if (!row) {
        return '-';
      }
      const was = base ? ` (${show(row.base, measure)})` : '';
      const mark = row.verdict === 'PASS' ? '' : ` ${row.verdict}`;
      return `${show(row.value, measure)}${was}${mark}`;
    });
    const worst = own.some((r) => r.verdict === 'FAIL')
      ? 'FAIL'
      : own.some((r) => r.verdict === 'OPEN')
        ? 'OPEN'
        : 'PASS';
    const [role = '', side = ''] = key.split(' ');
    lines.push(`| ${role} | ${side} | ${cells.join(' | ')} | ${worst} |`);
  }
  return lines;
}

/**
 * Writes the table of the details: the set, p50, p95 (p5 for the flat share), the worst sample,
 * the limit, the base, and the verdict of each value.
 *
 * @param rows The values to write.
 * @returns The lines of the table.
 */
export function detailLines(rows: readonly GateRow[]): string[] {
  const lines = [
    '| Role | Arm | Measure | Set | Samples | p50 | p95 or p5 | Share > 0 | Worst (demo, time) | Value | Limit | Base | Verdict |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const row of rows) {
    const limit = ARM_LIMITS[row.measure];
    const raw = (value: number): string =>
      Number.isFinite(value) ? value.toFixed(limit.stat === 'share' ? 0 : limit.digits) : '-';
    const tail = limit.up ? row.stats.p95 : row.stats.p5;
    lines.push(
      `| ${row.role} | ${row.side} | ${limit.name} | ${row.set} | ${row.stats.samples} | ${raw(row.stats.p50)} | ${raw(tail)} | ${(100 * row.stats.share).toFixed(1)}% | ${raw(row.stats.worst)} at ${row.stats.at || '-'} | ${show(row.value, row.measure)} | ${show(limit.limit, row.measure)} | ${show(row.base, row.measure)} | ${row.verdict} |`,
    );
  }
  return lines;
}

/** The command line of the tool. */
export interface CheckArgs {
  /** The roles. */
  readonly roles: readonly string[];
  /** The commit, the branch, or the tag of the base, or `null`. */
  readonly base: string | null;
  /** The options that both trees take: `--demo` and `--step`. */
  readonly shared: readonly string[];
  /** The options that only the working tree takes: `--set` and `--glb`. */
  readonly own: readonly string[];
  /** The folder of `--views`, or `null`. */
  readonly views: string | null;
  /** True to render each arm with `--views`, also an arm that passes. */
  readonly viewsAll: boolean;
  /** The number of roles that run at the same time. */
  readonly jobs: number;
  /** True to write the details of each value, also of a value that passes. */
  readonly long: boolean;
}

/** The usage text. */
const USAGE =
  'Usage: pnpm arm-check <role>... | --all [--base <ref>] [--set <changes>]... [--glb <file>] [--views <dir> [--views-all]] [--demo <id>]... [--step <seconds>] [--jobs <n>] [--long]';

/**
 * Reads the command line of the tool.
 *
 * @param args The arguments.
 * @returns The command line.
 * @throws Error for an unknown role or option, or a missing value.
 */
export function checkArgs(args: readonly string[]): CheckArgs {
  const valued = new Set(['--base', '--set', '--glb', '--views', '--demo', '--step', '--jobs']);
  const flags = new Set(['--all', '--views-all', '--long']);
  const roles: string[] = [];
  const values = new Map<string, string[]>();
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (valued.has(arg)) {
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`The option ${arg} takes a value.\n${USAGE}`);
      }
      values.set(arg, [...(values.get(arg) ?? []), value]);
      i++;
    } else if (flags.has(arg)) {
      seen.add(arg);
    } else if (arg.startsWith('--')) {
      throw new Error(`The option ${arg} is not known.\n${USAGE}`);
    } else {
      roles.push(arg);
    }
  }
  const all = seen.has('--all');
  if (all === roles.length > 0) {
    throw new Error(`Give roles or --all, not both and not none.\n${USAGE}`);
  }
  const unknown = roles.filter((role) => !FOLD_ROLES.has(role));
  if (unknown.length > 0) {
    throw new Error(
      `No role has the name ${unknown.join(', ')}. The roles are: ${[...FOLD_ROLES.keys()].join(', ')}.`,
    );
  }
  const glb = values.get('--glb')?.[0] ?? null;
  const chosen = all ? [...FOLD_ROLES.keys()] : roles;
  if (glb !== null && chosen.length !== 1) {
    throw new Error('The option --glb takes one role, the role of the animal of the file.');
  }
  const jobs = Number(values.get('--jobs')?.[0] ?? 4);
  if (!Number.isInteger(jobs) || jobs < 1) {
    throw new Error('The option --jobs takes a whole number above 0.');
  }
  const views = values.get('--views')?.[0] ?? null;
  if (views !== null && (glb !== null || values.has('--set'))) {
    throw new Error('The option --views renders the working tree, so --set and --glb do not go.');
  }
  const pairs = (name: string): string[] => (values.get(name) ?? []).flatMap((v) => [name, v]);
  return {
    roles: chosen,
    base: values.get('--base')?.[0] ?? null,
    shared: [...pairs('--demo'), ...pairs('--step')],
    own: [...pairs('--set'), ...(glb === null ? [] : ['--glb', resolve(glb)])],
    views,
    viewsAll: seen.has('--views-all'),
    jobs,
    long: seen.has('--long'),
  };
}

/**
 * Runs the tool as a child: it measures the roles of the command line in this tree, and writes
 * {@link ArmJson} into the file of `--json`. A role that the tree does not have goes into
 * `missing`. With `--glb <file>`, the tool runs again in a copy of `src/` with the studio body of
 * the file (`tools/glb-swap.ts`).
 *
 * @param args The arguments, with `--json <file>`.
 * @returns The exit code.
 */
async function childMain(args: readonly string[]): Promise<number> {
  const { glb, rest } = takeGlb(args);
  const roles = rest.filter((arg, i) => !arg.startsWith('--') && !rest[i - 1]?.startsWith('--'));
  if (glb) {
    const source = FOLD_ROLES.get(roles[0] ?? '');
    if (!source) {
      throw new Error(`The option --glb needs a role of this tree, and not ${roles.join(', ')}.`);
    }
    return withGlbBody(roleAnimal(source), glb, (dir) => runTool(dir, 'arm-check.ts', rest));
  }
  const option = (name: string): string[] =>
    rest.flatMap((arg, i) => (rest[i - 1] === name ? [arg] : []));
  const step = Number(option('--step')[0] ?? 0.25);
  if (!(step > 0)) {
    throw new Error('The step must be a number of seconds above 0.');
  }
  const chosen = option('--demo').map((id) => (id.endsWith('.mid') ? id : `${id}.mid`));
  const all = await patchedDemos();
  const demos = chosen.length > 0 ? all.filter((demo) => chosen.includes(demo.file)) : all;
  const holds = option('--set').join(';');
  const changes = holds ? setHolds(holds) : null;
  const reports: Record<string, RoleReport> = {};
  try {
    for (const role of roles) {
      const source = FOLD_ROLES.get(role);
      if (source) {
        reports[role] = probeRole(source, demos, step);
      }
    }
  } finally {
    changes?.undo();
  }
  const json: ArmJson = {
    version: ARM_FORMAT,
    since: 1,
    roles: reports,
    missing: roles.filter((role) => !FOLD_ROLES.has(role)),
  };
  await writeFile(option('--json')[0] ?? '', `${JSON.stringify(json)}\n`);
  return 0;
}

/**
 * Reads the JSON text of a child.
 *
 * @param text The text.
 * @returns The JSON.
 */
function readArmJson(text: string): ArmJson {
  // SAFETY: the text comes from childMain() of this tool, and probeFormat() checked its version.
  return JSON.parse(text) as ArmJson;
}

/**
 * Measures one role in a child process: the working tree, and the base beside it.
 *
 * @param role The role.
 * @param options The command line.
 * @returns The reports of the working tree and of the base, or `null` for no base.
 */
async function measureRole(
  role: string,
  options: CheckArgs,
): Promise<{ readonly tree: RoleReport | null; readonly base: RoleReport | null }> {
  const tree = [role, ...options.shared, ...options.own];
  if (options.base !== null) {
    const texts = await probeBeside(
      options.base,
      'arm-check.ts',
      { base: [role, ...options.shared], tree },
      { prefix: 'arm-check-', cache: true },
    );
    return {
      tree: readArmJson(texts.tree).roles[role] ?? null,
      base: readArmJson(texts.base).roles[role] ?? null,
    };
  }
  const text = await withTempFolder(
    async (dir) => {
      const file = join(dir, 'tree.json');
      await runChild(
        process.execPath,
        [join('tools', 'arm-check.ts'), ...tree, '--json', file],
        ROOT,
      );
      return readFile(file, 'utf8');
    },
    { prefix: 'arm-check-' },
  );
  return { tree: readArmJson(text).roles[role] ?? null, base: null };
}

/**
 * Runs a function on each item, with at most a number of calls at the same time.
 *
 * @param items The items.
 * @param jobs The largest number of calls at the same time.
 * @param work The function.
 * @returns The results, in the order of the items.
 */
async function eachLimited<T, R>(
  items: readonly T[],
  jobs: number,
  work: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  const lane = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      if (item !== undefined) {
        results[index] = await work(item);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(jobs, items.length) }, lane));
  return results;
}

/**
 * Runs the tool from the command line.
 *
 * @returns The exit code: 1 when a value fails.
 */
async function main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args.includes('--json')) {
    return childMain(args);
  }
  const options = checkArgs(args);
  const started = performance.now();
  const reports = await eachLimited(options.roles, options.jobs, async (role) => ({
    role,
    ...(await measureRole(role, options)),
  }));
  const rows = reports.flatMap(({ role, tree, base }) => (tree ? gateRows(role, tree, base) : []));
  const empty = reports.filter(({ tree }) => !tree || tree.demos.length === 0);
  const noBase = options.base === null ? [] : reports.filter(({ tree, base }) => tree && !base);
  const seconds = (performance.now() - started) / 1000;
  console.log(
    `Arm gate of ${options.roles.length} roles${options.base === null ? '' : ` against ${options.base}`} in ${seconds.toFixed(0)} s. A cell gives the value${options.base === null ? '' : ', the base in parentheses,'} and the verdict of a value that does not pass.`,
  );
  if (empty.length > 0) {
    console.log(`No demo has the roles: ${empty.map(({ role }) => role).join(', ')}.`);
  }
  if (noBase.length > 0) {
    console.log(
      `The base has no role ${noBase.map(({ role }) => role).join(', ')}, so each value over its limit fails.`,
    );
  }
  console.log(['', ...summaryLines(rows, options.base !== null)].join('\n'));
  const shown =
    options.long || options.roles.length === 1 ? rows : rows.filter((r) => r.verdict !== 'PASS');
  if (shown.length > 0) {
    console.log(['', ...detailLines(shown)].join('\n'));
  }
  if (options.views !== null) {
    const { renderViews } = await import('./arm-views.ts');
    await renderViews(reports, rows, options, { limits: ARM_LIMITS, armVertices, labelTime });
  }
  return rows.some((row) => row.verdict === 'FAIL') ? 1 : 0;
}

if (import.meta.main) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(2);
  }
}
