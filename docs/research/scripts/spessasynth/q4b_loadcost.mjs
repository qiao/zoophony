// Cost of the two song inputs that the lib worklet accepts (both run on the audio thread).
import fs from "node:fs";
import { performance } from "node:perf_hooks";
import { BasicMIDI, SpessaLog } from "spessasynth_core";
SpessaLog.setLogLevel(false, false, false);
for (const f of ["../midi/Symphony5_1.mid", "../midi/Concerto_No3.mid"]) {
  const raw = fs.readFileSync(f);
  const buf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  const mid = BasicMIDI.fromArrayBuffer(buf);
  const ev = mid.tracks.reduce((a, t) => a + t.events.length, 0);
  for (let warm = 0; warm < 3; warm++) { BasicMIDI.fromArrayBuffer(buf.slice(0)); BasicMIDI.copyFrom(structuredClone(mid)); }
  let t = performance.now(); for (let i = 0; i < 5; i++) BasicMIDI.fromArrayBuffer(buf.slice(0)); const parse = (performance.now() - t) / 5;
  t = performance.now(); let c; for (let i = 0; i < 5; i++) c = structuredClone(mid); const clone = (performance.now() - t) / 5;
  t = performance.now(); for (let i = 0; i < 5; i++) BasicMIDI.copyFrom(c); const copy = (performance.now() - t) / 5;
  console.log(`${f}: ${raw.length} bytes, ${ev} events: fromArrayBuffer ${parse.toFixed(1)} ms; structuredClone(BasicMIDI) ${clone.toFixed(1)} ms (main thread side, proxy); BasicMIDI.copyFrom ${copy.toFixed(1)} ms`);
}
