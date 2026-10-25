/**
 * Prints the body length and the whole length of the violin and the viola of each string species,
 * in mm, to compare them with the sizes of a shop (`docs/reference/string-technique.md`, 1.10).
 *
 * Usage: node docs/research/2026-10-25-string-angle/sizes.ts
 */
import { STRING_SCALES, VIOLIN } from '../../../src/models/instruments/strings.ts';
import { SPECIES, instrumentScale } from '../../../src/models/species.ts';

const cases = [
  ['rabbit', 'violin'],
  ['fox-red', 'violin'],
  ['cat', 'viola'],
] as const;
for (const [species, instrument] of cases) {
  const scale = STRING_SCALES[instrument] * instrumentScale(SPECIES[species], instrument);
  const body = VIOLIN.bodyLength * scale * 1000;
  console.log(
    `${species} ${instrument}: scale ${instrumentScale(SPECIES[species], instrument)}, body ${body.toFixed(0)} mm (${(body / 25.4).toFixed(1)} in), length ${(VIOLIN.length * scale * 1000).toFixed(0)} mm, full viola of the app ${(VIOLIN.bodyLength * STRING_SCALES.viola * 1000).toFixed(0)} mm`,
  );
}
