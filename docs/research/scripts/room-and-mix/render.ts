// Renders a demo offline with the SynthEngine of the worktree and the stage mix, and writes a
// 32-bit float stereo WAV. Usage: node render.ts '<json options>'
// Options: demo (file prefix), seconds (0 for the whole piece), out, room (false: reverbGain 0),
//   mix (false: no stage mix, the file controllers stay).
import { writeFileSync } from 'node:fs';
const R = '/Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-a32f80e2225f58629';
const { patchedDemos } = await import(`${R}/tools/patch-demos.ts`);
const { buildScore } = await import(`${R}/src/score/score.ts`);
const { layoutScene } = await import(`${R}/src/models/layout-scene.ts`);
const { stageMix, mixSynthEvents } = await import(`${R}/src/score/stage-mix.ts`);
const { packSynthEvents } = await import(`${R}/src/audio/synth-events.ts`);
const { OfflineHarness, testBanks, TEST_SAMPLE_RATE } = await import(`${R}/src/audio/test-banks.ts`);
const { BLOCK_FRAMES } = await import(`${R}/src/audio/engine.ts`);

const o = JSON.parse(process.argv[2] ?? '{}');
const demo = (await patchedDemos()).find((d: { file: string }) => d.file.startsWith(o.demo ?? 'beethoven'));
const score = buildScore(demo.bytes, 'auto').score;
const banks = await testBanks(score.presets);
const mix = o.mix === false ? [] : stageMix(score, layoutScene(score));
const events = o.mix === false ? score.synthEvents : mixSynthEvents(score.synthEvents, mix);
const run = new OfflineHarness(packSynthEvents(events), score.durationSec, banks);
const synth = (run.engine as any).synth;
if (o.room === false) synth.setSystemParameter('reverbGain', 0);
run.engine.enqueue({ type: 'play', countInSec: 0 });
const seconds = o.seconds ? Math.min(o.seconds, score.durationSec + 3) : score.durationSec + 3;
const frames = Math.ceil((seconds * TEST_SAMPLE_RATE) / BLOCK_FRAMES) * BLOCK_FRAMES;
const data = new Float32Array(frames * 2);
const l = new Float32Array(BLOCK_FRAMES);
const r = new Float32Array(BLOCK_FRAMES);
const times: number[] = [];
for (let f = 0; f < frames; f += BLOCK_FRAMES) {
  l.fill(0);
  r.fill(0);
  const t0 = performance.now();
  run.engine.render(f / TEST_SAMPLE_RATE, l, r);
  times.push(performance.now() - t0);
  for (let i = 0; i < BLOCK_FRAMES; i++) {
    data[2 * (f + i)] = l[i]!;
    data[2 * (f + i) + 1] = r[i]!;
  }
}
const header = Buffer.alloc(44);
header.write('RIFF', 0); header.writeUInt32LE(36 + data.byteLength, 4); header.write('WAVE', 8);
header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(3, 20); header.writeUInt16LE(2, 22);
header.writeUInt32LE(TEST_SAMPLE_RATE, 24); header.writeUInt32LE(TEST_SAMPLE_RATE * 8, 28); header.writeUInt16LE(8, 32);
header.writeUInt16LE(32, 34); header.write('data', 36); header.writeUInt32LE(data.byteLength, 40);
writeFileSync(o.out, Buffer.concat([header, Buffer.from(data.buffer)]));
const sorted = times.toSorted((a, b) => a - b);
console.log(JSON.stringify({ out: o.out, demo: demo.file, seconds, medianBlockMs: +sorted[Math.floor(sorted.length / 2)]!.toFixed(3), p99BlockMs: +sorted[Math.floor(sorted.length * 0.99)]!.toFixed(3) }));
