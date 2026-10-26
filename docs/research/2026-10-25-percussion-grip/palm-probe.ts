// Measures the true palm and the thumb of each percussion paw in play samples, with the shaft of the mallet as the tube (diagnosis only, from the probe of 2026-10-25-wind-palms).
// Usage, from the root of the tree: node docs/research/2026-10-25-percussion-grip/palm-probe.ts [<set changes> or ''] [<role,...>]
//
// The thumb is the separate digit of the paw in the bind mesh: the smaller of the two parts that
// a cut across the paw axis leaves beyond the cut. The true palm follows from the thumb by the
// chirality of the hand: for a left hand, the thumb lies at palm x fingers, for a right hand at
// fingers x palm. The probe carries the true palm into the pose by the best-fit rotation of the
// corners of the hand bone, and compares it with the palm of the hold (+x of the left hand of the
// player, -x of the right hand) and with the direction from the paw to the tube axis.
import { Matrix3, Matrix4, Quaternion, Vector3 } from 'three';

import { setHolds } from '../../../tools/hold-sets.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { WOODWINDS } from '../../../src/models/instruments/woodwinds.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { posedPiecePoint, poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import type { PosedSkeleton } from '../../../src/pose/test-kinematics.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { SWEEP_ROLES } from '../../../src/pose/test-sweep-roles.ts';

const changes = process.argv[2];
if (changes) {
  console.log(setHolds(changes).text);
}

const ROLES = [
  ['snare-drummer', 'badger', 'snare-drum'],
  ['xylophonist', 'badger', 'xylophone'],
  ['timpanist', 'elephant', 'timpani'],
] as const;
const SAMPLES = 12;
const deg = (r: number): number => (r * 180) / Math.PI;
const fmt = (v: number): string => (v >= 0 ? '+' : '') + v.toFixed(2);

const demos = await probeDemos();
const rows: string[] = [];
const only = process.argv[3];
for (const [role, species, instrument] of ROLES) {
  if (only && !only.split(',').includes(role)) {
    continue;
  }
  const sweep = SWEEP_ROLES[role as keyof typeof SWEEP_ROLES];
  const demo = demos.find((d) => sweep.hasRole(scoreOf(d.bytes)));
  if (!demo) {
    rows.push(`| ${role} | no demo |`);
    continue;
  }
  const scene = sceneOf(demo.bytes);
  const index = scene.layout.players.findIndex(
    (p) => p.cast.species === species && p.cast.instrument === instrument,
  );
  const place = scene.layout.players[index];
  if (!place) {
    rows.push(`| ${role} | no player |`);
    continue;
  }
  const model = scene.models.get(
    place.cast.species,
    place.cast.instrument,
    place.cast.kettles,
    place.cast.support,
  );
  const play = sweep.sampleSets(scene).find((s) => s.name === 'play');
  const all = play ? [...play.samples] : [];
  const step = Math.max(1, Math.floor(all.length / SAMPLES));
  const samples = all.filter((_, i) => i % step === 0).slice(0, SAMPLES);
  const { mesh, skeleton } = model;
  const at = (c: number): Vector3 =>
    new Vector3(mesh.positions[c * 3] ?? 0, mesh.positions[c * 3 + 1] ?? 0, mesh.positions[c * 3 + 2] ?? 0);

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

    // The parts beyond a cut: triangles with all corners beyond it, joined by shared vertices.
    let thumb: number[] | null = null;
    let usedCut = 0;
    let thumbLateral = 0;
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
      // The thumb: the part off the largest part that stands farthest from the paw axis.
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
        usedCut = cut;
        thumbLateral = lateral(thumb);
        break;
      }
    }
    const thumbPart: number[] = thumb ?? [];
    const hasThumb = thumbPart.length > 0;

    // The true palm in the bind: the thumb side u, square to the axis, and the chirality.
    const middleT = new Vector3();
    for (const c of thumbPart) {
      middleT.add(at(c));
    }
    middleT.divideScalar(Math.max(1, thumbPart.length));
    const u = middleT.clone().sub(wrist).projectOnPlane(axis).normalize();
    const truePalmBind =
      side === 'L' ? new Vector3().crossVectors(axis, u) : new Vector3().crossVectors(u, axis);
    const tipCorner = thumbPart.reduce(
      (best, c) => (at(c).distanceTo(wrist) > at(best).distanceTo(wrist) ? c : best),
      thumbPart[0] ?? 0,
    );

    const handCorners = corners.filter((c) => mesh.bones[c] === hand);
    const stats = { hint: [] as number[], tube: [] as number[], hintTube: [] as number[], along: [] as number[], toward: [] as number[], front: [] as number[], behind: [] as number[], hintFront: [] as number[], chiral: [] as number[] };
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
      // The best-fit rotation of the hand corners from the bind to the pose (Kabsch).
      const bindMid = new Vector3();
      const poseMid = new Vector3();
      const posedOf = new Map<number, Vector3>();
      for (const c of handCorners) {
        const p = new Vector3(...posedCorner(posed, c));
        posedOf.set(c, p);
        bindMid.add(at(c));
        poseMid.add(p);
      }
      bindMid.divideScalar(handCorners.length);
      poseMid.divideScalar(handCorners.length);
      const h = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (const c of handCorners) {
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
      const rotation = kabsch(h);
      const truePalm = truePalmBind.clone().applyQuaternion(rotation);
      const handFrame = posed.frames[hand]?.rotation ?? new Quaternion();
      const hintPalm = new Vector3(side === 'L' ? 1 : -1, 0, 0).applyQuaternion(handFrame);

      const tube = tubeOf(posed, instrument, side);
      const pawMid = new Vector3();
      for (const c of corners) {
        pawMid.add(new Vector3(...posedCorner(posed, c)));
      }
      pawMid.divideScalar(corners.length);
      const along = pawMid.clone().sub(tube.start).dot(tube.axis);
      const onAxis = tube.start.clone().addScaledVector(tube.axis, along);
      const toTube = onAxis.clone().sub(pawMid).projectOnPlane(tube.axis).normalize();
      const thumbTip = new Vector3(...posedCorner(posed, tipCorner));
      const thumbDir = thumbTip.clone().sub(pawMid);
      // + toward the mouthpiece along the tube.
      const mouth = model.instrument.grips.mouth;
      const mouthPoint = mouth ? new Vector3(...posedPiecePoint(posed, mouth)) : tube.start;
      const upTube = tube.axis.clone().multiplyScalar(Math.sign(mouthPoint.clone().sub(pawMid).dot(tube.axis)) || 1);
      // + toward the player: from the axis toward the chest, square to the tube.
      const chest = posed.frames[boneIndex('chest')]?.position ?? new Vector3();
      const toPlayer = chest.clone().sub(onAxis).projectOnPlane(tube.axis).normalize();
      stats.hint.push(deg(truePalm.angleTo(hintPalm)));
      stats.tube.push(deg(truePalm.clone().projectOnPlane(tube.axis).angleTo(toTube)));
      stats.hintTube.push(deg(hintPalm.clone().projectOnPlane(tube.axis).angleTo(toTube)));
      stats.along.push(thumbDir.dot(upTube) * 100);
      stats.toward.push(thumbDir.dot(toPlayer) * 100);
      const forward = new Vector3(0, 0, -1).applyQuaternion(posed.frames[boneIndex('chest')]?.rotation ?? new Quaternion());
      stats.front.push(truePalm.dot(forward));
      const tipOnAxis = tube.start.clone().addScaledVector(tube.axis, thumbTip.clone().sub(tube.start).dot(tube.axis));
      stats.behind.push(thumbTip.clone().sub(tipOnAxis).dot(toPlayer) * 100);
      stats.hintFront.push(hintPalm.dot(forward));
      const fingerDir = new Vector3()
        .subVectors(posed.frames[fingers]?.position ?? new Vector3(), posed.frames[hand]?.position ?? new Vector3())
        .normalize();
      const chiralThumb =
        side === 'L'
          ? new Vector3().crossVectors(hintPalm, fingerDir)
          : new Vector3().crossVectors(fingerDir, hintPalm);
      stats.chiral.push(chiralThumb.dot(upTube));
    }
    const med = (v: number[]): number => v.toSorted((a, b) => a - b)[Math.floor(v.length / 2)] ?? NaN;
    rows.push(
      `| ${role} | ${side} | ${hasThumb ? `cut ${usedCut}, ${thumbPart.length / 3} tris, off ${thumbLateral.toFixed(2)}` : 'no separate digit'} | ${hasThumb ? med(stats.hint).toFixed(0) : '-'} | ${hasThumb ? med(stats.tube).toFixed(0) : '-'} | ${med(stats.hintTube).toFixed(0)} | ${hasThumb ? fmt(med(stats.along)) : '-'} | ${hasThumb ? fmt(med(stats.toward)) : '-'} | ${hasThumb ? fmt(med(stats.front)) : '-'} | ${hasThumb ? fmt(med(stats.behind)) : '-'} | ${fmt(med(stats.hintFront))} | ${fmt(med(stats.chiral))} |`,
    );
  }
}
console.log('Medians over play samples. Angles in degrees, thumb moves in cm.');
console.log('| Role | Paw | Thumb in the bind mesh | True palm to hint palm | True palm to tube | Hint palm to tube | Thumb tip along the tube (+ to the mouthpiece) | Thumb tip toward the player (+) | True palm to the front (+1 faces the audience) | Thumb tip behind the tube axis (+ toward the player) | Hint palm to the front | Chirality thumb along the tube (+1 to the mouthpiece) |');
console.log('|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const r of rows) {
  console.log(r);
}

/**
 * Gives the rotation that best maps the centered bind points onto the centered posed points.
 *
 * @param h The cross covariance, row major: sum of bind_i * posed_j.
 * @returns The rotation.
 */
function kabsch(h: number[]): Quaternion {
  // Polar decomposition by iteration: R = H^T (H H^T)^(-1/2), with H^T the map bind -> posed.
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
  const m4 = new Matrix4().setFromMatrix3(r);
  return new Quaternion().setFromRotationMatrix(m4);
}

/**
 * Gives the posed tube of a paw: its own tube of the instrument, else the woodwind tube.
 *
 * @param posed The posed skeleton.
 * @param id The instrument.
 * @param side The side of the paw.
 * @returns The start and the unit axis.
 */
function tubeOf(posed: PosedSkeleton, id: string, side: 'L' | 'R'): { start: Vector3; axis: Vector3 } {
  const bone = side === 'L' ? 'malletL' : 'malletR';
  const head = posed.model.instrument.targets.find((t) => t.kind === 'mallet-head' && t.bone === bone);
  const start = new Vector3(...posedPiecePoint(posed, { bone, at: [-0.04, 0, 0] }));
  const end = new Vector3(...posedPiecePoint(posed, { bone, at: head ? head.from : [0.3, 0, 0] }));
  void id;
  return { start, axis: end.sub(start).normalize() };
}
