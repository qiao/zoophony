// A copy of bind-scan.ts of docs/research/2026-10-27-left-paw-bind/ for one side of a role (argv[4],
// L by default), with negative shifts too.
// Scans a shift of the zero of the paw twist (a new bind of the paw) over the rest, the
// play, and each lift and lowering of the gate demos. For each sample: the studio twist of the
// left paw on its forearm from the bind (no unwind), and the roll of the left upper arm from the
// chest. A move path is unwrapped from its first sample. For each shift d (degrees, toward
// supination: the twist grows by d), it prints the largest |twist + d| and the samples past 150°
// and 165°, and for a turn of the bind hinge (route a) the largest |roll - d|.
// Usage: node docs/research/2026-10-27-wolf-knee/probes/bind-scan.ts [roles] [playStep] [L|R]
import { Matrix4, Quaternion, Vector3 } from 'three';

import { FOLD_ROLES, roleBodies } from '../../../../tools/fold-probe.ts';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { demoMoves, MOVE_STEP } from '../../../../tools/arm-check.ts';
import { STUDIO_BONES } from '../../../../src/models/studio-format.ts';
import {
  createStudioPose,
  poseStudioBones,
  studioOffsets,
  twistAngle,
} from '../../../../src/models/studio-rig.ts';
import { countInAt } from '../../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../../src/pose/pose-at.ts';
import { LIFT_FIT_SEC, LOWER_MAX_SEC } from '../../../../src/pose/rest.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from '../../../../src/pose/test-scene.ts';
import type { Transport } from '../../../../src/pose/types.ts';

const roles = (process.argv[2] ?? 'violinist,fox-violinist,violist,flutist').split(',');
const playStep = Number(process.argv[3] ?? '0.5');
const demos = await probeDemos();
const deg = (r: number): number => (r * 180) / Math.PI;
const wrap = (a: number): number => ((((a + 180) % 360) + 360) % 360) - 180;
const turnOf = (m: ArrayLike<number>, bone: number): Quaternion =>
  new Quaternion().setFromRotationMatrix(
    new Matrix4().fromArray(Array.from({ length: 16 }, (_, k) => m[bone * 16 + k] ?? 0)),
  );
const SIDE = (process.argv[4] ?? 'L') === 'R' ? 'R' : 'L';
const FORE = STUDIO_BONES.indexOf(`forearm_${SIDE}`);
const HAND = STUDIO_BONES.indexOf(`hand_${SIDE}`);
const UPPER = STUDIO_BONES.indexOf(`upper_arm_${SIDE}`);
const CHEST = STUDIO_BONES.indexOf('chest');

function upperRoll(arm: Quaternion, chest: Quaternion, bind: Vector3): number {
  const axis = bind.clone().applyQuaternion(chest);
  const frame = new Quaternion().setFromUnitVectors(axis, bind.clone().applyQuaternion(arm));
  frame.multiply(chest).invert().multiply(arm);
  return deg(twistAngle(frame, bind));
}

interface Sample {
  readonly twist: number;
  readonly roll: number;
}

for (const role of roles) {
  const source = FOLD_ROLES.get(role);
  if (!source) {
    continue;
  }
  const rest: Sample[] = [];
  const play: Sample[] = [];
  const moves: Sample[][] = [];
  const studio = createStudioPose();
  for (const demo of demos) {
    const scene = sceneOf(demo.bytes);
    const bodies = roleBodies(source, scene);
    if (bodies.length === 0) {
      continue;
    }
    const audible = allAudible(scene.score);
    const buffer = createScenePose(scene.plan);
    const sample = (song: number, wall: number, transport: Transport): Sample[] => {
      const frame = poseAt(scene.plan, song, wall, transport, audible, buffer);
      const out: Sample[] = [];
      for (const { index, model } of bodies) {
        const pose = index === null ? frame.conductor : frame.players[index];
        const rig = model.studio;
        if (!pose || !rig) {
          continue;
        }
        poseStudioBones(rig, model.skeleton, pose.rotations, studioOffsets(pose), 1, studio);
        const foreBind = new Vector3(...rig.arms[SIDE].fore);
        const upperBind = new Vector3(...rig.arms[SIDE].upper);
        const fore = turnOf(studio.matrices, FORE);
        const hand = turnOf(studio.matrices, HAND);
        out.push({
          twist: deg(twistAngle(fore.clone().invert().multiply(hand), foreBind)),
          roll: upperRoll(turnOf(studio.matrices, UPPER), turnOf(studio.matrices, CHEST), upperBind),
        });
      }
      return out;
    };
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    rest.push(...sample(start, 10, NOT_STARTED));
    for (let song = start; song <= scene.score.durationSec; song += playStep) {
      play.push(...sample(song, 10 + song - start, PLAYING));
    }
    for (const move of demoMoves(scene.score.durationSec)) {
      const lead = countInAt(scene.plan.beats, move.at).lengthSec;
      const transport: Transport =
        move.kind === 'lift'
          ? { ...PLAYING, changedAtWall: 10, startSec: move.at }
          : { ...PLAYING, playing: false, changedAtWall: 10, before: PLAYING };
      const span = move.kind === 'lift' ? LIFT_FIT_SEC : transport.holdSec + LOWER_MAX_SEC;
      const from = move.kind === 'lift' ? 0 : transport.holdSec;
      const count = Math.round((span - from) / MOVE_STEP) + 1;
      const path: Sample[] = [];
      for (let k = 0; k < count; k++) {
        const wall = from + k * MOVE_STEP;
        const song = move.kind === 'lift' ? Math.min(move.at, move.at - lead + wall) : move.at;
        const [s] = sample(song, 10 + wall, transport);
        if (s) {
          path.push(s);
        }
      }
      moves.push(path);
    }
  }
  // Unwrap each move from its first sample, and put the first sample of a lift at the rest side.
  const unwrapped: Sample[] = [];
  for (const path of moves) {
    let prevT = path[0]?.twist ?? 0;
    let prevR = path[0]?.roll ?? 0;
    for (const s of path) {
      const t = prevT + wrap(s.twist - prevT);
      const r = prevR + wrap(s.roll - prevR);
      unwrapped.push({ twist: t, roll: r });
      prevT = t;
      prevR = r;
    }
  }
  const range = (xs: number[]): string => {
    const s = xs.toSorted((a, b) => a - b);
    const q = (p: number): number => s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? NaN;
    return `${q(0).toFixed(0)} / ${q(0.05).toFixed(0)} / ${q(0.5).toFixed(0)} / ${q(0.95).toFixed(0)} / ${q(1).toFixed(0)}`;
  };
  console.log(`\n${role} ${SIDE}: rest ${rest.length}, play ${play.length}, moves ${moves.length} (${unwrapped.length} samples)`);
  console.log(`  rest twist min/p5/p50/p95/max ${range(rest.map((s) => s.twist))}, roll ${range(rest.map((s) => s.roll))}`);
  console.log(`  play twist ${range(play.map((s) => s.twist))}, roll ${range(play.map((s) => s.roll))}`);
  console.log(`  move twist (unwrapped) ${range(unwrapped.map((s) => s.twist))}, roll ${range(unwrapped.map((s) => s.roll))}`);
  console.log('  d | max|t+d| all | >150 | >165 | max|t+d| rest,play | max|roll-d| (route a)');
  const all = [...rest, ...play, ...unwrapped];
  for (let d = -180; d <= 180; d += 10) {
    const ts = all.map((s) => Math.abs(wrap(s.twist + d)));
    const rp = [...rest, ...play].map((s) => Math.abs(wrap(s.twist + d)));
    const rolls = all.map((s) => Math.abs(wrap(s.roll - d)));
    console.log(
      `  ${String(d).padStart(3)} | ${Math.max(...ts).toFixed(0).padStart(3)} | ${ts.filter((x) => x > 150).length} | ${ts.filter((x) => x > 165).length} | ${Math.max(...rp).toFixed(0)} | ${Math.max(...rolls).toFixed(0)}`,
    );
  }
}
