/**
 * The headroom of the SoundFont in dB (design 6.2). The presets from the sample libraries match
 * the levels of GeneralUser GS with no gain above 0 dB, so all presets play this much below
 * GeneralUser GS. The output chain adds this gain to keep the loudness of GeneralUser GS.
 */
export const SOUNDFONT_HEADROOM_DB = 6.5;

/** One source of the SoundFont, for the credits panel (design 2.8). */
interface SoundFontCredit {
  /** The name of the source, such as "GeneralUser GS 2.0.3". */
  readonly name: string;
  /** The people or the company that made it. */
  readonly author: string;
  /** The short license name. */
  readonly license: string;
  /** The web page of the source. The credits panel links the name to it. */
  readonly url: string;
}

/** The sources of the SoundFont, in the order of the credits panel (design 2.8, 6.2). */
export const SOUNDFONT_CREDITS: readonly SoundFontCredit[] = [
  {
    name: 'GeneralUser GS 2.0.3',
    author: 'S. Christian Collins',
    license: 'GeneralUser GS License v2.0',
    url: 'https://www.schristiancollins.com/generaluser.php',
  },
  {
    name: 'VSCO 2: Community Edition',
    author: 'Versilian Studios (Sam Gossner) and Ivy Audio (Simon Dalzell)',
    license: 'CC0',
    url: 'https://vis.versilstudios.net/vsco-community.html',
  },
  {
    name: 'Versilian Community Sample Library',
    author: 'Versilian Studios',
    license: 'CC0',
    url: 'https://github.com/sgossner/VCSL',
  },
];
