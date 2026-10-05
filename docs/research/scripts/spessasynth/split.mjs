// Test: split a SoundFont into one SF3 file per preset with spessasynth_core in Node.
import fs from "node:fs";
import { BasicSoundBank, SoundBankLoader } from "spessasynth_core";
await BasicSoundBank.isSF3DecoderReady;
const input = fs.readFileSync("../GeneralUserGS.sf3");
const bank = SoundBankLoader.fromArrayBuffer(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength));
console.log("presets", bank.presets.length, "instruments", bank.instruments.length, "samples", bank.samples.length);
const compressed = bank.samples.filter((s) => s.isCompressed).length;
console.log("compressed samples", compressed);
const looped = bank.samples.filter((s) => s.loopEnd > s.loopStart).length;
console.log("samples with loopEnd > loopStart", looped);
fs.mkdirSync("split", { recursive: true });
const want = new Set([0, 40, 41, 42, 43, 45, 46, 47, 48, 49, 52, 56, 57, 58, 60, 68, 70, 71, 72, 73]);
let total = 0;
for (const p of bank.presets) {
  const isMelodicGM = p.bankMSB === 0 && p.bankLSB === 0 && !p.isGMGSDrum && want.has(p.program);
  const isDrumKit = p.isGMGSDrum && (p.program === 0 || p.program === 48);
  if (!isMelodicGM && !isDrumKit) continue;
  const one = new BasicSoundBank();
  one.soundBankInfo = { ...bank.soundBankInfo, name: p.name };
  one.clonePreset(p);
  one.flush();
  const out = one.writeSF2();
  const name = `split/${p.isGMGSDrum ? "drum" : "prog"}${String(p.program).padStart(3, "0")}.sf3`;
  fs.writeFileSync(name, new Uint8Array(out));
  total += out.byteLength;
  const s = one.samples;
  const durs = s.map((x) => (x.sampleData ? 0 : 0));
  console.log(name, JSON.stringify(p.name), "bytes", out.byteLength, "samples", s.length, "compressed", s.filter((x) => x.isCompressed).length, "looped", s.filter((x) => x.loopEnd > x.loopStart).length);
}
console.log("total bytes", total);
// Read back one file to prove it parses
const back = SoundBankLoader.fromArrayBuffer(fs.readFileSync("split/prog048.sf3").buffer);
console.log("readback prog048 presets", back.presets.map((p) => `${p.bankMSB}:${p.program} ${p.name}`), "samples", back.samples.length, "compressed", back.samples.filter((x) => x.isCompressed).length);
