// Research script of docs/research/demo-loudness.md. It measures each full demo at the output of
// the app chain (after the limiter and its trim) with the piece gain of pieceGainDb(), then finds
// the piece gain that gives -18 LUFS there.
// Usage: node loudness.ts <scratch dir> [demo id ...]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEMO_IDS } from '../../../../src/app/demos.ts';
import { TARGET_LOUDNESS, pieceGainDb } from '../../../../src/audio/demo-loudness.ts';
import { SOUNDFONT_HEADROOM_DB } from '../../../../src/audio/soundfont-info.ts';
import { closeChain, runChain } from './chain.ts';
import { measure } from './meter.ts';
import type { Measure } from './meter.ts';
import { renderDemo } from './synth.ts';
import type { Stereo } from './synth.ts';

const dir = process.argv[2];
if (!dir) {
  throw new Error('Give the scratch folder.');
}
mkdirSync(dir, { recursive: true });
const ids = process.argv.length > 3 ? process.argv.slice(3) : [...DEMO_IDS];

async function synthOf(id: string): Promise<Stereo> {
  const path = join(dir!, `${id}-synth.f32`);
  if (!existsSync(path)) {
    const audio = await renderDemo(id);
    const both = new Float32Array(audio.left.length * 2);
    both.set(audio.left);
    both.set(audio.right, audio.left.length);
    writeFileSync(path, both);
  }
  const bytes = readFileSync(path);
  const both = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
  const half = both.length / 2;
  return { left: both.slice(0, half), right: both.slice(half) };
}

async function measureAt(synth: Stereo, gainDb: number, truePeak: boolean): Promise<Measure> {
  const out = await runChain(synth, { inputDb: SOUNDFONT_HEADROOM_DB + gainDb });
  return measure(out.left, out.right, truePeak);
}

function row(id: string, gainDb: number, m: Measure): string {
  return [
    id,
    gainDb.toFixed(1),
    m.lufs.toFixed(2),
    m.lra.toFixed(1),
    m.maxMomentary.toFixed(1),
    m.samplePeak.toFixed(2),
    m.truePeak.toFixed(2),
  ].join(' | ');
}

const results: Record<string, unknown>[] = [];
try {
  for (const id of ids) {
    const synth = await synthOf(id);
    // SAFETY: the ids are the demo ids of the app or the arguments of the user.
    const before = pieceGainDb(id as (typeof DEMO_IDS)[number]);
    const first = await measureAt(synth, before, true);
    console.log(`before | ${row(id, before, first)}`);
    let gain = before;
    let now = first;
    for (let step = 0; step < 4 && Math.abs(now.lufs - TARGET_LOUDNESS) > 0.05; step++) {
      gain = Math.round((gain + TARGET_LOUDNESS - now.lufs) * 10) / 10;
      now = await measureAt(synth, gain, false);
      console.log(`step ${step} | ${row(id, gain, now)}`);
    }
    const after = await measureAt(synth, gain, true);
    console.log(`after | ${row(id, gain, after)}`);
    results.push({ id, before: { gainDb: before, ...first }, after: { gainDb: gain, ...after } });
  }
} finally {
  await closeChain();
}
writeFileSync(join(dir, `loudness-${Date.now()}.json`), JSON.stringify(results, null, 1));
