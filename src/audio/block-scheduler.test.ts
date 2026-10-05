import { describe, expect, it } from 'vitest';

import type { SynthEvent } from '../score/types.ts';
import {
  INITIAL_TRANSPORT,
  applyCommand,
  chaseEvents,
  eventIndexAt,
  heldNotes,
  notePairs,
  planBlock,
  restartNotes,
  takeEvent,
} from './block-scheduler.ts';
import { packSynthEvents } from './synth-events.ts';

const BLOCK_SEC = 128 / 48_000;

/**
 * Makes one synth event. As in a `Score`, a note on and a note off have the seat of their note,
 * and each other event has the seat -1 (design 3.2).
 */
function event(
  timeSec: number,
  kind: SynthEvent['kind'],
  channel: number,
  data1: number,
  data2: number,
): SynthEvent {
  const note = kind === 0x90 || kind === 0x80;
  return { timeSec, channel, kind, data1, data2, seatIndex: note ? 0 : -1 };
}

const on = (timeSec: number, channel: number, key: number, velocity = 100): SynthEvent =>
  event(timeSec, 0x90, channel, key, velocity);

const off = (timeSec: number, channel: number, key: number): SynthEvent =>
  event(timeSec, 0x80, channel, key, 0);

const program = (timeSec: number, channel: number, value: number): SynthEvent =>
  event(timeSec, 0xc0, channel, value, 0);

const control = (timeSec: number, channel: number, controller: number, value: number) =>
  event(timeSec, 0xb0, channel, controller, value);

describe('eventIndexAt', () => {
  const times = Float64Array.from([0, 1, 1, 2]);

  it('finds the first event at or after the time', () => {
    expect(eventIndexAt(times, 1)).toBe(1);
    expect(eventIndexAt(times, 1.5)).toBe(3);
  });

  it('gives the event count after the last event', () => {
    expect(eventIndexAt(times, 3)).toBe(4);
  });
});

describe('applyCommand', () => {
  const times = Float64Array.from([0, 1, 2, 3]);

  it('starts the held notes again when play continues', () => {
    const result = applyCommand(INITIAL_TRANSPORT, { type: 'play' }, times, 4);
    expect(result.state.playing).toBe(true);
    expect(result.actions).toEqual({ release: false, chase: false, restartHeld: true });
    expect(result.changed).toBe(true);
  });

  it('starts from the beginning when play comes at the end', () => {
    const atEnd = { ...INITIAL_TRANSPORT, songSec: 4, cursor: 4 };
    const result = applyCommand(atEnd, { type: 'play' }, times, 4);
    expect(result.state).toMatchObject({ playing: true, songSec: 0, cursor: 0 });
    expect(result.actions.chase).toBe(true);
  });

  it('releases the notes at a pause', () => {
    const playing = { ...INITIAL_TRANSPORT, playing: true };
    const result = applyCommand(playing, { type: 'pause' }, times, 4);
    expect(result.state.playing).toBe(false);
    expect(result.actions).toEqual({ release: true, chase: false, restartHeld: false });
  });

  it('does nothing for play while playing and pause while paused', () => {
    const playing = { ...INITIAL_TRANSPORT, playing: true };
    expect(applyCommand(playing, { type: 'play' }, times, 4).changed).toBe(false);
    expect(applyCommand(INITIAL_TRANSPORT, { type: 'pause' }, times, 4).changed).toBe(false);
  });

  it('moves the cursor at a seek and clamps the time to the song', () => {
    const playing = { ...INITIAL_TRANSPORT, playing: true };
    const result = applyCommand(playing, { type: 'seek', songSec: 1.5 }, times, 4);
    expect(result.state).toMatchObject({ songSec: 1.5, cursor: 2 });
    expect(result.actions).toEqual({ release: true, chase: true, restartHeld: true });
    expect(applyCommand(playing, { type: 'seek', songSec: 9 }, times, 4).state.songSec).toBe(4);
    expect(applyCommand(playing, { type: 'seek', songSec: -1 }, times, 4).state.songSec).toBe(0);
  });

  it('does not start held notes at a seek while paused', () => {
    const result = applyCommand(INITIAL_TRANSPORT, { type: 'seek', songSec: 1 }, times, 4);
    expect(result.actions.restartHeld).toBe(false);
  });

  it('changes the rate, and refuses a rate that is not above 0', () => {
    expect(applyCommand(INITIAL_TRANSPORT, { type: 'rate', rate: 1.5 }, times, 4).state.rate).toBe(
      1.5,
    );
    expect(applyCommand(INITIAL_TRANSPORT, { type: 'rate', rate: 0 }, times, 4).changed).toBe(
      false,
    );
  });
});

describe('planBlock', () => {
  const times = Float64Array.from([0, BLOCK_SEC * 0.5, BLOCK_SEC, BLOCK_SEC * 2.5]);
  const playing = { ...INITIAL_TRANSPORT, playing: true };

  it('selects the events before the song time at the block end', () => {
    const first = planBlock(playing, times, BLOCK_SEC, 1);
    expect([first.from, first.to]).toEqual([0, 2]);
    expect(first.state.songSec).toBeCloseTo(BLOCK_SEC);
    const second = planBlock(first.state, times, BLOCK_SEC, 1);
    expect([second.from, second.to]).toEqual([2, 3]);
  });

  it('advances the song time by the rate', () => {
    const plan = planBlock({ ...playing, rate: 2 }, times, BLOCK_SEC, 1);
    expect(plan.to).toBe(3);
    expect(plan.state.songSec).toBeCloseTo(BLOCK_SEC * 2);
  });

  it('selects no event while paused', () => {
    const plan = planBlock(INITIAL_TRANSPORT, times, BLOCK_SEC, 1);
    expect([plan.from, plan.to]).toEqual([0, 0]);
    expect(plan.state).toBe(INITIAL_TRANSPORT);
  });

  it('pauses at the song length after the last event', () => {
    const nearEnd = { ...playing, songSec: BLOCK_SEC * 2.2, cursor: 3 };
    const plan = planBlock(nearEnd, times, BLOCK_SEC, BLOCK_SEC * 2.5);
    expect(plan.ended).toBe(true);
    expect(plan.state).toMatchObject({ playing: false, songSec: BLOCK_SEC * 2.5, cursor: 4 });
  });

  it('sends an event at the song length before the end', () => {
    const exact = { ...playing, songSec: BLOCK_SEC * 1.5, cursor: 3 };
    const plan = planBlock(exact, times, BLOCK_SEC, BLOCK_SEC * 2.5);
    expect(plan.ended).toBe(false);
    expect(plan.to).toBe(3);
  });
});

describe('chaseEvents', () => {
  it('keeps the programs and the ordered controllers, and the last value of the others', () => {
    const table = packSynthEvents([
      control(0, 0, 0, 8), // 0: bank select, ordered
      program(0, 0, 48), // 1
      control(0, 0, 7, 50), // 2: replaced by 6
      on(0.5, 0, 60), // 3: a note, which a chase leaves out
      event(0.6, 0xe0, 0, 0, 80), // 4: pitch bend
      program(1, 0, 40), // 5
      control(1, 0, 7, 90), // 6
      control(1, 1, 7, 30), // 7: another channel
      off(2, 0, 60), // 8
    ]);
    expect([...chaseEvents(table, table.timeSec.length)]).toEqual([0, 1, 4, 5, 6, 7]);
  });

  it('includes only the events before the cursor', () => {
    const table = packSynthEvents([program(0, 0, 48), program(1, 0, 40)]);
    expect([...chaseEvents(table, 1)]).toEqual([0]);
  });

  it('drops the values that a later CC 121 resets', () => {
    const table = packSynthEvents([
      control(0, 0, 11, 40), // expression: reset by CC 121
      control(0, 0, 7, 50), // volume: kept
      event(0, 0xe0, 0, 0, 80), // pitch bend: reset by CC 121
      control(1, 0, 121, 0),
    ]);
    expect([...chaseEvents(table, 4)]).toEqual([1, 3]);
  });
});

describe('heldNotes', () => {
  it('finds the notes that continue after the cursor', () => {
    const table = packSynthEvents([on(0, 0, 60), on(0, 0, 64), off(1, 0, 60), off(3, 0, 64)]);
    expect([...heldNotes(table, 3)]).toEqual([1]);
  });

  it('ends notes on the same key first in, first out', () => {
    const table = packSynthEvents([on(0, 0, 60, 100), on(0.5, 0, 60, 40), off(1, 0, 60)]);
    expect([...heldNotes(table, 3)]).toEqual([1]);
  });

  it('reads a note on with velocity 0 as a note off', () => {
    const table = packSynthEvents([on(0, 0, 60), on(1, 0, 60, 0)]);
    expect([...heldNotes(table, 2)]).toEqual([]);
  });

  it('keeps the channels apart', () => {
    const table = packSynthEvents([on(0, 0, 60), on(0, 16, 60), off(1, 16, 60)]);
    expect([...heldNotes(table, 3)]).toEqual([0]);
  });
});

describe('restartNotes', () => {
  it('starts held notes of long sounds again, and no others', () => {
    const table = packSynthEvents([
      program(0, 0, 40), // violin: long sound
      program(0, 1, 0), // piano: decays
      program(0, 9, 48), // orchestral kit: 48 is a long sound on a melodic channel
      on(0, 0, 60),
      on(0, 1, 62),
      on(0, 9, 38), // rhythm channel: never again
      off(2, 0, 60),
      off(2, 1, 62),
      off(2, 9, 38),
    ]);
    expect([...restartNotes(table, 6, 16)]).toEqual([3]);
  });

  it('uses program 0 on a channel with no program change', () => {
    const table = packSynthEvents([on(0, 2, 60), off(2, 2, 60)]);
    expect([...restartNotes(table, 1, 16)]).toEqual([]);
  });
});

describe('notePairs', () => {
  it('pairs the note ends of each key first in, first out', () => {
    const table = packSynthEvents([
      on(0, 0, 60), // 0
      on(0.5, 0, 60), // 1
      on(0.5, 0, 64), // 2
      off(1, 0, 60), // 3: ends 0
      on(1.5, 0, 60, 0), // 4: velocity 0 ends 1
      off(2, 0, 64), // 5: ends 2
      off(3, 0, 60), // 6: no open note
    ]);
    expect([...notePairs(table, 16)]).toEqual([-1, -1, -1, 0, 1, 2, -1]);
  });

  it('keeps the channels apart', () => {
    const table = packSynthEvents([on(0, 0, 60), on(0, 16, 60), off(1, 16, 60), off(2, 0, 60)]);
    expect([...notePairs(table, 32)]).toEqual([-1, -1, 1, 0]);
  });
});

describe('takeEvent', () => {
  it('sends the note end of a sounding note, and skips the note end of a silent one', () => {
    // A held note that did not start again (0), then a new note on the same key (2).
    const table = packSynthEvents([on(0, 1, 62), off(1, 1, 62), on(2, 1, 62), off(3, 1, 62)]);
    const pairs = notePairs(table, 16);
    const sounding = new Uint8Array(4);
    expect(takeEvent(table, 1, pairs, sounding)).toBe(false);
    expect(takeEvent(table, 2, pairs, sounding)).toBe(true);
    expect(sounding[2]).toBe(1);
    expect(takeEvent(table, 3, pairs, sounding)).toBe(true);
    expect(sounding[2]).toBe(0);
  });

  it('sends a note end with no note on', () => {
    const table = packSynthEvents([off(0, 1, 62)]);
    expect(takeEvent(table, 0, notePairs(table, 16), new Uint8Array(1))).toBe(true);
  });
});
