// Probe of docs/research/2026-10-21-demo-loudness.md: the velocity of the note-on events of each
// demo, and the range of CC 7 and CC 11. Usage: node docs/research/2026-10-21-demo-loudness/velocities.ts
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { buildScore } from '../../../src/score/score.ts';
import { DEMO_IDS } from '../../../src/app/demos.ts';
const demos = await patchedDemos();
for (const id of DEMO_IDS) {
  const f = demos.find((d) => d.file === `${id}.mid`)!;
  const r = buildScore(f.bytes, 'auto');
  if (!r.ok) throw new Error(r.error);
  const ev = r.score.synthEvents;
  const vel = ev.filter((e) => e.kind === 0x90 && e.data2 > 0).map((e) => e.data2).sort((a, b) => a - b);
  const q = (p: number) => vel[Math.floor(p * (vel.length - 1))];
  const cc = (n: number) => { const v = ev.filter((e) => e.kind === 0xb0 && e.data1 === n).map((e) => e.data2); return v.length ? `${Math.min(...v)}..${Math.max(...v)} (${v.length})` : '-'; };
  console.log(id.padEnd(17), 'notes', vel.length, 'vel p10/50/90', q(0.1), q(0.5), q(0.9), 'min/max', vel[0], vel.at(-1), 'cc7', cc(7), 'cc11', cc(11), 'dur', r.score.durationSec.toFixed(0));
}
