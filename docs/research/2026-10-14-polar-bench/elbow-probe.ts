// Probes the elbow height of the pianist against the key top at each note start (design 5.3).
// Usage: node docs/research/2026-10-14-polar-bench/elbow-probe.ts [demo...]
// It reads the module src/models/studio/polar-bear.ts, so benches.sh swaps in each bench.
// The elbow is the head of the forearm bone, the wrist the head of the hand bone. Each
// sample is a note start of a paw plus 0.02 s, where the palm is on its keys (the note
// targets of the sweep). The slope is the angle of the line from the wrist to the elbow
// above the level: positive when the elbow is higher than the wrist.
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { PIANO } from '../../../src/models/instruments/piano.ts';
import { STUDIO_POLAR_BEAR } from '../../../src/models/studio/polar-bear.ts';
import { STUDIO_BONES } from "../../../src/models/studio-format.ts";
import { boneIndex } from '../../../src/models/rig.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { PIANIST_SWEEP } from '../../../src/pose/test-sweep-roles.ts';
import type { PosedSkeleton } from '../../../src/pose/test-kinematics.ts';

const wanted = process.argv.slice(2);
const at = (posed: PosedSkeleton, bone: Parameters<typeof boneIndex>[0]) => {
  const f = posed.frames[boneIndex(bone)];
  if (!f) {
    throw new Error(bone);
  }
  return f.position.clone();
};
const quant = (xs: number[], q: number) => {
  const s = xs.toSorted((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1) + 0.5))] ?? NaN;
};
const cm = (m: number) => (m * 100).toFixed(1);

const all: Record<'L' | 'R', { elbow: number[]; wrist: number[]; slope: number[]; shoulder: number[] }> = {
  L: { elbow: [], wrist: [], slope: [], shoulder: [] },
  R: { elbow: [], wrist: [], slope: [], shoulder: [] },
};
const errs: number[] = [];
let headRest = 0;
const skin: Record<"L" | "R", number[]> = { L: [], R: [] };
let headPlay = 0;
for (const demo of await patchedDemos()) {
  const id = demo.file.replace(/\.mid$/, '');
  if (wanted.length > 0 && !wanted.includes(id)) {
    continue;
  }
  const scene = sceneOf(demo.bytes);
  if (!PIANIST_SWEEP.hasRole(scene.score)) {
    continue;
  }
  const players = PIANIST_SWEEP.players(scene);
  const player = players[0];
  if (!player) {
    continue;
  }
  const rig = player.model.studio;
  const bodyCorners = rig ? rig.mesh.corners.length : 0;
  const headTop = (posed: PosedSkeleton) => {
    let top = -Infinity;
    for (let c = 0; c < bodyCorners; c++) {
      top = Math.max(top, posedCorner(posed, c)[1]);
    }
    return top;
  };
  const armBones = { L: [STUDIO_BONES.indexOf("upper_arm_L"), STUDIO_BONES.indexOf("forearm_L")], R: [STUDIO_BONES.indexOf("upper_arm_R"), STUDIO_BONES.indexOf("forearm_R")] };
  const armCorner = (c: number, side: "L" | "R") => {
    if (!rig) return false;
    const v = rig.mesh.corners[c] ?? 0;
    let best = 0;
    for (let j = 1; j < 4; j++) if ((rig.mesh.weights[v * 4 + j] ?? 0) > (rig.mesh.weights[v * 4 + best] ?? 0)) best = j;
    return armBones[side].includes(rig.mesh.joints[v * 4 + best] ?? -1);
  };
  const sets = PIANIST_SWEEP.sampleSets(scene);
  const rest = sets.find((s) => s.name === 'rest');
  for (const sample of rest?.samples ?? []) {
    headRest = headTop(poseSkeleton(player.model, player.poseAt(sample)));
  }
  const per: typeof all = { L: { elbow: [], wrist: [], slope: [], shoulder: [] }, R: { elbow: [], wrist: [], slope: [], shoulder: [] } };
  const targets = player.targets();
  let k = 0;
  for (const target of targets) {
    k++;
    const posed = poseSkeleton(player.model, player.poseAt(target.sample));
    const side = target.side;
    const elbow = at(posed, `forearm${side}`);
    const wrist = at(posed, `hand${side}`);
    const shoulder = at(posed, `upperArm${side}`);
    const key = PIANO.keyTop;
    errs.push(target.error(posed));
    per[side].elbow.push(elbow.y - key);
    per[side].wrist.push(wrist.y - key);
    per[side].shoulder.push(shoulder.y - key);
    const run = Math.hypot(elbow.x - wrist.x, elbow.z - wrist.z);
    per[side].slope.push((Math.atan2(elbow.y - wrist.y, run) * 180) / Math.PI);
    if (k % 97 === 1) {
      headPlay = Math.max(headPlay, headTop(posed));
    }
    if (k % 10 === 1) {
      let low = Infinity;
      for (let c = 0; c < bodyCorners; c++) {
        const p = posedCorner(posed, c);
        if (armCorner(c, side) && Math.hypot(p[0] - elbow.x, p[1] - elbow.y, p[2] - elbow.z) < 0.15) {
          low = Math.min(low, p[1]);
        }
      }
      skin[side].push(low - key);
    }
  }
  for (const side of ['L', 'R'] as const) {
    const p = per[side];
    console.log(
      `${id} ${side}: n ${p.elbow.length}, elbow-key cm p10/p50/p90 ${cm(quant(p.elbow, 0.1))}/${cm(quant(p.elbow, 0.5))}/${cm(quant(p.elbow, 0.9))}, wrist-key p50 ${cm(quant(p.wrist, 0.5))}, shoulder-key p50 ${cm(quant(p.shoulder, 0.5))}, forearm slope deg p10/p50/p90 ${quant(p.slope, 0.1).toFixed(1)}/${quant(p.slope, 0.5).toFixed(1)}/${quant(p.slope, 0.9).toFixed(1)}`,
    );
    all[side].elbow.push(...p.elbow);
    all[side].wrist.push(...p.wrist);
    all[side].slope.push(...p.slope);
    all[side].shoulder.push(...p.shoulder);
  }
}
for (const side of ["L", "R"] as const) {
  console.log(`ALL ${side}: elbow skin bottom (arm skin within 0.15 m of the joint) - key cm p10/p50/p90 ${cm(quant(skin[side], 0.1))}/${cm(quant(skin[side], 0.5))}/${cm(quant(skin[side], 0.9))}, n ${skin[side].length}`);
}
console.log(`palm error to the note target cm p50/p90/p99/max ${cm(quant(errs, 0.5))}/${cm(quant(errs, 0.9))}/${cm(quant(errs, 0.99))}/${cm(Math.max(...errs))}, share over 1 mm ${(errs.filter((e) => e > 0.001).length / errs.length * 100).toFixed(1)}%`);
console.log(`seatHeight ${STUDIO_POLAR_BEAR.seatHeight} m, head top rest ${headRest.toFixed(3)} m, head top play (some samples) ${headPlay.toFixed(3)} m`);
for (const side of ['L', 'R'] as const) {
  const p = all[side];
  console.log(
    `ALL ${side}: n ${p.elbow.length}, elbow-key cm p10/p50/p90 ${cm(quant(p.elbow, 0.1))}/${cm(quant(p.elbow, 0.5))}/${cm(quant(p.elbow, 0.9))}, wrist-key p50 ${cm(quant(p.wrist, 0.5))}, shoulder-key p50 ${cm(quant(p.shoulder, 0.5))}, slope p10/p50/p90 ${quant(p.slope, 0.1).toFixed(1)}/${quant(p.slope, 0.5).toFixed(1)}/${quant(p.slope, 0.9).toFixed(1)}`,
  );
}
{
  const both = (pick: (p: (typeof all)['L']) => number[]) => [...pick(all.L), ...pick(all.R)];
  const skinBoth = [...skin.L, ...skin.R];
  console.log(
    `BOTH: n ${both((p) => p.elbow).length}, elbow-key cm p50 ${cm(quant(both((p) => p.elbow), 0.5))}, slope deg p50 ${quant(both((p) => p.slope), 0.5).toFixed(1)}, elbow skin bottom - key cm p50 ${cm(quant(skinBoth, 0.5))} (n ${skinBoth.length}), shoulder-key cm p50 ${cm(quant(both((p) => p.shoulder), 0.5))}, wrist-key cm p50 ${cm(quant(both((p) => p.wrist), 0.5))}`,
  );
}
