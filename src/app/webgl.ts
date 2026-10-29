import type { TargetFormat } from '../scene/post.ts';

/** The part of a WebGL2 context that {@link probeWebgl2} uses. */
interface ProbeContext {
  getExtension(name: 'WEBGL_lose_context'): { loseContext(): void } | null;
  getExtension(name: 'EXT_color_buffer_float' | 'EXT_color_buffer_half_float'): object | null;
}

/** A canvas that can make a WebGL2 context. A test can give a fake canvas. */
export interface ProbeCanvas {
  getContext(kind: 'webgl2'): ProbeContext | null;
}

/**
 * Tells if the browser can make a WebGL2 context, and finds the color format that the GPU can
 * render to (design 2.6). The app needs WebGL2 and has no WebGL1 fallback. A GPU with no target of
 * floats renders with no post effects, so the canvas of the stage gets the MSAA. The probe uses its
 * own canvas, because the first context of a canvas keeps its attributes, and the renderer sets
 * them on the canvas of the stage. The probe frees its context at once. One probe does both
 * checks, because each new context costs about 4 ms of the load on the development Mac (design
 * 7.2).
 *
 * @param canvas A new canvas for the probe.
 * @returns The best format of a render target, `none` with no target of floats, or `null` with no
 *   WebGL2.
 */
export function probeWebgl2(canvas: ProbeCanvas): TargetFormat | null {
  let context: ProbeContext | null;
  try {
    context = canvas.getContext('webgl2');
  } catch {
    return null;
  }
  if (!context) {
    return null;
  }
  let format: TargetFormat = 'none';
  if (context.getExtension('EXT_color_buffer_float')) {
    format = 'packed';
  } else if (context.getExtension('EXT_color_buffer_half_float')) {
    format = 'half';
  }
  context.getExtension('WEBGL_lose_context')?.loseContext();
  return format;
}
