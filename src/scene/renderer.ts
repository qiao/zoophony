import { ACESFilmicToneMapping, PCFShadowMap, SRGBColorSpace, WebGLRenderer } from 'three';

import { tierPixelRatio } from './quality.ts';
import type { QualityTier } from './quality.ts';

/**
 * Creates the WebGL2 renderer of the stage (design 2.6, 4.5). The canvas is transparent, so the
 * CSS gradient of the page is the background.
 *
 * @param canvas The canvas of the page.
 * @param tier The quality tier. It sets the pixel ratio.
 * @param devicePixelRatio The `devicePixelRatio` of the window.
 * @returns The renderer. Its size is not set yet.
 */
export function createRenderer(
  canvas: HTMLCanvasElement,
  tier: QualityTier,
  devicePixelRatio: number,
): WebGLRenderer {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  // The spotlight sets the blur radius of each tier (TierSettings.shadowRadius).
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setPixelRatio(tierPixelRatio(tier, devicePixelRatio));
  return renderer;
}
