import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  PCFShadowMap,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

import { CLEAR_COLOR } from './post.ts';
import { tierPixelRatio } from './quality.ts';
import { smoothShadowEdges } from './shadow-chunk.ts';
import type { QualityTier } from './quality.ts';

/**
 * Creates the WebGL2 renderer of a page (design 2.6, 4.5).
 *
 * With post effects, the scene renders into the target of the post effects (scene/post.ts), which
 * clears to the dark of the hall, and the final pass writes each pixel of the canvas. The canvas
 * then has no MSAA, because the target has it: a multisample canvas holds 83 MB at 2880 × 1800
 * for the final pass alone. With no post effects, as on the gallery pages, the canvas has MSAA
 * and is transparent, so the CSS background of the page shows.
 *
 * @param canvas The canvas of the page.
 * @param tier The quality tier. It sets the pixel ratio.
 * @param devicePixelRatio The `devicePixelRatio` of the window.
 * @param post True if the page renders with the post effects.
 * @returns The renderer. Its size is not set yet.
 */
export function createRenderer(
  canvas: HTMLCanvasElement,
  tier: QualityTier,
  devicePixelRatio: number,
  post = false,
): WebGLRenderer {
  const renderer = new WebGLRenderer({ canvas, alpha: !post, antialias: !post });
  if (post) {
    renderer.setClearColor(CLEAR_COLOR, 1);
  } else {
    renderer.setClearColor(0x000000, 0);
  }
  renderer.toneMapping = post ? AgXToneMapping : ACESFilmicToneMapping;
  renderer.toneMappingExposure = post ? 0.8 : 1;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  // The spotlight sets the blur radius of each tier (TierSettings.shadowRadius).
  renderer.shadowMap.type = PCFShadowMap;
  smoothShadowEdges();
  renderer.setPixelRatio(tierPixelRatio(tier, devicePixelRatio));
  return renderer;
}
