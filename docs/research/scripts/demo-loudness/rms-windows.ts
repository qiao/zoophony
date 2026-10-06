// Research script of docs/research/demo-loudness.md. It repeats the level measure of SD1 of
// docs/audits/2026-10-05-ux-design.md on the offline output of the app chain: the RMS of five
// windows of 6 s at 10 %, 30 %, 50 %, 70 %, and 85 % of each demo, their mean in dB, and the
// loudness of the same windows. It reads the synth renders that loudness.ts keeps.
// Usage: node rms-windows.ts <scratch dir of loudness.ts>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEMO_IDS } from '../../../../src/app/demos.ts';
import { pieceGainDb } from '../../../../src/audio/demo-loudness.ts';
import { SOUNDFONT_HEADROOM_DB } from '../../../../src/audio/soundfont-info.ts';
import { closeChain, runChain } from './chain.ts';
import { measure } from './meter.ts';

const dir = process.argv[2];
if (!dir) {
  throw new Error('Give the scratch folder of loudness.ts.');
}
const RATE = 48_000;
const SHARES = [0.1, 0.3, 0.5, 0.7, 0.85];

try {
  for (const id of DEMO_IDS) {
    const bytes = readFileSync(join(dir, `${id}-synth.f32`));
    const both = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
    const half = both.length / 2;
    const out = await runChain(
      { left: both.slice(0, half), right: both.slice(half) },
      { inputDb: SOUNDFONT_HEADROOM_DB + pieceGainDb(id) },
    );
    // The render has 3 s of tail after the song.
    const songFrames = half - 3 * RATE;
    const rms: number[] = [];
    const lufs: number[] = [];
    for (const share of SHARES) {
      const start = Math.round(share * songFrames);
      const left = out.left.slice(start, start + 6 * RATE);
      const right = out.right.slice(start, start + 6 * RATE);
      let sum = 0;
      for (let i = 0; i < left.length; i++) {
        sum += (left[i]! ** 2 + right[i]! ** 2) / 2;
      }
      rms.push(10 * Math.log10(sum / left.length));
      lufs.push(measure(left, right, false).lufs);
    }
    const meanDb = (values: number[]): string =>
      (10 * Math.log10(values.reduce((s, v) => s + 10 ** (v / 10), 0) / values.length)).toFixed(1);
    console.log(
      `${id} | mean RMS ${meanDb(rms)} dB | windows ${rms.map((v) => v.toFixed(1)).join(', ')} | ` +
        `window loudness ${lufs.map((v) => v.toFixed(1)).join(', ')} LUFS`,
    );
  }
} finally {
  await closeChain();
}
