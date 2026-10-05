// Renders the first 60 s of demo 1 in Node with the effects on and off, and compares the left
// channels. It shows how much of the sound the reverb and the chorus make.
//
// SpessaSynthProcessor.process() adds to the output buffers. The browsers clear the outputs of a
// worklet before each process() call, so this script clears them too.
//
// Usage: node docs/research/scripts/webkit-audio/effects-diff.ts (after prepare.ts)

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BLOCK_FRAMES, SynthEngine } from '../../../../src/audio/engine.ts';
import { packSynthEvents } from '../../../../src/audio/synth-events.ts';

const SAMPLE_RATE = 48_000;
const SECONDS = 60;
const dir = join(import.meta.dirname, 'page/data');
const data = JSON.parse(readFileSync(join(dir, 'score.json'), 'utf8'));

function render(effects: boolean): Float32Array {
  const engine = new SynthEngine(SAMPLE_RATE, () => undefined);
  // SAFETY: research script. The engine keeps the synth private, and only this script reads it.
  const synth = (
    engine as unknown as { synth: { setSystemParameter(k: string, v: unknown): void } }
  ).synth;
  synth.setSystemParameter('effectsEnabled', effects);
  engine.loadScore(packSynthEvents(data.events), data.durationSec);
  engine.addBanks(
    data.banks.map((bank: { id: string; file: string }) => {
      const bytes = readFileSync(join(dir, bank.file));
      return { id: bank.id, data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) };
    }),
  );
  engine.enqueue({ type: 'play' });
  const blocks = Math.ceil((SECONDS * SAMPLE_RATE) / BLOCK_FRAMES);
  const out = new Float32Array(blocks * BLOCK_FRAMES);
  const left = new Float32Array(BLOCK_FRAMES);
  const right = new Float32Array(BLOCK_FRAMES);
  for (let i = 0; i < blocks; i++) {
    left.fill(0);
    right.fill(0);
    engine.render((i * BLOCK_FRAMES) / SAMPLE_RATE, left, right);
    out.set(left, i * BLOCK_FRAMES);
  }
  return out;
}

const on = render(true);
const off = render(false);
let signal = 0;
let difference = 0;
for (let i = 0; i < on.length; i++) {
  signal += (on[i] ?? 0) ** 2;
  difference += ((on[i] ?? 0) - (off[i] ?? 0)) ** 2;
}
console.log(
  `first ${SECONDS} s, left channel: RMS with effects ${Math.sqrt(signal / on.length).toFixed(5)}, ` +
    `RMS of (on - off) ${Math.sqrt(difference / on.length).toFixed(5)}, ` +
    `ratio ${(10 * Math.log10(difference / signal)).toFixed(1)} dB`,
);
