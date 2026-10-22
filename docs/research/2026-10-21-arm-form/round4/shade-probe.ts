// The probe of round arm-form-4: in each sample of a set, the area of the faces near the right
// arm that face the right side (+x) with a shading normal down (y < -0.3), from the smooth
// normals of the app with the morph normals of the shapes, skinned. Copy it into tools/ and run
// `node tools/shade-probe.ts violinist play[,rest] [--glb <file>]`.
import { Vector3 } from 'three';

import { FOLD_ROLES, probeFolds, roleAnimal } from './fold-probe.ts';
import { runTool, takeGlb, withGlbBody } from './glb-swap.ts';
import { probeDemos } from './probe-demos.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';
import { studioNormals } from '../src/models/studio-normals.ts';
import { UPPER_TWIST_BONES } from '../src/models/studio-rig.ts';
import type { StudioRig } from '../src/models/studio-rig.ts';

const { glb, rest } = takeGlb(process.argv.slice(2));
const role = rest[0] ?? 'violinist';
const sets = (rest[1] ?? 'play,rest').split(',') as ('play' | 'rest')[];
const source = FOLD_ROLES.get(role);
if (!source) throw new Error('role');
if (glb) {
  process.exitCode = await withGlbBody(roleAnimal(source), glb, (dir) =>
    runTool(dir, 'shade-probe.ts', rest),
  );
} else {
  const demos = await probeDemos();
  const arm = new Set([
    STUDIO_BONES.indexOf('upper_arm_R'),
    UPPER_TWIST_BONES.R,
    STUDIO_BONES.indexOf('clavicle_R'),
  ]);
  let cache: {
    faces: number[];
    n0: Float32Array;
    moves: Float32Array[];
    caps: Set<number>;
    rim: Set<number>;
  } | null = null;
  const setup = (rig: StudioRig): NonNullable<typeof cache> => {
    const { mesh, body } = rig;
    const caps = body.caps ?? [];
    const rim = body.rim ?? [];
    const n0 = studioNormals(mesh, body.crease, caps, rim);
    const moves = mesh.correctives.map((c) => {
      const after = studioNormals(
        { ...mesh, positions: mesh.positions.map((p, i) => p + (c[i] ?? 0)) },
        body.crease,
        caps,
        rim,
      );
      return after.map((x, i) => x - (n0[i] ?? 0));
    });
    const faces: number[] = [];
    for (let f = 0; f < mesh.corners.length / 3; f++) {
      const near = [0, 1, 2].some((k) => {
        const v = mesh.corners[f * 3 + k] ?? 0;
        let w = 0;
        for (let j = 0; j < 4; j++)
          if (arm.has(mesh.joints[v * 4 + j] ?? 255)) w += mesh.weights[v * 4 + j] ?? 0;
        return w >= 0.05;
      });
      if (near) faces.push(f);
    }
    return { faces, n0, moves, caps: new Set(caps), rim: new Set(rim) };
  };
  for (const set of sets) {
    const shares: number[] = [];
    const count = new Map<number, number>();
    let samples = 0;
    probeFolds(
      source,
      demos,
      1,
      (rig, studio, posed) => {
        cache ??= setup(rig);
        const { mesh } = rig;
        const m = studio.matrices;
        let all = 0;
        let bad = 0;
        samples += 1;
        for (const f of cache.faces) {
          const p = [0, 1, 2].map((k) =>
            new Vector3().fromArray(posed, (mesh.corners[f * 3 + k] ?? 0) * 3),
          );
          const g = new Vector3().crossVectors(p[1]!.clone().sub(p[0]!), p[2]!.clone().sub(p[0]!));
          const area = g.length() / 2;
          g.normalize();
          const s = new Vector3();
          for (let k = 0; k < 3; k++) {
            const c = f * 3 + k;
            const v = mesh.corners[c] ?? 0;
            const n = new Vector3(
              cache.n0[c * 3] ?? 0,
              cache.n0[c * 3 + 1] ?? 0,
              cache.n0[c * 3 + 2] ?? 0,
            );
            for (const [i, mv] of cache.moves.entries()) {
              const w = studio.correctives[i] ?? 0;
              n.x += w * (mv[c * 3] ?? 0);
              n.y += w * (mv[c * 3 + 1] ?? 0);
              n.z += w * (mv[c * 3 + 2] ?? 0);
            }
            const q = new Vector3();
            for (let j = 0; j < 4; j++) {
              const w = mesh.weights[v * 4 + j] ?? 0;
              const b = (mesh.joints[v * 4 + j] ?? 0) * 16;
              q.x += w * ((m[b] ?? 0) * n.x + (m[b + 4] ?? 0) * n.y + (m[b + 8] ?? 0) * n.z);
              q.y += w * ((m[b + 1] ?? 0) * n.x + (m[b + 5] ?? 0) * n.y + (m[b + 9] ?? 0) * n.z);
              q.z += w * ((m[b + 2] ?? 0) * n.x + (m[b + 6] ?? 0) * n.y + (m[b + 10] ?? 0) * n.z);
            }
            s.add(q.normalize());
          }
          s.normalize();
          all += area;
          if (g.x > 0.1 && s.y < -0.3) {
            bad += area;
            count.set(f, (count.get(f) ?? 0) + area);
          }
        }
        shares.push(bad / all);
      },
      [set],
    );
    shares.sort((a, b) => a - b);
    const top = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    console.log(
      `${set}: ${samples} samples, ${cache ? (cache as { faces: number[] }).faces.length : 0} faces near the right arm. Area that faces the right side and has a shading normal down (y < -0.3): p50 ${(100 * (shares[Math.floor(shares.length / 2)] ?? 0)).toFixed(2)}%, p95 ${(100 * (shares[Math.floor(shares.length * 0.95)] ?? 0)).toFixed(2)}%`,
    );
    const c = cache as NonNullable<typeof cache> | null;
    console.log(
      '  faces (samples):',
      top
        .map(
          ([f, n]) =>
            `${f} (${((1e4 * n) / samples).toFixed(1)} cm2)${c?.caps.has(f) ? ' cap' : ''}${c?.rim.has(f) ? ' rim' : ''}`,
        )
        .join(', '),
    );
  }
}
