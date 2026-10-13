import { describe, expect, it } from 'vitest';

import { BackdropProbe } from './backdrop-probe.ts';
import type { BackdropCanvas, BackdropContext } from './backdrop-probe.ts';
import { shadeLevel } from '../ui/title-shade.ts';
import type { TitleLine } from '../ui/title-shade.ts';

/** The phase of a frame in which the fake context gets a call. */
type Phase = 'collect' | 'request';

/** A fake WebGL2 context that records the phase of each copy of a pixel buffer to the CPU. */
interface FakeContext {
  /** The context for the probe. */
  readonly gl: BackdropContext;
  /** The phase of each call of `getBufferSubData`. */
  readonly copies: Phase[];
  /** The phase of the calls that follow. */
  phase: Phase;
}

/**
 * Makes a fake context. Each fence signals at the second check, and each pixel of a read is
 * white.
 *
 * @returns The fake context.
 */
function fakeContext(): FakeContext {
  const checks = new Map<WebGLSync, number>();
  const fake: FakeContext = {
    copies: [],
    phase: 'collect',
    gl: {
      PIXEL_PACK_BUFFER: 35051,
      READ_FRAMEBUFFER: 36008,
      READ_FRAMEBUFFER_BINDING: 36010,
      RGBA: 6408,
      STREAM_READ: 35041,
      SYNC_GPU_COMMANDS_COMPLETE: 37143,
      TIMEOUT_EXPIRED: 37147,
      UNSIGNED_BYTE: 5121,
      WAIT_FAILED: 37149,
      drawingBufferWidth: 200,
      drawingBufferHeight: 100,
      bindBuffer: () => undefined,
      bindFramebuffer: () => undefined,
      bufferData: () => undefined,
      clientWaitSync: (sync) => {
        checks.set(sync, (checks.get(sync) ?? 0) + 1);
        return (checks.get(sync) ?? 0) >= 2 ? 37148 : 37147;
      },
      createBuffer: () => ({}),
      deleteBuffer: () => undefined,
      deleteSync: () => undefined,
      fenceSync: () => ({}),
      flush: () => undefined,
      getBufferSubData: (_target, _offset, pixels) => {
        fake.copies.push(fake.phase);
        if (pixels instanceof Uint8Array) {
          pixels.fill(255);
        }
      },
      getParameter: () => null,
      isContextLost: () => false,
      readPixels: () => undefined,
    },
  };
  return fake;
}

/** A canvas of 200 × 100 CSS pixels at the top left of the window. */
const CANVAS: BackdropCanvas = {
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 100 }),
};

/** One title line on the canvas, with the limit of a light text. */
const LINES: readonly TitleLine[] = [
  { box: { left: 10, top: 10, right: 110, bottom: 30 }, limit: 0.125 },
];

describe('BackdropProbe (design 2.8)', () => {
  it('copies the pixels of a read only at the start of a frame, before the render', () => {
    const fake = fakeContext();
    const probe = new BackdropProbe(CANVAS, fake.gl);
    const levels: (number[] | null)[] = [];

    for (let frame = 0; frame < 30; frame++) {
      const wallTime = frame / 60;
      fake.phase = 'collect';
      levels.push(probe.collect(() => LINES));
      fake.phase = 'request';
      probe.request(wallTime, () => LINES);
    }

    expect(fake.copies.length).toBeGreaterThan(1);
    expect(fake.copies.every((phase) => phase === 'collect')).toBe(true);
    // Each finished read gives the level of a white backdrop.
    const white = shadeLevel(1, 0.125);
    expect(white).toBeGreaterThan(0);
    expect(levels.filter((level) => level !== null)).toContainEqual([white]);
  });

  it('gives each read a new pixel buffer, and frees the buffer of the read before', () => {
    const fake = fakeContext();
    const created: WebGLBuffer[] = [];
    const deleted: WebGLBuffer[] = [];
    const gl: BackdropContext = {
      ...fake.gl,
      createBuffer: () => {
        const buffer = {};
        created.push(buffer);
        return buffer;
      },
      deleteBuffer: (buffer) => {
        if (buffer) {
          deleted.push(buffer);
        }
      },
    };
    const probe = new BackdropProbe(CANVAS, gl);

    for (let frame = 0; frame < 30; frame++) {
      probe.collect(() => LINES);
      probe.request(frame / 60, () => LINES);
    }

    expect(created.length).toBeGreaterThan(2);
    expect(new Set(created).size).toBe(created.length);
    expect(deleted).toEqual(created.slice(0, -1));
  });

  it('asks for the full shade with no context', () => {
    const probe = new BackdropProbe(CANVAS, null);
    expect(probe.collect(() => LINES)).toEqual([1]);
  });
});
