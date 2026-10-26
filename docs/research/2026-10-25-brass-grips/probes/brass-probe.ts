// Measures the visible paws of the trumpeter and the tubist in the axes of the instrument
// (diagnosis only).
// Usage, from the root of the tree: node docs/research/2026-10-25-brass-grips/probes/brass-probe.ts [<set changes> or ''] [<role,...>] [<set>]
//
// For each paw, over play samples (or the set that the third argument names), it gives the
// medians of: the direction of the fingers (from the wrist to the finger tips), the palm normal,
// and the thumb direction of the visible paw, in the axes of the instrument (trumpet: forward
// along the trumpet, up, right; tuba: the axes of the chest), the place of the middle of the paw
// and of its lowest finger tip from the middle of the valve block, the top of the paw above the
// mouthpiece, and the gap of the two paws. The visible paw turns from the bind by the best-fit
// rotation of the corners of the hand bone (Kabsch). In the bind, the fingers point down, the
// thumb forward, and the palm faces +x (left hand) or -x (right hand).
import { Matrix3, Matrix4, Quaternion, Vector3 } from 'three';

import { setHolds } from '../../../../tools/hold-sets.ts';
import { probeDemos } from '../../../../tools/probe-demos.ts';
import { boneIndex } from '../../../../src/models/rig.ts';
import { scoreOf } from '../../../../src/score/test-score.ts';
import { posedPiecePoint, poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import type { PosedSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { posedCorner } from '../../../../src/pose/test-skin.ts';
import { createScenePose, poseAt } from '../../../../src/pose/pose-at.ts';
import { allAudible, sceneOf } from '../../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../../src/pose/test-sweep-roles.ts';

const changes = process.argv[2];
if (changes) {
  for (const c of changes.split(';;')) {
    console.log(setHolds(c).text);
  }
}
const only = process.argv[3] ?? 'trumpeter,tubist';
const setName = process.argv[4] ?? 'play';

const ROLES = [
  ['trumpeter', 'monkey', 'trumpet'],
  ['tubist', 'rhino', 'tuba'],
] as const;
const SAMPLES = 16;
const f1 = (v: number): string => (v >= 0 ? '+' : '') + v.toFixed(1);
const f2 = (v: number): string => (v >= 0 ? '+' : '') + v.toFixed(2);
const med = (v: number[]): number => v.toSorted((a, b) => a - b)[Math.floor(v.length / 2)] ?? NaN;

const demos = await probeDemos();
for (const [role, species, instrument] of ROLES) {
  if (!only.split(',').includes(role)) {
    continue;
  }
  const sweep = SWEEP_ROLES[role];
  const demo = demos.find((d) => sweep.hasRole(scoreOf(d.bytes)));
  if (!demo) {
    continue;
  }
  const scene = sceneOf(demo.bytes);
  const index = scene.layout.players.findIndex(
    (p) => p.cast.species === species && p.cast.instrument === instrument,
  );
  const place = scene.layout.players[index];
  if (!place) {
    continue;
  }
  const model = scene.models.get(
    place.cast.species,
    place.cast.instrument,
    place.cast.kettles,
    place.cast.support,
  );
  const set = sweep.sampleSets(scene).find((s) => s.name === setName);
  const all = set ? [...set.samples] : [];
  const step = Math.max(1, Math.floor(all.length / SAMPLES));
  const samples = all.filter((_, i) => i % step === 0).slice(0, SAMPLES);
  const { mesh, skeleton } = model;
  const at = (c: number): Vector3 =>
    new Vector3(
      mesh.positions[c * 3] ?? 0,
      mesh.positions[c * 3 + 1] ?? 0,
      mesh.positions[c * 3 + 2] ?? 0,
    );
  const s = model.instrument.id === 'trumpet' ? 0.8 : 1;
  const sides = ['L', 'R'] as const;
  const info = sides.map((side) => {
    const hand = boneIndex(`hand${side}`);
    const fingers = boneIndex(`fingers${side}`);
    const wrist = new Vector3(...(skeleton.positions[hand] ?? [0, 0, 0]));
    const handCorners: number[] = [];
    const pawCorners: number[] = [];
    for (let c = 0; c < mesh.bones.length; c++) {
      if (mesh.bones[c] === hand) {
        handCorners.push(c);
      }
      if (mesh.bones[c] === hand || mesh.bones[c] === fingers) {
        pawCorners.push(c);
      }
    }
    const far = Math.max(...pawCorners.map((c) => at(c).distanceTo(wrist)));
    const tips = pawCorners.filter((c) => at(c).distanceTo(wrist) > 0.85 * far);
    return { side, hand, handCorners, pawCorners, tips };
  });
  const stats: Record<string, number[]> = {};
  const push = (k: string, v: number): void => {
    (stats[k] ??= []).push(v);
  };
  for (const sample of samples) {
    const pose = poseAt(
      scene.plan,
      sample[0],
      sample[1],
      sample[2],
      allAudible(scene.score),
      createScenePose(scene.plan),
    ).players[index];
    if (!pose) {
      continue;
    }
    const posed: PosedSkeleton = poseSkeleton(model, pose);
    // The axes of the instrument: the trumpet points along +x of its piece, up +y; the tuba has
    // the axes of the chest.
    const origin = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: [0, 0, 0] }));
    const ax = (p: [number, number, number]): Vector3 =>
      new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: p })).sub(origin);
    let fwd: Vector3;
    let up: Vector3;
    let block: Vector3;
    if (instrument === 'trumpet') {
      fwd = ax([1, 0, 0]).normalize();
      up = ax([0, 1, 0]).normalize();
      block = new Vector3(...posedPiecePoint(posed, { bone: 'instrument', at: [0.176 * s, 0.0125 * s, 0] }));
    } else {
      const chest = posed.frames[boneIndex('chest')]?.rotation ?? new Quaternion();
      fwd = new Vector3(0, 0, -1).applyQuaternion(chest);
      up = new Vector3(0, 1, 0).applyQuaternion(chest);
      const tubes = model.instrument.grips;
      const t = tubes.tubeR;
      block = t
        ? new Vector3(...posedPiecePoint(posed, { bone: t.bone, at: t.from }))
            .add(new Vector3(...posedPiecePoint(posed, { bone: t.bone, at: t.to })))
            .multiplyScalar(0.5)
        : origin.clone();
    }
    const right = new Vector3().crossVectors(fwd, up).normalize();
    const loc = (v: Vector3): [number, number, number] => [v.dot(fwd), v.dot(up), v.dot(right)];
    const mids: Vector3[] = [];
    for (const p of info) {
      const bindMid = new Vector3();
      const poseMid = new Vector3();
      const posedOf = new Map<number, Vector3>();
      for (const c of p.handCorners) {
        const q = new Vector3(...posedCorner(posed, c));
        posedOf.set(c, q);
        bindMid.add(at(c));
        poseMid.add(q);
      }
      bindMid.divideScalar(p.handCorners.length);
      poseMid.divideScalar(p.handCorners.length);
      const h = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (const c of p.handCorners) {
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
      const rot = kabsch(h);
      const fing = loc(new Vector3(0, -1, 0).applyQuaternion(rot));
      const palm = loc(new Vector3(p.side === 'L' ? 1 : -1, 0, 0).applyQuaternion(rot));
      const thumb = loc(new Vector3(0, 0, -1).applyQuaternion(rot));
      const mid = new Vector3();
      let top = -1;
      for (const c of p.pawCorners) {
        const q = new Vector3(...posedCorner(posed, c));
        mid.add(q);
        top = Math.max(top, q.clone().sub(origin).dot(up));
      }
      mid.divideScalar(p.pawCorners.length);
      mids.push(mid);
      const tip = new Vector3();
      for (const c of p.tips) {
        tip.add(new Vector3(...posedCorner(posed, c)));
      }
      tip.divideScalar(p.tips.length);
      const m = loc(mid.clone().sub(block));
      const t = loc(tip.clone().sub(block));
      const k = p.side;
      ['f', 'u', 'r'].forEach((n, i) => {
        push(`${k} fingers ${n}`, fing[i] ?? 0);
        push(`${k} palm ${n}`, palm[i] ?? 0);
        push(`${k} thumb ${n}`, thumb[i] ?? 0);
        push(`${k} mid ${n}`, (m[i] ?? 0) * 100);
        push(`${k} tips ${n}`, (t[i] ?? 0) * 100);
      });
      push(`${k} top`, top * 100);
      const joint = posed.frames[boneIndex(`upperArm${k}`)]?.position ?? new Vector3();
      const elbow = posed.frames[boneIndex(`forearm${k}`)]?.position ?? new Vector3();
      const wristAt = posed.frames[boneIndex(`hand${k}`)]?.position ?? new Vector3();
      const fore = loc(wristAt.clone().sub(elbow).normalize());
      const j = loc(joint.clone().sub(block));
      const e = loc(elbow.clone().sub(block));
      const w = loc(wristAt.clone().sub(block));
      ['f', 'u', 'r'].forEach((n, i) => {
        push(`${k} fore ${n}`, fore[i] ?? 0);
        push(`${k} joint ${n}`, (j[i] ?? 0) * 100);
        push(`${k} elbow ${n}`, (e[i] ?? 0) * 100);
        push(`${k} wrist ${n}`, (w[i] ?? 0) * 100);
      });
    }
    push('paws apart', (mids[0] ?? new Vector3()).distanceTo(mids[1] ?? new Vector3()) * 100);
  }
  console.log(`${role} (${setName}, ${samples.length} samples). Axes: forward, up, right of the ${instrument === 'trumpet' ? 'trumpet' : 'chest'}. Places in cm from the ${instrument === 'trumpet' ? 'middle valve top' : 'middle of the valve tops'}.`);
  console.log('| Paw | Fingers (f, u, r) | Palm (f, u, r) | Thumb (f, u, r) | Middle cm | Tips cm | Top above mouthpiece cm |');
  console.log('|---|---|---|---|---|---|---:|');
  for (const k of sides) {
    const v = (n: string, f: (x: number) => string): string =>
      ['f', 'u', 'r'].map((a) => f(med(stats[`${k} ${n} ${a}`] ?? []))).join(', ');
    console.log(
      `| ${k} | ${v('fingers', f2)} | ${v('palm', f2)} | ${v('thumb', f2)} | ${v('mid', f1)} | ${v('tips', f1)} | ${f1(med(stats[`${k} top`] ?? []))} |`,
    );
  }
  console.log(`Middles of the paws apart: ${med(stats['paws apart'] ?? []).toFixed(1)} cm`);
  console.log('| Paw | Forearm (f, u, r) | Shoulder joint cm | Elbow cm | Wrist cm |');
  console.log('|---|---|---|---|---|');
  for (const k of sides) {
    const v = (n: string, f: (x: number) => string): string =>
      ['f', 'u', 'r'].map((a) => f(med(stats[`${k} ${n} ${a}`] ?? []))).join(', ');
    console.log(`| ${k} | ${v('fore', f2)} | ${v('joint', f1)} | ${v('elbow', f1)} | ${v('wrist', f1)} |`);
  }
}

/**
 * Gives the rotation that best maps the centered bind points onto the centered posed points.
 *
 * @param h The cross covariance, row major: sum of bind_i * posed_j.
 * @returns The rotation.
 */
function kabsch(h: number[]): Quaternion {
  const m = new Matrix3().set(
    h[0] ?? 0, h[3] ?? 0, h[6] ?? 0,
    h[1] ?? 0, h[4] ?? 0, h[7] ?? 0,
    h[2] ?? 0, h[5] ?? 0, h[8] ?? 0,
  );
  let r = m.clone();
  for (let i = 0; i < 60; i++) {
    const inv = r.clone().invert().transpose();
    const e = r.elements.map((x, k) => 0.5 * (x + (inv.elements[k] ?? 0)));
    r = new Matrix3().fromArray(e);
  }
  return new Quaternion().setFromRotationMatrix(new Matrix4().setFromMatrix3(r));
}
