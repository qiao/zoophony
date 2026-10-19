/**
 * Prints the strikes of the left hand of the timpanist of a demo near a song time, and the
 * targets of the rig. Usage, from the root of the tree: node docs/research/2026-10-19-elephant-arms/wait.ts <demo> <time> [--set <changes>]
 */
import { sceneOf } from '../../../src/pose/test-scene.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';
import { setHolds } from '../../../tools/hold-sets.ts';
import { createStrikeState, strikeStateAt } from '../../../src/pose/strikes.ts';

const args = process.argv.slice(2);
if (args.includes('--set')) setHolds(args[args.indexOf('--set') + 1] ?? '');
const demo = (await patchedDemos()).find((d) => d.file.startsWith(args[0] ?? 'beethoven-8-4'))!;
const time = Number(args[1] ?? '261.84');
const scene = sceneOf(demo.bytes);
const player = scene.plan.players.find((p) => p.instrument === 'timpani')!;
const note = player.note;
if (note.family !== 'percussion') throw new Error('no percussion');
console.log('targets', [...note.rig.targets.entries()].map(([k, t]) => `${k}: ${t.point.map((v) => v.toFixed(3)).join(',')}`).join(' | '));
console.log('restL', note.rig.restL.point.map((v) => v.toFixed(3)).join(','));
const track = note.left!;
const starts = Array.from(track.starts);
const near = starts.map((s, i) => [s, i] as const).filter(([s]) => Math.abs(s - time) < 8);
for (const [s, i] of near) {
  console.log(`L strike ${s.toFixed(2)} at ${Array.from(track.points.slice(i * 3, i * 3 + 3)).map((v) => v.toFixed(3)).join(',')}`);
}
const state = createStrikeState();
for (const t of [time - 1, time - 0.5, time, time + 0.5]) {
  strikeStateAt(track, t - player.timeOffset, state);
  console.log(`t ${t.toFixed(2)} point ${state.point.map((v) => v.toFixed(3)).join(',')} height ${state.height.toFixed(3)}`);
}
const allL = starts.length;
console.log(`left strikes ${allL}, right strikes ${note.right!.starts.length}`);
