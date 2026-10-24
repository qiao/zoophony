// Writes a short piano test file with the sustain pedal (CC 64) at 90 BPM: one chord in each bar,
// and in each odd bar (1, 3, 5, 7) the pedal down 0.1 beat after the bar line and up 0.1 beat
// before the next (diagnosis only). Thus the pedal is down at 12 s and up at 9.5 s. Usage, from
// the root of the tree: node docs/research/2026-10-24-piano-pedals/pedal-midi.ts <out.mid>
import { writeFileSync } from 'node:fs';

import {
  chord,
  controlChange,
  endOfTrack,
  programChange,
  tempo,
  track,
  writeSmf,
} from '../../../src/midi/test-smf.ts';

const out = process.argv[2];
if (!out) {
  throw new Error('Give the path of the output file.');
}
const q = 480;
const bar = 4 * q;
const chords = [
  [48, 60, 64, 67],
  [53, 60, 65, 69],
  [55, 59, 62, 67],
  [48, 60, 64, 72],
];
const events = [];
for (let b = 0; b < 8; b++) {
  const start = b * bar;
  events.push(chord(start, 0, chords[b % chords.length] ?? [60], start + bar - q / 4));
  if (b % 2 === 0) {
    events.push([
      controlChange(start + q / 10, 0, 64, 127),
      controlChange(start + bar - q / 10, 0, 64, 0),
    ]);
  }
}
const file = writeSmf({
  tracks: [track([tempo(0, 90), programChange(0, 0, 0)], ...events, [endOfTrack(8 * bar + q)])],
});
writeFileSync(out, file);
