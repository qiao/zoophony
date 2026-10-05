// Times each 128-frame block of an offline render of demo 1 in Node, with performance.now().
// The browsers give the worklet only Date.now() (1 ms steps), so this script shows where the
// slow blocks of the spike page come from, at a finer resolution.
//
// Usage (from the repository root): node docs/research/scripts/spike/block-times.ts

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BLOCK_FRAMES, SynthEngine } from '../../../../src/audio/engine.ts';
import { packSynthEvents } from '../../../../src/audio/synth-events.ts';
import { testBanks } from '../../../../src/audio/test-banks.ts';
import { scoreFromMidi } from '../../../../src/spike/midi-score.ts';

const SAMPLE_RATE = 48_000;
const root = join(import.meta.dirname, '../../../..');
const midi = await readFile(join(root, 'demos/src/beethoven-5.mid'));
const score = scoreFromMidi(midi.buffer.slice(midi.byteOffset, midi.byteOffset + midi.byteLength));
const banks = await testBanks(score.presets);

function render(label: string): void {
  const engine = new SynthEngine(SAMPLE_RATE, () => undefined);
  engine.loadScore(packSynthEvents(score.synthEvents), score.durationSec);
  engine.addBanks(banks.map((bank) => ({ id: bank.id, data: bank.data.slice(0) })));
  const left = new Float32Array(BLOCK_FRAMES);
  const right = new Float32Array(BLOCK_FRAMES);
  // Silent blocks before play, as in the worklet while the context runs before the click.
  for (let i = 0; i < 375; i++) {
    engine.render(i * (BLOCK_FRAMES / SAMPLE_RATE), left, right);
  }
  engine.enqueue({ type: 'play' });
  const budgetMs = (BLOCK_FRAMES / SAMPLE_RATE) * 1000;
  const times: number[] = [];
  const slow: string[] = [];
  const blocks = Math.ceil((score.durationSec * SAMPLE_RATE) / BLOCK_FRAMES);
  for (let i = 0; i < blocks; i++) {
    const start = performance.now();
    engine.render((375 + i) * (BLOCK_FRAMES / SAMPLE_RATE), left, right);
    const ms = performance.now() - start;
    times.push(ms);
    if (ms > budgetMs) {
      slow.push(`${((i * BLOCK_FRAMES) / SAMPLE_RATE).toFixed(2)} s: ${ms.toFixed(2)} ms`);
    }
  }
  const sorted = times.toSorted((a, b) => a - b);
  const at = (q: number): string => (sorted[Math.floor(q * (sorted.length - 1))] ?? 0).toFixed(3);
  console.log(
    `${label}: ${times.length} blocks, median ${at(0.5)} ms, p99 ${at(0.99)} ms, ` +
      `p99.9 ${at(0.999)} ms, max ${at(1)} ms, ${slow.length} above ${budgetMs.toFixed(2)} ms`,
  );
  console.log(
    `  first 8 blocks (ms): ${times
      .slice(0, 8)
      .map((ms) => ms.toFixed(2))
      .join(', ')}`,
  );
  console.log(`  slow blocks: ${slow.slice(0, 12).join('; ')}`);
}

// The first engine also warms up the JIT of V8. The second engine shows the cost with warm code.
render('first engine');
render('second engine');
