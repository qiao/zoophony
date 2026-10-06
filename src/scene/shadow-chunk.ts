import { ShaderChunk } from 'three';

/**
 * The number of samples of the soft shadow edge (design 4.5). three.js r186 takes 5 samples of a
 * Vogel disk, turned for each pixel by a noise. The noise showed as a dither on the lit faces of
 * close shots (UX audit 2026-10-05 and 2026-10-06, SC5). 12 samples with no turn give a smooth
 * edge.
 */
export const SHADOW_SAMPLES = 12;

/** The sampling of three.js r186 that the patch replaces. */
const NOISE_SAMPLING =
  /float phi = interleavedGradientNoise\( gl_FragCoord\.xy \) \* PI2;\s*shadow = \(\s*(?:texture\( shadowMap, vec3\( shadowCoord\.xy \+ vogelDiskSample\( \d, 5, phi \) \* radius, shadowCoord\.z \) \)\s*\+?\s*){5}\) \* 0\.2;/;

/** The sampling with no noise. */
const SMOOTH_SAMPLING = `shadow = 0.0;
				for ( int i = 0; i < ${SHADOW_SAMPLES}; i ++ ) {
					shadow += texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( i, ${SHADOW_SAMPLES}, 0.0 ) * radius, shadowCoord.z ) );
				}
				shadow /= ${SHADOW_SAMPLES}.0;`;

/**
 * Replaces the noisy sampling of the soft shadow edge of `PCFShadowMap` with 12 samples of a
 * Vogel disk with no turn (design 4.5, SC5). The function changes the shader chunk of three.js
 * one time, before the first material compiles.
 *
 * @throws Error if the chunk of three.js has no sampling that the patch knows, for example after
 *   an update of three.js.
 */
export function smoothShadowEdges(): void {
  const chunk = ShaderChunk.shadowmap_pars_fragment;
  if (chunk.includes(SMOOTH_SAMPLING)) {
    return;
  }
  if (!NOISE_SAMPLING.test(chunk)) {
    throw new Error('The shadow chunk of three.js changed. Update smoothShadowEdges().');
  }
  ShaderChunk.shadowmap_pars_fragment = chunk.replace(NOISE_SAMPLING, SMOOTH_SAMPLING);
}
