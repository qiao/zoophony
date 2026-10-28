// Measures the clarinet of the wolf at rest and in the moves (diagnosis only).
// Usage: node docs/research/2026-10-27-wolf-mouse-rests/probes/wolf-rest.ts ['<set changes>'] [--moves]
//
// For the rest sample and the lift and lowering shares: the clarinet tilt from the vertical, the
// lean, the bell end against the seat top, the seat front, and the knees, and for each paw: the
// place along the tube, the distance of the paw middle to the axis, the true palm to the tube
// (from the thumb of the bind mesh, as palm-probe.ts of 2026-10-25-wind-palms), the thumb tip
// along the tube and behind the axis, and the finger tips to the tube.
// With --moves: the turn of the clarinet in each paw over each lift and lowering (stepsCarry of
// tools/carry-check.ts), for both paws.
import { Matrix3, Matrix4, Quaternion, Vector3 } from 'three';

import { setHolds } from '../../../../tools/hold-sets.ts';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { MOVE_STEP, demoMoves } from '../../../../tools/arm-check.ts';
import { stepsCarry } from '../../../../tools/carry-check.ts';
import { WOODWINDS } from '../../../../src/models/instruments/woodwinds.ts';
import { boneIndex } from '../../../../src/models/rig.ts';
import { CHAIR, seatHeights } from '../../../../src/models/props.ts';
import { SPECIES } from '../../../../src/models/species.ts';
import { STUDIO_BONES } from '../../../../src/models/studio-format.ts';
import { createStudioPose, poseStudioBones, studioOffsets } from '../../../../src/models/studio-rig.ts';
import { countInAt } from '../../../../src/pose/count-in.ts';
import { scoreOf } from '../../../../src/score/test-score.ts';
import { posedPiecePoint, poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import type { PosedSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { posedCorner } from '../../../../src/pose/test-skin.ts';
import { createScenePose, poseAt } from '../../../../src/pose/pose-at.ts';
import { LIFT_FIT_SEC, LOWER_MAX_SEC } from '../../../../src/pose/rest.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from '../../../../src/pose/test-scene.ts';
import type { Transport } from '../../../../src/pose/types.ts';

const args = process.argv.slice(2);
const moves = args.includes('--moves');
const changes = args.find((a) => !a.startsWith('--'));
if (changes) {
  console.log(setHolds(changes).text);
}

const demos = await probeDemos();
const demo = demos.find((d) => d.file === 'beethoven-1.mid');
if (!demo) {
  throw new Error('no demo');
}
const scene = sceneOf(demo.bytes);
const index = scene.layout.players.findIndex(
  (p) => p.cast.species === 'wolf' && p.cast.instrument === 'clarinet' && p.cast.support === 'chair',
);
const place = scene.layout.players[index];
if (!place) {
  throw new Error('no wolf');
}
const model = scene.models.get(place.cast.species, place.cast.instrument, place.cast.kettles, place.cast.support);
const seat = seatHeights('chair', SPECIES.wolf);
if (!seat) {
  throw new Error('no seat');
}
const seatDepth = seat.seatDepth ?? CHAIR.seatDepth;
const seatWidth = seat.seatWidth ?? CHAIR.seatWidth;
const seatCenter = (CHAIR.seatDepth - seatDepth) / 2;
const seatFront = seatCenter - seatDepth / 2;
const { mesh, skeleton } = model;
const at = (c: number): Vector3 =>
  new Vector3(mesh.positions[c * 3] ?? 0, mesh.positions[c * 3 + 1] ?? 0, mesh.positions[c * 3 + 2] ?? 0);
const deg = (r: number): number => (r * 180) / Math.PI;
const cm = (m: number): string => (m * 100).toFixed(1);

/** The thumb of each paw in the bind mesh, and the true palm in the bind. */
interface Thumb {
  readonly tip: number;
  readonly palm: Vector3;
  readonly corners: number[];
  readonly hand: number[];
  readonly tips: number[];
}
const thumbs = new Map<'L' | 'R', Thumb>();
for (const side of ['L', 'R'] as const) {
  const hand = boneIndex(`hand${side}`);
  const fingers = boneIndex(`fingers${side}`);
  const wrist = new Vector3(...(skeleton.positions[hand] ?? [0, 0, 0]));
  const knuckle = new Vector3(...(skeleton.positions[fingers] ?? [0, 0, 0]));
  const axis = knuckle.clone().sub(wrist).normalize();
  const corners: number[] = [];
  for (let c = 0; c < mesh.bones.length; c++) {
    const b = mesh.bones[c];
    if (b === hand || b === fingers) {
      corners.push(c);
    }
  }
  const tOf = (c: number): number => at(c).sub(wrist).dot(axis);
  const tipT = Math.max(...corners.map(tOf));
  const key = (c: number): string => {
    const p = at(c);
    return `${p.x.toFixed(5)},${p.y.toFixed(5)},${p.z.toFixed(5)}`;
  };
  let thumb: number[] = [];
  for (const cut of [0.3, 0.45, 0.6, 0.75]) {
    const tris: number[] = [];
    for (let c = 0; c < mesh.bones.length; c += 3) {
      if ([c, c + 1, c + 2].every((k) => corners.includes(k) && tOf(k) > cut * tipT)) {
        tris.push(c);
      }
    }
    const parent = new Map<string, string>();
    const find = (k: string): string => {
      let r = k;
      while (parent.get(r) !== r) {
        r = parent.get(r) ?? r;
      }
      return r;
    };
    for (const t of tris) {
      const ks = [key(t), key(t + 1), key(t + 2)];
      for (const k of ks) {
        if (!parent.has(k)) {
          parent.set(k, k);
        }
      }
      parent.set(find(ks[1] ?? ''), find(ks[0] ?? ''));
      parent.set(find(ks[2] ?? ''), find(ks[0] ?? ''));
    }
    const groups = new Map<string, number[]>();
    for (const t of tris) {
      const r = find(key(t));
      groups.set(r, [...(groups.get(r) ?? []), t, t + 1, t + 2]);
    }
    const parts = [...groups.values()].toSorted((a, b) => b.length - a.length);
    const lateral = (part: number[]): number => {
      const m = new Vector3();
      for (const c of part) {
        m.add(at(c));
      }
      return m.divideScalar(part.length).sub(wrist).projectOnPlane(axis).length() / tipT;
    };
    const candidates = parts
      .slice(1)
      .filter((p) => p.length >= 6 && lateral(p) > 0.25)
      .toSorted((a, b) => lateral(b) - lateral(a));
    if (candidates[0]) {
      thumb = candidates[0];
      break;
    }
  }
  const mid = new Vector3();
  for (const c of thumb) {
    mid.add(at(c));
  }
  mid.divideScalar(Math.max(1, thumb.length));
  const u = mid.clone().sub(wrist).projectOnPlane(axis).normalize();
  const palm = side === 'L' ? new Vector3().crossVectors(axis, u) : new Vector3().crossVectors(u, axis);
  const tip = thumb.reduce((best, c) => (at(c).distanceTo(wrist) > at(best).distanceTo(wrist) ? c : best), thumb[0] ?? 0);
  // The finger tips: the corners of the paw within 1 cm of the farthest point along the axis.
  const tips = corners.filter((c) => tOf(c) > tipT - 0.012 && !thumb.includes(c));
  thumbs.set(side, { tip, palm, corners, hand: corners.filter((c) => mesh.bones[c] === hand), tips });
}

/**
 * Gives the rotation that best maps the centered bind points onto the centered posed points.
 *
 * @param h The cross covariance, row major.
 * @returns The rotation.
 */
function kabsch(h: number[]): Quaternion {
  const m = new Matrix3().set(h[0] ?? 0, h[3] ?? 0, h[6] ?? 0, h[1] ?? 0, h[4] ?? 0, h[7] ?? 0, h[2] ?? 0, h[5] ?? 0, h[8] ?? 0);
  let r = m.clone();
  for (let i = 0; i < 60; i++) {
    const inv = r.clone().invert().transpose();
    const e = r.elements.map((x, k) => 0.5 * (x + (inv.elements[k] ?? 0)));
    r = new Matrix3().fromArray(e);
  }
  return new Quaternion().setFromRotationMatrix(new Matrix4().setFromMatrix3(r));
}

const w = WOODWINDS.clarinet;
const grip = model.instrument.grips.palmR;
const length = grip ? (grip.at[0] / w.palmR) * w.length : w.length;

/**
 * Measures one pose.
 *
 * @param label The label.
 * @param song The song time.
 * @param wall The wall time.
 * @param transport The transport.
 * @returns The line.
 */
function measure(label: string, song: number, wall: number, transport: Transport): string {
  const pose = poseAt(scene.plan, song, wall, transport, allAudible(scene.score), createScenePose(scene.plan)).players[index];
  if (!pose) {
    return `${label}: no pose`;
  }
  const posed: PosedSkeleton = poseSkeleton(model, pose);
  const top = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: [0, 0, 0] }));
  const bell = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: [length, 0, 0] }));
  const axis = bell.clone().sub(top).normalize();
  const tilt = deg(Math.acos(-axis.y));
  // + forward lean of the top: the top in front (-z) of the bell.
  const leanFwd = deg(Math.atan2(-(top.z - bell.z), top.y - bell.y));
  const leanSide = deg(Math.atan2(top.x - bell.x, top.y - bell.y));
  const kneeL = posed.frames[boneIndex('shinL')]?.position ?? new Vector3();
  const kneeR = posed.frames[boneIndex('shinR')]?.position ?? new Vector3();
  const bellLow = bell.y - 0.033 * Math.sqrt(Math.max(0, 1 - axis.y * axis.y));
  const parts = [
    `${label}: tilt ${tilt.toFixed(0)}° (fwd ${leanFwd.toFixed(0)}°, side ${leanSide.toFixed(0)}°)`,
    `bell x ${cm(bell.x)} y-seat ${cm(bellLow - seat.seatHeight)} z-front ${cm(bell.z - seatFront)}`,
    `top y-seat ${cm(top.y - seat.seatHeight)} z ${cm(top.z - seatFront)}`,
    `knees x ${cm(kneeL.x)} ${cm(kneeR.x)} y-seat ${cm(kneeL.y - seat.seatHeight)} z-front ${cm(kneeL.z - seatFront)}`,
  ];
  for (const side of ['L', 'R'] as const) {
    const t = thumbs.get(side);
    if (!t) {
      continue;
    }
    const bindMid = new Vector3();
    const poseMid = new Vector3();
    const posedOf = new Map<number, Vector3>();
    for (const c of t.hand) {
      const p = new Vector3(...posedCorner(posed, c));
      posedOf.set(c, p);
      bindMid.add(at(c));
      poseMid.add(p);
    }
    bindMid.divideScalar(t.hand.length);
    poseMid.divideScalar(t.hand.length);
    const h = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (const c of t.hand) {
      const a = at(c).sub(bindMid);
      const b = (posedOf.get(c) ?? new Vector3()).clone().sub(poseMid);
      const av = [a.x, a.y, a.z];
      const bv = [b.x, b.y, b.z];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          h[i * 3 + j] = (h[i * 3 + j] ?? 0) + (av[i] ?? 0) * (bv[j] ?? 0);
        }
      }
    }
    const palm = t.palm.clone().applyQuaternion(kabsch(h));
    const pawMid = new Vector3();
    for (const c of t.corners) {
      pawMid.add(new Vector3(...posedCorner(posed, c)));
    }
    pawMid.divideScalar(t.corners.length);
    const along = pawMid.clone().sub(top).dot(axis);
    const onAxis = top.clone().addScaledVector(axis, along);
    const off = pawMid.clone().sub(onAxis);
    const toTube = off.clone().negate().projectOnPlane(axis).normalize();
    const thumbTip = new Vector3(...posedCorner(posed, t.tip));
    const chest = posed.frames[boneIndex('chest')]?.position ?? new Vector3();
    const toPlayer = chest.clone().sub(onAxis).projectOnPlane(axis).normalize();
    const tipAlong = thumbTip.clone().sub(top).dot(axis);
    const tipOnAxis = top.clone().addScaledVector(axis, tipAlong);
    const behind = thumbTip.clone().sub(tipOnAxis).dot(toPlayer);
    // The finger tips: mean distance to the axis.
    let tipAxis = 0;
    for (const c of t.tips) {
      const p = new Vector3(...posedCorner(posed, c));
      const s = p.clone().sub(top).dot(axis);
      tipAxis += p.distanceTo(top.clone().addScaledVector(axis, s));
    }
    tipAxis /= Math.max(1, t.tips.length);
    // The paw corners above the mouthpiece (cap) and below the bell.
    let above = -Infinity;
    for (const c of t.corners) {
      const p = new Vector3(...posedCorner(posed, c));
      above = Math.max(above, -p.clone().sub(top).dot(axis));
    }
    parts.push(
      `${side}: along ${cm(along)} axis ${cm(off.length())} palm ${deg(palm.clone().projectOnPlane(axis).angleTo(toTube)).toFixed(0)}° thumb along ${cm(-(tipAlong - along))} behind ${cm(behind)} tipsAxis ${cm(tipAxis)} cap ${cm(above)}`,
    );
  }
  return parts.join('\n   ');
}

const start = -countInAt(scene.plan.beats, 0).lengthSec;
console.log(`seat top ${cm(seat.seatHeight)} front z ${cm(seatFront)} width ${cm(seatWidth)} depth ${cm(seatDepth)}; clarinet length ${cm(length)}`);
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
  for (const d of args.includes("--one") ? demos.filter((x) => x.file === "beethoven-1.mid") : demos) {
    const s = sceneOf(d.bytes);
    if (!s.score.seats.some((x) => x.section === 'clarinet')) {
      continue;
    }
    const i = s.layout.players.findIndex((p) => p.cast.species === 'wolf' && p.cast.instrument === 'clarinet' && p.cast.support === 'chair');
    if (i < 0) {
      continue;
    }
    const audible = allAudible(s.score);
    const buffer = createScenePose(s.plan);
    for (const move of demoMoves(s.score.durationSec)) {
      const lead = countInAt(s.plan.beats, move.at).lengthSec;
      const transport: Transport =
        move.kind === 'lift'
          ? { ...PLAYING, changedAtWall: 10, startSec: move.at }
          : { ...PLAYING, playing: false, changedAtWall: 10, before: PLAYING };
      const span = move.kind === 'lift' ? LIFT_FIT_SEC : transport.holdSec + LOWER_MAX_SEC;
      const from = move.kind === 'lift' ? 0 : transport.holdSec;
      const count = Math.round((span - from) / MOVE_STEP) + 1;
      const out: string[] = [];
      for (const side of ['L', 'R'] as const) {
        const paw = STUDIO_BONES.indexOf(`hand_${side}`);
        const steps: { held: Quaternion; carried: Quaternion }[] = [];
        for (let k = 0; k < count; k++) {
          const wall = from + k * MOVE_STEP;
          const song = move.kind === 'lift' ? Math.min(move.at, move.at - lead + wall) : move.at;
          const pose = poseAt(s.plan, song, 10 + wall, transport, audible, buffer).players[i];
          if (pose) {
            poseStudioBones(rig, model.skeleton, pose.rotations, studioOffsets(pose), 1, studio);
            const q = (b: number): Quaternion =>
              new Quaternion().setFromRotationMatrix(new Matrix4().fromArray(Array.from({ length: 16 }, (...[, k2]) => studio.matrices[b * 16 + k2] ?? 0)));
            steps.push({ held: q(paw), carried: q(instrument) });
          }
        }
        const c = stepsCarry(steps);
        // The tilt of the tube axis in the paw: the axis of the instrument bone (+x) in the axes of
        // the paw, at the first step and at each later step; the largest angle.
        const axisIn = (k: number): Vector3 => {
          const st = steps[k];
          return st ? new Vector3(1, 0, 0).applyQuaternion(st.carried).applyQuaternion(st.held.clone().invert()) : new Vector3();
        };
        let tilt = 0;
        for (let k = 1; k < steps.length; k++) {
          tilt = Math.max(tilt, (axisIn(0).angleTo(axisIn(k)) * 180) / Math.PI);
        }
        out.push(`${side} fast ${c.fast} opp ${c.opposed} angle ${c.angle.toFixed(0)} path ${c.path.toFixed(0)} net ${c.net.toFixed(0)} tilt ${tilt.toFixed(0)}`);
      }
      console.log(`${d.file} ${move.kind} ${move.at.toFixed(0)}: ${out.join(' | ')}`);
    }
  }
}
