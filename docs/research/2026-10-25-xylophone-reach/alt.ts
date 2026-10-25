// The hand changes of the xylophone strikes: SET='<changes>' node docs/research/2026-10-25-xylophone-reach/alt.ts <midi|percussion-test>
// A pair is two strikes in a row, less than 0.5 s apart, of single notes. It alternates when the
// two strikes take different hands. A run is a group of such pairs.
import { readFile } from 'node:fs/promises';
import { setHolds } from '../../../tools/hold-sets.ts';
import { probeDemos } from '../../../tools/probe-demos.ts';
import { sceneOf } from '../../../src/pose/test-scene.ts';

if (process.env['SET']) setHolds(process.env['SET']);
const f = process.argv[2] ?? 'percussion-test';
const bytes = f.includes('/') ? new Uint8Array(await readFile(f)) : (await probeDemos()).find((d) => d.file === `${f}.mid`)!.bytes;
const s = sceneOf(bytes);
for (const [index, pl] of s.layout.players.entries()) {
  if (pl.cast.instrument !== 'xylophone') continue;
  const plan = s.plan.players[index]!;
  const layer = plan.note as unknown as Record<'left' | 'right', { starts: Float64Array }>;
  const all: [number, 'L' | 'R'][] = [];
  for (const [side, tr] of [['L', layer.left], ['R', layer.right]] as const) {
    for (const t of tr.starts) all.push([t, side]);
  }
  const sorted = all.toSorted((a, b) => a[0] - b[0]);
  let pairs = 0;
  let changes = 0;
  let longest = 0;
  let same = 0;
  for (let i = 1; i < sorted.length; i++) {
    const [t0, h0] = sorted[i - 1]!;
    const [t1, h1] = sorted[i]!;
    // Two strikes at one time are a chord.
    if (t1 - t0 < 0.05 || t1 - t0 >= 0.5 || (sorted[i + 1] && sorted[i + 1]![0] - t1 < 0.05)) {
      same = 0;
      continue;
    }
    pairs++;
    if (h0 !== h1) {
      changes++;
      same = 0;
    } else {
      same++;
      longest = Math.max(longest, same + 1);
    }
  }
  console.log(`${f.split('/').at(-1)} player ${index}: ${pairs} fast pairs, ${((100 * changes) / Math.max(1, pairs)).toFixed(0)}% change hands, longest run in one hand ${longest} strikes`);
  break;
}
