// Measures the oboe of the mouse and both paws at rest, in the lift, and in the play (diagnosis
// only). For each pose: the tilt of the oboe from the vertical, the reed and the bell end, and for
// each paw the span of its corners along the tube from the reed (min, middle, max), the distance of
// its middle from the axis, and the closest corner of the other paw. The pair line gives the
// overlap of the two spans along the tube (above 0 is an overlap, below 0 a gap) and the depth of
// the corners of one paw in the closed other paw (as `paw in paw` of `pnpm clip-probe`).
// With --moves: for each lift and lowering of the demos, the turn of the oboe in each paw
// (stepsCarry of tools/carry-check.ts), the tilt of the tube axis in the paw, and the largest slide
// of the paw middle along the tube from its place at the first step.
// Usage: node docs/research/2026-10-27-wolf-mouse-rests/probes/mouse-rest.ts ['<set changes>'] [--moves] [--stand]
import { Matrix4, Quaternion, Triangle, Vector3 } from 'three';

import { setHolds } from '../../../../tools/hold-sets.ts';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { MOVE_STEP, demoMoves } from '../../../../tools/arm-check.ts';
import { stepsCarry } from '../../../../tools/carry-check.ts';
import type { PlayerModel } from '../../../../src/models/player.ts';
import { boneIndex } from '../../../../src/models/rig.ts';
import type { BoneName } from '../../../../src/models/rig.ts';
import { STUDIO_BONES } from '../../../../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, studioOffsets } from '../../../../src/models/studio-rig.ts';
import { countInAt } from '../../../../src/pose/count-in.ts';
import { closedDepth, closedPart, openLoops } from '../../../../src/pose/test-clearance.ts';
import { posedPiecePoint, poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import type { PosedSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { posedCorner } from '../../../../src/pose/test-skin.ts';
import { createScenePose, poseAt } from '../../../../src/pose/pose-at.ts';
import { LIFT_FIT_SEC, LOWER_MAX_SEC } from '../../../../src/pose/rest.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from '../../../../src/pose/test-scene.ts';
import type { TestScene } from '../../../../src/pose/test-scene.ts';
import type { Transport } from '../../../../src/pose/types.ts';

const args = process.argv.slice(2);
const moves = args.includes('--moves');
const stand = args.includes('--stand');
const changes = args.find((a) => !a.startsWith('--'));
if (changes) {
  console.log(setHolds(changes).text);
}

const PAWS = { L: ['handL', 'fingersL'], R: ['handR', 'fingersR'] } as const satisfies Readonly<
  Record<'L' | 'R', readonly BoneName[]>
>;
const cm = (m: number): string => (m * 100).toFixed(1);
const deg = (r: number): number => (r * 180) / Math.PI;

/** Finds the mouse oboist of a scene: the standing soloist with --stand, else the first seated one. */
function oboistOf(scene: TestScene): number {
  return scene.layout.players.findIndex(
    (p) =>
      p.cast.species === 'mouse' &&
      p.cast.instrument === 'oboe' &&
      (stand ? p.cast.support === 'stand' : p.cast.support !== 'stand'),
  );
}

/** Gives the bind triangles of the bones, for the open loops of a paw. */
function bindTriangles(model: PlayerModel, bones: readonly BoneName[]): Triangle[] {
  const wanted = new Set(bones.map(boneIndex));
  const { positions, bones: owners } = model.mesh;
  const out: Triangle[] = [];
  for (let t = 0; t < positions.length / 9; t++) {
    if (wanted.has(owners[t * 3] ?? -1)) {
      const at = (k: number): Vector3 => new Vector3().fromArray(positions, t * 9 + k * 3);
      out.push(new Triangle(at(0), at(1), at(2)));
    }
  }
  return out;
}

/** Gives the corners of the bones. */
function cornersOf(model: PlayerModel, bones: readonly BoneName[]): number[] {
  const wanted = new Set(bones.map(boneIndex));
  const out: number[] = [];
  for (let c = 0; c < model.mesh.bones.length; c++) {
    if (wanted.has(model.mesh.bones[c] ?? -1)) {
      out.push(c);
    }
  }
  return out;
}

const demos = await probeDemos();
const demo = demos.find((d) => oboistOf(sceneOf(d.bytes)) >= 0);
if (!demo) {
  throw new Error('no demo with a mouse oboist');
}
const scene = sceneOf(demo.bytes);
const index = oboistOf(scene);
const place = scene.layout.players[index];
if (!place) {
  throw new Error('no mouse');
}
const model = scene.models.get(place.cast.species, place.cast.instrument, place.cast.kettles, place.cast.support);
const corners = { L: cornersOf(model, PAWS.L), R: cornersOf(model, PAWS.R) };
const loops = { L: openLoops(bindTriangles(model, PAWS.L)), R: openLoops(bindTriangles(model, PAWS.R)) };
const reedTip: [number, number, number] = [0, 0, 0];
const grip = model.instrument.grips.palmR;
// The bell end: the instrument bone axis is +x from the reed. The far end is the largest x of the
// pieces of the oboe in the bind, which placePoint does not give, so use 1.6 times the right grip.
const bellEnd: [number, number, number] = [grip ? grip.at[0] * 1.6 : 0.3, 0, 0];

/** The places of one posed paw along the tube. */
interface PawSpan {
  readonly min: number;
  readonly mid: number;
  readonly max: number;
  readonly axis: number;
  readonly points: Vector3[];
}

/** Measures a paw along the tube from the reed. */
function spanOf(posed: PosedSkeleton, side: 'L' | 'R', top: Vector3, along: Vector3): PawSpan {
  const points = corners[side].map((c) => new Vector3(...posedCorner(posed, c)));
  const t = points.map((p) => p.clone().sub(top).dot(along));
  const mid = new Vector3();
  for (const p of points) {
    mid.add(p);
  }
  mid.divideScalar(points.length);
  const s = mid.clone().sub(top).dot(along);
  const axis = mid.distanceTo(top.clone().addScaledVector(along, s));
  return { min: Math.min(...t), mid: s, max: Math.max(...t), axis, points };
}

/** Measures one pose and gives its lines and the paw middles along the tube. */
function measure(label: string, song: number, wall: number, transport: Transport): string {
  const pose = poseAt(scene.plan, song, wall, transport, allAudible(scene.score), createScenePose(scene.plan)).players[index];
  if (!pose) {
    return `${label}: no pose`;
  }
  const posed = poseSkeleton(model, pose);
  const top = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: reedTip }));
  const bell = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: bellEnd }));
  const along = bell.clone().sub(top).normalize();
  const tilt = deg(Math.acos(-along.y));
  const leanFwd = deg(Math.atan2(-(top.z - bell.z), top.y - bell.y));
  const leanSide = deg(Math.atan2(top.x - bell.x, top.y - bell.y));
  const l = spanOf(posed, 'L', top, along);
  const r = spanOf(posed, 'R', top, along);
  const overlap = Math.min(l.max, r.max) - Math.max(l.min, r.min);
  let closest = Infinity;
  for (const p of l.points) {
    for (const q of r.points) {
      closest = Math.min(closest, p.distanceTo(q));
    }
  }
  const closedL = closedPart(posed, PAWS.L, loops.L);
  const closedR = closedPart(posed, PAWS.R, loops.R);
  const depth = Math.max(closedDepth(r.points, closedL).depth, closedDepth(l.points, closedR).depth);
  return [
    `${label}: tilt ${tilt.toFixed(0)}° (fwd ${leanFwd.toFixed(0)}°, side ${leanSide.toFixed(0)}°) reed y ${cm(top.y)} z ${cm(top.z)} bell y ${cm(bell.y)} z ${cm(bell.z)}`,
    `   L: along ${cm(l.min)}..${cm(l.mid)}..${cm(l.max)} axis ${cm(l.axis)}`,
    `   R: along ${cm(r.min)}..${cm(r.mid)}..${cm(r.max)} axis ${cm(r.axis)}`,
    `   pair: overlap along ${cm(overlap)} (gap ${cm(-overlap)}), middles ${cm(r.mid - l.mid)} apart, closest corners ${cm(closest)}, paw in paw ${cm(depth)}`,
  ].join('\n');
}

const start = -countInAt(scene.plan.beats, 0).lengthSec;
console.log(`${demo.file} player ${index} (${place.cast.support}), H ${cm(model.body.headHeight)} cm`);
console.log(measure('rest', start, 10, NOT_STARTED));
const play: Transport = { ...PLAYING, changedAtWall: 10 };
for (const share of [0.2, 0.4, 0.6, 0.8, 1]) {
  const wall = 10 + share * 0.9;
  console.log(measure(`lift wall+${(share * 0.9).toFixed(2)}`, Math.min(0, start + wall - 10), wall, play));
}
console.log(measure('play 30 s', 30, 40, play));

if (moves) {
  const studio = createStudioPose();
  const instrument = STUDIO_BONES.length + boneIndex('instrument');
  const rig = model.studio;
  if (!rig) {
    throw new Error('no rig');
  }
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  for (const move of demoMoves(scene.score.durationSec)) {
    const lead = countInAt(scene.plan.beats, move.at).lengthSec;
    const transport: Transport =
      move.kind === 'lift'
        ? { ...PLAYING, changedAtWall: 10, startSec: move.at }
        : { ...PLAYING, playing: false, changedAtWall: 10, before: PLAYING };
    const span = move.kind === 'lift' ? LIFT_FIT_SEC : transport.holdSec + LOWER_MAX_SEC;
    const from = move.kind === 'lift' ? 0 : transport.holdSec;
    const count = Math.round((span - from) / MOVE_STEP) + 1;
    const out: string[] = [];
    const steps = { L: [] as { held: Quaternion; carried: Quaternion }[], R: [] as { held: Quaternion; carried: Quaternion }[] };
    const slides = { L: [] as number[], R: [] as number[] };
    for (let k = 0; k < count; k++) {
      const wall = from + k * MOVE_STEP;
      const song = move.kind === 'lift' ? Math.min(move.at, move.at - lead + wall) : move.at;
      const pose = poseAt(scene.plan, song, 10 + wall, transport, audible, buffer).players[index];
      if (!pose) {
        continue;
      }
      poseStudioBones(rig, model.skeleton, pose.rotations, studioOffsets(pose), 1, studio);
      const q = (b: number): Quaternion =>
        new Quaternion().setFromRotationMatrix(
          new Matrix4().fromArray(Array.from({ length: 16 }, (...[, k2]) => studio.matrices[b * 16 + k2] ?? 0)),
        );
      const posed = poseSkeleton(model, pose);
      const top = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: reedTip }));
      const bell = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: bellEnd }));
      const along = bell.clone().sub(top).normalize();
      for (const side of ['L', 'R'] as const) {
        steps[side].push({ held: q(STUDIO_BONES.indexOf(`hand_${side}`)), carried: q(instrument) });
        slides[side].push(spanOf(posed, side, top, along).mid);
      }
    }
    for (const side of ['L', 'R'] as const) {
      const s = steps[side];
      const c = stepsCarry(s);
      const axisIn = (k: number): Vector3 => {
        const st = s[k];
        return st ? new Vector3(1, 0, 0).applyQuaternion(st.carried).applyQuaternion(st.held.clone().invert()) : new Vector3();
      };
      let tilt = 0;
      for (let k = 1; k < s.length; k++) {
        tilt = Math.max(tilt, deg(axisIn(0).angleTo(axisIn(k))));
      }
      const first = slides[side][0] ?? 0;
      const slide = Math.max(...slides[side].map((v) => Math.abs(v - first)));
      out.push(`${side} net ${c.net.toFixed(0)} tilt ${tilt.toFixed(0)} slide ${cm(slide)}`);
    }
    console.log(`${demo.file} ${move.kind} ${move.at.toFixed(0)}: ${out.join(' | ')}`);
  }
}
