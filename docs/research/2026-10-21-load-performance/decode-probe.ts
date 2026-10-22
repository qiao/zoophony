// Times the SF3 to PCM SF2 decode of the 17 presets of the default demo in Node, one after the
// other, as one decode Worker did. Usage, after pnpm build:
// node docs/research/2026-10-21-load-performance/decode-probe.ts
import { readFileSync } from 'node:fs';
import { sf3ToPcmSf2 } from '../../../src/audio/decode.ts';
import { buildScore } from '../../../src/score/score.ts';
import { resolvePresetFiles } from '../../../src/audio/preset-index.ts';
const result = buildScore(new Uint8Array(readFileSync('dist/demos/boulanger-matin.mid')), 'auto');
if (!result.ok) throw new Error('no score');
const index = JSON.parse(readFileSync('dist/sf/index.json', 'utf8'));
const files = resolvePresetFiles(index, result.score.presets);
// warm
await sf3ToPcmSf2(readFileSync('dist/sf/0/8.sf3').buffer.slice(0));
let sum = 0, pcm = 0;
for (const f of files) {
  const b = readFileSync(`dist/${f.file}`);
  const t = performance.now();
  const out = await sf3ToPcmSf2(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const ms = performance.now() - t; sum += ms; pcm += out.byteLength;
  console.log(f.file, b.length, ms.toFixed(1), 'ms');
}
console.log('total decode ms', sum.toFixed(0), 'pcm bytes', pcm);
