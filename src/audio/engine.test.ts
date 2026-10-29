import type { SpessaSynthProcessor } from 'spessasynth_core';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { controlChange, noteOff, noteOn, port, programChange } from '../midi/test-smf.ts';
import type { TestEvent, TestFile } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import type { SectionId } from '../score/types.ts';
import type { ClockAnchor } from './clock.ts';
import { BLOCK_FRAMES, ROOM_REVERB, SynthEngine } from './engine.ts';
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

/** An offline harness for a score, and the index of the first seat of each section. */
interface SeatRun {
  readonly run: OfflineHarness;
  readonly log: SentMessage[];
  seat(section: SectionId): number;
}

/**
 * Makes an offline harness for the score of a file of one track, and records its messages.
 *
 * @param banks The banks.
 * @param events The events of the track, with ticks from {@link SECOND}.
 * @returns The harness, the message log, and the seat finder.
 */
function seatRun(banks: readonly EngineBank[], events: readonly TestEvent[]): SeatRun {
  const score = scoreOf({ tracks: [events] });
  const run = new OfflineHarness(packSynthEvents(score.synthEvents), score.durationSec, banks);
  return {
    run,
    log: recordMessages(run.engine),
    seat: (section) => {
      const index = score.seats.findIndex((seat) => seat.section === section);
      expect(index).toBeGreaterThanOrEqual(0);
      return index;
    },
  };
}

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
  // Element access reaches the TypeScript private synth (docs/agents/code.md, "Visibility").
  return engine['synth'];
}

/** One message that the engine sent to the synth. */
interface SentMessage {
  /** The high nibble of the status byte. */
  readonly kind: number;
  /** The synth channel. */
  readonly channel: number;
  readonly data1: number;
  readonly data2: number;
}

/**
 * Records each message that the engine sends to its synth, and passes it on.
 *
 * @param engine The engine.
 * @returns The list that gets the messages, the oldest first.
 */
function recordMessages(engine: SynthEngine): SentMessage[] {
  const synth = synthOf(engine);
  const send = synth.processMessage;
  const log: SentMessage[] = [];
  vi.spyOn(synth, 'processMessage').mockImplementation((message, offset = 0, options) => {
    if (message instanceof Uint8Array) {
      const [status = 0, data1 = 0, data2 = 0] = message;
      log.push({ kind: status & 0xf0, channel: offset + (status & 0x0f), data1, data2 });
    }
    send(message, offset, options);
  });
  return log;
}

/** Lists the keys of the note ons of a synth channel in a message log. */
function noteOnKeys(log: readonly SentMessage[], channel: number): number[] {
  return log.flatMap((item) =>
    item.kind === 0x90 && item.data2 > 0 && item.channel === channel ? [item.data1] : [],
  );
}

/** Lists the keys of the note offs of a synth channel in a message log. */
function noteOffKeys(log: readonly SentMessage[], channel: number): number[] {
  return log.flatMap((item) =>
    item.channel === channel && (item.kind === 0x80 || (item.kind === 0x90 && item.data2 === 0))
      ? [item.data1]
      : [],
  );
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
    run.engine.enqueue({ type: 'play', countInSec: 0 });
    expect(run.renderTo(0.4)).toBeGreaterThan(0.01);
  });

  it('posts an anchor at play, one each second, and one at pause', () => {
    const run = harness(banks, [on(0, 0, 60), off(5, 0, 60)]);
    run.renderTo(0.1);
    const playTime = run.time;
    run.engine.enqueue({ type: 'play', countInSec: 0 });
    run.renderTo(2.5);
    run.engine.enqueue({ type: 'pause' });
    run.renderTo(3);
    // The first anchor is the anchor of the score load.
    expect(run.anchors.map((anchor) => anchor.rate)).toEqual([0, 1, 1, 1, 0]);
    expect(run.anchors[1]).toEqual({ contextTime: playTime, songTime: 0, rate: 1, load: 1 });
    const second = run.anchors[2];
    expect(second?.contextTime).toBeGreaterThanOrEqual(playTime + 1);
    expect((second?.songTime ?? 0) - (second?.contextTime ?? 0)).toBeCloseTo(-playTime, 6);
  });

  it('posts an anchor at the song start with a new load number after a new score', () => {
    const run = harness(banks, [on(0, 0, 60), off(5, 0, 60)]);
    run.renderTo(0.01);
    expect(run.anchors).toEqual([{ contextTime: 0, songTime: 0, rate: 0, load: 1 }]);
    run.engine.enqueue({ type: 'play', countInSec: 0 });
    run.renderTo(1.5);
    const score = scoreOf({ tracks: [[on(0, 0, 62), off(3, 0, 62)]] });
    run.engine.loadScore(packSynthEvents(score.synthEvents), score.durationSec);
    const loadTime = run.time;
    run.timeBlock();
    expect(run.anchors.at(-1)).toEqual({ contextTime: loadTime, songTime: 0, rate: 0, load: 2 });
    expect(run.anchors.slice(0, -1).every((anchor) => anchor.load === 1)).toBe(true);
  });

  it('releases all notes at a pause', () => {
    const run = harness(banks, [program(0, 0, 48), on(0, 0, 60), off(9, 0, 60)]);
    run.engine.enqueue({ type: 'play', countInSec: 0 });
    run.renderTo(0.5);
    run.engine.enqueue({ type: 'pause' });
    run.renderTo(2.5);
    expect(voices(run, 0)).toBe(0);
  });

  it('pauses at the song end with an anchor at the song length', () => {
    const run = harness(banks, [on(0, 0, 60), off(0.5, 0, 60)]);
    run.engine.enqueue({ type: 'play', countInSec: 0 });
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
    run.engine.enqueue({ type: 'play', countInSec: 0 });
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
    run.engine.enqueue({ type: 'play', countInSec: 0 });
    run.renderTo(0.1);
    run.engine.enqueue({ type: 'seek', songSec: 1 });
    // Song 5.9 s: a release at 4 s would be over (about 1.6 s), and the note must still sound.
    run.renderTo(5);
    expect(voices(run, 1)).toBeGreaterThan(0);
    run.renderTo(8);
    expect(voices(run, 1)).toBe(0);
  });

  describe('count-in (design 6.5)', () => {
    /** The length of one block at the test sample rate. */
    const BLOCK_SEC = BLOCK_FRAMES / TEST_SAMPLE_RATE;

    /** A violin from the downbeat to 6 s. */
    const VIOLIN: readonly TestEvent[] = [program(0, 0, 40), on(0, 0, 60), off(6, 0, 60)];

    /**
     * The highest sample of the tail of released voices and of the reverb, about 3 s after a
     * pause. A note gives more than 0.001 in its first block.
     */
    const TAIL = 1e-5;

    it('is silent in the count-in, and sounds from the block of the downbeat', () => {
      const { run, log } = seatRun(banks, [program(0, 0, 0), on(0, 0, 60), off(2, 0, 60)]);
      run.engine.enqueue({ type: 'play', countInSec: 0.9 });
      const downbeat = 0.9 * TEST_SAMPLE_RATE;
      let firstSound = Infinity;
      while (run.frame < downbeat + 4 * BLOCK_FRAMES && firstSound === Infinity) {
        const frame = run.frame;
        run.timeBlock();
        if (run.peak > 0) {
          firstSound = frame;
        }
      }
      // Design 6.4: an event sounds from the start of the block that holds its time.
      expect(firstSound).toBeLessThanOrEqual(downbeat);
      expect(firstSound).toBeGreaterThan(downbeat - BLOCK_FRAMES);
      expect(noteOnKeys(log, 0)).toEqual([60]);
    });

    it('posts the anchor of the play at the song time minus the count-in', () => {
      const run = harness(banks, VIOLIN);
      run.renderTo(0.1);
      const playTime = run.time;
      run.engine.enqueue({ type: 'play', countInSec: 0.9 });
      run.renderTo(1.5);
      expect(run.anchors[1]).toEqual({ contextTime: playTime, songTime: -0.9, rate: 1, load: 1 });
      // The song time runs from -0.9 s with the context time, so the anchor of each second agrees.
      const second = run.anchors[2];
      expect((second?.songTime ?? 0) - (second?.contextTime ?? 0)).toBeCloseTo(-0.9 - playTime, 6);
    });

    it('goes back to the start point at a pause in the count-in', () => {
      const run = harness(banks, VIOLIN);
      run.engine.enqueue({ type: 'play', countInSec: 0.9 });
      run.renderTo(0.5);
      run.engine.enqueue({ type: 'pause' });
      expect(run.renderTo(1.5)).toBe(0);
      expect(run.anchors.at(-1)).toMatchObject({ songTime: 0, rate: 0 });
      run.engine.enqueue({ type: 'play', countInSec: 0.9 });
      const playTime = run.time;
      run.timeBlock();
      expect(run.anchors.at(-1)).toMatchObject({ contextTime: playTime, songTime: -0.9 });
    });

    it('plays no note before the pause point again, and starts the held notes at it', () => {
      // A piano note that ends before the pause, and a violin note that holds over it.
      const events = [
        program(0, 0, 40),
        program(0, 1, 0),
        on(0, 0, 60),
        on(0.2, 1, 64),
        off(0.6, 1, 64),
        off(6, 0, 60),
      ];
      const { run, log } = seatRun(banks, events);
      run.engine.enqueue({ type: 'play', countInSec: 0 });
      run.renderTo(1);
      run.engine.enqueue({ type: 'pause' });
      // The released voices and the reverb end before the count-in.
      run.renderTo(4);
      const pauseSong = run.anchors.at(-1)?.songTime ?? 0;
      expect(pauseSong).toBeCloseTo(1, 2);
      const before = log.length;
      const playTime = run.time;
      run.engine.enqueue({ type: 'play', countInSec: 0.5 });
      expect(run.renderTo(playTime + 0.5 - BLOCK_SEC)).toBeLessThan(TAIL);
      expect(log.slice(before).filter((item) => item.kind === 0x90)).toEqual([]);
      expect(run.renderTo(playTime + 0.5 + BLOCK_SEC)).toBeGreaterThan(100 * TAIL);
      expect(noteOnKeys(log.slice(before), 0)).toEqual([60]);
      expect(noteOnKeys(log.slice(before), 1)).toEqual([]);
      expect(run.anchors.at(-1)).toMatchObject({ songTime: pauseSong - 0.5, rate: 1 });
    });

    it('only sets the flag of a seat change in the count-in, and the start point reads it', () => {
      const { run, log, seat } = seatRun(banks, VIOLIN);
      run.engine.enqueue({ type: 'play', countInSec: 0 });
      run.renderTo(1);
      run.engine.enqueue({ type: 'pause' });
      run.renderTo(4);
      const before = log.length;
      const playTime = run.time;
      run.engine.enqueue({ type: 'play', countInSec: 0.5 });
      run.renderTo(playTime + 0.2);
      run.engine.enqueue({ type: 'seat', seatIndex: seat('violin'), audible: false });
      run.engine.enqueue({ type: 'seat', seatIndex: seat('violin'), audible: true });
      run.timeBlock();
      expect(log.slice(before).filter((item) => item.kind === 0x90)).toEqual([]);
      run.engine.enqueue({ type: 'seat', seatIndex: seat('violin'), audible: false });
      expect(run.renderTo(playTime + 1)).toBeLessThan(TAIL);
      expect(noteOnKeys(log.slice(before), 0)).toEqual([]);
    });
  });

  describe('seat audibility (design 6.5, 6.6)', () => {
    /** A violin on channel 0 and a piano on channel 1, from 0 to 6 s. */
    const VIOLIN_AND_PIANO: readonly TestEvent[] = [
      program(0, 0, 40),
      program(0, 1, 0),
      on(0, 0, 60),
      on(0, 1, 64),
      off(6, 0, 60),
      off(6, 1, 64),
    ];

    it('skips the note ons of a silent seat and their note offs', () => {
      const { run, log, seat } = seatRun(banks, VIOLIN_AND_PIANO);
      run.engine.enqueue({ type: 'seat', seatIndex: seat('piano'), audible: false });
      run.engine.enqueue({ type: 'play', countInSec: 0 });
      run.renderTo(7);
      expect(noteOnKeys(log, 0)).toEqual([60]);
      expect(noteOnKeys(log, 1)).toEqual([]);
      expect(noteOffKeys(log, 1)).toEqual([]);
    });

    it('ends the held notes of a seat at once when it becomes silent', () => {
      const { run, log, seat } = seatRun(banks, VIOLIN_AND_PIANO);
      run.engine.enqueue({ type: 'play', countInSec: 0 });
      run.renderTo(1);
      const before = log.length;
      run.engine.enqueue({ type: 'seat', seatIndex: seat('violin'), audible: false });
      run.timeBlock();
      expect(noteOffKeys(log.slice(before), 0)).toEqual([60]);
      run.renderTo(3);
      expect(voices(run, 0)).toBe(0);
      expect(voices(run, 1)).toBeGreaterThan(0);
      // The note off of the score at 6 s is not sent again.
      run.renderTo(7);
      expect(noteOffKeys(log, 0)).toEqual([60]);
    });

    it('plans the seat flags of a block together, so a mute and an unmute change nothing', () => {
      const { run, log, seat } = seatRun(banks, VIOLIN_AND_PIANO);
      run.engine.enqueue({ type: 'play', countInSec: 0 });
      run.renderTo(1);
      const before = log.length;
      for (const section of ['violin', 'piano'] as const) {
        run.engine.enqueue({ type: 'seat', seatIndex: seat(section), audible: false });
        run.engine.enqueue({ type: 'seat', seatIndex: seat(section), audible: true });
      }
      run.timeBlock();
      expect(log.slice(before)).toEqual([]);
      run.renderTo(3);
      expect(voices(run, 0)).toBeGreaterThan(0);
      expect(voices(run, 1)).toBeGreaterThan(0);
    });

    it('ends the notes of a silent seat also when the sustain pedal is down', () => {
      const pedal = controlChange(0, 0, 64, 127);
      const { run, seat } = seatRun(banks, [pedal, ...VIOLIN_AND_PIANO]);
      run.engine.enqueue({ type: 'play', countInSec: 0 });
      run.renderTo(1);
      run.engine.enqueue({ type: 'seat', seatIndex: seat('violin'), audible: false });
      run.renderTo(3);
      expect(voices(run, 0)).toBe(0);
    });

    it('ends the notes of a silent seat on a shared channel when the sustain pedal is down', () => {
      // A string ensemble with the pedal down: key 72 is a violin and key 40 a cello (design 3.5).
      const events = [
        program(0, 0, 48),
        controlChange(0, 0, 64, 127),
        on(0, 0, 72),
        on(0, 0, 40),
        off(6, 0, 72),
        off(6, 0, 40),
      ];
      const muted = seatRun(banks, events);
      const alone = seatRun(banks, events);
      alone.run.engine.enqueue({ type: 'seat', seatIndex: alone.seat('violin'), audible: false });
      for (const { run } of [muted, alone]) {
        run.engine.enqueue({ type: 'play', countInSec: 0 });
        run.renderTo(1);
      }
      muted.run.engine.enqueue({ type: 'seat', seatIndex: muted.seat('violin'), audible: false });
      muted.run.renderTo(3);
      alone.run.renderTo(3);
      // Only the voices of the cello sound, as when the violin is silent from the start.
      expect(voices(alone.run, 0)).toBeGreaterThan(0);
      expect(voices(muted.run, 0)).toBe(voices(alone.run, 0));
      // The pedal stays down for the later notes.
      expect(synthOf(muted.run.engine).midiChannels[0]?.midiControllers[64]).toBe(127 << 7);
    });

    it('starts held long notes again when a seat becomes audible, but not decaying notes', () => {
      const { run, log, seat } = seatRun(banks, VIOLIN_AND_PIANO);
      for (const section of ['violin', 'piano'] as const) {
        run.engine.enqueue({ type: 'seat', seatIndex: seat(section), audible: false });
      }
      run.engine.enqueue({ type: 'play', countInSec: 0 });
      run.renderTo(1);
      expect(noteOnKeys(log, 0)).toEqual([]);
      for (const section of ['violin', 'piano'] as const) {
        run.engine.enqueue({ type: 'seat', seatIndex: seat(section), audible: true });
      }
      run.timeBlock();
      expect(noteOnKeys(log, 0)).toEqual([60]);
      expect(noteOnKeys(log, 1)).toEqual([]);
      run.renderTo(7);
      expect(noteOffKeys(log, 0)).toEqual([60]);
      expect(noteOffKeys(log, 1)).toEqual([]);
    });

    it('plays the other seat of a shared channel when one seat is silent', () => {
      // A string ensemble divides by pitch: key 72 is a violin and key 40 a cello (design 3.5).
      const events = [program(0, 0, 48), on(0, 0, 72), on(0, 0, 40), off(6, 0, 72), off(6, 0, 40)];
      const { run, log, seat } = seatRun(banks, events);
      expect(seat('violin')).not.toBe(seat('cello'));
      run.engine.enqueue({ type: 'play', countInSec: 0 });
      run.renderTo(1);
      run.engine.enqueue({ type: 'seat', seatIndex: seat('violin'), audible: false });
      run.renderTo(3);
      expect(noteOffKeys(log, 0)).toEqual([72]);
      expect(voices(run, 0)).toBeGreaterThan(0);
      run.engine.enqueue({ type: 'seek', songSec: 2 });
      run.renderTo(4);
      expect(noteOnKeys(log, 0)).toEqual([72, 40, 40]);
    });

    it('makes all seats audible again with a new score', () => {
      const { run, log, seat } = seatRun(banks, VIOLIN_AND_PIANO);
      run.engine.enqueue({ type: 'seat', seatIndex: seat('violin'), audible: false });
      run.renderTo(0.1);
      const score = scoreOf({ tracks: [VIOLIN_AND_PIANO] });
      run.engine.loadScore(packSynthEvents(score.synthEvents), score.durationSec);
      run.engine.enqueue({ type: 'play', countInSec: 0 });
      run.renderTo(0.5);
      expect(noteOnKeys(log, 0)).toEqual([60]);
    });
  });

  describe('warm-up at the bank add (spike report, section 8, item 2)', () => {
    /**
     * A violin and a piano from the start, and a string ensemble that enters at 2.5 s on the
     * channel of the violin.
     */
    const ENTRIES: readonly TestEvent[] = [
      program(0, 0, 40),
      program(0, 1, 0),
      on(0, 0, 60),
      off(1, 0, 60),
      on(1, 1, 64),
      off(2, 1, 64),
      program(2, 0, 48),
      on(2.5, 0, 67),
      off(3, 0, 67),
    ];

    /** Makes an engine with the score of {@link ENTRIES}, before the banks. */
    function engineBeforeBanks(anchors: ClockAnchor[] = []): SynthEngine {
      const engine = new SynthEngine(TEST_SAMPLE_RATE, (anchor) => anchors.push(anchor));
      const score = scoreOf({ tracks: [ENTRIES] });
      engine.loadScore(packSynthEvents(score.synthEvents), score.durationSec);
      return engine;
    }

    it('plays a note of each preset of the score, also of a preset that enters later', () => {
      const engine = engineBeforeBanks();
      const log = recordMessages(engine);
      engine.addBanks(copyBanks(banks));
      const keys = log.flatMap((item) =>
        item.kind === 0x90 && item.data2 > 0 ? [`${item.channel}:${item.data1}`] : [],
      );
      expect(new Set(keys)).toEqual(new Set(['0:60', '1:64', '0:67']));
    });

    it('leaves the synth silent and at the song start', () => {
      const anchors: ClockAnchor[] = [];
      const engine = engineBeforeBanks(anchors);
      engine.addBanks(copyBanks(banks));
      expect(anchors).toEqual([]);
      const synth = synthOf(engine);
      expect(synth.midiChannels[0]?.patch.program).toBe(0);
      expect(engine.playing).toBe(false);

      const left = new Float32Array(BLOCK_FRAMES);
      const right = new Float32Array(BLOCK_FRAMES);
      for (let i = 0; i < 40; i++) {
        engine.render(i * (BLOCK_FRAMES / TEST_SAMPLE_RATE), left, right);
      }
      // The synth counts the voices while it renders.
      expect(synth.voiceCount).toBe(0);
      expect([...left, ...right].every((sample) => sample === 0)).toBe(true);
      expect(anchors).toEqual([{ contextTime: 0, songTime: 0, rate: 0, load: 1 }]);
    });
  });

  describe('effects (design 6.1)', () => {
    /**
     * Plays a violin note after controller events, and sums the energy of the output.
     *
     * @param controls The controller events before the note, at the song start.
     * @returns The sum of the squares of both channels over 2 s.
     */
    function noteEnergy(controls: readonly TestEvent[]): number {
      const run = harness(banks, [program(0, 0, 40), ...controls, on(0, 0, 60), off(1, 0, 60)]);
      run.engine.enqueue({ type: 'play', countInSec: 0 });
      const left = new Float32Array(BLOCK_FRAMES);
      const right = new Float32Array(BLOCK_FRAMES);
      let energy = 0;
      for (let frame = 0; frame < 2 * TEST_SAMPLE_RATE; frame += BLOCK_FRAMES) {
        left.fill(0);
        right.fill(0);
        run.engine.render(frame / TEST_SAMPLE_RATE, left, right);
        for (let i = 0; i < BLOCK_FRAMES; i++) {
          energy += (left[i] ?? 0) ** 2 + (right[i] ?? 0) ** 2;
        }
      }
      return energy;
    }

    it('adds no chorus for a chorus send of the file', () => {
      const send = noteEnergy([controlChange(0, 0, 93, 127)]);
      expect(send).toBeGreaterThan(0);
      expect(send).toBe(noteEnergy([controlChange(0, 0, 93, 0)]));
    });

    it('adds the room reverb for a reverb send', () => {
      expect(noteEnergy([controlChange(0, 0, 91, 100)])).toBeGreaterThan(
        noteEnergy([controlChange(0, 0, 91, 0)]),
      );
    });

    it('keeps the room reverb after the resets of a new score and of a seek', () => {
      const run = harness(banks, [program(0, 0, 40), on(0, 0, 60), off(1, 0, 60)]);
      run.engine.enqueue({ type: 'seek', songSec: 0.5 });
      run.renderTo(0.1);
      const reverb = synthOf(run.engine).reverbProcessor;
      expect({
        character: reverb.character,
        preLowpass: reverb.preLowpass,
        time: reverb.time,
        level: reverb.level,
        delayFeedback: reverb.delayFeedback,
        preDelayTime: reverb.preDelayTime,
      }).toEqual(ROOM_REVERB);
    });
  });
});
