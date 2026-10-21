/** The credit of a file that the site serves under a license that asks for a credit. */
interface AssetCredit {
  /** The credit line, with the changes to the file. */
  readonly text: string;
  /** The page of the source. */
  readonly sourceUrl: string;
  /** The name of the license. */
  readonly license: string;
  /** The page of the license. */
  readonly licenseUrl: string;
}

/**
 * The credit of the hall impulse response, `assets/hall/st-pauls-hall-c8m.wav` (design 2.8, 7.3).
 * CC BY 4.0 asks for the credit, a link to the license, and a note of the changes. The credits
 * panel and the third-party license file show it. This module has no imports, so the UI can read
 * it at a small cost.
 */
export const HALL_CREDIT: AssetCredit = {
  text:
    "Hall reverb: impulse response of St Paul's Hall, University of Huddersfield, from the 360° " +
    'BRIR and FOA database by Bogdan Ioan Bacila and Hyunkook Lee (Applied Psychoacoustics Lab, ' +
    'University of Huddersfield), CC BY 4.0. Changed: decoded to stereo, direct sound removed, ' +
    'shortened.',
  sourceUrl: 'https://doi.org/10.5281/zenodo.2641166',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
};
