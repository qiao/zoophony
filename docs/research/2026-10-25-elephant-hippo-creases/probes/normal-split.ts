// Probe: the skin faces near a joint (the elbow by default) whose corners take a crease normal
// that differs from the whole smooth normal of the skin at the vertex, in the bind of the rig.
// node docs/research/2026-10-25-elephant-hippo-creases/probes/normal-split.ts <body> <joint> <radius m> [crease]
// With NO_RIM=1, the probe drops the rim of the body, as the rigs of main before this round.
import { studioRigOf } from '../../../../src/models/studio-body.ts';
import type { StudioBodyName } from '../../../../src/models/studio-body.ts';
import { studioNormals } from '../../../../src/models/studio-normals.ts';

const [name = 'studio-elephant', joint = 'forearm', radiusText = '0.12', creaseText] =
  process.argv.slice(2);
const radius = Number(radiusText);
for (const stands of [false, true]) {
  const rig = studioRigOf(name as StudioBodyName, stands);
  const { mesh, body } = rig;
  const crease = creaseText ? Number(creaseText) : body.crease;
  const p = mesh.positions;
  const c = mesh.corners;
  const rim = process.env.NO_RIM ? [] : body.rim;
  const nC = studioNormals(mesh, crease, body.caps, rim);
  const nS = studioNormals(mesh, 180, body.caps, body.rim);
  const faces = c.length / 3;
  for (const side of ['L', 'R'] as const) {
    const head = body.heads[`${joint}_${side}` as keyof typeof body.heads] as readonly number[];
    let near = 0;
    let split = 0;
    let rimNear = 0;
    const rimSet = new Set(rim ?? []);
    const angles: number[] = [];
    const splitFaces: number[] = [];
    for (let f = 0; f < faces; f++) {
      let mx = 0;
      let my = 0;
      let mz = 0;
      for (let k = 0; k < 3; k++) {
        const v = c[f * 3 + k] ?? 0;
        mx += (p[v * 3] ?? 0) / 3;
        my += (p[v * 3 + 1] ?? 0) / 3;
        mz += (p[v * 3 + 2] ?? 0) / 3;
      }
      const d = Math.hypot(mx - (head[0] ?? 0), my - (head[1] ?? 0), mz - (head[2] ?? 0));
      if (d > radius) continue;
      near++;
      if (rimSet.has(f)) rimNear++;
      let worst = 0;
      for (let k = 0; k < 3; k++) {
        const i = (f * 3 + k) * 3;
        const dot =
          (nC[i] ?? 0) * (nS[i] ?? 0) +
          (nC[i + 1] ?? 0) * (nS[i + 1] ?? 0) +
          (nC[i + 2] ?? 0) * (nS[i + 2] ?? 0);
        worst = Math.max(worst, (Math.acos(Math.min(1, Math.max(-1, dot))) * 180) / Math.PI);
      }
      angles.push(worst);
      if (worst > 10) {
        split++;
        splitFaces.push(f);
      }
    }
    angles.sort((a, b) => a - b);
    const q = (s: number): string => (angles[Math.floor(s * (angles.length - 1))] ?? 0).toFixed(1);
    console.log(
      `${stands ? 'standing' : 'bind'} ${side} ${joint} r=${radius} crease=${crease}: ${near} faces, ${rimNear} rim, ` +
        `${split} with a corner split > 10 deg; split p50 ${q(0.5)} p90 ${q(0.9)} max ${q(1)}`,
    );
    if (process.env.FACES) console.log(`  faces: ${splitFaces.join(' ')}`);
  }
}
