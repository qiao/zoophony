// Prints the source middles of named faces of the hippo module. Usage: node docs/research/2026-10-19-cut-caps/middles.ts <animal> <count> <faces>
import { sourceMiddles } from '../../../tools/fold-probe.ts';
const [animal = 'hippo', count = '3141', list = ''] = process.argv.slice(2);
const { middles, note } = await sourceMiddles(animal, Number(count));
if (note) console.log(note);
for (const f of list.split(',').map(Number)) console.log(f, JSON.stringify(middles?.[f] ?? null));
