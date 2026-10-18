/**
 * Writes the bind mesh and posed meshes of the studio panda of the trombonist into a JSON file:
 * the rest sample and some play samples of the first demo with the role.
 * Usage: node docs/research/2026-10-18-panda-marks/posed.ts <out.json> [<demo file>]
 */
import { writeFile } from 'node:fs/promises';

import { FOLD_ROLES, probeFolds } from '../../../tools/fold-probe.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const out = process.argv[2] ?? 'scratch/marks/posed.json';
const wanted = process.argv[3];
const role = FOLD_ROLES.get('trombonist');
if (!role) {
  throw new Error('no role');
}
const all = await patchedDemos();
const demos = all.filter((demo) => (wanted ? demo.file === wanted : true));
let bind: number[] | null = null;
let corners: number[] | null = null;
let colors: number[] | null = null;
let joints: number[] | null = null;
let weights: number[] | null = null;
const rest: number[][] = [];
const play: number[][] = [];
let playCount = 0;
const report = probeFolds(role, demos, 0.5, (rig, _studio, posed, _folded, set) => {
  bind ??= Array.from(rig.mesh.positions);
  corners ??= Array.from(rig.mesh.corners);
  colors ??= Array.from(rig.mesh.colors);
  joints ??= Array.from(rig.mesh.joints);
  weights ??= Array.from(rig.mesh.weights);
  if (set === 'rest' && rest.length < 1) {
    rest.push(Array.from(posed));
  }
  if (set === 'play') {
    playCount += 1;
    if (playCount % 10 === 5 && play.length < 40) {
      play.push(Array.from(posed));
    }
  }
});
await writeFile(out, JSON.stringify({ demos: report.demos, bind, corners, colors, joints, weights, rest, play }));
console.log(`demos ${report.demos.join(', ')}, play samples ${playCount}, kept ${play.length}`);
