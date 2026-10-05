import type { SpessaSynthProcessor } from 'spessasynth_core';
import { beforeAll, describe, expect, it } from 'vitest';

import { noteOff, noteOn, port, programChange } from '../midi/test-smf.ts';
import type { TestEvent, TestFile } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import { SynthEngine } from './engine.ts';
import type { EngineBank } from './engine.ts';
import { packSynthEvents } from './synth-events.ts';
import { OfflineHarness, TEST_SAMPLE_RATE, copyBanks, testBanks } from './test-banks.ts';

/** The ticks of one second at the default 120 BPM and 480 ticks for each quarter. */
const SECOND = 960;

const on = (sec: number, channel: number, key: number): TestEvent =>
  noteOn(sec * SECOND, channel, key);

const off = (sec: number, channel: number, key: number): TestEvent =>
  noteOff(sec * SECOND, channel, key);

const program = (sec: number, channel: number, value: number): TestEvent =>
  programChange(sec * SECOND, channel, value);

/** A file with a note on channel 4 of port 1, which is synth channel 20 (design 3.4). */
const SECOND_PORT: TestFile = {
  tracks: [[program(0, 0, 0)], [port(1), on(0, 4, 60), off(1, 4, 60)]],
};

/**
 * Makes an offline harness for the score of a file of one track.
 *
 * @param banks The banks.
 * @param events The events of the track, with ticks from {@link SECOND}.
 * @param durationSec The song length. The default is the length of the score.
 * @returns The harness.
 */
function harness(
  banks: readonly EngineBank[],
  events: readonly TestEvent[],
  durationSec?: number,
): OfflineHarness {
  const score = scoreOf({ tracks: [events] });
  return new OfflineHarness(
    packSynthEvents(score.synthEvents),
    durationSec ?? score.durationSec,
    banks,
  );
}

/** Gives the synth of an engine, for the channel state. */
function synthOf(engine: SynthEngine): SpessaSynthProcessor {
  // Element access reaches the TypeScript private synth (AGENTS.md "Visibility").
  return engine['synth'];
}

/** Counts the voices of a synth channel. */
function voices(run: OfflineHarness, channel: number): number {
  return synthOf(run.engine).midiChannels[channel]?.voiceCount ?? 0;
}

describe('SynthEngine', () => {
  let banks: EngineBank[];

  beforeAll(async () => {
    banks = await testBanks([
      { bank: 0, program: 0, drumKit: false },
      { bank: 0, program: 40, drumKit: false },
      { bank: 0, program: 48, drumKit: false },
      // Core makes a channel a drum channel only when a drum kit is loaded.
      { bank: 128, program: 0, drumKit: true },
    ]);
  });

  it('makes 16 channels for each port, with a drum channel at channel 10 of each port', () => {
    const score = scoreOf(SECOND_PORT);
    const run = new OfflineHarness(packSynthEvents(score.synthEvents), score.durationSec, banks);
    expect(run.engine.channelCount).toBe(32);
    const drums = synthOf(run.engine).midiChannels.flatMap((channel, i) =>
      channel.drumChannel ? [i] : [],
    );
    expect(drums).toEqual([9, 25]);
  });

  it('resets the new channels when the banks loaded before the score', () => {
    const engine = new SynthEngine(TEST_SAMPLE_RATE, () => undefined);
    engine.addBanks(copyBanks(banks));
    const score = scoreOf(SECOND_PORT);
    engine.loadScore(packSynthEvents(score.synthEvents), score.durationSec);
    const synth = synthOf(engine);
    const drums = synth.midiChannels.flatMap((channel, i) => (channel.drumChannel ? [i] : []));
    expect(drums).toEqual([9, 25]);
  });

  it('is silent while paused, and sounds after play', () => {
    const run = harness(banks, [program(0, 0, 40), on(0, 0, 60), off(2, 0, 60)]);
    expect(run.renderTo(0.2)).toBe(0);
    run.engine.enqueue({ type: 'play' });
    expect(run.renderTo(0.4)).toBeGreaterThan(0.01);
  });

  it('posts an anchor at play, one each second, and one at pause', () => {
    const run = harness(banks, [on(0, 0, 60), off(5, 0, 60)]);
    run.renderTo(0.1);
    const playTime = run.time;
    run.engine.enqueue({ type: 'play' });
    run.renderTo(2.5);
    run.engine.enqueue({ type: 'pause' });
    run.renderTo(3);
    expect(run.anchors.map((anchor) => anchor.rate)).toEqual([1, 1, 1, 0]);
    expect(run.anchors[0]).toEqual({ contextTime: playTime, songTime: 0, rate: 1 });
    const second = run.anchors[1];
    expect(second?.contextTime).toBeGreaterThanOrEqual(playTime + 1);
    expect((second?.songTime ?? 0) - (second?.contextTime ?? 0)).toBeCloseTo(-playTime, 6);
  });

  it('releases all notes at a pause', () => {
    const run = harness(banks, [program(0, 0, 48), on(0, 0, 60), off(9, 0, 60)]);
    run.engine.enqueue({ type: 'play' });
    run.renderTo(0.5);
    run.engine.enqueue({ type: 'pause' });
    run.renderTo(2.5);
    expect(voices(run, 0)).toBe(0);
  });

  it('pauses at the song end with an anchor at the song length', () => {
    const run = harness(banks, [on(0, 0, 60), off(0.5, 0, 60)]);
    run.engine.enqueue({ type: 'play' });
    run.renderTo(1);
    expect(run.engine.playing).toBe(false);
    expect(run.anchors.at(-1)).toMatchObject({ songTime: 0.5, rate: 0 });
    expect(run.anchors.at(-1)?.contextTime).toBeCloseTo(0.5, 9);
  });

  it('restores the program of the seek point', () => {
    const events = [program(0, 0, 40), program(1, 0, 48), on(2, 0, 60), off(3, 0, 60)];
    const run = harness(banks, events);
    run.engine.enqueue({ type: 'seek', songSec: 1.5 });
    run.renderTo(0.01);
    expect(synthOf(run.engine).midiChannels[0]?.patch.program).toBe(48);
    run.engine.enqueue({ type: 'seek', songSec: 0.5 });
    run.renderTo(0.02);
    expect(synthOf(run.engine).midiChannels[0]?.patch.program).toBe(40);
  });

  it('starts a held violin note again after a seek, but not a held piano note', () => {
    const events = [
      program(0, 0, 40),
      program(0, 1, 0),
      on(0, 0, 60),
      on(0, 1, 60),
      off(6, 0, 60),
      off(6, 1, 60),
    ];
    const run = harness(banks, events);
    run.engine.enqueue({ type: 'play' });
    run.renderTo(0.5);
    run.engine.enqueue({ type: 'seek', songSec: 1.5 });
    // A released piano voice lasts about 1 s, and a released violin voice about 1.6 s.
    run.renderTo(2.5);
    expect(voices(run, 0)).toBeGreaterThan(0);
    expect(voices(run, 1)).toBe(0);
  });

  it('does not end a later note with the note off of a held note that did not start again', () => {
    const events = [
      program(0, 1, 0),
      on(0, 1, 60), // piano: held at the seek, so it does not start again
      program(2, 1, 48),
      on(2.5, 1, 60), // strings: starts before the note off of the piano note
      off(4, 1, 60), // ends the piano note (first in, first out), so the engine skips it
      off(6, 1, 60), // ends the strings note
    ];
    // A song end releases all notes, so the song is longer than its events.
    const run = harness(banks, events, 10);
    run.engine.enqueue({ type: 'play' });
    run.renderTo(0.1);
    run.engine.enqueue({ type: 'seek', songSec: 1 });
    // Song 5.9 s: a release at 4 s would be over (about 1.6 s), and the note must still sound.
    run.renderTo(5);
    expect(voices(run, 1)).toBeGreaterThan(0);
    run.renderTo(8);
    expect(voices(run, 1)).toBe(0);
  });

  it('keeps the volume after a seek', () => {
    const run = harness(banks, [program(0, 0, 40), on(0, 0, 60), off(3, 0, 60)]);
    run.engine.setVolume(0);
    run.engine.enqueue({ type: 'play' });
    run.engine.enqueue({ type: 'seek', songSec: 0 });
    expect(run.renderTo(0.5)).toBe(0);
  });
});
