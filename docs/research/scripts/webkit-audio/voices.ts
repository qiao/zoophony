// Renders demo 1 in Node and groups the block times by the number of active voices, with the
// effects on and off. It shows the cost of a voice, the fixed cost of the effects, and the
// highest voice count against the voice cap of spessasynth_core (350).
//
// Usage: node docs/research/scripts/webkit-audio/voices.ts (after prepare.ts)

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BLOCK_FRAMES, SynthEngine } from '../../../../src/audio/engine.ts';
import { packSynthEvents } from '../../../../src/audio/synth-events.ts';

const SAMPLE_RATE = 48_000;
const dir = join(import.meta.dirname, 'page/data');
const data = JSON.parse(readFileSync(join(dir, 'score.json'), 'utf8'));
const banks = data.banks.map((bank: { id: string; file: string }) => {
  const bytes = readFileSync(join(dir, bank.file));
  return { id: bank.id, data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) };
});

for (const effects of [true, false]) {
  const engine = new SynthEngine(SAMPLE_RATE, () => undefined);
  // SAFETY: research script. The engine keeps the synth private, and only this script reads it.
  const synth = (
    engine as unknown as {
      synth: { voiceCount: number; setSystemParameter(k: string, v: unknown): void };
    }
  ).synth;
  synth.setSystemParameter('effectsEnabled', effects);
  engine.loadScore(packSynthEvents(data.events), data.durationSec);
  engine.addBanks(banks);
  engine.enqueue({ type: 'play' });
  const left = new Float32Array(BLOCK_FRAMES);
  const right = new Float32Array(BLOCK_FRAMES);
  const blocks = Math.ceil((data.durationSec * SAMPLE_RATE) / BLOCK_FRAMES);
  const groups = new Map<number, number[]>();
  let maxVoices = 0;
  let sumVoices = 0;
  for (let i = 0; i < blocks; i++) {
    const start = performance.now();
    engine.render((i * BLOCK_FRAMES) / SAMPLE_RATE, left, right);
    const ms = performance.now() - start;
    const voices = synth.voiceCount;
    maxVoices = Math.max(maxVoices, voices);
    sumVoices += voices;
    const key = Math.floor(voices / 20) * 20;
    const group = groups.get(key) ?? [];
    group.push(ms);
    groups.set(key, group);
  }
  console.log(
    `effects ${effects ? 'on' : 'off'}: highest voice count ${maxVoices}, ` +
      `mean ${(sumVoices / blocks).toFixed(1)}`,
  );
  for (const key of [...groups.keys()].toSorted((a, b) => a - b)) {
    const times = (groups.get(key) ?? []).toSorted((a, b) => a - b);
    const median = times[times.length >> 1] ?? 0;
    console.log(`  ${key} to ${key + 19} voices: ${times.length} blocks, median ${median.toFixed(3)} ms`);
  }
}
