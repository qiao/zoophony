import { describe, expect, it } from 'vitest';

import {
  busyMs,
  gpuIntervals,
  otherGpuShare,
  parseTraceTable,
  webglFrameTimes,
} from './gpu-trace.ts';
import type { GpuInterval } from './gpu-trace.ts';

/** A small export of `metal-gpu-intervals` with ids, refs, nested ids, and an empty value. */
const XML = `<?xml version="1.0"?>
<trace-query-result>
<node xpath='//trace-toc[1]/run[1]/data[1]/table[109]'><schema name="metal-gpu-intervals"><col><mnemonic>start</mnemonic></col><col><mnemonic>duration</mnemonic></col><col><mnemonic>channel-name</mnemonic></col><col><mnemonic>event-label</mnemonic></col><col><mnemonic>process</mnemonic></col><col><mnemonic>iosurface-accesses</mnemonic></col><col><mnemonic>cmdbuffer-id</mnemonic></col></schema>
<row><start-time id="1" fmt="00:00.000.100">100</start-time><duration id="2" fmt="50 ns">50</duration><gpu-channel-name id="3" fmt="Vertex">Vertex</gpu-channel-name><formatted-label id="4" fmt="Render Command 1 ( A &amp; B (7) )"><string id="5" fmt="x">x</string><process id="6" fmt="A &amp; B (7)"><pid id="7" fmt="7">7</pid></process></formatted-label><process ref="6"/><sentinel/><metal-command-buffer-id id="8" fmt="0x1">1</metal-command-buffer-id></row>
<row><start-time id="9" fmt="00:00.000.120">120</start-time><duration ref="2"/><gpu-channel-name id="10" fmt="Fragment">Fragment</gpu-channel-name><formatted-label ref="4"/><process ref="6"/><formatted-label id="11" fmt="Write Surface: 3(8×8)">Write</formatted-label><metal-command-buffer-id ref="8"/></row>
<row><start-time id="12" fmt="00:00.000.300">300</start-time><duration id="13" fmt="10 ns">10</duration><gpu-channel-name ref="3"/></row>
</node></trace-query-result>`;

describe('parseTraceTable', () => {
  it('gives each cell its value, also through a ref to an id inside another element', () => {
    const table = parseTraceTable(XML);
    expect(table.columns).toEqual([
      'start',
      'duration',
      'channel-name',
      'event-label',
      'process',
      'iosurface-accesses',
      'cmdbuffer-id',
    ]);
    expect(table.rows).toHaveLength(3);
    const [first, second, third] = table.rows;
    expect(first?.[0]).toEqual({ fmt: '00:00.000.100', raw: '100' });
    expect(first?.[4]?.fmt).toBe('A & B (7)');
    expect(first?.[5]).toEqual({ fmt: '', raw: '' });
    expect(second?.[1]).toEqual({ fmt: '50 ns', raw: '50' });
    expect(second?.[3]?.fmt).toBe('Render Command 1 ( A & B (7) )');
    expect(second?.[6]).toEqual({ fmt: '0x1', raw: '1' });
    expect(third?.[2]).toEqual({ fmt: 'Vertex', raw: 'Vertex' });
    expect(third?.[6]).toEqual({ fmt: '', raw: '' });
  });

  it('refuses a text with no schema', () => {
    expect(() => parseTraceTable('<trace-query-result/>')).toThrow(/schema/);
  });
});

describe('gpuIntervals', () => {
  it('reads the start, the duration, and the texts of each row', () => {
    const [first, second] = gpuIntervals(parseTraceTable(XML));
    expect(first).toEqual({
      startNs: 100,
      durationNs: 50,
      channel: 'Vertex',
      process: 'A & B (7)',
      commandBuffer: '1',
      label: 'Render Command 1 ( A & B (7) )',
      surfaces: '',
    });
    expect(second?.surfaces).toBe('Write Surface: 3(8×8)');
  });
});

/**
 * Makes a GPU interval of the process `GPU (7)`.
 *
 * @param startMs The start, in milliseconds.
 * @param ms The duration, in milliseconds.
 * @param buffer The command buffer.
 * @param label The label of the encoder.
 * @param channel The channel.
 * @param surfaces The IOSurface accesses.
 * @returns The interval.
 */
function interval(
  startMs: number,
  ms: number,
  buffer: string,
  label = 'Render Command 1',
  channel = 'Fragment',
  surfaces = '',
): GpuInterval {
  return {
    startNs: startMs * 1e6,
    durationNs: ms * 1e6,
    channel,
    process: 'GPU (7)',
    commandBuffer: buffer,
    label,
    surfaces,
  };
}

describe('busyMs', () => {
  it('counts the time of overlapping intervals one time', () => {
    expect(busyMs([interval(0, 2, 'a'), interval(1, 2, 'a'), interval(5, 1, 'a')])).toBe(4);
    expect(busyMs([])).toBe(0);
  });
});

describe('webglFrameTimes', () => {
  it('splits the WebGL work at each write of the canvas, without the compositor', () => {
    const write = 'Write Surface: 9(2880×1800:ARGB)';
    const intervals = [
      interval(0, 1, 'w0', 'Render Command 15', 'Fragment', write),
      interval(10, 1, 'w1', 'Render Command 1', 'Vertex'),
      interval(10.5, 2, 'w1'),
      interval(13, 1, 'w1', 'Render Command 15', 'Fragment', write),
      // The compositor reads the canvas, and another one has many blits.
      interval(14, 3, 'c1', 'Render Command 0', 'Fragment', 'Read Surface: 9 -> Write Surface: 4'),
      ...['Blit Command 1', 'Blit Command 3', 'Blit Command 5', 'Blit Command 7'].map((label) =>
        interval(15, 1, 'c2', label, 'Compute'),
      ),
      // A frame in two command buffers, as with the depth of field.
      interval(20, 2, 'w2'),
      interval(23, 1, 'w3', 'Render Command 4', 'Fragment', write),
      // Another process.
      { ...interval(24, 9, 'x'), process: 'GPU (8)' },
    ];
    expect(webglFrameTimes(intervals, '(7)')).toEqual([3.5, 3]);
  });
});

describe('otherGpuShare', () => {
  it('gives the busy time of the other processes over the span of the trace', () => {
    const other = (startMs: number, ms: number): GpuInterval => ({
      ...interval(startMs, ms, 'o'),
      process: 'Google Chrome Helper (8)',
    });
    const intervals = [interval(0, 4, 'a'), other(1, 2), other(2, 2), interval(8, 2, 'b')];
    expect(otherGpuShare(intervals, '(7)')).toBe(0.3);
    expect(otherGpuShare([interval(0, 4, 'a')], '(7)')).toBe(0);
    expect(otherGpuShare([], '(7)')).toBe(0);
  });
});
