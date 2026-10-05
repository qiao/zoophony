// Test: several sound banks in one processor, and the timing grid of scheduled note on events.
import fs from "node:fs";
import { BasicSoundBank, SoundBankLoader, SpessaSynthProcessor } from "spessasynth_core";
await BasicSoundBank.isSF3DecoderReady;
const load = (f) => { const b = fs.readFileSync(f); return SoundBankLoader.fromArrayBuffer(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
async function onsetFor(eventTime, bufSize) {
  const sr = 48000;
  const synth = new SpessaSynthProcessor(sr, { effectsEnabled: false, enableEventSystem: false });
  await synth.processorInitialized;
  synth.soundBankManager.addSoundBank(load("split/prog048.sf3"), "strings");
  synth.soundBankManager.addSoundBank(load("split/prog056.sf3"), "trumpet");
  synth.programChange(0, 56);
  // Render one block so the program change applies.
  const L = new Float32Array(bufSize), R = new Float32Array(bufSize);
  const t0 = synth.currentTime;
  synth.processMessage([0x90, 60, 127], 0, { time: t0 + eventTime });
  let index = 0;
  for (let b = 0; b < 5000; b++) {
    L.fill(0); R.fill(0);
    synth.process(L, R);
    for (let i = 0; i < bufSize; i++) {
      if (Math.abs(L[i]) > 1e-7 || Math.abs(R[i]) > 1e-7) return { requestedSample: eventTime * sr, firstNonZeroSample: index + i, banks: synth.soundBankManager.soundBankList.map((x) => x.id), presets: synth.soundBankManager.presetList.length };
    }
    index += bufSize;
  }
  return "silent";
}
console.log(await onsetFor(0.0101, 128));
console.log(await onsetFor(0.0101, 1));
console.log(await onsetFor(0.0, 128));
console.log(await onsetFor(0.0101, 64));
