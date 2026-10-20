import {
  note,
  programChange,
  tempo,
  timeSignature,
  track,
  trackName,
} from '../src/midi/test-smf.ts';
import { writeSmf } from '../src/midi/test-smf.ts';
import type { TestEvent, TestFile } from '../src/midi/test-smf.ts';
import { RHYTHM_CHANNEL } from '../src/score/drum-map.ts';
import { patchedDemos } from './patch-demos.ts';
import type { DemoFile } from './patch-demos.ts';

/** The ticks of one quarter note. */
const Q = 480;

/** The bars of the percussion test score, in 4/4 at 100 BPM: 38.4 s. */
const BARS = 16;

/** The GM1 keys of the rhythm channel that the percussion test score plays (design 3.6). */
const DRUM_KEYS = {
  bass: 36,
  snare: 38,
  crash: 49,
  triangle: 81,
  tambourine: 54,
} as const;

/** The lowest and the highest key of the xylophone of the app (`XYLOPHONE.keys`). */
const XYLOPHONE_KEYS = [72, 101] as const;

/**
 * Makes one drum note of the rhythm channel.
 *
 * @param beat The start, in quarter notes from the start of the score.
 * @param key The GM1 key.
 * @returns The events of the note, a sixteenth note long.
 */
function hit(beat: number, key: number): TestEvent[] {
  const tick = Math.round(beat * Q);
  return note(tick, RHYTHM_CHANNEL, key, tick + Q / 4 - 10);
}

/**
 * Makes the notes of one bar of the drum part: the bass drum on beats 1 and 3, the snare drum on
 * beats 2 and 4 with a roll of sixteenth notes in each fourth bar, the crash cymbals at the start
 * of each second bar, the triangle on beat 2 of the odd bars, and the tambourine on beat 4 of the
 * even bars.
 *
 * @param bar The bar, from 0.
 * @returns The events of the bar.
 */
function drumBar(bar: number): TestEvent[][] {
  const at = bar * 4;
  const notes = [hit(at, DRUM_KEYS.bass), hit(at + 2, DRUM_KEYS.bass)];
  const snare = bar % 4 === 3 ? [2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75] : [1, 3];
  notes.push(...snare.map((beat) => hit(at + beat, DRUM_KEYS.snare)));
  if (bar % 2 === 0) {
    notes.push(hit(at, DRUM_KEYS.crash));
  }
  notes.push(bar % 2 === 1 ? hit(at + 1, DRUM_KEYS.triangle) : hit(at + 3, DRUM_KEYS.tambourine));
  return notes;
}

/**
 * Makes the notes of the xylophone: eighth notes that go up and down over each key of the
 * xylophone, the sharps too, so that each bar of both rows gets strikes.
 *
 * @param channel The channel.
 * @returns The events.
 */
function xylophoneNotes(channel: number): TestEvent[][] {
  const [low, high] = XYLOPHONE_KEYS;
  const span = high - low;
  return Array.from({ length: BARS * 8 }, (_, i) => {
    const phase = i % (2 * span);
    const key = phase <= span ? low + phase : high - (phase - span);
    const tick = i * (Q / 2);
    return note(tick, channel, key, tick + Q / 2 - 10);
  });
}

/**
 * Builds the percussion test score of the probe tools (`docs/decisions/2026-10-20-mesh-badger.md`):
 * a drum part with each player of a percussion seat (the bass drum, the snare drum, the cymbals,
 * and the small percussion), and two xylophone parts on two channels, so that the score has 6
 * players and keeps the layout of an orchestra (design 4.2). No demo has a snare drum or a
 * xylophone, so the probes measure their holds on this score. It is no demo, and the app does not
 * load it.
 *
 * @returns The test file.
 */
export function percussionTestFile(): TestFile {
  return {
    tracks: [
      [trackName('Percussion Test'), tempo(0, 100), timeSignature(0, 4, 4)],
      track(
        [trackName('Drums'), programChange(0, RHYTHM_CHANNEL, 0)],
        ...Array.from({ length: BARS }, (_, bar) => drumBar(bar)).flat(),
      ),
      track([trackName('Xylophone I'), programChange(0, 0, 13)], ...xylophoneNotes(0)),
      track([trackName('Xylophone II'), programChange(0, 1, 13)], ...xylophoneNotes(1)),
    ],
  };
}

/**
 * The scores of the probe tools that are no demo, by their file name: scores with the parts that
 * no demo plays.
 */
export const TOOL_SCORES: ReadonlyMap<string, () => TestFile> = new Map([
  ['percussion-test.mid', percussionTestFile],
]);

/**
 * Gives the scores of the probe tools of the poses and the bodies (`pnpm pose-depth`, `pnpm
 * hold-fit`, `pnpm fold-probe`, `pnpm arm-check`, `pnpm hold-reach`, and `pnpm mesh-options`):
 * each demo of {@link patchedDemos}, then each score of {@link TOOL_SCORES}. A role with no player
 * in a tool score keeps the demos of the app.
 *
 * @returns The demos and the tool scores.
 */
export async function probeDemos(): Promise<DemoFile[]> {
  const tools = [...TOOL_SCORES].map(([file, build]): DemoFile => {
    const bytes = writeSmf(build());
    return { file, bytes, source: bytes };
  });
  return [...(await patchedDemos()), ...tools];
}
