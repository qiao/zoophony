/**
 * Prints the opening of the beak of each choir penguin of the Ode to Joy over the play, from the
 * note layer of the choir (`choirStateAt()`, `CHOIR_MOTION`): the percentiles of the jaw angle
 * while a note sounds, the share of the sung time with the beak open more than 10°, and the drop
 * of the tip of the lower beak at each percentile, from the jaw joint of the studio body to the
 * tip of the beak. Usage: node docs/research/2026-10-21-penguin-beak/jaw-probe.ts
 */
import { readFileSync } from 'node:fs';
import { MathUtils } from 'three';
import { STUDIO_PENGUIN } from '../../../src/models/studio/penguin.ts';
import { choirStateAt, createChoirState } from '../../../src/pose/choir-notes.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';

const scene = sceneOf(readFileSync('public/demos/beethoven-9.mid'));
const state = createChoirState();
const hinge = STUDIO_PENGUIN.heads.jaw ?? [0, 0, 0];
const reach = Math.abs(STUDIO_PENGUIN.nose[2] - hinge[2]);
console.log(`jaw joint ${hinge.map((x) => x.toFixed(3)).join(', ')} m, beak ${(reach * 100).toFixed(1)} cm from the hinge to the tip`);
const all: number[] = [];
for (const [index, plan] of scene.plan.players.entries()) {
  if (plan?.note.family !== 'choir') {
    continue;
  }
  const { track } = plan.note;
  const angles: number[] = [];
  for (let k = 0; k < track.starts.length; k++) {
    const start = track.starts[k] ?? 0;
    const end = track.ends[k] ?? start;
    for (let t = start; t < end; t += 0.05) {
      choirStateAt(track, t, state);
      angles.push(state.jaw * MathUtils.RAD2DEG);
    }
  }
  all.push(...angles);
  const sorted = angles.toSorted((a, b) => a - b);
  const q = (p: number): number => sorted[Math.round(p * (sorted.length - 1))] ?? 0;
  console.log(`player ${index}: ${track.starts.length} notes, jaw p10 ${q(0.1).toFixed(1)}°, p50 ${q(0.5).toFixed(1)}°, p90 ${q(0.9).toFixed(1)}°, max ${q(1).toFixed(1)}°`);
}
const sorted = all.toSorted((a, b) => a - b);
const q = (p: number): number => sorted[Math.round(p * (sorted.length - 1))] ?? 0;
const open = all.filter((a) => a > 10).length / Math.max(all.length, 1);
console.log(`all singers while a note sounds: p10 ${q(0.1).toFixed(1)}°, p50 ${q(0.5).toFixed(1)}°, p90 ${q(0.9).toFixed(1)}°, max ${q(1).toFixed(1)}°, open above 10° ${(open * 100).toFixed(0)}% of the samples`);
for (const p of [0.1, 0.5, 0.9]) {
  const drop = reach * Math.sin(q(p) * MathUtils.DEG2RAD);
  console.log(`p${p * 100}: the tip of the lower beak drops ${(drop * 100).toFixed(1)} cm`);
}
