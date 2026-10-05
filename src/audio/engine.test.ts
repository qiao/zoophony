import type { SpessaSynthProcessor } from 'spessasynth_core';
import { beforeAll, describe, expect, it } from 'vitest';

import type { SynthEvent } from '../score/types.ts';
import type { ClockAnchor } from './clock.ts';
import { BLOCK_FRAMES, SynthEngine } from './engine.ts';
import type { EngineBank } from './engine.ts';
import { packSynthEvents } from './synth-events.ts';
import { testBanks } from './test-banks.ts';

const SAMPLE_RATE = 48_000;

const on = (timeSec: number, channel: number, key: number): SynthEvent => ({
  timeSec,
  channel,
  kind: 0x90,
  data1: key,
  data2: 100,
  seatIndex: 0,
});
const off = (timeSec: number, channel: number, key: number): SynthEvent => ({
  timeSec,
  channel,
  kind: 0x80,
  data1: key,
  data2: 0,
  seatIndex: 0,
});
const program = (timeSec: number, channel: number, value: number): SynthEvent => ({
  timeSec,
  channel,
  kind: 0xc0,
  data1: value,
  data2: 0,
  seatIndex: -1,
});

/** An engine that renders offline, with the anchors that it posted. */
class OfflineRun {
  readonly engine: SynthEngine;
  readonly anchors: ClockAnchor[] = [];
  #frame = 0;

  constructor(banks: readonly EngineBank[], events: readonly SynthEvent[], durationSec: number) {
    this.engine = new SynthEngine(SAMPLE_RATE, (anchor) => this.anchors.push(anchor));
    const table = packSynthEvents(events);
    this.engine.loadScore(table, durationSec);
    this.engine.addBanks(banks.map((bank) => ({ id: bank.id, data: bank.data.slice(0) })));
  }

  /** The synth of the engine, for the channel state. */
  get synth(): SpessaSynthProcessor {
    // Element access reaches the TypeScript private synth (AGENTS.md "Visibility").
    return this.engine['synth'];
  }

  /** Context seconds at the next block start. */
  get time(): number {
    return this.#frame / SAMPLE_RATE;
  }

  /** Renders blocks up to a context time, and returns the peak level of the output. */
  renderTo(timeSec: number): number {
    const left = new Float32Array(BLOCK_FRAMES);
    const right = new Float32Array(BLOCK_FRAMES);
    let peak = 0;
    while (this.time < timeSec) {
      left.fill(0);
      right.fill(0);
      this.engine.render(this.time, left, right);
      for (let i = 0; i < BLOCK_FRAMES; i++) {
        peak = Math.max(peak, Math.abs(left[i] ?? 0), Math.abs(right[i] ?? 0));
      }
      this.#frame += BLOCK_FRAMES;
    }
    return peak;
  }

  voices(channel: number): number {
    return this.synth.midiChannels[channel]?.voiceCount ?? 0;
  }
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
    const run = new OfflineRun(banks, [on(0, 20, 60), off(1, 20, 60)], 1);
    expect(run.engine.channelCount).toBe(32);
    const drums = run.synth.midiChannels.flatMap((channel, i) => (channel.drumChannel ? [i] : []));
    expect(drums).toEqual([9, 25]);
  });

  it('resets the new channels when the banks loaded before the score', () => {
    const engine = new SynthEngine(SAMPLE_RATE, () => undefined);
    engine.addBanks(banks.map((bank) => ({ id: bank.id, data: bank.data.slice(0) })));
    engine.loadScore(packSynthEvents([on(0, 20, 60), off(1, 20, 60)]), 1);
    const synth = engine['synth'];
    const drums = synth.midiChannels.flatMap((channel, i) => (channel.drumChannel ? [i] : []));
    expect(drums).toEqual([9, 25]);
  });

  it('is silent while paused, and sounds after play', () => {
    const run = new OfflineRun(banks, [program(0, 0, 40), on(0, 0, 60), off(2, 0, 60)], 2);
    expect(run.renderTo(0.2)).toBe(0);
    run.engine.enqueue({ type: 'play' });
    expect(run.renderTo(0.4)).toBeGreaterThan(0.01);
  });

  it('posts an anchor at play, one each second, and one at pause', () => {
    const run = new OfflineRun(banks, [on(0, 0, 60), off(5, 0, 60)], 5);
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
    const run = new OfflineRun(banks, [program(0, 0, 48), on(0, 0, 60), off(9, 0, 60)], 9);
    run.engine.enqueue({ type: 'play' });
    run.renderTo(0.5);
    run.engine.enqueue({ type: 'pause' });
    run.renderTo(2.5);
    expect(run.voices(0)).toBe(0);
  });

  it('pauses at the song end with an anchor at the song length', () => {
    const run = new OfflineRun(banks, [on(0, 0, 60), off(0.5, 0, 60)], 0.5);
    run.engine.enqueue({ type: 'play' });
    run.renderTo(1);
    expect(run.engine.playing).toBe(false);
    expect(run.anchors.at(-1)).toMatchObject({ songTime: 0.5, rate: 0 });
    expect(run.anchors.at(-1)?.contextTime).toBeCloseTo(0.5, 9);
  });

  it('restores the program of the seek point', () => {
    const events = [program(0, 0, 40), program(1, 0, 48), on(2, 0, 60), off(3, 0, 60)];
    const run = new OfflineRun(banks, events, 3);
    run.engine.enqueue({ type: 'seek', songSec: 1.5 });
    run.renderTo(0.01);
    expect(run.synth.midiChannels[0]?.patch.program).toBe(48);
    run.engine.enqueue({ type: 'seek', songSec: 0.5 });
    run.renderTo(0.02);
    expect(run.synth.midiChannels[0]?.patch.program).toBe(40);
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
    const run = new OfflineRun(banks, events, 6);
    run.engine.enqueue({ type: 'play' });
    run.renderTo(0.5);
    run.engine.enqueue({ type: 'seek', songSec: 1.5 });
    // A released piano voice lasts about 1 s, and a released violin voice about 1.6 s.
    run.renderTo(2.5);
    expect(run.voices(0)).toBeGreaterThan(0);
    expect(run.voices(1)).toBe(0);
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
    const run = new OfflineRun(banks, events, 10);
    run.engine.enqueue({ type: 'play' });
    run.renderTo(0.1);
    run.engine.enqueue({ type: 'seek', songSec: 1 });
    // Song 5.9 s: a release at 4 s would be over (about 1.6 s), and the note must still sound.
    run.renderTo(5);
    expect(run.voices(1)).toBeGreaterThan(0);
    run.renderTo(8);
    expect(run.voices(1)).toBe(0);
  });

  it('keeps the volume after a seek', () => {
    const run = new OfflineRun(banks, [program(0, 0, 40), on(0, 0, 60), off(3, 0, 60)], 3);
    run.engine.setVolume(0);
    run.engine.enqueue({ type: 'play' });
    run.engine.enqueue({ type: 'seek', songSec: 0 });
    expect(run.renderTo(0.5)).toBe(0);
  });
});
