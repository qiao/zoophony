/**
 * Draws the left armpit of the deer harpist from the back (az 180, elevation 20) at the rest and at
 * the first play samples of boulanger-matin, as the posed skin of the fold probe gives it, in three
 * panels: the true face normals, the smooth normals of the app (studioRenderMesh(), moved by the
 * skin matrices of each corner), and the angle between them (white 0°, red 60° or more). The colors
 * of a normal are those of the probe `normals`: (n + 1) / 2 in the axes of the camera. It prints,
 * for the faces of the armpit that the camera sees, the share that faces down, and the angle
 * between the two normals, and the corners of the ten lowest faces of the corner that face down,
 * with their places in the studio body (the saw-tooth of the outline).
 *
 *     node scratch/armpit-normals.ts <out dir> (copy it to scratch/ first) [--step <s>] [--az <deg>] [--el <deg>]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

import { Matrix4, Vector3 } from 'three';

import { STUDIO_BONES } from '../src/models/studio-format.ts';
import { studioRenderMesh } from '../src/models/studio-body.ts';
import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { probeDemos } from '../tools/probe-demos.ts';

const args = process.argv.slice(2);
const out = args[0] ?? 'scratch/armpit';
const opt = (name: string, fallback: string): number =>
  Number(args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const step = opt('--step', '40');
const azDeg = opt('--az', '180');
const elDeg = opt('--el', '20');
mkdirSync(out, { recursive: true });
const role = FOLD_ROLES.get('harpist');
if (!role) {
  throw new Error('no harpist');
}
const demos = (await probeDemos()).filter((d) => d.file.startsWith('boulanger-matin'));
const RES = 220;
/** The half size of the window around the armpit, in meters. */
const HALF = 0.09;

function png(path: string, w: number, h: number, rgb: Uint8Array): void {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  }
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    table.push(c >>> 0);
  }
  const crc = (b: Buffer): number => {
    let c = ~0;
    for (const x of b) c = (table[(c ^ x) & 0xff] ?? 0) ^ (c >>> 8);
    return ~c >>> 0;
  };
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

const lines: string[] = [];
let done = 0;
probeFolds(
  role,
  demos,
  step,
  (rig, studio, posed, _folded, set, label) => {
    if (done >= 3) {
      return;
    }
    done++;
    const { corners, joints, weights } = rig.mesh;
    const nc = corners.length;
    const fake = {
      positions: new Float32Array(nc * 3),
      colors: new Float32Array(nc * 3),
      bones: new Uint8Array(nc),
      blendBones: new Uint8Array(nc),
      blendWeights: new Float32Array(nc),
      finishes: new Uint8Array(nc / 3),
    };
    const render = studioRenderMesh(rig, fake);
    const smooth = render.normals.corners;
    const m = new Matrix4();
    const skinNormal = (v: number, n: Vector3): Vector3 => {
      const sum = new Vector3();
      for (let k = 0; k < 4; k++) {
        const w = weights[v * 4 + k] ?? 0;
        if (w <= 0) continue;
        const j = joints[v * 4 + k] ?? 0;
        m.fromArray(studio.matrices, j * 16);
        sum.addScaledVector(n.clone().transformDirection(m), w);
      }
      return sum.normalize();
    };
    const ar = (azDeg * Math.PI) / 180;
    const er = (elDeg * Math.PI) / 180;
    // The model faces -z and its left side is -x: az 0 looks at the front, az 180 at the back.
    const cdir = new Vector3(
      Math.sin(ar) * Math.cos(er),
      Math.sin(er),
      -Math.cos(ar) * Math.cos(er),
    );
    const right = new Vector3(0, 1, 0).cross(cdir).normalize();
    const up = cdir.clone().cross(right).normalize();
    const shoulder = rig.body.heads.upper_arm_L;
    const arm = STUDIO_BONES.indexOf('upper_arm_L');
    m.fromArray(studio.matrices, arm * 16);
    const s = new Vector3(...shoulder).applyMatrix4(m);
    // The window is centered below the shoulder joint, at the armpit.
    const cx = s.dot(right);
    const cy = s.dot(up) - 0.05;
    const P = (v: number): Vector3 => new Vector3(posed[v * 3], posed[v * 3 + 1], posed[v * 3 + 2]);
    const depth = new Float32Array(RES * RES).fill(-Infinity);
    const ids = new Int32Array(RES * RES).fill(-1);
    const bary = new Float32Array(RES * RES * 3);
    const px = (2 * HALF) / RES;
    const nf = nc / 3;
    for (let f = 0; f < nf; f++) {
      const vs = [corners[f * 3] ?? 0, corners[f * 3 + 1] ?? 0, corners[f * 3 + 2] ?? 0];
      const q = vs.map((v) => P(v));
      const sx = q.map((p) => (p.dot(right) - cx + HALF) / px);
      const sy = q.map((p) => (p.dot(up) - cy + HALF) / px);
      const sz = q.map((p) => p.dot(cdir));
      const [ax, bx, qx3] = sx as [number, number, number];
      const [ay, by, qy3] = sy as [number, number, number];
      const d2 = (bx - ax) * (qy3 - ay) - (by - ay) * (qx3 - ax);
      if (Math.abs(d2) < 1e-12) continue;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, qx3)));
      const x1 = Math.min(RES - 1, Math.ceil(Math.max(ax, bx, qx3)));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, qy3)));
      const y1 = Math.min(RES - 1, Math.ceil(Math.max(ay, by, qy3)));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const qx = x + 0.5;
          const qy = y + 0.5;
          const w0 = ((bx - qx) * (qy3 - qy) - (by - qy) * (qx3 - qx)) / d2;
          const w1 = ((qx3 - qx) * (ay - qy) - (qy3 - qy) * (ax - qx)) / d2;
          const w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const d = w0 * (sz[0] ?? 0) + w1 * (sz[1] ?? 0) + w2 * (sz[2] ?? 0);
          const i = y * RES + x;
          if (d > (depth[i] ?? -Infinity)) {
            depth[i] = d;
            ids[i] = f;
            bary.set([w0, w1, w2], i * 3);
          }
        }
      }
    }
    const panels = [new Uint8Array(RES * RES * 3), new Uint8Array(RES * RES * 3), new Uint8Array(RES * RES * 3)];
    const seen = new Set<number>();
    let down = 0;
    let angles = 0;
    let big = 0;
    const face = new Map<number, { n: Vector3; angle: number }>();
    for (let i = 0; i < RES * RES; i++) {
      const f = ids[i] ?? -1;
      const row = RES - 1 - Math.floor(i / RES);
      const o = (row * RES + (i % RES)) * 3;
      if (f < 0) {
        for (const p of panels) p.set([25, 25, 25], o);
        continue;
      }
      const vs = [corners[f * 3] ?? 0, corners[f * 3 + 1] ?? 0, corners[f * 3 + 2] ?? 0];
      const q = vs.map((v) => P(v));
      const n = (q[1] ?? new Vector3()).clone().sub(q[0] ?? new Vector3()).cross((q[2] ?? new Vector3()).clone().sub(q[0] ?? new Vector3())).normalize();
      const sn = new Vector3();
      for (let k = 0; k < 3; k++) {
        const c = f * 3 + k;
        const b = new Vector3(smooth[c * 3], smooth[c * 3 + 1], smooth[c * 3 + 2]);
        sn.addScaledVector(skinNormal(vs[k] ?? 0, b), bary[i * 3 + k] ?? 0);
      }
      sn.normalize();
      const col = (v: Vector3): number[] => [
        Math.round(255 * (v.dot(right) * 0.5 + 0.5)),
        Math.round(255 * (v.dot(up) * 0.5 + 0.5)),
        Math.round(255 * (v.dot(cdir) * 0.5 + 0.5)),
      ];
      panels[0]?.set(col(n), o);
      panels[1]?.set(col(sn), o);
      const angle = (Math.acos(Math.max(-1, Math.min(1, n.dot(sn)))) * 180) / Math.PI;
      const t = Math.min(1, angle / 60);
      panels[2]?.set([255, Math.round(255 * (1 - t)), Math.round(255 * (1 - t))], o);
      if (!seen.has(f)) {
        seen.add(f);
        face.set(f, { n, angle });
      }
    }
    // The faces of the corner that face down, with their lowest place on the screen.
    const corner = [...face.entries()].filter(([, v]) => v.n.y < -0.3).map(([f]) => f);
    const lowY = (f: number): number =>
      Math.min(...[0, 1, 2].map((k) => P(corners[f * 3 + k] ?? 0).dot(up)));
    corner.sort((a, b) => lowY(a) - lowY(b));
    const verts = new Set<number>();
    for (const f of corner.slice(0, 10)) for (let k = 0; k < 3; k++) verts.add(corners[f * 3 + k] ?? 0);
    lines.push(`${set} ${label}: lowest corner faces ${corner.slice(0, 10).join(',')}, vertices ${[...verts].join(',')}`);
    lines.push('  bind places (m): ' + [...verts].map((v) => `${v}:[${[0, 1, 2].map((k) => (rig.mesh.positions[v * 3 + k] ?? 0).toFixed(4)).join(',')}]`).join(' '));
    lines.push(`  scale ${rig.body.scale}, shoulder L ${JSON.stringify(rig.body.heads.upper_arm_L)}`);
    for (const { n, angle } of face.values()) {
      if (n.y < -0.3) down++;
      angles += angle;
      if (angle > 40) big++;
    }
    const all = new Uint8Array(RES * 3 * RES * 3);
    for (let y = 0; y < RES; y++) {
      for (let k = 0; k < 3; k++) {
        all.set((panels[k] ?? new Uint8Array()).subarray(y * RES * 3, (y + 1) * RES * 3), (y * RES * 3 + k * RES) * 3);
      }
    }
    const name = `${set}-${label.replace(/[^a-z0-9.]+/gi, '_')}`;
    png(`${out}/armpit-${name}.png`, RES * 3, RES, all);
    lines.push(
      `${set} ${label}: faces seen ${face.size}, facing down (n.y < -0.3) ${down}, mean angle true to smooth ${(angles / Math.max(1, face.size)).toFixed(1)}°, above 40°: ${big}`,
    );
  },
  ['rest', 'play'],
);
writeFileSync(`${out}/armpit-normals.txt`, lines.join('\n') + '\n');
console.log(lines.join('\n'));
