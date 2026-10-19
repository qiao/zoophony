/** Prints the end pins of the contrabass and the cello. Usage: node docs/research/2026-10-18-hippo-mesh/end-pin.ts */
import { CELLO_END_PIN, STRING_SCALES, VIOLIN, endPinLength } from '../../../src/models/instruments/strings.ts';

console.log('violin body', VIOLIN.bodyLength, 'contrabass scale', STRING_SCALES.contrabass);
for (const s of [1, 0.8]) {
  console.log(`contrabass scale ${s}: end pin ${endPinLength('contrabass', s).toFixed(3)} m, body ${(VIOLIN.bodyLength * STRING_SCALES.contrabass * s).toFixed(3)} m`);
}
console.log('cello end pin', CELLO_END_PIN, 'dog cello 0.86:', endPinLength('cello', 0.86).toFixed(3));
