/** One cell of a table of an `xctrace export`: the formatted value and the raw value. */
export interface TraceCell {
  /** The `fmt` attribute, for example `1.46 ms`, or an empty string. */
  readonly fmt: string;
  /** The text of the element, for example `1462959`, or an empty string. */
  readonly raw: string;
}

/** A table of an `xctrace export`: the mnemonic of each column, and the cells of each row. */
export interface TraceTable {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly TraceCell[])[];
}

/** The cell of an empty value, such as `<sentinel/>`. */
const EMPTY_CELL: TraceCell = { fmt: '', raw: '' };

/**
 * Replaces the five XML entities of an attribute or a text with their characters.
 *
 * @param text The text.
 * @returns The text with no entities.
 */
function unescapeXml(text: string): string {
  return text
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

/**
 * Reads an attribute from the attribute text of a tag.
 *
 * @param attributes The attribute text, for example ` id="3" fmt="Vertex"`.
 * @param name The attribute name.
 * @returns The value, or `undefined`.
 */
function attribute(attributes: string, name: string): string | undefined {
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(attributes);
  return match?.[1] === undefined ? undefined : unescapeXml(match[1]);
}

/**
 * Parses one table of `xctrace export --xpath`. The export writes each value one time with an
 * `id`, and each repeat as an element with a `ref` to that id, also inside other elements. The
 * parser keeps each id, so that each cell holds its value.
 *
 * @param xml The XML text of the export.
 * @returns The table. A row with fewer elements than columns gets empty cells at the end.
 * @throws Error if the text has no schema.
 */
export function parseTraceTable(xml: string): TraceTable {
  const schema = /<schema[\s\S]*?<\/schema>/.exec(xml)?.[0];
  if (!schema) {
    throw new Error('The xctrace export has no table schema.');
  }
  const columns = [...schema.matchAll(/<mnemonic>([^<]*)<\/mnemonic>/g)].map((m) => m[1] ?? '');

  const known = new Map<string, TraceCell>();
  const rows: TraceCell[][] = [];
  const token = /<(\/?)([\w-]+)([^>]*?)(\/?)>|([^<]+)/g;
  for (const rowMatch of xml.matchAll(/<row>([\s\S]*?)<\/row>/g)) {
    const cells: TraceCell[] = [];
    // The open elements of the row: their id, fmt, text, and the index of their cell.
    const open: { id: string | undefined; fmt: string; raw: string; cell: number }[] = [];
    for (const t of (rowMatch[1] ?? '').matchAll(token)) {
      const [, closing, , attributes = '', selfClosing, text] = t;
      if (text !== undefined) {
        const top = open.at(-1);
        if (top) {
          top.raw += unescapeXml(text);
        }
        continue;
      }
      if (closing) {
        const element = open.pop();
        if (!element) {
          continue;
        }
        const cell = { fmt: element.fmt, raw: element.raw.trim() };
        if (element.id !== undefined) {
          known.set(element.id, cell);
        }
        if (open.length === 0) {
          cells[element.cell] = cell;
        }
        continue;
      }
      const ref = attribute(attributes, 'ref');
      const id = attribute(attributes, 'id');
      const fmt = attribute(attributes, 'fmt') ?? '';
      if (selfClosing) {
        const cell = ref === undefined ? { fmt, raw: '' } : (known.get(ref) ?? EMPTY_CELL);
        if (id !== undefined) {
          known.set(id, cell);
        }
        if (open.length === 0) {
          cells.push(cell);
        }
        continue;
      }
      if (open.length === 0) {
        cells.push(EMPTY_CELL);
      }
      open.push({ id, fmt, raw: '', cell: open.length === 0 ? cells.length - 1 : -1 });
    }
    while (cells.length < columns.length) {
      cells.push(EMPTY_CELL);
    }
    rows.push(cells);
  }
  return { columns, rows };
}

/** One interval of GPU work of one encoder on one channel of the GPU. */
export interface GpuInterval {
  /** The start, in nanoseconds from the start of the trace. */
  readonly startNs: number;
  /** The duration, in nanoseconds. */
  readonly durationNs: number;
  /** `Vertex`, `Fragment`, or `Compute`. */
  readonly channel: string;
  /** The process, for example `Google Chrome Helper (GPU) (8621)`. */
  readonly process: string;
  /** The id of the Metal command buffer. */
  readonly commandBuffer: string;
  /** The label of the encoder, for example `Command Buffer 0:Render Command 2`. */
  readonly label: string;
  /** The IOSurface reads and writes of the encoder, for example `Write Surface: 961(...)`. */
  readonly surfaces: string;
}

/**
 * Reads the GPU intervals from the table `metal-gpu-intervals` of a Metal System Trace.
 *
 * @param table The parsed table.
 * @returns The intervals.
 * @throws Error if the table has no column that the function reads.
 */
export function gpuIntervals(table: TraceTable): GpuInterval[] {
  const index = (name: string): number => {
    const i = table.columns.indexOf(name);
    if (i < 0) {
      throw new Error(`The GPU table has no column "${name}".`);
    }
    return i;
  };
  const columns = {
    start: index('start'),
    duration: index('duration'),
    channel: index('channel-name'),
    process: index('process'),
    commandBuffer: index('cmdbuffer-id'),
    label: index('event-label'),
    surfaces: index('iosurface-accesses'),
  };
  return table.rows.map((row) => {
    const cell = (i: number): TraceCell => row[i] ?? EMPTY_CELL;
    return {
      startNs: Number(cell(columns.start).raw),
      durationNs: Number(cell(columns.duration).raw),
      channel: cell(columns.channel).fmt,
      process: cell(columns.process).fmt,
      commandBuffer: cell(columns.commandBuffer).raw,
      label: cell(columns.label).fmt,
      surfaces: cell(columns.surfaces).fmt,
    };
  });
}

/**
 * Calculates the time in which at least one of the intervals runs: the union of the intervals.
 * The vertex work of a pass can run at the same time as the fragment work of the pass before it,
 * so a sum of the durations counts that time twice.
 *
 * @param intervals The intervals.
 * @returns The busy time, in milliseconds.
 */
export function busyMs(intervals: readonly GpuInterval[]): number {
  const sorted = intervals.toSorted((a, b) => a.startNs - b.startNs);
  let busy = 0;
  let end = -Infinity;
  for (const { startNs, durationNs } of sorted) {
    const stop = startNs + durationNs;
    if (stop > end) {
      busy += stop - Math.max(startNs, end);
      end = stop;
    }
  }
  return busy / 1e6;
}

/** The most blit encoders in a command buffer of WebGL. The compositor of Chrome has more. */
const WEBGL_MAX_BLITS = 3;

/**
 * Gives the GPU intervals of each WebGL frame of the GPU process of Chrome. The process also runs
 * the compositor of Chrome. A command buffer of the compositor reads an IOSurface (the canvas and
 * the layers of the page), or holds many blit encoders, so the function drops it. A WebGL frame
 * ends with the fragment work of the final pass, which writes the IOSurface of the canvas.
 *
 * @param intervals The GPU intervals of the trace.
 * @param process The text that the process column of the GPU process holds, such as its pid.
 * @returns The intervals of each complete frame, in the order of their start.
 */
export function webglFrames(intervals: readonly GpuInterval[], process: string): GpuInterval[][] {
  const byBuffer = new Map<string, GpuInterval[]>();
  for (const interval of intervals) {
    if (!interval.process.includes(process)) {
      continue;
    }
    const list = byBuffer.get(interval.commandBuffer) ?? [];
    list.push(interval);
    byBuffer.set(interval.commandBuffer, list);
  }

  const webgl: GpuInterval[] = [];
  for (const list of byBuffer.values()) {
    const blits = new Set(
      list.flatMap((interval) => /Blit Command (\d+)/.exec(interval.label)?.[1] ?? []),
    );
    const reads = list.some((interval) => interval.surfaces.includes('Read Surface'));
    if (!reads && blits.size <= WEBGL_MAX_BLITS) {
      webgl.push(...list);
    }
  }

  const frames: GpuInterval[][] = [];
  let frame: GpuInterval[] = [];
  let started = false;
  for (const interval of webgl.toSorted((a, b) => a.startNs - b.startNs)) {
    frame.push(interval);
    if (interval.channel === 'Fragment' && interval.surfaces.includes('Write Surface')) {
      // The first frame can start before the trace, so it does not count.
      if (started) {
        frames.push(frame);
      }
      started = true;
      frame = [];
    }
  }
  return frames;
}

/**
 * Gives the GPU time of each WebGL frame of the GPU process of Chrome ({@link webglFrames}).
 *
 * @param intervals The GPU intervals of the trace.
 * @param process The text that the process column of the GPU process holds, such as its pid.
 * @returns The busy time of each complete frame, in milliseconds ({@link busyMs}).
 */
export function webglFrameTimes(intervals: readonly GpuInterval[], process: string): number[] {
  return webglFrames(intervals, process).map((frame) => busyMs(frame));
}
