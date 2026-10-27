/**
 * Writes the posed studio skin of a role as OBJ files: the rest, one play sample at a song time,
 * and the bind mesh, in meters, with the faces of the module.
 * Usage: node scratch/pose-obj.ts <role> <out dir> <demo prefix> <song s>[,<song s>...] [--glb <file>]
 */
import { mkdirSync, writeFileSync } from 'node:fs';

import { STUDIO_BONES } from '../src/models/studio-format.ts';
import { FOLD_ROLES, probeFolds } from '../tools/fold-probe.ts';
import { probeDemos } from '../tools/probe-demos.ts';

const [roleName, out, prefix, times] = process.argv.slice(2);
mkdirSync(out!, { recursive: true });
const role = FOLD_ROLES.get(roleName!)!;
const demos = (await probeDemos()).filter((d) => d.file.startsWith(prefix!));
const want = times!.split(',').map(Number);
const step = 0.05;
let wroteBind = false;
let wroteRest = false;
const done = new Set<number>();

let tint: number[][] = [];
function tints(mesh: { joints: Uint8Array; weights: Float32Array }): void {
  if (tint.length) return;
  const n = mesh.weights.length / 4;
  for (let v = 0; v < n; v++) {
    let arm = 0;
    let clav = 0;
    for (let k = 0; k < 4; k++) {
      const name = STUDIO_BONES[mesh.joints[v * 4 + k]!] ?? '';
      const w = mesh.weights[v * 4 + k]!;
      if (/^(upper_arm|forearm|hand|fingers|elbow|wrist)/.test(name)) arm += w;
      else if (name.startsWith('clavicle')) clav += w;
    }
    tint.push([arm, clav, 1 - arm - clav]);
  }
}
function obj(path: string, pos: ArrayLike<number>, corners: ArrayLike<number>): void {
  const lines: string[] = [];
  for (let v = 0; v < pos.length / 3; v++) {
    const c = tint[v] ?? [0.7, 0.7, 0.7];
    lines.push(`v ${pos[v * 3]!.toFixed(5)} ${pos[v * 3 + 1]!.toFixed(5)} ${pos[v * 3 + 2]!.toFixed(5)} ${c.map((x) => x.toFixed(3)).join(' ')}`);
  }
  for (let f = 0; f < corners.length / 3; f++) {
    lines.push(`f ${corners[f * 3]! + 1} ${corners[f * 3 + 1]! + 1} ${corners[f * 3 + 2]! + 1}`);
  }
  writeFileSync(path, lines.join('\n') + '\n');
}

probeFolds(role, demos.slice(0, 1), step, (rig, _studio, posed, folded, set, label) => {
  tints(rig.mesh);
  if (!wroteBind) {
    obj(`${out}/bind.obj`, rig.mesh.positions, rig.mesh.corners);
    wroteBind = true;
  }
  if (set === 'rest' && !wroteRest) {
    obj(`${out}/rest.obj`, posed, rig.mesh.corners);
    writeFileSync(`${out}/rest-folded.txt`, folded.join(' ') + '\n');
    wroteRest = true;
  }
  if (set === 'play') {
    const t = Number(/(-?[\d.]+) s$/.exec(label)?.[1]);
    for (const w of want) {
      if (!done.has(w) && Math.abs(t - w) < step / 2) {
        obj(`${out}/play-${w}.obj`, posed, rig.mesh.corners);
        writeFileSync(`${out}/play-${w}-folded.txt`, folded.join(' ') + '\n');
        done.add(w);
      }
    }
  }
  if (set === 'lift' && label.endsWith("wall 0.6 s")) {
    obj(`${out}/lift-0.6.obj`, posed, rig.mesh.corners);
  }
});
console.log(`wrote bind, rest, play ${[...done].join(',')}`);
