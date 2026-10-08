// Prints the footprint bounds of a player.
// Run it from the root of the repository: node <this file> <species> <instrument>
import { playerFootprint } from '../../../../src/models/footprint.ts';
import { buildPlayer } from '../../../../src/models/player.ts';

const [species = 'hippo', instrument = 'contrabass'] = process.argv.slice(2);
// SAFETY: a scratch tool; the arguments name a species and an instrument.
const fp = playerFootprint(buildPlayer(species as never, instrument as never));
const f = (v: readonly number[]): string => v.map((n) => n.toFixed(3)).join(', ');
console.log(`bounds min ${f(fp.bounds.min)} max ${f(fp.bounds.max)}, boxes ${fp.boxes.length}`);
for (const box of fp.boxes) {
  console.log(`  min ${f(box.min)} max ${f(box.max)}`);
}
