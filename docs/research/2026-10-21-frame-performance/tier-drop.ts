/**
 * Gives the part of the minutes of play in which the automatic tier drops (design 2.6, the task
 * S2 of `TODO.md` step 7, the report `2026-10-21-frame-performance.md`). Run from the repository
 * root: `node docs/research/2026-10-21-frame-performance/tier-drop.ts`.
 *
 * Each minute starts at the high tier. Each frame has the interval of the display with a jitter
 * of ±2% from a seeded random number, and a missed frame at random with the given share adds one
 * interval. The probe runs `followFrame()` over the frames of the minute, and counts a minute in
 * which the tier drops.
 */
import { followFrame, watchTier } from '../../../src/app/settings.ts';

/** The minutes of each row. */
const MINUTES = 2000;

/**
 * Makes a random generator with a seed (mulberry32).
 *
 * @param seed The seed.
 * @returns A function that gives a number from 0 to 1.
 */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

console.log('| Display | Missed frames | Minutes with a drop |');
console.log('|---|---|---|');
for (const hz of [60, 50]) {
  for (const missed of [0, 0.01, 0.02, 0.05, 0.1, 0.2]) {
    const next = random(hz * 1000 + Math.round(missed * 1000));
    let drops = 0;
    for (let minute = 0; minute < MINUTES; minute++) {
      let watch = watchTier('high');
      let time = 0;
      for (let frame = 0; frame < hz * 60; frame++) {
        const interval = (1 / hz) * (1 + (next() - 0.5) * 0.04);
        time += next() < missed ? 2 * interval : interval;
        watch = followFrame(watch, time, true);
      }
      if (watch.tier !== 'high') {
        drops += 1;
      }
    }
    console.log(`| ${hz} Hz | ${missed * 100}% | ${((drops / MINUTES) * 100).toFixed(1)}% |`);
  }
}
