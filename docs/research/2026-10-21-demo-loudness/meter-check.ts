// Probe of docs/research/2026-10-21-demo-loudness.md: the time of the meter on 750 s of a loud
// sine, and the loudness of a stereo sine of 1 kHz at -23 dBFS. Usage: node docs/research/2026-10-21-demo-loudness/meter-check.ts
import { measureLoudness } from '../../../tools/loudness-meter.ts';
const n = 48000 * 750;
const left = new Float32Array(n), right = new Float32Array(n);
for (let i = 0; i < n; i++) { const v = 0.1 * Math.sin(i * 2 * Math.PI * 1000 / 48000) * (1 + Math.sin(i / 48000)); left[i] = v; right[i] = v; }
let t = performance.now();
const m = measureLoudness({ left, right });
console.log('ms', (performance.now() - t).toFixed(0), m.integrated.toFixed(2), m.truePeak.toFixed(2));
const s = new Float32Array(48000 * 20).map((_, i) => 10 ** (-23 / 20) * Math.sin(i * 2 * Math.PI * 1000 / 48000));
const k = measureLoudness({ left: s, right: s });
console.log('1 kHz -23 dBFS stereo:', k.integrated.toFixed(2), 'LUFS, tp', k.truePeak.toFixed(2));
