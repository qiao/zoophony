// Lists the strikes of each hand of the xylophone in a time range: node docs/research/2026-10-25-xylophone-reach/list.ts <file> <from> <to>
import { readFile } from 'node:fs/promises';
import { sceneOf } from '../../../src/pose/test-scene.ts';
const s = sceneOf(new Uint8Array(await readFile(process.argv[2]!)));
const [from, to] = [Number(process.argv[3]), Number(process.argv[4])];
for (const [index, pl] of s.layout.players.entries()) {
  if (pl.cast.instrument !== 'xylophone') continue;
  const plan = s.plan.players[index]!;
  const layer = plan.note as unknown as Record<'left' | 'right', { starts: Float64Array; points: Float64Array }>;
  const rows: [number, string][] = [];
  for (const [side, tr] of [['L', layer.left], ['R', layer.right]] as const) {
    for (let i = 0; i < tr.starts.length; i++) {
      const t = tr.starts[i]! + plan.timeOffset;
      if (t >= from && t <= to) rows.push([t, `${t.toFixed(2)} ${side} x ${(tr.points[3 * i]! * 100).toFixed(1)} z ${(tr.points[3 * i + 2]! * 100).toFixed(1)}`]);
    }
  }
  console.log(rows.toSorted((a, b) => a[0] - b[0]).map((r) => r[1]).join('\n'));
  break;
}
