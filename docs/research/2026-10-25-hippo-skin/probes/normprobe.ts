/**
 * Probes the shading of the posed studio skin of a role: for each face, the largest angle between
 * a skinned corner normal (the app normal of the bind, moved by the blend of its bone matrices)
 * and the flat normal of the posed face. A large angle shades the face from a normal that its
 * surface does not have.
 * Usage: node docs/research/2026-10-25-hippo-skin/probes/normprobe.ts <role> <demo> <label>... [-- <face>...]
 * A label is the time of a play sample, as `21.09`, or `rest`. With faces, it prints them; else
 * the 25 faces with the largest angle near the arms.
 */
import { FOLD_ROLES, probeFolds } from '../../../../tools/fold-probe.ts';
import { patchedDemo } from '../../../../tools/patch-demos.ts';
import { studioNormals } from '../../../../src/models/studio-normals.ts';

const argv = process.argv.slice(2);
const dash = argv.indexOf('--');
const [roleName, demo, ...labels] = dash < 0 ? argv : argv.slice(0, dash);
const named = dash < 0 ? [] : argv.slice(dash + 1).map(Number);
const role = FOLD_ROLES.get(roleName!)!;
const steps = labels.filter((l) => l !== 'rest').map(Number);
const noRim = process.env.NO_RIM === '1';

probeFolds(
  role,
  [await patchedDemo(`${demo}.mid`)],
  Number(process.env.STEP ?? '0.25'),
  (rig, studio, posed, _f, set, label) => {
    const time = Number(label.split(' ').at(-2));
    const want =
      set === 'rest' ? labels.includes('rest') : steps.some((t) => Math.abs(t - time) < 0.004);
    if (!want) {
      return;
    }
    const { mesh, body } = rig;
    const normals = studioNormals(mesh, body.crease, body.caps, noRim ? [] : body.rim);
    const m = process.env.BIND ? new Float32Array(studio.matrices.length).map((_, i) => (i % 16 === 0 || i % 16 === 5 || i % 16 === 10 || i % 16 === 15 ? 1 : 0)) : studio.matrices;
    if (process.env.BIND) { posed = mesh.positions as Float32Array; }
    const faces = mesh.corners.length / 3;
    const rows: [number, number, string][] = [];
    for (let f = 0; f < faces; f++) {
      const c = [0, 1, 2].map((k) => mesh.corners[f * 3 + k] ?? 0);
      const p = c.map((v) => [0, 1, 2].map((k) => posed[v * 3 + k] ?? 0));
      const [a, b, d] = p as [number[], number[], number[]];
      const u = [0, 1, 2].map((k) => (b[k] ?? 0) - (a[k] ?? 0));
      const w = [0, 1, 2].map((k) => (d[k] ?? 0) - (a[k] ?? 0));
      const n = [
        (u[1] ?? 0) * (w[2] ?? 0) - (u[2] ?? 0) * (w[1] ?? 0),
        (u[2] ?? 0) * (w[0] ?? 0) - (u[0] ?? 0) * (w[2] ?? 0),
        (u[0] ?? 0) * (w[1] ?? 0) - (u[1] ?? 0) * (w[0] ?? 0),
      ];
      const nl = Math.hypot(...n) || 1;
      let worst = 0;
      const parts: string[] = [];
      for (let k = 0; k < 3; k++) {
        const v = c[k] ?? 0;
        const cn = [0, 1, 2].map((i) => normals[(f * 3 + k) * 3 + i] ?? 0);
        const s = [0, 0, 0];
        for (let j = 0; j < 4; j++) {
          const wt = mesh.weights[v * 4 + j] ?? 0;
          const bb = (mesh.joints[v * 4 + j] ?? 0) * 16;
          for (let i = 0; i < 3; i++) {
            s[i]! +=
              wt *
              ((m[bb + i] ?? 0) * (cn[0] ?? 0) +
                (m[bb + 4 + i] ?? 0) * (cn[1] ?? 0) +
                (m[bb + 8 + i] ?? 0) * (cn[2] ?? 0));
          }
        }
        const sl = Math.hypot(...s) || 1;
        const dot = (s[0]! * n[0]! + s[1]! * n[1]! + s[2]! * n[2]!) / sl / nl;
        const ang = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
        worst = Math.max(worst, ang);
        parts.push(`v${v} ${ang.toFixed(0)}° n(${s.map((x) => (x / sl).toFixed(2)).join(',')})`);
      }
      const mid = [0, 1, 2].map((i) => (((a[i] ?? 0) + (b[i] ?? 0) + (d[i] ?? 0)) / 3).toFixed(3));
      rows.push([
        f,
        worst,
        `face ${f} ${worst.toFixed(0)}° flat(${n.map((x) => (x / nl).toFixed(2)).join(',')}) mid(${mid.join(',')}) ${parts.join(' | ')}`,
      ]);
    }
    console.log(`${set} ${label}${noRim ? ' (no rim)' : ''}`);
    const show = named.length
      ? rows.filter(([f]) => named.includes(f))
      : rows.toSorted((x, y) => y[1] - x[1]).slice(0, 25);
    for (const [, , text] of show) {
      console.log(`  ${text}`);
    }
  },
  labels.includes('rest') ? ['rest', 'play'] : ['play'],
);
