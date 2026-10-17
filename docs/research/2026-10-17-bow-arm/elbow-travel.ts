/**
 * Measures the turn of the right upper arm in the fast runs across two strings (research of
 * 2026-10-17, round `bow-arm`, rule B3): the bowed pose of `src/pose/bowed.ts` of the first player
 * of the first violin seat of each demo, on the rabbit with its hold, in the playing frames with
 * no idle motion. In each sample of 10 ms of the strokes whose right elbow keeps the mean string
 * (`Stroke.crossMean`), it adds the angle between the local rotations of the right upper arm and
 * of the right forearm in two samples in a row. A second pass sets the mean string to the string
 * of the bow, as before the rule. A third pass keeps the bow on the mean string, with no crossing,
 * so that its turn is the turn of the strokes alone. It prints the turn of each bone for each
 * second in the three passes.
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-17-bow-arm/elbow-travel.ts [--demo <id>]...
 */
import { Quaternion } from 'three';

import { buildPlayer } from '../../../src/models/player.ts';
import { BONE_NAMES } from '../../../src/models/rig.ts';
import { bowedRig, holdOf, playingFrames } from '../../../src/pose/bowed-rig.ts';
import { poseBowed } from '../../../src/pose/bowed.ts';
import { noteLoudness } from '../../../src/pose/loudness.ts';
import { bowStateAt, buildStrokes, createBowState, vibratoRate } from '../../../src/pose/strokes.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

const args = process.argv.slice(2);
const asked = args.flatMap((arg, i) => (args[i - 1] === '--demo' ? [arg] : []));
const model = buildPlayer('rabbit', 'violin');
const rig = bowedRig(model, 'violin', holdOf('rabbit', 'violin'));
const frames = playingFrames(rig);
const bones = [rig.armR.bones.upperArm, rig.armR.bones.forearm] as const;
const rotations = new Float32Array(BONE_NAMES.length * 4);
const offset: [number, number, number] = [0, 0, 0];
const state = createBowState();

/** A pass of the probe: the rule, no rule, or no crossing. */
type Pass = 'rule' | 'none' | 'still';

/**
 * Gives the local rotations of the right upper arm and forearm at one time.
 *
 * @param strokes The strokes.
 * @param starts The starts of the strokes.
 * @param time The song time.
 * @param pass `rule` keeps the mean string of the rule, `none` follows the string of the bow, and
 *   `still` keeps the bow on the mean string.
 * @returns The two rotations.
 */
function armAt(
  strokes: ReturnType<typeof buildStrokes>,
  starts: Float64Array,
  time: number,
  pass: Pass,
): Quaternion[] {
  bowStateAt(strokes, starts, time, state);
  if (pass === 'none') {
    state.crossMean = state.string;
  } else if (pass === 'still') {
    state.string = state.crossMean;
  }
  poseBowed(rig, frames, state, 1, rotations, offset);
  return bones.map((b) => new Quaternion().fromArray(rotations, b * 4));
}

const PASSES: readonly Pass[] = ['rule', 'none', 'still'];
console.log(
  '| Demo | Seconds in the runs | Upper arm °/s: rule, no rule, no crossing | Forearm °/s: rule, no rule, no crossing |',
);
console.log('|---|---|---|---|');
const total = { seconds: 0, upper: [0, 0, 0], fore: [0, 0, 0] };
for (const demo of await patchedDemos()) {
  const id = demo.file.replace(/\.mid$/, '');
  if (asked.length > 0 && !asked.includes(id)) {
    continue;
  }
  const score = scoreOf(demo.bytes);
  const seat = score.seats.findIndex((s) => s.section === 'violin');
  if (seat < 0) {
    continue;
  }
  const all = noteLoudness(score);
  const notes = score.notes.filter((n) => n.seatIndex === seat && n.player === 0);
  const loudness = score.notes.flatMap((n, i) =>
    n.seatIndex === seat && n.player === 0 ? [all[i] ?? 0] : [],
  );
  const beats = Float64Array.from(score.beats, (b) => b.timeSec);
  const strokes = buildStrokes(
    notes,
    loudness,
    rig.bowRange,
    1,
    'violin',
    vibratoRate('violin', 0.5),
    beats,
  );
  const starts = Float64Array.from(strokes, (s) => s.start);
  const row = { seconds: 0, upper: [0, 0, 0], fore: [0, 0, 0] };
  for (const [k, s] of strokes.entries()) {
    const next = strokes[k + 1];
    if (s.crossMean === s.string && next?.crossMean === next?.string) {
      continue;
    }
    const end = next ? next.start : s.end;
    let before = PASSES.map((pass) => armAt(strokes, starts, s.start, pass));
    for (let t = s.start + 0.01; t <= end + 1e-9; t += 0.01) {
      const now = PASSES.map((pass) => armAt(strokes, starts, t, pass));
      for (const p of [0, 1, 2]) {
        const a = before[p] ?? [];
        const b = now[p] ?? [];
        row.upper[p] = (row.upper[p] ?? 0) + (a[0]?.angleTo(b[0] ?? new Quaternion()) ?? 0) * (180 / Math.PI);
        row.fore[p] = (row.fore[p] ?? 0) + (a[1]?.angleTo(b[1] ?? new Quaternion()) ?? 0) * (180 / Math.PI);
      }
      row.seconds += 0.01;
      before = now;
    }
  }
  if (row.seconds === 0) {
    continue;
  }
  total.seconds += row.seconds;
  for (const p of [0, 1, 2]) {
    total.upper[p] = (total.upper[p] ?? 0) + (row.upper[p] ?? 0);
    total.fore[p] = (total.fore[p] ?? 0) + (row.fore[p] ?? 0);
  }
  const rates = (v: number[]): string => v.map((x) => (x / row.seconds).toFixed(1)).join(', ');
  console.log(`| ${id} | ${row.seconds.toFixed(1)} | ${rates(row.upper)} | ${rates(row.fore)} |`);
}
const rates = (v: number[]): string => v.map((x) => (x / total.seconds).toFixed(1)).join(', ');
console.log(`| all | ${total.seconds.toFixed(1)} | ${rates(total.upper)} | ${rates(total.fore)} |`);
