/**
 * Measures the left paw of the cat on the neck of the viola at rest and in the moves: the wrap
 * (the share of 36 directions around the neck, square to it, at the place of the paw, in which a
 * ray from the middle of the neck meets the paw within 3.5 cm), the distance of the middle of the
 * paw from the middle of the neck, the skin gap and the gap of the paw corners nearest to the
 * neck, and the deepest paw corner inside the viola.
 * Usage: node scratch/neck-wrap.ts [<demo prefix>] [--set <changes>] [--sets rest,lift,lower]
 */
import { Ray, Vector3 } from 'three';
import type { Triangle } from 'three';
import { SWEEP_ROLES } from '../src/pose/test-sweep-roles.ts';
import { sceneOf, allAudible } from '../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../src/pose/pose-at.ts';
import { poseSkeleton, posedPiecePoint } from '../src/pose/test-kinematics.ts';
import { closeSurface, closedDepth, openLoops, posedPart } from '../src/pose/test-clearance.ts';
import { probeDemos } from '../tools/probe-demos.ts';
import { setHolds } from '../tools/hold-sets.ts';

const args = process.argv.slice(2);
const opt = (n: string, f: string): string => (args.includes(n) ? args[args.indexOf(n) + 1]! : f);
if (args.includes('--set')) setHolds(opt('--set', ''));
const prefix = args[0] && !args[0].startsWith('--') ? args[0] : '';
const wanted = opt('--sets', 'rest,lift,lower').split(',');
const sweep = SWEEP_ROLES['violist'];
const demos = (await probeDemos()).filter((d) => d.file.startsWith(prefix));
const rows: Record<string, number[][]> = {};
const ray = new Ray();
const hit = new Vector3();
for (const demo of demos) {
  const scene = sceneOf(demo.bytes);
  const index = scene.layout.players.findIndex((p) => p.cast.species === 'cat' && p.cast.support === 'chair');
  if (index < 0) continue;
  const { cast } = scene.layout.players[index]!;
  const model = scene.models.get(cast.species, cast.instrument, cast.kettles, cast.support);
  const buffer = createScenePose(scene.plan);
  const audible = allAudible(scene.score);
  for (const set of sweep.sampleSets(scene)) {
    if (!wanted.includes(set.name)) continue;
    for (const [song, wall, transport] of set.samples) {
      const pose = poseAt(scene.plan, song, wall, transport, audible, buffer).players[index]!;
      const posed = poseSkeleton(model, pose);
      const board = model.instrument.targets.find((t) => t.kind === 'fingerboard')!;
      const a = new Vector3(...posedPiecePoint(posed, { bone: board.bone, at: board.from }));
      const b = new Vector3(...posedPiecePoint(posed, { bone: board.bone, at: board.to }));
      const axis = b.clone().sub(a).normalize();
      const paw = posedPart(posed, ['handL', 'fingersL']);
      const corners = paw.triangles.flatMap((t: Triangle) => [t.a, t.b, t.c]);
      const mid = corners.reduce((s, c) => s.add(c), new Vector3()).multiplyScalar(1 / corners.length);
      const along = mid.clone().sub(a).dot(axis);
      // The middle of the neck at the paw: the mean of the hits of 36 rays from the fingerboard
      // line, square to it, on the viola within 5 cm.
      const viola = posedPart(posed, ['instrument']);
      const base = a.clone().addScaledVector(axis, Math.min(Math.max(along, 0.01), a.distanceTo(b) - 0.01));
      const u0 = new Vector3().crossVectors(axis, new Vector3(0, 1, 0)).normalize();
      if (u0.lengthSq() < 0.5) u0.set(1, 0, 0);
      const v0 = new Vector3().crossVectors(axis, u0).normalize();
      const near: Vector3[] = [];
      for (let k = 0; k < 36; k++) {
        const th = (k * Math.PI * 2) / 36;
        ray.set(base, u0.clone().multiplyScalar(Math.cos(th)).addScaledVector(v0, Math.sin(th)));
        for (const t of viola.triangles) {
          if (ray.intersectTriangle(t.a, t.b, t.c, false, hit) && hit.distanceTo(base) < 0.05) {
            near.push(hit.clone());
          }
        }
      }
      if (process.env.DBG) console.log(set.name, song, 'along', along.toFixed(3), 'hits', near.length);
      if (near.length === 0) continue;
      const neck = near.reduce((sum, c) => sum.add(c), new Vector3()).multiplyScalar(1 / near.length);
      const offset = mid.clone().sub(neck);
      const axisDist = offset.sub(axis.clone().multiplyScalar(offset.dot(axis))).length();
      const u = new Vector3().crossVectors(axis, new Vector3(0, 1, 0)).normalize();
      if (u.lengthSq() < 0.5) u.set(1, 0, 0);
      const v = new Vector3().crossVectors(axis, u).normalize();
      let hits = 0;
      for (let k = 0; k < 36; k++) {
        const th = (k * Math.PI * 2) / 36;
        const dir = u.clone().multiplyScalar(Math.cos(th)).addScaledVector(v, Math.sin(th));
        let ok = false;
        for (const off of [-0.01, 0, 0.01]) {
          ray.set(neck.clone().addScaledVector(axis, off), dir);
          for (const t of paw.triangles) {
            if (ray.intersectTriangle(t.a, t.b, t.c, false, hit) && hit.distanceTo(ray.origin) < 0.035) {
              ok = true;
              break;
            }
          }
          if (ok) break;
        }
        if (ok) hits++;
      }
      // The deepest paw corner inside the closed viola, and the smallest gap of the paw skin.
      const shells = (viola.closed?.() ?? [viola]).filter((s) => openLoops(s.triangles) === 0);
      const surface = closeSurface(shells.flatMap((s) => s.triangles), 0);
      const depth = closedDepth(corners, surface).depth;
      let gap = Infinity;
      const p = new Vector3();
      for (const c of corners) for (const t of near.length ? viola.triangles : []) {
        gap = Math.min(gap, t.closestPointToPoint(c, p).distanceTo(c));
      }
      (rows[set.name] ??= []).push([hits / 36, axisDist, gap, depth]);
    }
  }
}
const pct = (xs: number[], q: number): number => { const s = xs.toSorted((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] ?? NaN; };
console.log('| Set | n | wrap p5 / p50 | neck to paw middle p50 / p95 cm | skin gap p50 / p95 cm | paw in viola p50 / p95 cm |');
for (const [name, r] of Object.entries(rows)) {
  const col = (k: number): number[] => r.map((x) => x[k]!);
  console.log(`| ${name} | ${r.length} | ${(pct(col(0), 0.05) * 100).toFixed(0)}% / ${(pct(col(0), 0.5) * 100).toFixed(0)}% | ${(pct(col(1), 0.5) * 100).toFixed(1)} / ${(pct(col(1), 0.95) * 100).toFixed(1)} | ${(pct(col(2), 0.5) * 100).toFixed(1)} / ${(pct(col(2), 0.95) * 100).toFixed(1)} | ${(pct(col(3), 0.5) * 100).toFixed(1)} / ${(pct(col(3), 0.95) * 100).toFixed(1)} |`);
}
