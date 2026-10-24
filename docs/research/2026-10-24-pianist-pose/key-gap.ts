// Measures the gap between the paws of the pianist and the key tops at each note start of each
// paw, over the demos with a piano (diagnosis only). The gap of a paw is the lowest height of a
// vertex of the paw (hand and fingers) above the key top under it, over the vertices above the
// keys. A negative gap goes into the key. Usage, from the root of the tree:
// node docs/research/2026-10-24-pianist-pose/key-gap.ts [--list] [--set <changes>]
import { FOLD_ROLES, roleBodies } from '../../../tools/fold-probe.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import * as pianoModule from '../../../src/models/instruments/piano.ts';
import { STUDIO_BONES } from '../../../src/models/studio-format.ts';
import {
  createStudioPose,
  poseStudioBones,
  skinStudioMesh,
  studioOffsets,
} from '../../../src/models/studio-rig.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { PLAYING, allAudible, sceneOf } from '../../../src/pose/test-scene.ts';

const { PIANO } = pianoModule;
const scale = 'PIANO_SCALE' in pianoModule ? Number(pianoModule.PIANO_SCALE) : 1;
const list = process.argv.includes('--list');
const setAt = process.argv.indexOf('--set');
if (setAt > 0) {
  setHolds(process.argv[setAt + 1] ?? '');
}
const role = FOLD_ROLES.get('pianist');
if (!role) {
  throw new Error('no pianist');
}
const names: readonly string[] = STUDIO_BONES;
const black = new Set([1, 3, 6, 8, 10]);
const whiteLength = PIANO.whiteKeyLength * scale;
const blackLength = PIANO.blackKeyLength * scale;
const whiteTop = PIANO.keyTop * scale;
const blackTop = (PIANO.keyTop + 0.012) * scale;
const blackHalf = (0.012 * scale) / 2;
const blackXs: number[] = [];
for (let k = PIANO.keys[0]; k <= PIANO.keys[1]; k++) {
  if (black.has(k % 12)) {
    blackXs.push(pianoModule.pianoKeyPosition(k)[0]);
  }
}
const half = (PIANO.keyboardWidth * scale) / 2;

const demos = await patchedDemos();
const all: { side: string; gap: number; reach: number; low: number; label: string }[] = [];
for (const demo of demos) {
  const scene = sceneOf(demo.bytes);
  const bodies = roleBodies(role, scene);
  const body = bodies[0];
  if (!body || body.index === null) {
    continue;
  }
  const { model, index } = body;
  const rig = model.studio;
  const plan = scene.plan.players[index];
  if (!rig || !plan || plan.note.family !== 'keyboard') {
    continue;
  }
  const front = model.pieces.find((p) => p.piece.bone === 'instrument')?.at.position[2] ?? 0;
  const paw = { L: new Set<number>(), R: new Set<number>() };
  for (const [i, name] of names.entries()) {
    for (const side of ['L', 'R'] as const) {
      if (name === `hand_${side}` || name === `fingers_${side}`) {
        paw[side].add(i);
      }
    }
  }
  const { joints, weights } = rig.mesh;
  const vertexCount = joints.length / 4;
  const pawOf: ('L' | 'R' | null)[] = [];
  for (let v = 0; v < vertexCount; v++) {
    let best = 0;
    let bone = 0;
    for (let k = 0; k < 4; k++) {
      if ((weights[v * 4 + k] ?? 0) > best) {
        best = weights[v * 4 + k] ?? 0;
        bone = joints[v * 4 + k] ?? 0;
      }
    }
    pawOf.push(paw.L.has(bone) ? 'L' : paw.R.has(bone) ? 'R' : null);
  }
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  const start = -countInAt(scene.plan.beats, 0).lengthSec;
  const studio = createStudioPose();
  for (const side of ['L', 'R'] as const) {
    const track = side === 'L' ? plan.note.left : plan.note.right;
    for (const note of track.starts) {
      if (note < 2) {
        continue;
      }
      const song = note + plan.timeOffset;
      const frame = poseAt(scene.plan, song, 10 + song - start, PLAYING, audible, buffer);
      const pose = frame.players[index];
      if (!pose) {
        continue;
      }
      poseStudioBones(rig, model.skeleton, pose.rotations, studioOffsets(pose), 1, studio);
      const posed = skinStudioMesh(rig.mesh, studio);
      let gap = Infinity;
      let reach = -Infinity;
      let low = Infinity;
      for (let v = 0; v < vertexCount; v++) {
        if (pawOf[v] !== side) {
          continue;
        }
        const x = posed[v * 3] ?? 0;
        const y = posed[v * 3 + 1] ?? 0;
        const z = (posed[v * 3 + 2] ?? 0) - front;
        reach = Math.max(reach, -z);
        low = Math.min(low, y - whiteTop);
        if (z > 0 || z < -whiteLength || Math.abs(x) > half) {
          continue;
        }
        const onBlack =
          z < -(whiteLength - blackLength) && blackXs.some((bx) => Math.abs(bx - x) < blackHalf);
        gap = Math.min(gap, y - (onBlack ? blackTop : whiteTop));
      }
      all.push({ side, gap, reach, low, label: `${demo.file} ${note.toFixed(2)} s` });
    }
  }
}
for (const side of ['L', 'R'] as const) {
  const rows = all.filter((r) => r.side === side);
  const off = rows.filter((r) => !Number.isFinite(r.gap));
  const on = rows.filter((r) => Number.isFinite(r.gap)).toSorted((a, b) => a.gap - b.gap);
  const p = (q: number): number =>
    (on[Math.min(on.length - 1, Math.floor(q * on.length))]?.gap ?? 0) * 100;
  const worst = on.at(-1);
  const deepest = on[0];
  console.log(
    `${side}: ${rows.length} strikes, ${off.length} with no paw vertex over the keys; gap cm: ` +
      `deepest ${p(0).toFixed(2)} (${deepest?.label ?? '-'}), p5 ${p(0.05).toFixed(2)}, median ` +
      `${p(0.5).toFixed(2)}, p95 ${p(0.95).toFixed(2)}, largest ${p(1).toFixed(2)} (${worst?.label ?? '-'})`,
  );
  const med = (key: 'reach' | 'low'): string => {
    const v = rows.map((r) => r[key] * 100).toSorted((a, b) => a - b);
    return `min ${(v[0] ?? 0).toFixed(1)}, median ${(v[Math.floor(v.length / 2)] ?? 0).toFixed(1)}, max ${(v.at(-1) ?? 0).toFixed(1)}`;
  };
  console.log(`  reach of the paw past the key front, cm: ${med('reach')}`);
  console.log(`  lowest paw point above the white key top, cm: ${med('low')}`);
  if (list) {
    for (const r of off.slice(0, 10)) {
      console.log(`  off the keys: ${r.label}`);
    }
  }
}
