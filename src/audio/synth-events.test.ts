import { describe, expect, it } from 'vitest';

import { packSynthEvents, synthChannelCount, tableBuffers } from './synth-events.ts';

describe('packSynthEvents', () => {
  it('copies each field into its typed array', () => {
    const table = packSynthEvents([
      { timeSec: 0.5, channel: 17, kind: 0x90, data1: 60, data2: 100, seatIndex: 3 },
      { timeSec: 1.25, channel: 9, kind: 0xb0, data1: 7, data2: 90, seatIndex: -1 },
    ]);
    expect([...table.timeSec]).toEqual([0.5, 1.25]);
    expect([...table.channel]).toEqual([17, 9]);
    expect([...table.kind]).toEqual([0x90, 0xb0]);
    expect([...table.data1]).toEqual([60, 7]);
    expect([...table.data2]).toEqual([100, 90]);
    expect([...table.seatIndex]).toEqual([3, -1]);
  });

  it('refuses events that are not sorted by time', () => {
    expect(() =>
      packSynthEvents([
        { timeSec: 1, channel: 0, kind: 0x90, data1: 60, data2: 100, seatIndex: 0 },
        { timeSec: 0.5, channel: 0, kind: 0x80, data1: 60, data2: 0, seatIndex: 0 },
      ]),
    ).toThrow('Synth event 1');
  });
});

describe('tableBuffers', () => {
  it('lists six different buffers', () => {
    const buffers = tableBuffers(packSynthEvents([]));
    expect(new Set(buffers).size).toBe(6);
  });
});

describe('synthChannelCount', () => {
  it('makes 16 channels for each port up to the highest channel', () => {
    const at = (channel: number) =>
      packSynthEvents([{ timeSec: 0, channel, kind: 0xc0, data1: 0, data2: 0, seatIndex: -1 }]);
    expect(synthChannelCount(packSynthEvents([]))).toBe(16);
    expect(synthChannelCount(at(15))).toBe(16);
    expect(synthChannelCount(at(16))).toBe(32);
    expect(synthChannelCount(at(47))).toBe(48);
  });
});
