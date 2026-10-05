// Q7: when are SF3 (Ogg Vorbis) samples decoded, and how long does one decode take?
import fs from "node:fs";
import { performance } from "node:perf_hooks";
import { loadBank, makeSynth, renderUntil, SpessaSynthSequencer, SR } from "./q_common.mjs";
import { BasicMIDI } from "spessasynth_core";

const decoded = (bank) => bank.samples.filter((s) => s.audioData !== undefined).length;

// A. Load the full bank: are samples decoded at load?
let a = performance.now();
const bank = loadBank("../GeneralUserGS.sf3");
console.log(`A. load GeneralUserGS.sf3: ${(performance.now() - a).toFixed(0)} ms; samples=${bank.samples.length}, decoded after load=${decoded(bank)}`);
const synth = await makeSynth(bank);
console.log(`A. after addSoundBank: decoded=${decoded(bank)}`);

// B. First note on a preset: decode happens inside noteOn (time the call).
synth.programChange(0, 40);
renderUntil(synth, synth.currentTime + 0.01);
a = performance.now();
synth.noteOn(0, 67, 100);
const firstNoteMs = performance.now() - a;
a = performance.now();
synth.noteOn(0, 67, 100);
const secondNoteMs = performance.now() - a;
console.log(`B. violin key 67: first noteOn ${firstNoteMs.toFixed(2)} ms, same note again ${secondNoteMs.toFixed(3)} ms; decoded now=${decoded(bank)}`);
synth.stopAllChannels(true);

// C. Time one decode per sample for orchestral presets (fresh samples only).
const wanted = new Set([0, 40, 41, 42, 43, 45, 46, 47, 48, 52, 56, 57, 58, 60, 68, 70, 71, 72, 73]);
const samples = new Set();
for (const p of bank.presets) {
  const melodic = p.bankMSB === 0 && p.bankLSB === 0 && !p.isGMGSDrum && wanted.has(p.program);
  const drum = p.isGMGSDrum && (p.program === 0 || p.program === 48);
  if (!melodic && !drum) continue;
  for (const z of p.zones) for (const iz of z.instrument.zones) if (iz.sample) samples.add(iz.sample);
}
const rows = [];
for (const s of samples) {
  if (s.audioData) continue;
  const t = performance.now();
  const d = s.getAudioData();
  rows.push({ ms: performance.now() - t, frames: d.length, rate: s.sampleRate, bytes: s.compressedData?.length ?? 0 });
}
rows.sort((x, y) => x.ms - y.ms);
const q = (p) => rows[Math.min(rows.length - 1, Math.floor(p * rows.length))];
const sum = rows.reduce((acc, r) => acc + r.ms, 0);
const secs = rows.reduce((acc, r) => acc + r.frames / r.rate, 0);
console.log(`C. decoded ${rows.length} samples one by one: total ${sum.toFixed(0)} ms for ${secs.toFixed(1)} s of audio (${(sum / secs).toFixed(2)} ms per audio second)`);
for (const p of [0.5, 0.9, 0.99, 1]) { const r = q(p); console.log(`   p${p * 100}: ${r.ms.toFixed(2)} ms (sample ${r.frames} frames = ${(r.frames / r.rate).toFixed(2)} s, ${r.bytes} Ogg bytes)`); }
const med = rows.map((r) => r.frames).sort((x, y) => x - y)[rows.length >> 1];
console.log(`   median sample length: ${med} frames; render budget per 128-frame block at ${SR} Hz: ${(1000 * 128 / SR).toFixed(2)} ms`);

// D. Sequencer.loadNewSongList preloads (decodes) all samples a song uses. Time it with a fresh bank.
for (const f of ["../midi/Symphony5_1.mid", "../midi/Egmont.mid"]) {
  const fresh = loadBank("../GeneralUserGS.sf3");
  const s = await makeSynth(fresh);
  const seq = new SpessaSynthSequencer(s);
  const raw = fs.readFileSync(new URL(f, import.meta.url));
  const mid = BasicMIDI.fromArrayBuffer(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
  const t = performance.now();
  seq.loadNewSongList([mid]);
  console.log(`D. ${f}: loadNewSongList (preload on) took ${(performance.now() - t).toFixed(0)} ms; decoded samples=${decoded(fresh)}`);
  const s2 = await makeSynth(loadBank("../GeneralUserGS.sf3"));
  const seq2 = new SpessaSynthSequencer(s2);
  seq2.preload = false;
  const t2 = performance.now();
  seq2.loadNewSongList([mid]);
  console.log(`   same with preload=false: ${(performance.now() - t2).toFixed(0)} ms`);
}

// E. Decode before the worklet: setSampleFormat("pcm") + writeSF2 on a one-preset SF3 (could run in a Web Worker).
for (const f of ["./split/prog048.sf3", "./split/prog040.sf3", "./split/drum048.sf3"]) {
  const b = loadBank(f);
  const t = performance.now();
  await b.setSampleFormat({ format: "pcm" });
  const out = b.writeSF2();
  const ms = performance.now() - t;
  const inBytes = fs.statSync(new URL(f, import.meta.url)).size;
  const back = loadBank("./split/prog048.sf3");
  console.log(`E. ${f}: SF3 ${inBytes} B -> PCM SF2 ${out.byteLength} B in ${ms.toFixed(0)} ms`);
}
