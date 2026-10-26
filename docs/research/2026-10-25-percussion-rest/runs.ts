/**
 * Measures the runs of each xylophone player of a file: the hand changes of the fast pairs (two
 * single strikes within 0.5 s), the double strokes of the fast pairs, the longest run in one hand,
 * the strikes within 5 mm of their bars, and over the play at a step, the least gap of the two
 * heads and the share of the samples in which the two mallets touch.
 * Usage: SET='<changes>' node docs/research/2026-10-25-percussion-rest/runs.ts <midi path | percussion-test> [step]
 */
import { readFile } from 'node:fs/promises';
import { Vector3 } from 'three';

import { setHolds } from '../../../tools/hold-sets.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { sceneOf, PLAYING, allAudible } from '../../../src/pose/test-scene.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton, posedPiecePoint } from '../../../src/pose/test-kinematics.ts';
import { posedPart, partDistance } from '../../../src/pose/test-clearance.ts';
import { countInAt } from '../../../src/pose/count-in.ts';
import { boneIndex } from '../../../src/models/rig.ts';

const changes = process.env['SET'] ? setHolds(process.env['SET']) : null;
const file = process.argv[2] ?? 'percussion-test';
const step = Number(process.argv[3] ?? 0.05);
const bytes = file.includes('/')
  ? new Uint8Array(await readFile(file))
  : (await probeDemos()).find((d) => d.file === `${file}.mid`)?.bytes;
if (!bytes) {
  throw new Error(`no file ${file}`);
}
const s = sceneOf(bytes);
const audible = allAudible(s.score);
const buffer = createScenePose(s.plan);
const lead = countInAt(s.plan.beats, 0).lengthSec;
const RADIUS = 0.012;
const pct = (a: number, b: number): string => `${((100 * a) / Math.max(1, b)).toFixed(0)}%`;
interface Track {
  readonly starts: Float64Array;
  readonly points: Float64Array;
}
for (const [index, pl] of s.layout.players.entries()) {
  if (pl.cast.instrument !== 'xylophone') {
    continue;
  }
  const model = s.models.get(pl.cast.species, 'xylophone', pl.cast.kettles, pl.cast.support);
  const plan = s.plan.players[index];
  if (!plan) {
    continue;
  }
  const layer = plan.note as unknown as Record<'left' | 'right', Track>;
  // The strikes of both hands in order of time.
  const strikes: { start: number; side: 'L' | 'R'; x: number; i: number }[] = [];
  for (const [side, tr] of [
    ['L', layer.left],
    ['R', layer.right],
  ] as const) {
    for (let i = 0; i < tr.starts.length; i++) {
      strikes.push({ start: tr.starts[i] ?? 0, side, x: tr.points[3 * i] ?? 0, i });
    }
  }
  strikes.sort((a, b) => a.start - b.start || (a.side === 'L' ? -1 : 1));
  if (process.env['DUMP']) {
    console.log(strikes.slice(0, Number(process.env['DUMP'])).map((st) => `${st.start.toFixed(2)}${st.side}${(st.x * 100).toFixed(1)}`).join(' '));
  }
  let fast = 0;
  let changesN = 0;
  let longest = 0;
  let run = 0;
  let passes = 0;
  for (let k = 1; k < strikes.length; k++) {
    const a = strikes[k - 1];
    const b = strikes[k];
    if (!a || !b || b.start - a.start < 0.04) {
      continue;
    }
    if (b.start - a.start < 0.5) {
      fast++;
      if (a.side !== b.side) {
        changesN++;
      }
    }
    run = a.side === b.side ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  // The passes: a strike of one hand past the last target of the other hand.
  let lastL = -Infinity;
  let lastR = Infinity;
  for (const st of strikes) {
    if (st.side === 'L') {
      if (st.x > lastR + 1e-6) passes++;
      lastL = st.x;
    } else {
      if (st.x < lastL - 1e-6) passes++;
      lastR = st.x;
    }
  }
  // The misses at each strike.
  const headOf = (bone: 'malletL' | 'malletR'): readonly [number, number, number] =>
    model.instrument.targets.find((t) => t.kind === 'mallet-head' && t.bone === bone)?.from ?? [
      0, 0, 0,
    ];
  const within = { L: 0, R: 0 };
  const count = { L: 0, R: 0 };
  let worst = 0;
  for (const st of strikes) {
    const tr = st.side === 'L' ? layer.left : layer.right;
    const start = st.start + plan.timeOffset;
    const posed = poseSkeleton(
      model,
      poseAt(s.plan, start, 10 + start + lead, PLAYING, audible, buffer).players[index] ??
        (() => {
          throw new Error('no pose');
        })(),
    );
    const bone = st.side === 'L' ? 'malletL' : 'malletR';
    const target = new Vector3(
      tr.points[3 * st.i],
      tr.points[3 * st.i + 1],
      tr.points[3 * st.i + 2],
    );
    const e = new Vector3(...posedPiecePoint(posed, { bone, at: headOf(bone) })).distanceTo(target);
    count[st.side]++;
    if (e < 0.005) within[st.side]++;
    worst = Math.max(worst, e);
  }
  // The heads and the mallets over the play.
  const first = (strikes[0]?.start ?? 0) + plan.timeOffset;
  const last = (strikes.at(-1)?.start ?? 0) + plan.timeOffset;
  let samples = 0;
  let touch = 0;
  let gapMin = Infinity;
  // The samples in which a head is higher than the shoulder joint of its side.
  let above = 0;
  let highest = -Infinity;
  const touches: string[] = [];
  for (let t = first; t <= last; t += step) {
    const pose = poseAt(s.plan, t, 10 + t + lead, PLAYING, audible, buffer).players[index];
    if (!pose) continue;
    const posed = poseSkeleton(model, pose);
    const l = new Vector3(...posedPiecePoint(posed, { bone: 'malletL', at: headOf('malletL') }));
    const r = new Vector3(...posedPiecePoint(posed, { bone: 'malletR', at: headOf('malletR') }));
    gapMin = Math.min(gapMin, l.distanceTo(r) - 2 * RADIUS);
    const shoulderL = posed.frames[boneIndex('upperArmL')]?.position.y ?? Infinity;
    const shoulderR = posed.frames[boneIndex('upperArmR')]?.position.y ?? Infinity;
    if (l.y > shoulderL || r.y > shoulderR) above++;
    highest = Math.max(highest, l.y - shoulderL, r.y - shoulderR);
    if (process.env['HEADS'] && l.distanceTo(r) - 2 * RADIUS < Number(process.env['HEADS'])) {
      console.log(`  t ${t.toFixed(2)} L ${l.toArray().map((v) => (v * 100).toFixed(1)).join(',')} R ${r.toArray().map((v) => (v * 100).toFixed(1)).join(',')} gap ${((l.distanceTo(r) - 2 * RADIUS) * 100).toFixed(1)}`);
    }
    samples++;
    if (partDistance(posedPart(posed, ['malletL']), posedPart(posed, ['malletR']), 0.05) === 0) {
      touch++;
      if (touches.length < 6) touches.push(t.toFixed(2));
    }
  }
  console.log(
    `${file.split('/').at(-1)} player ${index}: fast pairs ${fast}, hand changes ${pct(changesN, fast)}, longest run ${longest}, passes ${passes}; within 5 mm L ${pct(within.L, count.L)} of ${count.L}, R ${pct(within.R, count.R)} of ${count.R}, worst ${(worst * 1000).toFixed(0)} mm; head gap min ${(gapMin * 100).toFixed(1)} cm; mallets touch ${pct(touch, samples)} of ${samples} (${touches.join(' ')}); a head above its shoulder ${pct(above, samples)}, highest ${(highest * 100).toFixed(1)} cm over it`,
  );
}
changes?.undo();
