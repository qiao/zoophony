import { writeSmf } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { buildScore } from './score.ts';
import type { Score, SectionSize } from './types.ts';

/**
 * Builds the score of a test file with the real `score/` modules. Only tests use this function,
 * so it does not enter the first download.
 *
 * @param file The file as events, or its bytes.
 * @param sectionSize The value of the setting "Section size".
 * @returns The score.
 * @throws Error if `buildScore()` refuses the file.
 */
export function scoreOf(file: TestFile | Uint8Array, sectionSize: SectionSize = 'auto'): Score {
  const result = buildScore(file instanceof Uint8Array ? file : writeSmf(file), sectionSize);
  if (!result.ok) {
    throw new Error(`The test file was refused: ${result.error}.`);
  }
  return result.score;
}
