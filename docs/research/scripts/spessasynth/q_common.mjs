// Shared helpers for the scheduling tests (spessasynth_core 4.3.22 in Node).
import fs from "node:fs";
import { BasicSoundBank, SoundBankLoader, SpessaSynthProcessor, SpessaSynthSequencer, SpessaLog } from "spessasynth_core";

SpessaLog.setLogLevel(false, false, false);
await BasicSoundBank.isSF3DecoderReady;

export const SR = 48000;
export const BLOCK = 128;

export function loadBank(file) {
  const b = fs.readFileSync(new URL(file, import.meta.url));
  return SoundBankLoader.fromArrayBuffer(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}

export async function makeSynth(bank, opts = {}) {
  const synth = new SpessaSynthProcessor(SR, { effectsEnabled: false, eventsEnabled: true, ...opts });
  await synth.processorInitialized;
  synth.soundBankManager.addSoundBank(bank, "main");
  return synth;
}

// Render whole blocks until synth time reaches `until` (seconds since synth start).
// Returns per-block info: time, peak, voice count.
// Like the lib worklet: call processTick() on each sequencer before each block.
export function renderUntil(synth, until, onBlock, seqs = []) {
  const L = new Float32Array(BLOCK), R = new Float32Array(BLOCK);
  const out = [];
  while (synth.currentTime < until) {
    L.fill(0); R.fill(0);
    const t = synth.currentTime;
    for (const q of seqs) q.processTick();
    synth.process(L, R);
    let peak = 0;
    for (let i = 0; i < BLOCK; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    const info = { t, peak, voices: synth.voiceCount, L: L.slice(), R: R.slice() };
    out.push(info);
    if (onBlock) onBlock(info);
  }
  return out;
}

export { SpessaSynthProcessor, SpessaSynthSequencer };
