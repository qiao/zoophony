// Prints the seated eye heights (the eye bones of the skeleton) of the first species and the first
// instrument of each section on its support, and the gap of the lower eye to the top edge of the
// desk of 1.05 m. Usage, from the root of a source tree with this file copied to it:
//
//     node docs/research/2026-10-16-seat-rest/eye-probe.ts
import { CHAIR } from '../../../src/models/props.ts';
import { MUSIC_STAND } from '../../../src/models/props.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { SECTION_SPECIES, SECTION_INSTRUMENTS } from '../../../src/models/cast.ts';
import { INSTRUMENT_SUPPORTS } from '../../../src/models/player.ts';
void CHAIR;
const top = MUSIC_STAND.deskHeight + (MUSIC_STAND.deskDepth / 2) * Math.cos(MUSIC_STAND.tilt);
console.log(`desk middle ${MUSIC_STAND.deskHeight}, top edge ${top.toFixed(4)}`);
for (const [section, species] of Object.entries(SECTION_SPECIES)) {
  const instruments = (SECTION_INSTRUMENTS as Record<string, readonly string[]>)[section] ?? [];
  for (const sp of species) {
    for (const inst of instruments.slice(0, 1)) {
      const support = (INSTRUMENT_SUPPORTS as Record<string, string>)[inst];
      const m = buildPlayer(sp as never, inst as never, 4, support as never);
      const l = m.skeleton.positions[boneIndex('eyeL')]?.[1] ?? NaN;
      const r = m.skeleton.positions[boneIndex('eyeR')]?.[1] ?? NaN;
      console.log(`${section} ${sp} ${inst} ${support}: seat ${m.seat?.seatHeight?.toFixed(3) ?? '-'} eyes ${l.toFixed(4)} ${r.toFixed(4)} gap to top ${(Math.min(l, r) - top).toFixed(4)}`);
    }
  }
}
