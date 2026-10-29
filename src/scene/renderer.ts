import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  PCFShadowMap,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import type { ToneMapping } from 'three';

import { CLEAR_COLOR } from './post.ts';
import { tierPixelRatio } from './quality.ts';
import { smoothShadowEdges } from './shadow-chunk.ts';
import type { QualityTier } from './quality.ts';

/**
 * The look of a renderer (design 2.6, 4.5):
 *
 * - `post`: the stage of the app with the post effects. The target of the post effects has the
 *   MSAA, so the canvas has none.
 * - `stage`: the stage of the app on a GPU that cannot render to a target of floats. The scene
 *   renders to the canvas with no post effects, so the canvas has the MSAA.
 * - `gallery`: the gallery pages. The canvas has the MSAA and is transparent, so the CSS
 *   background of the page shows.
 */
type RendererLook = 'post' | 'stage' | 'gallery';

/**
 * The tone mapping of the stage (design 4.5, light and render): AgX at this exposure. A close shot
 * adds the exposure of `SHOT_LOOK` (scene/shot-light.ts), and the grade of `scene/grade.ts` works
 * on the result. The renderer reads the value at its creation, so the look override of the dev
 * server reaches it (`LOOK_ROOTS` of `scene/look-values.ts`).
 */
export const STAGE_TONE = {
  /**
   * The exposure. With 0.8, the lit fur and the lit floor sit on the shoulder of the curve, and
   * the stage looks over-exposed. 0.7 is about 0.2 stop less.
   */
  exposure: 0.7,
} as const;

/** The settings of the renderer of a look. */
interface RendererSettings {
  readonly alpha: boolean;
  readonly antialias: boolean;
  readonly toneMapping: ToneMapping;
  readonly exposure: number;
  /** The alpha of the clear color: 1 for the dark of the hall, 0 for a transparent canvas. */
  readonly clearAlpha: number;
}

/**
 * Gives the settings of the renderer of a look. A multisample canvas holds 83 MB at
 * 2880 × 1800 for the final pass alone, so the canvas of the post effects has no MSAA.
 *
 * @param look The look.
 * @returns The settings.
 */
export function rendererSettings(look: RendererLook): RendererSettings {
  if (look === 'gallery') {
    return {
      alpha: true,
      antialias: true,
      toneMapping: ACESFilmicToneMapping,
      exposure: 1,
      clearAlpha: 0,
    };
  }
  return {
    alpha: false,
    antialias: look === 'stage',
    toneMapping: AgXToneMapping,
    exposure: STAGE_TONE.exposure,
    clearAlpha: 1,
  };
}

/**
 * Creates the WebGL2 renderer of a page (design 2.6, 4.5).
 *
 * With post effects, the scene renders into the target of the post effects (scene/post.ts), which
 * clears to the dark of the hall, and the final pass writes each pixel of the canvas. MSAA stays
 * on in all tiers: in the target with post effects, and in the canvas without them.
 *
 * @param canvas The canvas of the page.
 * @param tier The quality tier. It sets the pixel ratio.
 * @param devicePixelRatio The `devicePixelRatio` of the window.
 * @param look The look of the renderer.
 * @returns The renderer. Its size is not set yet.
 */
export function createRenderer(
  canvas: HTMLCanvasElement,
  tier: QualityTier,
  devicePixelRatio: number,
  look: RendererLook = 'gallery',
): WebGLRenderer {
  const settings = rendererSettings(look);
  const renderer = new WebGLRenderer({
    canvas,
    alpha: settings.alpha,
    antialias: settings.antialias,
  });
  renderer.setClearColor(look === 'gallery' ? 0x000000 : CLEAR_COLOR, settings.clearAlpha);
  renderer.toneMapping = settings.toneMapping;
  renderer.toneMappingExposure = settings.exposure;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  // The spotlight sets the blur radius of each tier (TierSettings.shadowRadius).
  renderer.shadowMap.type = PCFShadowMap;
  smoothShadowEdges();
  renderer.setPixelRatio(tierPixelRatio(tier, devicePixelRatio));
  return renderer;
}
