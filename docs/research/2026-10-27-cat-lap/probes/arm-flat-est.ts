// Estimates the depth of the right upper arm of the cat violist in the body after a flatter
// inner side of the upper arm: the bind vertices of the right upper arm from share a0 to a1 of
// its length, whose radial direction lies within `cone` degrees of the mean radial direction of
// the probe vertices `ids`, move toward the arm axis by `move` cm times a bump along the arm and a
// cosine falloff over the cone.
// Usage: node scratch/arm-flat-est.ts <samples> <a0>,<a1> <cone> <ids> <moves cm,...> [<holds>]
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

const [atList = '', aText = '0.4,0.8', coneText = '50', idsText = '320,321,322,323,324', movesText = '0,0.5,1', holds = ''] =
  process.argv.slice(2);
setHolds(holds);
const [a0, a1] = aText.split(',').map(Number) as [number, number];
const cone = (Number(coneText) * Math.PI) / 180;
const ids = idsText.split(',').map(Number);
const moves = movesText.split(',').map((v) => Number(v) / 100);
const role = SWEEP_ROLES.violist;
const demos = await probeDemos();
const ARM = boneIndex('upperArmR');
const ARM_BONES = new Set(
  STUDIO_BONES.map((b, i) => [b, i] as const)
    .filter(([b]) => /^upper_arm(_seg\d)?_R$|^elbow_R$/.test(b))
    .map(([, i]) => i),
);
const bump = (t: number): number => (t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t) ** 2);
let original: Float32Array | null = null;
console.log(`| sample | ${moves.map((m) => `move ${(m * 100).toFixed(1)} cm`).join(' | ')} |`);
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
  const sh = new Vector3(...heads.upper_arm_R);
  const axis = new Vector3(...heads.forearm_R).sub(sh);
  const alen = axis.length();
  axis.normalize();
  const radialOf = (v: number): [number, Vector3] => {
    const rel = new Vector3().fromArray(original!, v * 3).sub(sh);
    const along = rel.dot(axis);
    return [along / alen, rel.addScaledVector(axis, -along)];
  };
  const inner = new Vector3();
  for (const v of ids) inner.add(radialOf(v)[1].normalize());
  inner.normalize();
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
    let count = 0;
    for (let v = 0; v < positions.length / 3; v++) {
      let arm = 0;
      for (let k = 0; k < 4; k++) {
        if (ARM_BONES.has(mesh.joints[v * 4 + k] ?? -1)) arm += mesh.weights[v * 4 + k] ?? 0;
      }
      if (arm < 0.5) continue;
      const [share, radial] = radialOf(v);
      const angle = radial.clone().normalize().angleTo(inner);
      if (angle >= cone) continue;
      const w = bump((share - a0) / (a1 - a0)) * Math.cos((angle / cone) * (Math.PI / 2)) ** 2;
      if (w <= 0) continue;
      count++;
      const p = new Vector3().fromArray(original, v * 3).addScaledVector(radial.normalize(), -move * w);
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
    cells.push(`${(deepest * 100).toFixed(2)} (${count})`);
  }
  console.log(`| ${cells.join(' | ')} |`);
}
