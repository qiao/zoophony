import type { SkinLoader } from './player-materials.ts';

/** A skin loader for the tests: it gives an image of one texel at once, with no network. */
export const NO_LOAD: SkinLoader = () => Promise.resolve({ width: 1, height: 1 });
