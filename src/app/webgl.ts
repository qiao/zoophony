/** The part of a WebGL2 context that {@link supportsWebgl2} uses. */
interface ProbeContext {
  getExtension(name: 'WEBGL_lose_context'): { loseContext(): void } | null;
}

/** A canvas that can make a WebGL2 context. A test can give a fake canvas. */
export interface ProbeCanvas {
  getContext(kind: 'webgl2'): ProbeContext | null;
}

/**
 * Tells if the browser can make a WebGL2 context (design 2.6). The app needs WebGL2 and has no
 * WebGL1 fallback. The probe uses its own canvas, because the first context of a canvas keeps its
 * attributes, and the renderer sets them on the canvas of the stage. The probe frees its context
 * at once.
 *
 * @param canvas A new canvas for the probe.
 * @returns True if the browser has WebGL2.
 */
export function supportsWebgl2(canvas: ProbeCanvas): boolean {
  let context: ProbeContext | null;
  try {
    context = canvas.getContext('webgl2');
  } catch {
    return false;
  }
  if (!context) {
    return false;
  }
  context.getExtension('WEBGL_lose_context')?.loseContext();
  return true;
}
