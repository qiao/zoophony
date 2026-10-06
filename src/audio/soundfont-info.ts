/**
 * The headroom of the SoundFont in dB (design 6.2). The presets from the sample libraries match
 * the levels of GeneralUser GS with no gain above 0 dB, so all presets play this much below
 * GeneralUser GS. The output chain adds this gain to keep the loudness of GeneralUser GS.
 */
export const SOUNDFONT_HEADROOM_DB = 6.5;
