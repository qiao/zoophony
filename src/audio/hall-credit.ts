/** The credit of a file that the site serves under a license that asks for a credit. */
export interface AssetCredit {
  /** The credit line, with the changes to the file. */
  readonly text: string;
  /**
   * The end of the credit line after the name of the file: the source, the authors, the license,
   * and the changes.
   */
  readonly attribution: string;
  /** The page of the source. */
  readonly sourceUrl: string;
  /** The name of the license. */
  readonly license: string;
  /** The page of the license. */
  readonly licenseUrl: string;
}

/** The source, the authors, the license, and the changes of the hall impulse response. */
const HALL_ATTRIBUTION =
  "St Paul's Hall, University of Huddersfield, from the 360° BRIR and FOA database by Bogdan " +
  'Ioan Bacila and Hyunkook Lee (Applied Psychoacoustics Lab, University of Huddersfield), CC BY ' +
  '4.0. Changed: decoded to stereo, direct sound removed, shortened.';

/**
 * The credit of the impulse response of the mix preset `hall`,
 * `assets/hall/st-pauls-hall-c8m.wav` (design 2.8, 6.8, 7.3). CC BY 4.0 asks for the credit, a
 * link to the license, and a note of the changes. The credits panel and the third-party license
 * file show it. This module has no imports, so the UI can read it at a small cost.
 */
export const HALL_CREDIT: AssetCredit = {
  text: `Hall reverb: impulse response of ${HALL_ATTRIBUTION}`,
  attribution: HALL_ATTRIBUTION,
  sourceUrl: 'https://doi.org/10.5281/zenodo.2641166',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
};

/** The source, the authors, the license, and the changes of the impulse response of Detmold. */
const KONZERTHAUS_ATTRIBUTION =
  'the Konzerthaus of the Detmold University of Music, from the Open Database of Spatial Room ' +
  'Impulse Responses at Detmold University of Music by Sebastià V. Amengual Garí, Banu Sahin, ' +
  'Dusty Eddy, and Malte Kob (Detmold University of Music), CC BY 4.0. Changed: decoded to ' +
  'stereo, direct sound removed, shortened.';

/**
 * The credit of the impulse response of the mix preset `cinematic`,
 * `assets/hall/detmold-konzerthaus-r2.wav` (design 2.8, 6.8, 7.3). CC BY 4.0 asks for the
 * credit, a link to the license, and a note of the changes. The credits panel and the
 * third-party license file show it, because the site serves the file.
 */
export const KONZERTHAUS_CREDIT: AssetCredit = {
  text: `Cinematic hall reverb: impulse response of ${KONZERTHAUS_ATTRIBUTION}`,
  attribution: KONZERTHAUS_ATTRIBUTION,
  sourceUrl: 'https://doi.org/10.5281/zenodo.4116247',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
};
