import type { ScreenBox } from '../shots/frame.ts';
import { lightestBlock, shadeLevel } from '../ui/title-shade.ts';
import type { PixelRect, TitleLine } from '../ui/title-shade.ts';

/** The time between two reads of the backdrop, in seconds. */
const READ_INTERVAL_SEC = 0.15;

/** The side of a block of the backdrop, in CSS pixels (`lightestBlock()`). */
const BLOCK_CSS = 6;

/** The rectangle of a line that does not show. */
const EMPTY: PixelRect = { x: 0, y: 0, width: 0, height: 0 };

/** One read of the backdrop that the GPU did not finish yet. */
interface PendingRead {
  /** The fence after the read. */
  readonly fence: WebGLSync;
  /** The rectangle of the read, in pixels of the drawing buffer, from the bottom left. */
  readonly rect: PixelRect;
  /**
   * The rectangle of each line in pixels of the read, from its bottom left, and its limit. A line
   * that does not show has an empty rectangle.
   */
  readonly lines: readonly { readonly rect: PixelRect; readonly limit: number }[];
  /** The side of a block, in pixels of the drawing buffer. */
  readonly block: number;
}

/**
 * Converts a box of the window to a rectangle of the drawing buffer, clipped to the buffer.
 *
 * @param box The box, in CSS pixels of the window.
 * @param canvas The box of the canvas, in CSS pixels of the window.
 * @param width The width of the drawing buffer, in pixels.
 * @param height The height of the drawing buffer, in pixels.
 * @returns The rectangle, from the bottom left of the buffer.
 */
function bufferRect(box: ScreenBox, canvas: DOMRect, width: number, height: number): PixelRect {
  const sx = width / Math.max(1, canvas.width);
  const sy = height / Math.max(1, canvas.height);
  const left = Math.max(0, Math.floor((box.left - canvas.left) * sx));
  const right = Math.min(width, Math.ceil((box.right - canvas.left) * sx));
  const top = Math.max(0, Math.floor((box.top - canvas.top) * sy));
  const bottom = Math.min(height, Math.ceil((box.bottom - canvas.top) * sy));

  return {
    x: left,
    y: height - bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

/**
 * Reads the frame on the canvas behind the lines of the title, and gives the level of the shade
 * that each line needs (design 2.8). A read goes into a pixel buffer after the render, and the
 * probe takes its pixels a few frames later, when the GPU signals its fence. Thus the read does
 * not stop the frame. With no WebGL2 context, or after an error, the probe asks for the full
 * shade.
 */
export class BackdropProbe {
  /** The canvas of the stage. */
  readonly #canvas: HTMLCanvasElement;
  /** The WebGL2 context of the renderer, or `null` if the canvas has none. */
  readonly #gl: WebGL2RenderingContext | null;
  /** The pixel buffer of the reads, or `null` before the first read. */
  #buffer: WebGLBuffer | null = null;
  /** The size of the pixel buffer, in bytes. */
  #bufferBytes = 0;
  /** The pixels of the last read, on the CPU. */
  #pixels = new Uint8Array(0);
  /** The read in flight, or `null`. */
  #pending: PendingRead | null = null;
  /** The wall time of the start of the last read, in seconds. */
  #readAt = -Infinity;
  /** True after an error of a read. */
  #failed = false;

  /**
   * Creates the probe on the canvas of the renderer. The renderer must make its context first,
   * because the first context of a canvas keeps its attributes.
   *
   * @param canvas The canvas of the stage.
   */
  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#gl = canvas.getContext('webgl2');
  }

  /**
   * Takes the result of a finished read, and starts a new read every 0.15 s. Call it directly
   * after the render of a frame, because the browser clears the drawing buffer after it shows
   * the frame.
   *
   * @param wallTime The wall time of the frame, in seconds.
   * @param lines Gives the lines of the title. The probe calls it only when a read starts.
   * @returns The level of the shade that each line needs, from 0 to 1, in the order of the
   *   lines, or `null` when no read finished in this frame.
   */
  update(wallTime: number, lines: () => readonly TitleLine[]): number[] | null {
    const gl = this.#gl;
    if (!gl || this.#failed) {
      return lines().map(() => 1);
    }
    if (gl.isContextLost()) {
      this.#buffer = null;
      this.#bufferBytes = 0;
      this.#pending = null;
      return null;
    }

    try {
      const level = this.#finish(gl);
      if (!this.#pending && wallTime - this.#readAt >= READ_INTERVAL_SEC) {
        this.#readAt = wallTime;
        this.#start(gl, lines());
      }
      return level;
    } catch (error) {
      console.error(error);
      this.#failed = true;
      return lines().map(() => 1);
    }
  }

  /**
   * Takes the pixels of the read in flight when its fence signals.
   *
   * @param gl The context.
   * @returns The level of the shade that each line needs, or `null` with no finished read.
   */
  #finish(gl: WebGL2RenderingContext): number[] | null {
    const pending = this.#pending;
    if (!pending) {
      return null;
    }
    const status = gl.clientWaitSync(pending.fence, 0, 0);
    if (status === gl.TIMEOUT_EXPIRED) {
      return null;
    }
    if (status === gl.WAIT_FAILED) {
      throw new Error('The read of the title backdrop failed.');
    }

    gl.deleteSync(pending.fence);
    this.#pending = null;
    const bytes = 4 * pending.rect.width * pending.rect.height;
    if (this.#pixels.length < bytes) {
      this.#pixels = new Uint8Array(bytes);
    }
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.#buffer);
    gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this.#pixels, 0, bytes);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

    return pending.lines.map((line) => {
      const light = lightestBlock(this.#pixels, pending.rect.width, line.rect, pending.block);
      return shadeLevel(light, line.limit);
    });
  }

  /**
   * Starts a read of the drawing buffer behind the lines: one rectangle around all lines.
   *
   * @param gl The context.
   * @param lines The lines of the title.
   */
  #start(gl: WebGL2RenderingContext, lines: readonly TitleLine[]): void {
    const canvas = this.#canvas.getBoundingClientRect();
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const rects = lines.map((line) =>
      line.box ? bufferRect(line.box, canvas, width, height) : EMPTY,
    );
    const shown = rects.filter((rect) => rect.width > 0 && rect.height > 0);
    if (shown.length === 0) {
      return;
    }

    const x = Math.min(...shown.map((rect) => rect.x));
    const y = Math.min(...shown.map((rect) => rect.y));
    const right = Math.max(...shown.map((rect) => rect.x + rect.width));
    const top = Math.max(...shown.map((rect) => rect.y + rect.height));
    const rect = { x, y, width: right - x, height: top - y };
    const bytes = 4 * rect.width * rect.height;

    if (!this.#buffer || this.#bufferBytes < bytes) {
      if (this.#buffer) {
        gl.deleteBuffer(this.#buffer);
      }
      this.#buffer = gl.createBuffer();
      this.#bufferBytes = bytes;
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.#buffer);
      gl.bufferData(gl.PIXEL_PACK_BUFFER, bytes, gl.STREAM_READ);
    } else {
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.#buffer);
    }

    // The renderer keeps the framebuffer that it bound last, so the probe binds it again.
    const framebuffer: unknown = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.readPixels(rect.x, rect.y, rect.width, rect.height, gl.RGBA, gl.UNSIGNED_BYTE, 0);
    gl.bindFramebuffer(
      gl.READ_FRAMEBUFFER,
      framebuffer instanceof WebGLFramebuffer ? framebuffer : null,
    );
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!fence) {
      throw new Error('The read of the title backdrop has no fence.');
    }
    gl.flush();

    const block = Math.max(1, Math.round((BLOCK_CSS * width) / Math.max(1, canvas.width)));
    this.#pending = {
      fence,
      rect,
      block,
      lines: lines.map((line, i) => {
        const r = rects[i] ?? EMPTY;
        if (r.width === 0 || r.height === 0) {
          return { rect: EMPTY, limit: line.limit };
        }
        return { rect: { ...r, x: r.x - x, y: r.y - y }, limit: line.limit };
      }),
    };
  }
}
