// Estimates the depth of the right upper arm of the cat violist in the body after a flatten of
// the bind: the body vertices (trunk bones) in a box of the trunk frame move toward the trunk line
// in the cross-section by `move` cm times a smooth bump over the box. Prints the deepest upper
// arm corner of each sample for each move.
// Usage: node scratch/flatten-est.ts <samples> <f0>,<f1> <x0>,<x1> <moves cm,...> [<holds>] [both]
//   samples: <demo>:<set>:<time>,...  x in cm to the left of the cat (the right side is negative).
import { Vector3 } from 'three';

import { setHolds } from '../tools/hold-sets.ts';
import { probeDemos } from '../tools/probe-demos.ts';
import { boneIndex } from '../src/models/rig.ts';
import { closedDepth } from '../src/pose/test-clearance.ts';
import { poseSkeleton } from '../src/pose/test-kinematics.ts';
import { sceneOf } from '../src/pose/test-scene.ts';
import { posedCorner } from '../src/pose/test-skin.ts';
import { SWEEP_ROLES, playSample } from '../src/pose/test-sweep-roles.ts';
import type { SweepSample } from '../src/pose/test-sweep.ts';
import { STUDIO_BONES } from '../src/models/studio-format.ts';

const [atList = '', fText = '0.7,0.85', xText = '-14,-6', movesText = '0,0.5,1', holds = '', both = ''] =
  process.argv.slice(2);
setHolds(holds);
const [f0, f1] = fText.split(',').map(Number) as [number, number];
const [x0, x1] = xText.split(',').map((v) => Number(v) / 100) as [number, number];
const moves = movesText.split(',').map((v) => Number(v) / 100);
const role = SWEEP_ROLES.violist;
const demos = await probeDemos();
const ARM = boneIndex('upperArmR');
const TRUNK = new Set(['hips', 'spine', 'spine1', 'chest', 'neck'].map((b) => STUDIO_BONES.indexOf(b as never)));
const bump = (t: number): number => (t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t) ** 2);
let original: Float32Array | null = null;
const header = ['sample', ...moves.map((m) => `move ${(m * 100).toFixed(1)} cm`)];
console.log(`| ${header.join(' | ')} |`);
for (const at of atList.split(',')) {
  const [demoId = '', setName = 'play', timeText = '0'] = at.split(':');
  const demo = demos.find((d) => d.file.replace(/\.mid$/, '') === demoId)!;
  const scene = sceneOf(demo.bytes);
  const player = role.players(scene)[0]!;
  const studio = player.model.studio!;
  const mesh = studio.mesh;
  const positions = mesh.positions as Float32Array;
  original ??= positions.slice();
  const heads = studio.body.heads;
  const hips = new Vector3(...heads.hips);
  const up = new Vector3(...heads.neck).sub(hips);
  const len = up.length();
  up.normalize();
  const fwd = new Vector3(0, 0, -1).addScaledVector(up, up.z).normalize();
  const left = new Vector3().crossVectors(up, fwd).normalize();
  const { bones } = player.model.mesh;
  const time = Number(timeText);
  const sample: SweepSample =
    setName === 'play'
      ? playSample(scene, time)
      : (role.sampleSets(scene).find((s) => s.name === setName)!.samples.find(
          (s) => Math.abs((s as SweepSample)[1] - time) < 0.06,
        ) as SweepSample);
  const cells: string[] = [at];
  for (const move of moves) {
    positions.set(original);
    const nv = positions.length / 3;
    for (let v = 0; v < nv; v++) {
      let trunk = 0;
      for (let k = 0; k < 4; k++) {
        if (TRUNK.has(mesh.joints[v * 4 + k] ?? -1)) trunk += mesh.weights[v * 4 + k] ?? 0;
      }
      if (trunk < 0.5) continue;
      const p = new Vector3().fromArray(original, v * 3);
      const rel = p.clone().sub(hips);
      const f = rel.dot(up) / len;
      const x = rel.dot(left);
      const d = rel.dot(fwd);
      if (d <= 0) continue;
      const wx = both ? Math.max(bump((x - x0) / (x1 - x0)), bump((-x - x0) / (x1 - x0))) : bump((x - x0) / (x1 - x0));
      const w = bump((f - f0) / (f1 - f0)) * wx * trunk;
      if (w <= 0) continue;
      const radial = left.clone().multiplyScalar(x).addScaledVector(fwd, d).normalize();
      p.addScaledVector(radial, -move * w);
      positions[v * 3] = p.x;
      positions[v * 3 + 1] = p.y;
      positions[v * 3 + 2] = p.z;
    }
    const posed = poseSkeleton(player.model, player.poseAt(sample));
    const surface = role.obstacles.find((o) => o.name === 'body')!.surface(posed);
    let deepest = 0;
    const seen = new Set<number>();
    for (let c = 0; c < bones.length; c++) {
      if (bones[c] !== ARM) continue;
      const v = mesh.corners[c] ?? 0;
      if (seen.has(v)) continue;
      seen.add(v);
      deepest = Math.max(deepest, closedDepth([new Vector3(...posedCorner(posed, c))], surface).depth);
    }
    cells.push((deepest * 100).toFixed(2));
  }
  console.log(`| ${cells.join(' | ')} |`);
}
