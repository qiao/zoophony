// Measures the left forearm of the hippo bassist in the contrabass over the play samples: the max,
// the samples over 5.7 cm and over 3 cm, and the mean of the deepest 2% of the samples.
// Usage: node docs/research/2026-10-19-hippo-chest/arms/left-forearm.ts [--demo <id>]... [--every <n>] [--set <changes>]...
import { Vector3 } from 'three';

import { boneIndex } from '../../../../src/models/rig.ts';
import { closedDepth } from '../../../../src/pose/test-clearance.ts';
import { poseSkeleton } from '../../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../../src/pose/test-scene.ts';
import { posedCorner } from '../../../../src/pose/test-skin.ts';
import { BASSIST_SWEEP } from '../../../../src/pose/test-sweep-roles.ts';
import { scoreOf } from '../../../../src/score/test-score.ts';
import { setHolds } from '../../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../../tools/patch-demos.ts';

const args = process.argv.slice(2);
const all = (name: string): string[] => args.flatMap((a, i) => (a === name ? [args[i + 1] ?? ''] : []));
const demoIds = all('--demo').length ? all('--demo') : ['boulanger-matin', 'bach-bwv1050'];
const every = Number(all('--every')[0] ?? '2');
const variants = ['', ...all('--set')];
const role = BASSIST_SWEEP;
const cb = role.obstacles.find((o) => o.name === 'contrabass');
const bodyObs = role.obstacles.find((o) => o.name === 'body');
if (!cb || !bodyObs) throw new Error('no obstacle');
const demos = (await patchedDemos()).filter((d) => demoIds.some((id) => d.file.startsWith(id)));

for (const variant of variants) {
  const undo = variant ? setHolds(variant) : null;
  const depths: number[] = [];
  const bodyDepths: number[] = [];
  let worst = '';
  let max = 0;
  for (const demo of demos) {
    if (!role.hasRole(scoreOf(demo.bytes))) continue;
    const scene = sceneOf(demo.bytes);
    const [player] = role.players(scene);
    if (!player) continue;
    const mesh = player.model.mesh;
    const fl = boneIndex('forearmL');
    const ul = boneIndex('upperArmL');
    const seen = new Set<string>();
    const corners: number[] = [];
    const armCorners: number[] = [];
    for (let c = 0; c < mesh.bones.length; c++) {
      const b = mesh.bones[c];
      if (b !== fl && b !== ul) continue;
      const key = `${mesh.positions[c * 3]} ${mesh.positions[c * 3 + 1]} ${mesh.positions[c * 3 + 2]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      armCorners.push(c);
      if (b === fl) corners.push(c);
    }
    const play = role.sampleSets(scene).find((s) => s.name === 'play');
    let i = 0;
    for (const sample of play?.samples ?? []) {
      if (i++ % every !== 0) continue;
      const posed = poseSkeleton(player.model, player.poseAt(sample));
      const d = closedDepth(corners.map((c) => new Vector3(...posedCorner(posed, c))), cb.surface(posed)).depth;
      const b = closedDepth(armCorners.map((c) => new Vector3(...posedCorner(posed, c))), bodyObs.surface(posed)).depth;
      depths.push(d);
      bodyDepths.push(b);
      if (d > max) {
        max = d;
        worst = `${demo.file} ${sample[0].toFixed(2)} s`;
      }
    }
  }
  const sorted = [...depths].sort((a, b) => b - a);
  const top = sorted.slice(0, Math.max(1, Math.round(sorted.length * 0.02)));
  const mean = top.reduce((s, v) => s + v, 0) / top.length;
  const bmax = Math.max(...bodyDepths);
  console.log(`${(variant || 'base').padEnd(90)} n ${depths.length}, forearm L in contrabass max ${(max * 100).toFixed(1)} cm (${worst}), >5.7 cm ${depths.filter((d) => d > 0.057).length}, >3 cm ${depths.filter((d) => d > 0.03).length}, top 2% mean ${(mean * 100).toFixed(1)} cm; left arm in body max ${(bmax * 100).toFixed(1)} cm, >5.8 cm ${bodyDepths.filter((d) => d > 0.058).length}`);
  undo?.undo();
}
