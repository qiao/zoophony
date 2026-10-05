// Writes the synth events and the PCM SF2 banks of demo 1 into page/data/, for bench and the
// probe pages. The banks come from GeneralUserGS.sf3 in the same way as in the tests.
//
// Usage (from the repository root): node docs/research/scripts/webkit-audio/prepare.ts

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { testBanks } from '../../../../src/audio/test-banks.ts';
import { scoreFromMidi } from '../../../../src/spike/midi-score.ts';

const root = join(import.meta.dirname, '../../../..');
const out = join(import.meta.dirname, 'page/data');
mkdirSync(out, { recursive: true });
const midi = readFileSync(join(root, 'demos/src/beethoven-5.mid'));
const score = scoreFromMidi(midi.buffer.slice(midi.byteOffset, midi.byteOffset + midi.byteLength));
const banks = await testBanks(score.presets);
const files = banks.map((bank, i) => {
  const file = `bank${i}.sf2`;
  writeFileSync(join(out, file), new Uint8Array(bank.data));
  return { id: bank.id, file };
});
const data = { durationSec: score.durationSec, events: score.synthEvents, banks: files };
writeFileSync(join(out, 'score.json'), JSON.stringify(data));
console.log(`${score.synthEvents.length} events and ${files.length} banks in ${out}`);
