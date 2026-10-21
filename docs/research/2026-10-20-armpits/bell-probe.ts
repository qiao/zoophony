/**
 * The copy of the probe of round `armpits`. Run it from the root of the tree. The option `--glb`
 * runs a copy in `tools/` of a temporary tree, so it needs the imports of `scratch/`: copy the file
 * to `scratch/` and set the imports to `../tools/` and `../src/` first.
 *
 * Measures the right paw and the right forearm of the hornist against the bell of the horn. The
 * bell is a solid of revolution (`bell()` and `openBell()` of `src/models/instruments/brass.ts`):
 * the outer flare F(t) and the inner lining L(t), at the depth t behind the plane of the opening.
 * The hollow of the bell is r < min(F, L) for 0 < t, and the metal is the band from min(F, L) to
 * max(F, L). Each point of a part is a vertex or a point at each 1 cm of an edge of the part.
 *
 * - "out": the largest r - min(F, L) of a paw point with 0 < t < depth of the bell: a paw point
 *   past the wall of the hollow, in the metal or outside the bell.
 * - "metal": the largest distance of a point inside the band to the nearer side of the band.
 * - "palm": the distance of the middle of the right palm from the axis, and its depth t.
 *
 * Usage: node scratch/bell-probe.ts [--demo <id>]... [--step <s>] [--set <changes>] [--glb <file>]
 */
import { cpSync } from 'node:fs';
import { join } from 'node:path';

import { Quaternion, Vector3 } from 'three';

import { FOLD_ROLES, roleAnimal, roleBodies } from '../../../tools/fold-probe.ts';
import { runTool, takeGlb, withGlbBody } from '../../../tools/glb-swap.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { BRASS } from '../../../src/models/instruments/brass.ts';
import { placePoint } from '../../../src/models/instruments/hold.ts';
import { BONE_NAMES } from '../../../src/models/rig.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import type { Vec3 } from '../../../src/models/tuples.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { posePoint } from '../../../src/pose/frames.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED, PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import type { Transport } from '../../../src/pose/types.ts';

const { glb, rest: args } = takeGlb(process.argv.slice(2));
const role = FOLD_ROLES.get('hornist');
if (!role) throw new Error('no hornist');
if (glb) {
  process.exitCode = await withGlbBody(roleAnimal(role), glb, (dir) => {
    cpSync(import.meta.filename, join(dir, 'tools', 'bell-probe.ts'));
    return runTool(dir, 'bell-probe.ts', args);
  });
} else {
  await main();
}

function profileAt(points: readonly (readonly [number, number])[], t: number): number {
  return (process.env.FACET ? Math.cos(Math.PI / 12) : 1) * profileRaw(points, t);
}
function profileRaw(points: readonly (readonly [number, number])[], t: number): number {
  // points: [t, r] with t rising.
  for (let i = 0; i + 1 < points.length; i++) {
    const [t0, r0] = points[i] ?? [0, 0];
    const [t1, r1] = points[i + 1] ?? [0, 0];
    if (t >= t0 && t <= t1) return r0 + ((t - t0) / (t1 - t0 || 1)) * (r1 - r0);
  }
  return 0;
}

async function main(): Promise<void> {
  const setAt = args.indexOf('--set');
  if (setAt >= 0) setHolds(args[setAt + 1] ?? '');
  const stepAt = args.indexOf('--step');
  const step = stepAt >= 0 ? Number(args[stepAt + 1]) : 0.25;
  const chosen = args.flatMap((a, i) =>
    args[i - 1] === '--demo' ? [a.endsWith('.mid') ? a : `${a}.mid`] : [],
  );
  const all = await patchedDemos();
  const demos = chosen.length > 0 ? all.filter((d) => chosen.includes(d.file)) : all;
  const R = BRASS.horn.bellRadius;
  const D = 0.2;
  // The flare, from the opening (t = 0) back to the throat (t = D).
  const flare: [number, number][] = [
    [0, R],
    [0.1 * D, 0.7 * R],
    [0.4 * D, 0.35 * R],
    [D, 0.18 * R],
  ];
  // The lining, from the rim back to its point on the axis.
  const lining: [number, number][] = [
    [0, R],
    [0.06 * R, 0.9 * R],
    [0.6 * R, 0.45 * R],
    [0.8 * R, 0],
  ];
  type Worst = { v: number; label: string };
  const worst: Record<string, Worst> = {};
  const over: Record<string, number> = {};
  let samples = 0;
  const note = (key: string, v: number, label: string): void => {
    if (v > (worst[key]?.v ?? -Infinity)) worst[key] = { v, label };
  };
  const palms: number[][] = [];
  const inShare: number[] = [];
  const toShoulder: number[][] = [];
  const toElbow: number[][] = [];
  const cAxis: number[][] = [];
  const cElbow: number[][] = [];
  const cShoulder: number[][] = [];
  const cPalm: number[][] = [];
  const angles: number[] = [];
  const fores: number[][] = [];
  const seen = new Set<string>();
  const counted: Record<string, number> = {};
  const setCount: Record<string, number> = {};
  for (const demo of demos) {
    const scene = sceneOf(demo.bytes);
    const bodies = roleBodies(role, scene);
    if (bodies.length === 0) continue;
    const audible = allAudible(scene.score);
    const buffer = createScenePose(scene.plan);
    const start = -countInAt(scene.plan.beats, 0).lengthSec;
    const list: [string, number, number, Transport, string][] = [['rest', start, 10, NOT_STARTED, 'rest']];
    for (let song = start; song <= scene.score.durationSec; song += step) {
      list.push(['play', song, 10 + song - start, PLAYING, `${song.toFixed(2)} s`]);
    }
    const lift: Transport = { ...PLAYING, changedAtWall: 10 };
    for (let wall = 10; wall < 13; wall += 0.1) {
      list.push(['lift', Math.min(0, start + wall - 10), wall, lift, `wall ${(wall - 10).toFixed(1)} s`]);
    }
    for (const { index, model } of bodies) {
      const rig = model.studio;
      if (!rig || index === null) continue;
      const mesh = rig.mesh;
      const mainOf = (v: number): string => {
        let best = -1;
        let bw = -1;
        for (let k = 0; k < 4; k++) {
          const w = mesh.weights[v * 4 + k] ?? 0;
          if (w > bw) {
            bw = w;
            best = mesh.joints[v * 4 + k] ?? 0;
          }
        }
        return STUDIO_BONES[best] ?? '';
      };
      const count = mesh.positions.length / 3;
      const partOf = new Map<number, 'paw' | 'forearm'>();
      for (let v = 0; v < count; v++) {
        const b = mainOf(v);
        if (b === 'hand_R' || b === 'fingers_R') partOf.set(v, 'paw');
        if (b === 'forearm_R' || b === 'forearm_twist_R') partOf.set(v, 'forearm');
      }
      const edges = new Map<string, [number, number, 'paw' | 'forearm']>();
      for (let f = 0; f < mesh.corners.length / 3; f++) {
        const vs = [0, 1, 2].map((k) => mesh.corners[f * 3 + k] ?? 0);
        for (let k = 0; k < 3; k++) {
          const a = vs[k] ?? 0;
          const b = vs[(k + 1) % 3] ?? 0;
          const pa = partOf.get(a);
          const pb = partOf.get(b);
          if (pa && pb) edges.set(a < b ? `${a} ${b}` : `${b} ${a}`, [a, b, pa === 'paw' || pb === 'paw' ? 'paw' : 'forearm']);
        }
      }
      // The bell in the bind axes of the model.
      const target = model.instrument.targets.find((t) => t.kind === 'bell');
      if (!target) throw new Error('no bell');
      const mouthBind = placePoint(model.pieces, { bone: target.bone, at: target.from });
      const tip = placePoint(model.pieces, {
        bone: target.bone,
        at: [target.from[0] + target.normal[0], target.from[1] + target.normal[1], target.from[2] + target.normal[2]],
      });
      const palmBind = placePoint(model.pieces, model.instrument.grips.palmR ?? { bone: 'instrument', at: [0, 0, 0] });
      const ib = BONE_NAMES.indexOf('instrument');
      for (const [set, song, wall, transport, label] of list) {
        const frame = poseAt(scene.plan, song, wall, transport, audible, buffer);
        const pose = frame.players[index];
        if (!pose) continue;
        samples += 1;
        const posed = poseSkeleton(model, pose);
        const f = posed.frames[ib];
        const bindPos = model.skeleton.positions[ib] ?? [0, 0, 0];
        if (!f) continue;
        const mouth = posePoint(f, bindPos, mouthBind, new Vector3());
        const axis = posePoint(f, bindPos, tip, new Vector3()).sub(mouth).normalize();
        const palm = posePoint(f, bindPos, palmBind, new Vector3());
        const tag = `${demo.file} ${set} ${label}`;
        const measure = (p: Vector3, part: string): void => {
          const d = new Vector3().subVectors(p, mouth);
          const t = -d.dot(axis);
          if (t <= 0 || t >= D) return;
          const r = d.addScaledVector(axis, t).length();
          const fl = profileAt(flare, t);
          const li = profileAt(lining, t);
          const hollow = Math.min(fl, li);
          const outer = Math.max(fl, li);
          if (part === 'paw') note(`${set} paw out`, r - hollow, tag);
          if (r > hollow && r < outer) note(`${set} ${part} metal`, Math.min(r - hollow, outer - r), tag);
          else note(`${set} ${part} metal`, 0, tag);
        };
        const pts = new Map<number, Vector3>();
        for (const v of partOf.keys()) pts.set(v, new Vector3(...posedCorner(posed, v)));
        const before = { ...worst };
        for (const [v, part] of partOf) measure(pts.get(v) ?? new Vector3(), part);
        {
          let inn = 0;
          let tot = 0;
          for (const [v, part] of partOf) {
            if (part !== 'paw') continue;
            const q = pts.get(v);
            if (!q) continue;
            tot++;
            const d = new Vector3().subVectors(q, mouth);
            const t = -d.dot(axis);
            const r = d.addScaledVector(axis, t).length();
            if (t > 0 && t < D && r < Math.min(profileAt(flare, t), profileAt(lining, t))) inn++;
          }
          if (set === 'play') inShare.push(inn / (tot || 1));
        }
        if (process.env.DEBUG && label === process.env.DEBUG) {
          for (const [v, part] of partOf) {
            const p = pts.get(v) ?? new Vector3();
            const d = new Vector3().subVectors(p, mouth);
            const t = -d.dot(axis);
            const r = d.addScaledVector(axis, t).length();
            console.log(part, v, (t * 100).toFixed(1), (r * 100).toFixed(1), (profileAt(flare, t) * 100).toFixed(1), (profileAt(lining, t) * 100).toFixed(1));
          }
        }
        for (const [a, b, part] of edges.values()) {
          const pa = pts.get(a);
          const pb = pts.get(b);
          if (!pa || !pb) continue;
          const n = Math.ceil(pa.distanceTo(pb) / 0.005);
          for (let i = 1; i < n; i++) measure(new Vector3().lerpVectors(pa, pb, i / n), part);
          // A crossing of the wall of the hollow: from a point in the hollow to a point past its
          // wall, both behind the plane of the opening. The depth is the largest r - hollow of the
          // points of the edge past the wall.
          let inside = false;
          let crossed = false;
          let depth = 0;
          for (let i = 0; i <= n; i++) {
            const q = new Vector3().lerpVectors(pa, pb, i / n);
            const d = new Vector3().subVectors(q, mouth);
            const t = -d.dot(axis);
            const r = d.addScaledVector(axis, t).length();
            if (t <= 0 || t >= D) {
              inside = false;
              continue;
            }
            const hollow = Math.min(profileAt(flare, t), profileAt(lining, t));
            if (r < hollow) {
              inside = true;
            } else if (inside) {
              crossed = true;
              depth = Math.max(depth, r - hollow);
            }
          }
          // The same walk from b to a.
          inside = false;
          for (let i = n; i >= 0; i--) {
            const q = new Vector3().lerpVectors(pa, pb, i / n);
            const d = new Vector3().subVectors(q, mouth);
            const t = -d.dot(axis);
            const r = d.addScaledVector(axis, t).length();
            if (t <= 0 || t >= D) {
              inside = false;
              continue;
            }
            const hollow = Math.min(profileAt(flare, t), profileAt(lining, t));
            if (r < hollow) {
              inside = true;
            } else if (inside) {
              crossed = true;
              depth = Math.max(depth, r - hollow);
            }
          }
          if (crossed) {
            note(`${set} ${part} through`, depth, tag);
            over[`${set} ${part}`] = (over[`${set} ${part}`] ?? 0) + 1;
            seen.add(`${set} ${part}`);
          } else {
            note(`${set} ${part} through`, 0, tag);
          }
        }
        void before;
        for (const k of seen) counted[k] = (counted[k] ?? 0) + 1;
        seen.clear();
        for (const k of ['paw', 'forearm']) setCount[`${set} ${k}`] = (setCount[`${set} ${k}`] ?? 0) + 1;
        // The middle of the palm: the mean of the paw vertices' grip point is the hold target;
        // report the place of the grip point of the hold against the axis.
        {
          const pm = new Vector3();
          const fm = new Vector3();
          let np = 0;
          let nf = 0;
          for (const [v, part] of partOf) {
            const q = pts.get(v);
            if (!q) continue;
            if (part === 'paw') {
              pm.add(q);
              np++;
            } else {
              fm.add(q);
              nf++;
            }
          }
          pm.divideScalar(np || 1);
          fm.divideScalar(nf || 1);
          const dir = pm.clone().sub(fm).normalize();
          angles.push((dir.angleTo(axis.clone().negate()) * 180) / Math.PI);
          const d = new Vector3().subVectors(fm, mouth);
          const t = -d.dot(axis);
          fores.push([t, d.addScaledVector(axis, t).length()]);
        }
        {
          const inv = f.rotation.clone().multiply(new Quaternion(...(model.pieces.find((q) => q.piece.bone === 'instrument')?.at.rotation ?? [0, 0, 0, 1]))).invert();
          const sh = posed.frames[BONE_NAMES.indexOf('upperArmR' as never)]?.position;
          const el = posed.frames[BONE_NAMES.indexOf('forearmR' as never)]?.position;
          const ch = posed.frames[BONE_NAMES.indexOf('chest' as never)]?.rotation.clone().invert();
          if (sh && el && ch) {
            cAxis.push(axis.clone().applyQuaternion(ch).toArray());
            cElbow.push(el.clone().sub(palm).normalize().applyQuaternion(ch).toArray());
            cShoulder.push(sh.clone().sub(palm).normalize().applyQuaternion(ch).toArray());
            cPalm.push(palm.clone().sub(sh).applyQuaternion(ch).toArray());
          }
          if (sh && el) {
            toShoulder.push(sh.clone().sub(palm).normalize().applyQuaternion(inv).toArray());
            toElbow.push(el.clone().sub(palm).normalize().applyQuaternion(inv).toArray());
          }
        }
        const dp = new Vector3().subVectors(palm, mouth);
        const tp = -dp.dot(axis);
        palms.push([tp, dp.addScaledVector(axis, tp).length()]);
        void Quaternion;
        void (null as unknown as Vec3);
      }
    }
  }
  console.log(`Bell probe of the hornist: ${samples} samples, step ${step} s, ${demos.length} demos.`);
  console.log('| Set | Measure | Worst cm | Worst sample |');
  console.log('|---|---|---:|---|');
  for (const key of Object.keys(worst).toSorted()) {
    const w = worst[key];
    if (!w) continue;
    const [set, ...rest] = key.split(' ');
    console.log(`| ${set} | ${rest.join(' ')} | ${(w.v * 100).toFixed(1)} | ${w.label} |`);
  }
  void over;
  for (const k of Object.keys(setCount).toSorted()) console.log(`samples with a crossing, ${k}: ${counted[k] ?? 0} of ${setCount[k]}`);
  const tps = palms.map((p) => p[0] ?? 0).toSorted((a, b) => a - b);
  const rps = palms.map((p) => p[1] ?? 0).toSorted((a, b) => a - b);
  const mid = (a: number[]): number => a[Math.floor(a.length / 2)] ?? 0;
  console.log(`grip point of the right palm: depth t median ${(mid(tps) * 100).toFixed(1)} cm, from the axis median ${(mid(rps) * 100).toFixed(1)} cm, max ${((rps.at(-1) ?? 0) * 100).toFixed(1)} cm`);
  const an = angles.toSorted((a, b) => a - b);
  console.log(`angle of the forearm to the axis into the bell: median ${mid(an).toFixed(0)} deg, p5 ${(an[Math.floor(an.length * 0.05)] ?? 0).toFixed(0)}, p95 ${(an[Math.floor(an.length * 0.95)] ?? 0).toFixed(0)}`);
  const ft = fores.map((f) => f[0] ?? 0).toSorted((a, b) => a - b);
  const fr = fores.map((f) => f[1] ?? 0).toSorted((a, b) => a - b);
  console.log(`middle of the forearm: depth t median ${(mid(ft) * 100).toFixed(1)} cm, from the axis median ${(mid(fr) * 100).toFixed(1)} cm`);
  const meanDir = (l: number[][]): string => {
    const m = new Vector3();
    for (const d of l) m.add(new Vector3(...d));
    return m.normalize().toArray().map((v) => v.toFixed(3)).join(', ');
  };
  console.log(`from the palm grip, in the axes of the horn piece: to the right shoulder ${meanDir(toShoulder)}, to the right elbow ${meanDir(toElbow)}`);
  console.log(`in the axes of the chest (x right, y up, z back): opening axis ${meanDir(cAxis)}, palm to elbow ${meanDir(cElbow)}, palm to shoulder ${meanDir(cShoulder)}`);
  const m = new Vector3(); for (const d of cPalm) m.add(new Vector3(...d)); m.divideScalar(cPalm.length || 1);
  console.log(`palm from the right shoulder joint, chest axes, m: ${m.toArray().map((v) => v.toFixed(3)).join(', ')}`);
  const sh = inShare.toSorted((a, b) => a - b);
  console.log(`share of the paw vertices inside the hollow of the bell in play: median ${(mid(sh) * 100).toFixed(0)}%, p5 ${((sh[Math.floor(sh.length * 0.05)] ?? 0) * 100).toFixed(0)}%`);
}
