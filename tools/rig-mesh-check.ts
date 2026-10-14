/**
 * Measures a rig of `pnpm rig-mesh <animal> --check` (route 3 of `AGENTS.md`): the triangles, the
 * size of the module, the seat, the head height, the reach, the standing body against the
 * long-armed source, and the thin faces near the joints of the limbs. It reads the GLB file of
 * the rig and writes no file.
 */
import { Matrix4, Quaternion, Vector3 } from 'three';

import { STUDIO_BONES, STUDIO_PARENTS, unpackStudioMesh } from '../src/models/studio-format.ts';
import type { StudioBody, StudioBone, StudioMesh } from '../src/models/studio-format.ts';
import { createStudioPose, skinStudioMesh, studioRig } from '../src/models/studio-rig.ts';
import type { Vec3 } from '../src/models/tuples.ts';
import { STUDIO_MESH_GZIP_BUDGET, STUDIO_TRIANGLE_BUDGET, gzipSize } from './studio-budgets.ts';
import {
  firstKeys,
  inspectStudioGlb,
  readGlb,
  readSkeleton,
  studioBody,
  worldMatrices,
} from './studio-body.ts';
import type { AnimalSettings } from './studio-body.ts';

/** The largest error of the standing body against the long-armed source, in meters. */
export const STANDING_LIMIT = 0.001;

/**
 * The joints of the limbs that the check of the thin faces looks at: the bone that starts at the
 * joint, and the name of the joint.
 */
export const LIMB_JOINTS = [
  ['upper_arm', 'shoulder'],
  ['forearm', 'elbow'],
  ['hand', 'wrist'],
  ['thigh', 'hip'],
  ['shin', 'knee'],
  ['foot', 'ankle'],
] as const;

/**
 * The rule of the thin faces that `--check` lists as candidates for a ring (`check.thin` of the
 * config of the mesh rig). A long thin face across a joint folds when the joint bends.
 */
export interface ThinRule {
  /** The largest smallest corner angle of a thin face, in degrees. */
  readonly angle: number;
  /** The shortest longest edge of a listed face, in the units of the studio. */
  readonly length: number;
  /** The largest distance from the joint to the longest edge, in the units of the studio. */
  readonly near: number;
}

/** A thin face near a joint of a limb. */
export interface ThinFace {
  /** The index of the triangle in the packed mesh, as `pnpm fold-probe` counts the faces. */
  readonly face: number;
  /** The bone that starts at the nearest joint, such as `forearm_L`. */
  readonly bone: string;
  /** The smallest corner angle, in degrees. */
  readonly angle: number;
  /** The longest edge, in meters. */
  readonly length: number;
  /** The distance from the joint to the longest edge, in meters. */
  readonly distance: number;
}

/**
 * Gives the distance from a point to a segment.
 *
 * @param p The point.
 * @param a The start of the segment.
 * @param b The end of the segment.
 * @returns The distance.
 */
function segmentDistance(p: Vector3, a: Vector3, b: Vector3): number {
  const ab = b.clone().sub(a);
  const t = Math.min(1, Math.max(0, p.clone().sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-12)));
  return a.clone().addScaledVector(ab, t).distanceTo(p);
}

/**
 * Finds the thin faces near the joints of the limbs in the bind mesh of a studio body: each face
 * with a smallest corner angle below the angle of the rule, a longest edge of at least the length
 * of the rule, and a joint of {@link LIMB_JOINTS} within the distance of the rule of that edge.
 * A face goes to its nearest joint.
 *
 * @param mesh The places and the triangles of the mesh, in meters.
 * @param heads The head of each bone, in meters.
 * @param rule The rule. Its lengths are in the units of the studio.
 * @param scale The meters for each unit of the studio.
 * @returns The faces, by joint in the order of {@link LIMB_JOINTS} and the left side first.
 */
export function thinFaces(
  mesh: Pick<StudioMesh, 'positions' | 'corners'>,
  heads: Readonly<Record<string, Vec3>>,
  rule: ThinRule,
  scale: number,
): ThinFace[] {
  const joints = LIMB_JOINTS.flatMap(([bone]) =>
    (['L', 'R'] as const).flatMap((side) => {
      const head = heads[`${bone}_${side}`];
      return head ? [{ bone: `${bone}_${side}`, head: new Vector3(...head) }] : [];
    }),
  );
  const point = (v: number): Vector3 => new Vector3().fromArray(mesh.positions, v * 3);
  const found: ThinFace[] = [];
  for (let t = 0; t < mesh.corners.length / 3; t++) {
    const corners = [0, 1, 2].map((k) => point(mesh.corners[t * 3 + k] ?? 0));
    const angles = corners.map((p, k) => {
      const a = (corners[(k + 1) % 3] ?? p).clone().sub(p);
      const b = (corners[(k + 2) % 3] ?? p).clone().sub(p);
      return a.angleTo(b) * (180 / Math.PI);
    });
    const smallest = Math.min(...angles);
    // The longest edge lies across the largest corner.
    const wide = angles.indexOf(Math.max(...angles));
    const a = corners[(wide + 1) % 3] ?? new Vector3();
    const b = corners[(wide + 2) % 3] ?? new Vector3();
    const length = a.distanceTo(b);
    if (smallest >= rule.angle || length < rule.length * scale) {
      continue;
    }

    const [nearest] = joints
      .map((joint) => ({ bone: joint.bone, distance: segmentDistance(joint.head, a, b) }))
      .toSorted((x, y) => x.distance - y.distance);
    if (nearest && nearest.distance <= rule.near * scale) {
      found.push({
        face: t,
        bone: nearest.bone,
        angle: smallest,
        length,
        distance: nearest.distance,
      });
    }
  }
  const order = joints.map((joint) => joint.bone);
  return found.toSorted((x, y) => order.indexOf(x.bone) - order.indexOf(y.bone) || x.face - y.face);
}

/** The error of the standing body of the app against the long-armed source of the rig. */
export interface StandingError {
  /** The largest distance of a posed vertex from the nearest vertex of the source, in meters. */
  readonly worst: number;
  /** The largest distance of a vertex of the source from the nearest posed vertex, in meters. */
  readonly back: number;
  /** The posed vertices that count. */
  readonly vertices: number;
  /** The vertices of the eye shells, which do not count: the source has no eye shells. */
  readonly shells: number;
}

/**
 * Reads the vertices of an OBJ file of the long-armed source in the model axes, in meters.
 *
 * @param obj The text of the file, in the units and the axes of the studio.
 * @param scale The meters for each unit.
 * @returns The vertices.
 */
export function objVertices(obj: string, scale: number): Vector3[] {
  return obj.split('\n').flatMap((line) => {
    const [kind, x, y, z] = line.split(' ');
    // The studio animal faces +z, and the model faces -z.
    return kind === 'v'
      ? [new Vector3(-Number(x), Number(y), -Number(z)).multiplyScalar(scale)]
      : [];
  });
}

/**
 * Measures the standing body of the app against the long-armed source of a rig, as
 * `docs/research/2026-10-13-rabbit-mesh/standing-probe.ts` did: the standing body of
 * `studioRig(body, true)`, with each arm bone turned to the arm of the clip `reference` and both
 * arm corrective shapes at the weight 1.
 *
 * @param bytes The GLB file of the rig.
 * @param body The studio body of the file, exported as a seated body that also stands.
 * @param obj The text of the OBJ file of the long-armed source (`rig_mesh.py --obj`).
 * @returns The error.
 * @throws Error if the body does not stand.
 */
export function standingError(bytes: Uint8Array, body: StudioBody, obj: string): StandingError {
  if (!body.standing) {
    throw new Error('The body does not stand, so the standing check does not apply.');
  }
  const rig = studioRig(body, true);

  // The world turn of each arm bone from the bind pose to the clip reference, in the model axes.
  const glb = readGlb(bytes);
  const skeleton = readSkeleton(glb);
  const posed = worldMatrices(glb.json, firstKeys(glb, 'reference').nodes);
  const turnOf = (bone: string): Quaternion => {
    const world = posed[skeleton.nodes.get(bone) ?? -1] ?? new Matrix4();
    const bind = skeleton.binds.get(bone) ?? new Matrix4();
    const q = new Quaternion()
      .setFromRotationMatrix(world)
      .multiply(new Quaternion().setFromRotationMatrix(bind).invert());
    return new Quaternion(-q.x, q.y, -q.z, q.w);
  };
  const arm = (bone: string): boolean =>
    /^(clavicle|upper_arm|forearm|forearm_twist|hand|fingers)_/.test(bone);

  // Each arm bone turns around its head, and its children follow it from the chest out.
  const pose = createStudioPose();
  const heads = new Map<StudioBone, Vector3>();
  const turns = new Map<StudioBone, Quaternion>();
  for (const [index, bone] of STUDIO_BONES.entries()) {
    const from = new Vector3(...rig.body.heads[bone]);
    const parent = STUDIO_PARENTS[bone];
    const parentTurn = parent ? turns.get(parent) : undefined;
    const parentHead = parent ? heads.get(parent) : undefined;
    const to =
      parent && parentTurn && parentHead
        ? from
            .clone()
            .sub(new Vector3(...rig.body.heads[parent]))
            .applyQuaternion(parentTurn)
            .add(parentHead)
        : from.clone();
    const turn = arm(bone) ? turnOf(bone) : new Quaternion();
    heads.set(bone, to);
    turns.set(bone, turn);
    const matrix = new Matrix4().makeRotationFromQuaternion(turn);
    const offset = from.clone().applyQuaternion(turn);
    matrix.setPosition(to.x - offset.x, to.y - offset.y, to.z - offset.z);
    matrix.toArray(pose.matrices, index * 16);
  }
  pose.correctives.fill(1, 0, 2);
  const positions = skinStudioMesh(rig.mesh, pose);

  // The vertices of the eye shells follow the eye bones.
  const eyes = new Set([STUDIO_BONES.indexOf('eye_L'), STUDIO_BONES.indexOf('eye_R')]);
  const mine: Vector3[] = [];
  let shells = 0;
  for (let v = 0; v < positions.length / 3; v++) {
    if (eyes.has(rig.mesh.joints[v * 4] ?? -1) && (rig.mesh.weights[v * 4] ?? 0) > 0.5) {
      shells++;
    } else {
      mine.push(new Vector3().fromArray(positions, v * 3));
    }
  }
  const target = objVertices(obj, body.scale);
  const nearest = (p: Vector3, set: readonly Vector3[]): number =>
    set.reduce((best, q) => Math.min(best, p.distanceToSquared(q)), Infinity);
  const worst = Math.sqrt(mine.reduce((m, p) => Math.max(m, nearest(p, target)), 0));
  const back = Math.sqrt(target.reduce((m, q) => Math.max(m, nearest(q, mine)), 0));
  return { worst, back, vertices: mine.length, shells };
}

/** The measures of a rig for `--check`. */
export interface RigMeasures {
  /** The triangles of the packed mesh. */
  readonly triangles: number;
  /** The studio body with the settings of the animal. */
  readonly body: StudioBody;
  /** The arm of each side from the shoulder joint to the middle of the palm, in meters. */
  readonly arms: Readonly<Record<'L' | 'R', number | null>>;
  /** The error of the standing body against the long-armed source. */
  readonly standing: StandingError;
  /** The thin faces near the joints of the limbs. */
  readonly thin: readonly ThinFace[];
}

/**
 * Measures a rig with the settings of its animal.
 *
 * @param bytes The GLB file of the rig.
 * @param source The name of the file in the module.
 * @param settings The settings of the animal.
 * @param obj The text of the OBJ file of the long-armed source.
 * @param rule The rule of the thin faces.
 * @returns The measures.
 */
export function measureRig(
  bytes: Uint8Array,
  source: string,
  settings: AnimalSettings,
  obj: string,
  rule: ThinRule,
): RigMeasures {
  const { body } = studioBody(bytes, source, settings);
  const mesh = unpackStudioMesh(body.mesh);
  const standing =
    settings.seated && settings.soloist ? body : standingExport(bytes, source, settings);
  const facts = inspectStudioGlb(bytes, settings);
  const meters = (value: number | null): number | null =>
    value === null ? null : value * facts.scale;
  return {
    triangles: mesh.corners.length / 3,
    body,
    arms: { L: meters(facts.arms.L), R: meters(facts.arms.R) },
    standing: standingError(bytes, standing, obj),
    thin: thinFaces(mesh, body.heads, rule, body.scale),
  };
}

/**
 * Exports a rig as a seated body that also stands, for the standing check of a role that only
 * sits.
 *
 * @param bytes The GLB file of the rig.
 * @param source The name of the file in the module.
 * @param settings The settings of the animal.
 * @returns The body.
 */
function standingExport(bytes: Uint8Array, source: string, settings: AnimalSettings): StudioBody {
  return studioBody(bytes, source, { ...settings, seated: true, soloist: true }).body;
}

/**
 * Writes the measures of a rig as lines.
 *
 * @param measures The measures.
 * @param module The text of the module that `pnpm studio-body` would write.
 * @param rule The rule of the thin faces.
 * @returns The lines.
 */
export function measureLines(measures: RigMeasures, module: string, rule: ThinRule): string[] {
  const { body, standing } = measures;
  const m = (value: number | null): string => (value === null ? 'none' : `${value.toFixed(3)} m`);
  const mm = (value: number): string => `${(value * 1000).toFixed(3)} mm`;
  const bytes = (value: number): string => `${value.toLocaleString('en-US')} B`;
  const lines = [
    `Module: ${bytes(module.length)}, ${bytes(gzipSize(module))} after gzip. Packed mesh: ${bytes(gzipSize(body.mesh))} after gzip, budget ${bytes(STUDIO_MESH_GZIP_BUDGET)} (src/models/studio-size.test.ts).`,
    `Scale ${body.scale} m for each unit. Head height H ${m(body.headHeight)}. Seat height ${m(body.seatHeight)}. Chair depth ${m(body.chairDepth)}.`,
    `Arm from the shoulder joint to the middle of the palm: L ${m(measures.arms.L)}, R ${m(measures.arms.R)}.`,
    `Standing body against the long-armed source: ${mm(standing.worst)} at most (limit ${mm(STANDING_LIMIT)}), ${mm(standing.back)} back, ${standing.vertices} vertices, ${standing.shells} eye vertices left out.${standing.worst > STANDING_LIMIT ? ' ABOVE THE LIMIT.' : ''}`,
    `Thin faces near the joints of the limbs (corner below ${rule.angle}°, longest edge from ${rule.length} u, joint within ${rule.near} u), candidates for a ring:`,
  ];
  for (const [bone, joint] of LIMB_JOINTS) {
    for (const side of ['L', 'R'] as const) {
      const faces = measures.thin.filter((face) => face.bone === `${bone}_${side}`);
      if (faces.length > 0) {
        const list = faces.map(
          (face) =>
            `${face.face} (${face.angle.toFixed(1)}°, ${m(face.length)}, ${m(face.distance)} from the joint)`,
        );
        lines.push(`  ${joint} ${side}: ${list.join(', ')}`);
      }
    }
  }
  if (measures.thin.length === 0) {
    lines.push('  none');
  }
  return lines;
}

/**
 * Writes the line of the triangles against the budget of a studio body.
 *
 * @param triangles The triangles of the rig.
 * @returns The line.
 * @throws Error above the budget, with the line.
 */
export function triangleLine(triangles: number): string {
  const line = `Triangles: ${triangles} of the budget of ${STUDIO_TRIANGLE_BUDGET} of a studio body.`;
  if (triangles > STUDIO_TRIANGLE_BUDGET) {
    throw new Error(`${line} The rig is above the budget, so the check stops.`);
  }
  return line;
}
