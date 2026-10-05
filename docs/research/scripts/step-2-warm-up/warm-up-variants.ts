// Compares variants of the voice warm-up on one demo, in a fresh Node process. The research
// agent of 2026-10-05 ran it before the warm-up of `SynthEngine` existed (commit 6378864).
// The engine now warms up by itself in `addBanks()`, so on later commits the variant "none"
// also includes that warm-up.
//
// Usage, from the repository root:
//   node docs/research/scripts/step-2-warm-up/warm-up-variants.ts <variant> <demo> \
//     <hold blocks> <batch> <burst> <release blocks>
// Variants: none, presets (first note of each preset), keys (first note of each preset and
// key), octaves (each preset and octave), keyvel (each preset, key, and velocity), and cache
// (presets, and fills the voice cache of core for each note).
import { packSynthEvents } from '../../../../src/audio/synth-events.ts';
import { OfflineHarness, TEST_SAMPLE_RATE, testBanks } from '../../../../src/audio/test-banks.ts';
import { buildScore } from '../../../../src/score/score.ts';
import { patchedDemos } from '../../../../tools/patch-demos.ts';

const [strategy = 'none', name = 'handel', blocksArg = '8', batchArg = '100000', burstArg = '0', releaseArg = '0'] = process.argv.slice(2);
const demo = (await patchedDemos()).find((d) => d.file.startsWith(name))!;
const result = buildScore(demo.bytes, 'auto');
if (!result.ok) throw new Error('bad');
const score = result.score;
const banks = await testBanks(score.presets);
const table = packSynthEvents(score.synthEvents);
const run = new OfflineHarness(table, score.durationSec, banks);
const synth: any = (run.engine as any).synth;
const msg = new Uint8Array(3);
function send(i: number) {
  const ch = table.channel[i]!;
  msg[0] = table.kind[i]! | (ch % 16);
  msg[1] = table.data1[i]!;
  msg[2] = table.data2[i]!;
  synth.processMessage(msg, ch - (ch % 16));
}
const left = new Float32Array(128);
const right = new Float32Array(128);
const t0 = performance.now();
let notes = 0;
if (strategy !== 'none') {
  synth.setSystemParameter('gain', 0);
  const warmed = new Set<unknown>();
  for (let i = 0; i < table.timeSec.length; i++) {
    const kind = table.kind[i];
    if (kind === 0x80) continue;
    if (kind === 0x90) {
      if (table.data2[i] === 0) continue;
      const ch = table.channel[i]!;
      const preset = synth.midiChannels[ch].preset;
      const key =
        strategy === 'keys'
          ? `${preset?.name}:${table.data1[i]}`
          : strategy === 'octaves'
            ? `${preset?.name}:${Math.floor(table.data1[i]! / 12)}`
          : strategy === 'keyvel'
            ? `${preset?.name}:${table.data1[i]}:${table.data2[i]}`
            : preset;
      if (strategy === 'cache') {
        synth.synthCore.getVoices(ch, table.data1[i], table.data2[i]);
      }
      if (!warmed.has(key)) {
        warmed.add(key);
        send(i);
        notes++;
        if (notes % Number(batchArg) === 0) {
          for (let b = 0; b < Number(blocksArg); b++) synth.process(left, right);
          synth.stopAllChannels(true);
        }
      }
      continue;
    }
    send(i);
  }
  for (let k = 0; k < Number(burstArg); k++) {
    msg[0] = 0x90; msg[1] = 30 + (k % 60); msg[2] = 100;
    synth.processMessage(msg, 0);
  }
  for (let b = 0; b < Number(blocksArg); b++) synth.process(left, right);
  synth.stopAllChannels(false);
  for (let b = 0; b < Number(releaseArg); b++) synth.process(left, right);
  synth.stopAllChannels(true);
  synth.reset();
  synth.setSystemParameter('gain', 1);
}
const warmMs = performance.now() - t0;
const origProcess = synth.process.bind(synth);
const origMsg = synth.processMessage.bind(synth);
const procTimes: number[] = [];
let msgTime = 0;
const msgTimes: number[] = [];
synth.process = (l: Float32Array, r: Float32Array) => { const t = performance.now(); origProcess(l, r); procTimes.push(performance.now() - t); msgTimes.push(msgTime); msgTime = 0; };
synth.processMessage = (m: Uint8Array, o: number) => { const t = performance.now(); origMsg(m, o); msgTime += performance.now() - t; };
run.engine.enqueue({ type: 'play' });
const times: number[] = [];
while (times.length === 0 || run.engine.playing) times.push(run.timeBlock());
const at = (i: number) => (i * 128) / TEST_SAMPLE_RATE;
const slow = times.flatMap((t, i) => (t > 1.3 ? [`${at(i).toFixed(2)}s ${t.toFixed(3)}`] : []));
const window = (a: number, b: number) =>
  Math.max(...times.filter((_, i) => at(i) >= a && at(i) < b));
console.log(
  `over ${times.filter((t) => t > 1.3).length} ` + `${strategy} ${name} warm ${warmMs.toFixed(1)} ms (${notes} notes), max0-1s ${window(0, 1).toFixed(3)}, ` +
    `max27.6-28 ${window(27.6, 28).toFixed(3)}, max ${Math.max(...times).toFixed(3)}, slow: ${slow.join(', ')}`,
);
const first = times.slice(0, 6).map((t) => t.toFixed(3)).join(' ');
let n0 = 0;
for (let i = 0; i < table.timeSec.length && table.timeSec[i]! < 128 / 48000; i++) n0++;
console.log(`process ${procTimes.slice(0, 4).map((t) => t.toFixed(3)).join(' ')}; messages ${msgTimes.slice(0, 4).map((t) => t.toFixed(3)).join(' ')}`);
console.log(`first blocks ${first}; events in block 0: ${n0}`);
const kinds: Record<string, number> = {};
for (let i = 0; i < n0; i++) {
  const k = `${table.kind[i]!.toString(16)}${table.kind[i] === 0xb0 ? ':' + table.data1[i] : ''}`;
  kinds[k] = (kinds[k] ?? 0) + 1;
}
console.log(JSON.stringify(kinds));
// Time each kind of message alone on a fresh pass at a later point.
const per: Record<string, number[]> = {};
for (let rep = 0; rep < 3; rep++) {
  synth.stopAllChannels(true);
  synth.reset();
  for (let i = 0; i < n0; i++) {
    const k = `${table.kind[i]!.toString(16)}`;
    const t = performance.now();
    send(i);
    (per[k] ??= []).push(performance.now() - t);
  }
}
console.log(Object.entries(per).map(([k, v]) => `${k}: total/rep ${(v.reduce((a, b) => a + b, 0) / 3).toFixed(3)} ms, max ${Math.max(...v).toFixed(3)}`).join('; '));
