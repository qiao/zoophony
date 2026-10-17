/**
 * Measures the cross-sections of the arms of a studio body: the cut of the skin with the plane
 * across the arm at the middle of the upper arm, at the elbow (the plane of the bisector), and at
 * the middle of the forearm. For each cut, it prints the width seen from the front and the depth
 * seen from the side (standing bind only), the largest and the smallest caliper width, and the
 * area, in head heights H of the body.
 *
 * Usage: node scratch/arm-cuts.ts <root of a tree> [<species>:<instrument>]...
 *   [--demo <file>] [--time <s>] [--json <file>]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Vector3 } from 'three';

type V = Vector3;

const args = process.argv.slice(2);
const root = resolve(args[0] ?? '.');
const opt = (name: string, fallback: string): string => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? fallback) : fallback;
};
const pairs = args.slice(1).filter((a) => a.includes(':') && !a.startsWith('--'));
const demo = opt('--demo', 'boulanger-matin.mid');
const times = opt('--time', '20,40,60,80').split(',').map(Number);
const jsonOut = opt('--json', '');

const player = await import(`${root}/src/models/player.ts`);
const rigMod = await import(`${root}/src/models/rig.ts`);
const fmt = await import(`${root}/src/models/studio-format.ts`);
const kin = await import(`${root}/src/pose/test-kinematics.ts`);
const skin = await import(`${root}/src/pose/test-skin.ts`);
const scn = await import(`${root}/src/pose/test-scene.ts`);
const poseAtMod = await import(`${root}/src/pose/pose-at.ts`);
const countIn = await import(`${root}/src/pose/count-in.ts`);
const srig = await import(`${root}/src/models/studio-rig.ts`);
const pscene = await import(`${root}/src/scene/player.ts`);

/** One cut: the loop of the skin around the arm in the plane. */
interface Cut {
  closed: boolean;
  loops: number;
  points: number;
  front: number;
  side: number;
  major: number;
  minor: number;
  area: number;
}

/**
 * Cuts a mesh with a plane and gives the loop around a point.
 */
function cut(
  pos: (v: number) => V,
  tris: readonly [number, number, number][],
  keep: (t: number) => boolean,
  point: V,
  normal: V,
  depthHint: V,
): Cut | null {
  const n = normal.clone().normalize();
  const v = depthHint.clone().addScaledVector(n, -depthHint.dot(n)).normalize();
  const u = new Vector3().crossVectors(n, v).normalize();
  const segs: [string, string, V, V][] = [];
  for (const [t, tri] of tris.entries()) {
    if (!keep(t)) {
      continue;
    }
    const p = tri.map(pos);
    const d = p.map((q) => q.clone().sub(point).dot(n));
    const hits: [string, V][] = [];
    for (const [a, b] of [
      [0, 1],
      [1, 2],
      [2, 0],
    ] as const) {
      const da = d[a] ?? 0;
      const db = d[b] ?? 0;
      if ((da < 0) !== (db < 0)) {
        const s = da / (da - db);
        const ia = tri[a];
        const ib = tri[b];
        const key = ia < ib ? `${ia}-${ib}` : `${ib}-${ia}`;
        hits.push([key, (p[a] as V).clone().lerp(p[b] as V, s)]);
      }
    }
    if (hits.length === 2) {
      const [h0, h1] = hits as [[string, V], [string, V]];
      segs.push([h0[0], h1[0], h0[1], h1[1]]);
    }
  }
  // Chain the segments into loops by their edge keys.
  const byKey = new Map<string, number[]>();
  for (const [i, s] of segs.entries()) {
    for (const k of [s[0], s[1]]) {
      byKey.set(k, [...(byKey.get(k) ?? []), i]);
    }
  }
  const used = new Set<number>();
  const loops: V[][] = [];
  const closedLoops: boolean[] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used.has(i)) {
      continue;
    }
    used.add(i);
    const s = segs[i] as [string, string, V, V];
    const loop: V[] = [s[2], s[3]];
    let key = s[1];
    for (;;) {
      const next = (byKey.get(key) ?? []).find((j) => !used.has(j));
      if (next === undefined) {
        break;
      }
      used.add(next);
      const t = segs[next] as [string, string, V, V];
      if (t[0] === key) {
        loop.push(t[3]);
        key = t[1];
      } else {
        loop.push(t[2]);
        key = t[0];
      }
    }
    closedLoops.push(key === s[0]);
    loops.push(loop);
  }
  const flat = (loop: V[]): [number, number][] =>
    loop.map((q) => {
      const r = q.clone().sub(point);
      return [r.dot(u), r.dot(v)];
    });
  const inside = (poly: [number, number][]): boolean => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i] as [number, number];
      const [xj, yj] = poly[j] as [number, number];
      if (yi > 0 !== yj > 0 && 0 < ((xj - xi) * (0 - yi)) / (yj - yi) + xi) {
        c = !c;
      }
    }
    return c;
  };
  const polys = loops.map(flat);
  if (polys.length === 0) {
    return null;
  }
  const dist = (poly: [number, number][]): number =>
    Math.min(...poly.map(([x, y]) => Math.hypot(x, y)));
  const area = (poly: [number, number][]): number => {
    let a = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i] as [number, number];
      const [xj, yj] = poly[j] as [number, number];
      a += xj * yi - xi * yj;
    }
    return Math.abs(a) / 2;
  };
  const holding = polys.filter(inside).toSorted((a, b) => area(a) - area(b));
  const poly = holding[0] ?? polys.toSorted((a, b) => dist(a) - dist(b))[0];
  if (!poly) {
    return null;
  }
  const span = (dx: number, dy: number): number => {
    const s = poly.map(([x, y]) => x * dx + y * dy);
    return Math.max(...s) - Math.min(...s);
  };
  const spans = Array.from({ length: 36 }, (_, k) => {
    const a = (k * Math.PI) / 36;
    return span(Math.cos(a), Math.sin(a));
  });
  const which = polys.indexOf(poly);
  return {
    closed: closedLoops[which] ?? false,
    loops: polys.length,
    points: poly.length,
    front: span(1, 0),
    side: span(0, 1),
    major: Math.max(...spans),
    minor: Math.min(...spans),
    area: area(poly),
  };
}

/** The bones of the triangles of each cut, and the radius of the cut around its point. */
const CUT_BONES: Record<string, string[]> = {
  upper: ['upper_arm'],
  elbow: ['upper_arm', 'forearm', 'forearm_twist'],
  fore: ['forearm', 'forearm_twist'],
};

/** Measures the three cuts of each arm of a posed mesh. */
function armCuts(
  pos: (v: number) => V,
  tris: readonly [number, number, number][],
  mainBone: (v: number) => string,
  joints: (side: 'L' | 'R') => [V, V, V],
  depthHint: V,
  radius: number,
): Record<string, Cut | null> {
  const out: Record<string, Cut | null> = {};
  const upperT = Number(process.env['UPPER_T'] ?? 0.6);
  for (const side of ['L', 'R'] as const) {
    const [s, e, w] = joints(side);
    const up = e.clone().sub(s).normalize();
    const fore = w.clone().sub(e).normalize();
    const places: Record<string, [V, V]> = {
      upper: [s.clone().lerp(e, upperT), up],
      elbow: [e, up.clone().add(fore)],
      fore: [e.clone().lerp(w, 0.5), fore],
    };
    if (process.env['PROFILE']) {
      for (const t of [0.6, 0.7, 0.8, 0.9]) {
        places[`u${t}`] = [s.clone().lerp(e, t), up];
      }
      for (const t of [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9]) {
        places[`f${t}`] = [e.clone().lerp(w, t), fore];
      }
    }
    for (const [name, [point, normal]] of Object.entries(places)) {
      const kind = name.startsWith('u') ? 'upper' : name.startsWith('f') ? 'fore' : name;
      const names = new Set((CUT_BONES[kind] ?? []).map((b) => `${b}_${side}`));
      const keep = (t: number): boolean => {
        const tri = tris[t] as [number, number, number];
        if (!tri.some((v) => names.has(mainBone(v)))) {
          return false;
        }
        const c = pos(tri[0]).add(pos(tri[1])).add(pos(tri[2])).multiplyScalar(1 / 3);
        return c.distanceTo(point) < radius;
      };
      out[`${name} ${side}`] = cut(pos, tris, keep, point, normal, depthHint);
    }
  }
  return out;
}

const results: Record<string, unknown> = {};
for (const pair of pairs.length ? pairs : ['cat:viola']) {
  const [species, instrument] = pair.split(':') as [string, string];
  // The standing bind.
  const stand = player.buildPlayer(species, instrument, 4, 'stand');
  const rig = stand.studio;
  const H: number = stand.body.headHeight;
  const mesh = rig.mesh;
  const vcount = mesh.positions.length / 3;
  const mainOf = (m: typeof mesh): ((v: number) => string) => {
    return (v: number): string => {
      let best = 0;
      let bone = 0;
      for (let k = 0; k < 4; k++) {
        const w = m.weights[v * 4 + k] ?? 0;
        if (w > best) {
          best = w;
          bone = m.joints[v * 4 + k] ?? 0;
        }
      }
      return fmt.STUDIO_BONES[bone];
    };
  };
  const trisOf = (m: typeof mesh): [number, number, number][] => {
    const t: [number, number, number][] = [];
    for (let c = 0; c + 2 < m.corners.length; c += 3) {
      t.push([m.corners[c], m.corners[c + 1], m.corners[c + 2]]);
    }
    return t;
  };
  const tris = trisOf(mesh);
  const bindPos = (v: number): V =>
    new Vector3(mesh.positions[v * 3], mesh.positions[v * 3 + 1], mesh.positions[v * 3 + 2]);
  const h = rig.body.heads;
  const head = (b: string): V => new Vector3(...(h[b] as [number, number, number]));
  const standing = armCuts(
    bindPos,
    tris,
    mainOf(mesh),
    (side) => [head(`upper_arm_${side}`), head(`forearm_${side}`), head(`hand_${side}`)],
    new Vector3(0, 0, 1),
    0.6 * H,
  );

  // The play: the first seated player of the species in the demo.
  const scene = await scn.demoSceneOf(demo);
  const index = scene.layout.players.findIndex(
    (p: { cast: { species: string; instrument: string; support: string } }) =>
      p.cast.species === species && p.cast.instrument === instrument && p.cast.support !== 'stand',
  );
  const plays: Record<string, Cut | null>[] = [];
  if (index >= 0) {
    const place = scene.layout.players[index];
    const model = scene.models.get(species, instrument, place.cast.kettles, place.cast.support);
    const audible = scn.allAudible(scene.score);
    const buffer = poseAtMod.createScenePose(scene.plan);
    const start = -countIn.countInAt(scene.plan.beats, 0).lengthSec;
    const pm = model.studio.mesh;
    for (const time of times) {
      const frame = poseAtMod.poseAt(scene.plan, time, 10 + time - start, scn.PLAYING, audible, buffer);
      const pose = frame.players[index];
      const studio = model.studio;
      const sp = srig.poseStudioBones(
        studio,
        model.skeleton,
        pose.rotations,
        srig.studioOffsets(pose),
        Math.max(pscene.CLOSED_EYE_SCALE, 1 - pose.blink),
        srig.createStudioPose(),
      );
      if (process.env['NO_SHAPES']) {
        sp.correctives.fill(0);
      }
      const vpos: Float32Array = srig.skinStudioMesh(studio.mesh, sp);
      const at = (v: number): V => new Vector3(vpos[v * 3], vpos[v * 3 + 1], vpos[v * 3 + 2]);
      const sh = studio.body.heads;
      const jp = (name: string): V => {
        const b = fmt.STUDIO_BONES.indexOf(name);
        const m = sp.matrices;
        const [x, y, z] = sh[name] as [number, number, number];
        return new Vector3(
          m[b * 16] * x + m[b * 16 + 4] * y + m[b * 16 + 8] * z + m[b * 16 + 12],
          m[b * 16 + 1] * x + m[b * 16 + 5] * y + m[b * 16 + 9] * z + m[b * 16 + 13],
          m[b * 16 + 2] * x + m[b * 16 + 6] * y + m[b * 16 + 10] * z + m[b * 16 + 14],
        );
      };
      void kin;
      void skin;
      void rigMod;
      plays.push(
        armCuts(
          at,
          trisOf(pm),
          mainOf(pm),
          (side) => [jp(`upper_arm_${side}`), jp(`forearm_${side}`), jp(`hand_${side}`)],
          new Vector3(0, 0, 1),
          0.6 * H,
        ),
      );
    }
  }
  const f = (x: number | undefined): string => (x === undefined ? '-' : (x / H).toFixed(3));
  const lines: string[] = [];
  lines.push(`${species} (${instrument}) at ${root}: H ${(H * 100).toFixed(1)} cm, ${vcount} vertices, ${tris.length} triangles`);
  lines.push('| Cut | Stand front | Stand side | Stand major | Stand minor | Stand area H² | Play major (median) | Play minor | Play area H² |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  const med = (xs: number[]): number | undefined => {
    const s = xs.toSorted((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : undefined;
  };
  const row: Record<string, unknown> = {};
  for (const key of Object.keys(standing)) {
    const s = standing[key];
    const p = plays.map((x) => x[key]).filter((x): x is Cut => !!x);
    const pmaj = med(p.map((x) => x.major));
    const pmin = med(p.map((x) => x.minor));
    const parea = med(p.map((x) => x.area));
    lines.push(
      `| ${key} | ${f(s?.front)} | ${f(s?.side)} | ${f(s?.major)} | ${f(s?.minor)} | ${s ? (s.area / H / H).toFixed(4) : '-'} | ${f(pmaj)} | ${f(pmin)} | ${parea === undefined ? '-' : (parea / H / H).toFixed(4)} |`,
    );
    row[key] = {
      stand: s && { front: s.front / H, side: s.side / H, major: s.major / H, minor: s.minor / H, area: s.area / H / H },
      play: { major: (pmaj ?? NaN) / H, minor: (pmin ?? NaN) / H, area: (parea ?? NaN) / H / H },
    };
  }
  if (process.env['DEBUG']) {
    for (const key of Object.keys(standing)) {
      const s = standing[key];
      const p0 = plays[0]?.[key];
      lines.push(`debug ${key} plays: ` + plays.map((x) => { const c = x[key]; return c ? `${(c.major / H).toFixed(3)}/${(c.minor / H).toFixed(3)}/${(c.area / H / H).toFixed(4)}${c.closed ? '' : ' open'}` : '-'; }).join(', '));
      lines.push(`debug ${key}: stand closed ${s?.closed} loops ${s?.loops} points ${s?.points}; play0 closed ${p0?.closed} loops ${p0?.loops} points ${p0?.points}`);
    }
  }
  console.log(lines.join('\n'));
  results[species] = { H, cuts: row };
}
if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify(results, null, 1));
}
