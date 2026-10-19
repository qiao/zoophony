// Measures how deep the contrabass of the hippo bassist goes into the closed body, for the top
// plate (the corners within 2.5 cm behind the top plate front, along the body) and for all
// corners. Usage: node docs/research/2026-10-19-hippo-chest/top-plate.ts [--demo <id>] [--every <n>] [--set <changes>]...
import { Vector3 } from 'three';

import { boneIndex } from '../../../src/models/rig.ts';
import { closedDepth } from '../../../src/pose/test-clearance.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import { BASSIST_SWEEP } from '../../../src/pose/test-sweep-roles.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const args = process.argv.slice(2);
const all = (name: string): string[] => args.flatMap((a, i) => (a === name ? [args[i + 1] ?? ''] : []));
const demoId = all('--demo')[0] ?? 'boulanger-matin';
const every = Number(all('--every')[0] ?? '4');
const variants = ['', ...all('--set')];

const role = BASSIST_SWEEP;
const body = role.obstacles.find((o) => o.name === 'body');
if (!body) throw new Error('no body');
const demo = (await patchedDemos()).find((d) => d.file.startsWith(demoId));
if (!demo || !role.hasRole(scoreOf(demo.bytes))) throw new Error('no demo');

const contact = new Vector3(-0.148, 0.644, -0.527);
const nut = new Vector3(-0.365, 1.46, -0.344);
const axis = nut.clone().sub(contact).normalize();
const front = new Vector3(0.55, 0, -1);
front.addScaledVector(axis, -front.dot(axis)).normalize();

for (const variant of variants) {
  const undo = variant ? setHolds(variant) : null;
  const scene = sceneOf(demo.bytes);
  const [player] = role.players(scene);
  if (!player) throw new Error('no player');
  const mesh = player.model.mesh;
  const inst = boneIndex('instrument');
  const seen = new Set<string>();
  const top: number[] = [];
  const any: number[] = [];
  for (let c = 0; c < mesh.bones.length; c++) {
    if (mesh.bones[c] !== inst) continue;
    const key = `${mesh.positions[c * 3]} ${mesh.positions[c * 3 + 1]} ${mesh.positions[c * 3 + 2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const p = new Vector3(mesh.positions[c * 3], mesh.positions[c * 3 + 1], mesh.positions[c * 3 + 2]).sub(contact);
    any.push(c);
    const a = p.dot(axis);
    const f = p.dot(front);
    if (a < 0.6 && f > -0.135 && f < -0.09) top.push(c);
  }
  const lines: string[] = [];
  for (const { name, samples } of role.sampleSets(scene)) {
    let n = 0;
    let topOver = 0;
    let topMax = 0;
    let anyMax = 0;
    let i = 0;
    let topSum = 0;
    for (const sample of samples) {
      if (i++ % every !== 0) continue;
      n++;
      const posed = poseSkeleton(player.model, player.poseAt(sample));
      const surface = body.surface(posed);
      const t = closedDepth(top.map((c) => new Vector3(...posedCorner(posed, c))), surface).depth;
      const a = closedDepth(any.map((c) => new Vector3(...posedCorner(posed, c))), surface).depth;
      topMax = Math.max(topMax, t);
      anyMax = Math.max(anyMax, a);
      topSum += t;
      if (t > 0.015) topOver++;
    }
    lines.push(`${name} (${n}): top plate max ${(topMax * 100).toFixed(1)} cm, mean ${((topSum / n) * 100).toFixed(1)} cm, ${topOver} samples > 1.5 cm; all corners max ${(anyMax * 100).toFixed(1)} cm`);
  }
  console.log(`${variant || 'base'}: ${top.length} top corners\n  ${lines.join('\n  ')}`);
  undo?.undo();
}
