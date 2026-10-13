/**
 * Measures the rest pose of the polar bear pianist in the app and the `ready` clip of the studio
 * (the report `2026-10-13-pianist-lap.md`, section 3). Run from the repository root:
 * `node docs/research/2026-10-13-pianist-lap/measure-rest.ts [--set <changes>] [--studio <s>]`.
 *
 * The app side poses the pianist of each demo with a piano at rest (before the first play, wall
 * time 10 s). The studio side samples the clip `ready` of
 * `lowpoly-studio/animals/polar-bear/out/polar-bear.glb` at a time (1.5 s by default), with the
 * joints of the skin. A length of the studio is in meters at the scale of the app.
 *
 * - Trunk lean: the angle of the line from the hips joint to the neck joint from the vertical,
 *   in the side view. Positive is forward. This is the method of the report
 *   `2026-10-13-pianist-rest.md`, section 2.
 * - Head pitch: the angle of the forward axis of the head from the level. Positive is up.
 * - Wrist from the knee and elbow from the shoulder: out, up, and forward, in meters.
 * - Upper arm angle: the angle of the line from the shoulder joint to the elbow joint from the
 *   line from the neck joint to the hips joint, in the back view. Positive is out.
 * - Palm x and knee x: the palm point and the knee joint, out from the middle line, in meters.
 * - Paw gap: the smallest distance from the paw and the claws to the trunk, the hips, and the
 *   legs, 0 when they touch or cross.
 * - Depths: the deepest point of each arm part in the closed body, as the sweep measures it.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Matrix4, Quaternion, Vector3 } from 'three';

import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { readAccessor, readGlb, worldMatrices } from '../../../tools/studio-body.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { closedDepth, closedPart, partDistance, posedPart } from '../../../src/pose/test-clearance.ts';
import { posedAt, posedPoint } from '../../../src/pose/test-kinematics.ts';
import type { PosedSkeleton } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED, firstPlayers, sceneOf } from '../../../src/pose/test-scene.ts';

const args = process.argv.slice(2);
const setAt = args.indexOf('--set');
if (setAt >= 0) {
  setHolds(args[setAt + 1] ?? '');
}
const studioAt = args.indexOf('--studio');
const studioTime = studioAt >= 0 ? Number(args[studioAt + 1]) : 1.5;

const DEG = 180 / Math.PI;

/** The trunk, the head, the tail, the legs, and the shoulders, as the sweep of the pianist. */
const BODY_BONES = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'jaw',
  'eyeL',
  'eyeR',
  'earL',
  'earR',
  'tail1',
  'tail2',
  'shoulderL',
  'shoulderR',
  'thighL',
  'thighR',
  'shinL',
  'shinR',
  'footL',
  'footR',
] as const satisfies readonly BoneName[];

/** The lap: the bones that a paw at rest can touch. */
const LAP_BONES = ['hips', 'spine', 'thighL', 'thighR', 'shinL', 'shinR'] as const;

const f = (v: number, n = 2): string => v.toFixed(n);
const triple = (v: Vector3): string => `${f(v.x)}, ${f(v.y)}, ${f(v.z)}`;

/** Gives the lean of a line from the vertical in the side view, positive forward (-z). */
function leanOf(low: Vector3, high: Vector3): number {
  const d = high.clone().sub(low);
  return Math.atan2(-d.z, d.y) * DEG;
}

/** Gives the angle of the upper arm from the trunk axis in the back view, positive out. */
function armAngle(shoulder: Vector3, elbow: Vector3, neck: Vector3, hips: Vector3, side: number) {
  const arm = elbow.clone().sub(shoulder);
  const down = hips.clone().sub(neck);
  return (Math.atan2(side * arm.x, -arm.y) - Math.atan2(side * down.x, -down.y)) * DEG;
}

/** Gives a move from a joint, out to the side, up, and forward, in meters. */
function moveFrom(from: Vector3, to: Vector3, side: number): Vector3 {
  return new Vector3(side * (to.x - from.x), to.y - from.y, from.z - to.z);
}

function appRows(posed: PosedSkeleton): string[] {
  const at = (bone: BoneName): Vector3 => posed.frames[boneIndex(bone)]?.position ?? new Vector3();
  const head = posed.frames[boneIndex('head')]?.rotation ?? new Quaternion();
  const forward = new Vector3(0, 0, -1).applyQuaternion(head);
  const rows = [
    `trunk lean ${f(leanOf(at('hips'), at('neck')), 1)} deg, head pitch ${f(Math.asin(forward.y) * DEG, 1)} deg`,
  ];
  const body = posedPart(posed, BODY_BONES);
  const lap = posedPart(posed, LAP_BONES);
  const surface = closedPart(posed, BODY_BONES, 2);
  for (const [s, side] of [
    ['L', -1],
    ['R', 1],
  ] as const) {
    const palm = new Vector3(...posedPoint(posed, `hand${s}`, posed.model.body[`palm${s}`]));
    const paw = posedPart(posed, [`hand${s}`, `fingers${s}`]);
    const gap = partDistance(paw, body, 0.3);
    const lapGap = partDistance(paw, lap, 0.3);
    const depth = (bones: readonly BoneName[]): string => {
      const part = posedPart(posed, bones);
      const points = part.triangles.flatMap((t) => [t.a, t.b, t.c]);
      return f(closedDepth(points, surface).depth * 100, 1);
    };
    rows.push(
      `${s}: palm x ${f(side * palm.x, 3)} m, knee x ${f(side * at(`shin${s}`).x, 3)} m, ` +
        `palm ${triple(palm)}, paw gap body ${f(gap * 100, 1)} cm, lap ${f(lapGap * 100, 1)} cm`,
      `${s}: wrist from knee ${triple(moveFrom(at(`shin${s}`), at(`hand${s}`), side))} m, ` +
        `elbow from shoulder ${triple(moveFrom(at(`upperArm${s}`), at(`forearm${s}`), side))} m, ` +
        `arm angle ${f(armAngle(at(`upperArm${s}`), at(`forearm${s}`), at('neck'), at('hips'), side), 1)} deg`,
      `${s}: depth cm paw ${depth([`hand${s}`])}, claws ${depth([`fingers${s}`])}, ` +
        `forearm ${depth([`forearm${s}`])}, upper arm ${depth([`upperArm${s}`])}`,
    );
  }
  return rows;
}

async function app(): Promise<void> {
  for (const demo of await patchedDemos()) {
    const scene = sceneOf(demo.bytes);
    if (!scene.score.seats.some((seat) => seat.section === 'piano')) {
      continue;
    }
    const [piano] = firstPlayers(scene, ['piano'] as const);
    if (!piano) {
      continue;
    }
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    console.log(`app ${demo.file}`);
    for (const row of appRows(posedAt(scene, piano, start, 10, NOT_STARTED))) {
      console.log(`  ${row}`);
    }
  }
}

/** The meters of the app for each unit of the studio (the report of the rest, section 2). */
const STUDIO_SCALE = 1.805;

async function studio(time: number): Promise<void> {
  const path = join(import.meta.dirname, '../../../lowpoly-studio/animals/polar-bear/out/polar-bear.glb');
  const glb = readGlb(new Uint8Array(await readFile(path)));
  const animation = glb.json.animations?.find((a) => a.name === 'ready');
  if (!animation) {
    throw new Error('The file has no clip "ready".');
  }
  const poses = new Map<number, { rotation?: number[]; translation?: number[]; scale?: number[] }>();
  for (const channel of animation.channels) {
    const sampler = animation.samplers[channel.sampler];
    const path = channel.target.path;
    if (!sampler || path === 'weights') {
      continue;
    }
    const input = readAccessor(glb, sampler.input);
    const output = readAccessor(glb, sampler.output);
    const n = path === 'rotation' ? 4 : 3;
    let k = 0;
    while (k + 1 < input.length && (input[k + 1] ?? 0) <= time) {
      k++;
    }
    const next = Math.min(k + 1, input.length - 1);
    const span = (input[next] ?? 0) - (input[k] ?? 0);
    const u = span > 0 ? Math.min(1, Math.max(0, (time - (input[k] ?? 0)) / span)) : 0;
    const a = Array.from(output.subarray(k * n, k * n + n));
    const b = Array.from(output.subarray(next * n, next * n + n));
    const pose = poses.get(channel.target.node) ?? {};
    if (path === 'rotation') {
      const q = new Quaternion(a[0], a[1], a[2], a[3]).slerp(new Quaternion(b[0], b[1], b[2], b[3]), u);
      pose.rotation = [q.x, q.y, q.z, q.w];
    } else {
      pose[path] = a.map((v, i) => v + ((b[i] ?? 0) - v) * u);
    }
    poses.set(channel.target.node, pose);
  }
  const worlds = worldMatrices(glb.json, poses);
  const skin = glb.json.skins[0];
  if (!skin) {
    throw new Error('The file has no skin.');
  }
  const inverse = readAccessor(glb, skin.inverseBindMatrices);
  const joint = (name: string): { place: Vector3; turn: Quaternion } => {
    const node = glb.json.nodes.findIndex((n) => n.name === name);
    const j = skin.joints.indexOf(node);
    const world = worlds[node] ?? new Matrix4();
    const skinMatrix = world.clone().multiply(new Matrix4().fromArray(inverse, j * 16));
    const p = new Vector3().setFromMatrixPosition(world);
    const turn = new Quaternion().setFromRotationMatrix(skinMatrix.extractRotation(skinMatrix));
    // The studio animal faces +z with its left at +x. The app faces -z with its left at -x.
    return {
      place: new Vector3(-p.x * STUDIO_SCALE, p.y * STUDIO_SCALE, -p.z * STUDIO_SCALE),
      turn,
    };
  };
  const at = (name: string): Vector3 => joint(name).place;
  // The forward axis of the head of the studio is +z.
  const forward = new Vector3(0, 0, 1).applyQuaternion(joint('head').turn);
  console.log(`studio ready at ${time} s`);
  console.log(
    `  trunk lean ${f(leanOf(at('hips'), at('neck')), 1)} deg, head pitch ${f(Math.asin(forward.y) * DEG, 1)} deg`,
  );
  for (const [s, side] of [
    ['L', -1],
    ['R', 1],
  ] as const) {
    // The left of the studio is at +x, and the app turns it to -x.
    const knee = at(`shin_${s}`);
    console.log(
      `  ${s}: wrist from knee ${triple(moveFrom(knee, at(`hand_${s}`), side))} m, ` +
        `elbow from shoulder ${triple(moveFrom(at(`upper_arm_${s}`), at(`forearm_${s}`), side))} m, ` +
        `arm angle ${f(armAngle(at(`upper_arm_${s}`), at(`forearm_${s}`), at('neck'), at('hips'), side), 1)} deg`,
    );
  }
}

await studio(studioTime);
await app();
