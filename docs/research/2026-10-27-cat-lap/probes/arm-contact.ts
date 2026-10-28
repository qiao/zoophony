// Finds where the right upper arm of the cat violist goes into the body: for each sample, the
// deepest corners of the right upper arm, and the bind place of the nearest body point, in the
// trunk frame of the bind (f along the hips-neck line, x to the left of the cat, d forward).
// Usage: node scratch/arm-contact.ts <demo>:<set>:<time>[,...] [<holds>] [<count>]
//   set: play (song time) or lift, lower, rest (wall time).
import { Triangle, Vector3 } from 'three';

import { setHolds } from '../tools/hold-sets.ts';
import { probeDemos } from '../tools/probe-demos.ts';
import { boneIndex } from '../src/models/rig.ts';
import { closeSurface, closedDepth } from '../src/pose/test-clearance.ts';
import { poseSkeleton } from '../src/pose/test-kinematics.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { posedCorner } from '../src/pose/test-skin.ts';
import { SWEEP_ROLES, playSample } from '../src/pose/test-sweep-roles.ts';
import type { SweepSample } from '../src/pose/test-sweep.ts';

const [atList = '', holds = '', countText = '6'] = process.argv.slice(2);
setHolds(holds);
const role = SWEEP_ROLES.violist;
const demos = await probeDemos();
const BODY = new Set(
  ['hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'thighL', 'thighR'].map((b) =>
    boneIndex(b as 'hips'),
  ),
);
const ARM = boneIndex((process.env.PART ?? 'upperArmR') as 'upperArmR');
for (const at of atList.split(',')) {
  const [demoId = '', setName = 'play', timeText = '0'] = at.split(':');
  const demo = demos.find((d) => d.file.replace(/\.mid$/, '') === demoId);
  if (!demo) throw new Error(`no demo ${demoId}`);
  const scene = sceneOf(demo.bytes);
  const player = role.players(scene)[0]!;
  const studio = player.model.studio!;
  const mesh = studio.mesh;
  const { bones } = player.model.mesh;
  const time = Number(timeText);
  const sample: SweepSample =
    setName === 'play'
      ? playSample(scene, time)
      : (role
          .sampleSets(scene)
          .find((s) => s.name === setName)!
          .samples.find((s) => Math.abs((s as SweepSample)[1] - time) < 0.06) as SweepSample);
  const posed = poseSkeleton(player.model, player.poseAt(sample));
  const n = mesh.corners.length / 3;
  const bodyTris: number[] = [];
  const posedTris: Triangle[] = [];
  for (let t = 0; t < n; t++) {
    if (!BODY.has(bones[t * 3] ?? -1)) continue;
    bodyTris.push(t);
    const [a, b, c] = [0, 1, 2].map((k) => new Vector3(...posedCorner(posed, t * 3 + k)));
    posedTris.push(new Triangle(a, b, c));
  }
  const surface = role.obstacles.find((o) => o.name === 'body')!.surface(posed);
  const heads = studio.body.heads;
  const hips = new Vector3(...heads.hips);
  const up = new Vector3(...heads.neck).sub(hips);
  const len = up.length();
  up.normalize();
  const fwd = new Vector3(0, 0, -1).addScaledVector(up, up.z).normalize();
  const left = new Vector3().crossVectors(up, fwd).normalize();
  const rows: [number, string][] = [];
  const seen = new Set<number>();
  for (let c = 0; c < bones.length; c++) {
    if (bones[c] !== ARM) continue;
    const v = mesh.corners[c] ?? 0;
    if (seen.has(v)) continue;
    seen.add(v);
    const p = new Vector3(...posedCorner(posed, c));
    const depth = closedDepth([p], surface).depth;
    if (depth <= Number(process.env.MIN ?? 0.003)) continue;
    let best = -1;
    let bestD = Infinity;
    const q = new Vector3();
    for (let i = 0; i < posedTris.length; i++) {
      posedTris[i]!.closestPointToPoint(p, q);
      const d = q.distanceTo(p);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    const tri = posedTris[best]!;
    tri.closestPointToPoint(p, q);
    const bary = tri.getBarycoord(q, new Vector3());
    const t = bodyTris[best]!;
    const bind = new Vector3();
    for (let k = 0; k < 3; k++) {
      const s = mesh.corners[t * 3 + k] ?? 0;
      bind.addScaledVector(new Vector3().fromArray(mesh.positions, s * 3), bary.getComponent(k));
    }
    const rel = bind.sub(hips);
    const sh = new Vector3(...heads.upper_arm_R);
    const el = new Vector3(...heads.forearm_R);
    const axis = el.clone().sub(sh);
    const alen = axis.length();
    const vb = new Vector3().fromArray(mesh.positions, v * 3).sub(sh);
    const along = vb.dot(axis) / (alen * alen);
    rows.push([
      depth,
      `vertex ${v} depth ${(depth * 100).toFixed(2)} cm -> body tri ${t} at f ${(rel.dot(up) / len).toFixed(3)} x ${(rel.dot(left) * 100).toFixed(1)} d ${(rel.dot(fwd) * 100).toFixed(1)} cm (bone ${bones[t * 3]}), arm share ${along.toFixed(2)}`,
    ]);
  }
  rows.sort((a, b) => b[0] - a[0]);
  console.log(`${at}: ${rows.length} corners over 3 mm`);
  for (const [, r] of rows.slice(0, Number(countText))) console.log(`  ${r}`);
}
