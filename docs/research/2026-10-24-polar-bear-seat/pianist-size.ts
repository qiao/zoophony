// Probe: the size, the seat, and the arm angles of the pianist, in the model axes (the player
// faces -z, y up, the floor point of the body at the origin). Usage:
//   node scratch/pianist-size.ts [demo]
import { Vector3 } from 'three';
import { demoSceneOf, NOT_STARTED } from '../src/pose/test-scene.ts';
import { PIANIST_SWEEP, playSample } from '../src/pose/test-sweep-roles.ts';
import { poseSkeleton, posedPoint } from '../src/pose/test-kinematics.ts';
import { posedCorner } from '../src/pose/test-skin.ts';
import { boneIndex } from '../src/models/rig.ts';
import type { BoneName } from '../src/models/rig.ts';
import { countInAt } from '../src/pose/count-in.ts';
import { PIANO_FRONT_H, PIANO } from '../src/models/instruments/piano.ts';
import { HEAD_BONES } from '../src/pose/test-clearance.ts';
import { HANDS_HOLDS } from '../src/pose/hands.ts';
const hold = HANDS_HOLDS.piano as unknown as Record<string, unknown>;
for (const [k, v] of Object.entries(JSON.parse(process.env.HOLD ?? '{}'))) hold[k] = k === 'lean' || k === 'restLean' ? (Number(v) * Math.PI) / 180 : v;
const QUIET = process.env.QUIET === '1';

const demo = process.argv[2] ?? 'boulanger-matin.mid';
const scene = await demoSceneOf(demo);
const [player] = PIANIST_SWEEP.players(scene);
if (!player) throw new Error('no pianist');
const model = player.model;
const H = model.proportions?.headHeight ?? NaN;
const piano = model.pieces.find((p) => p.piece.bone === 'instrument');
console.log(`H ${H.toFixed(4)}  key front z ${(-(PIANO_FRONT_H * H + 0.05)).toFixed(3)}  piano at ${JSON.stringify(piano?.at.position)}  keyTop ${PIANO.keyTop}`);

const joint = (posed: ReturnType<typeof poseSkeleton>, bone: BoneName): Vector3 =>
  new Vector3(...posedPoint(posed, bone, model.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0]));

const headIdx = new Set(HEAD_BONES.map((b) => boneIndex(b)));
const deg = (r: number): number => (r * 180) / Math.PI;

function report(label: string, sample: Parameters<typeof player.poseAt>[0]): number[] {
  const posed = poseSkeleton(model, player!.poseAt(sample));
  let top = -Infinity;
  let front = Infinity;
  let low = Infinity;
  const { bones } = model.mesh;
  for (let c = 0; c < bones.length; c++) {
    const p = posedCorner(posed, c);
    low = Math.min(low, p[1]);
    if (headIdx.has(bones[c] ?? -1)) {
      top = Math.max(top, p[1]);
      front = Math.min(front, p[2]);
    }
  }
  const out: number[] = [];
  const parts: string[] = [`${label}: head top ${top.toFixed(3)} muzzle z ${front.toFixed(3)}`];
  for (const s of ['L', 'R'] as const) {
    const sh = joint(posed, `upperArm${s}`);
    const el = joint(posed, `forearm${s}`);
    const wr = joint(posed, `hand${s}`);
    const up = el.clone().sub(sh);
    const fo = wr.clone().sub(el);
    const elbow = 180 - deg(up.angleTo(fo));
    const slope = deg(Math.atan2(fo.y, Math.hypot(fo.x, fo.z)));
    const upFromDown = deg(up.angleTo(new Vector3(0, -1, 0)));
    const reach = wr.distanceTo(sh);
    parts.push(
      `${s}: sh [${sh.toArray().map((v) => v.toFixed(2))}] el [${el.toArray().map((v) => v.toFixed(2))}] wr [${wr.toArray().map((v) => v.toFixed(2))}] elbow ${elbow.toFixed(0)} fslope ${slope.toFixed(0)} upper-from-down ${upFromDown.toFixed(0)} el-ahead ${(sh.z - el.z).toFixed(2)} reach ${reach.toFixed(2)}`,
    );
    out.push(elbow, slope, upFromDown, sh.z - el.z);
  }
  const hips = joint(posed, 'hips');
  parts.push(`hips [${hips.toArray().map((v) => v.toFixed(2))}] lowest ${low.toFixed(3)}`);
  if (!QUIET || label === 'rest') console.log(parts.join('\n  '));
  return [...out, top];
}

const start = -countInAt(scene.plan.beats, 0).lengthSec;
report('rest', [start, 10, NOT_STARTED]);
const times = [5, 20, 40, 60, 80, 107.95, 120, 150];
const sums = new Array(9).fill(0);
for (const t of times) {
  const r = report(`play ${t}`, playSample(scene, t));
  r.forEach((v, i) => (sums[i] += v));
}
console.log(
  'mean play: elbowL %s slopeL %s upperL %s aheadL %s elbowR %s slopeR %s upperR %s aheadR %s top %s',
  ...sums.map((v) => (v / times.length).toFixed(2)),
);
