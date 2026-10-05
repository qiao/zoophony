// Seek cost: setTimeTo replays all events from tick 0 (on the audio thread in the worklet).
import fs from "node:fs";
import { performance } from "node:perf_hooks";
import { loadBank, makeSynth, renderUntil, SpessaSynthSequencer } from "./q_common.mjs";
import { BasicMIDI } from "spessasynth_core";
const bank = loadBank("../GeneralUserGS.sf3");
for (const f of ["../midi/Symphony5_1.mid", "../midi/Concerto_No3.mid"]) {
  const raw = fs.readFileSync(new URL(f, import.meta.url));
  const mid = BasicMIDI.fromArrayBuffer(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
  const s = await makeSynth(bank);
  const seq = new SpessaSynthSequencer(s);
  seq.loadNewSongList([mid]);
  seq.play();
  renderUntil(s, s.currentTime + 0.1, null, [seq]);
  const out = [];
  for (const frac of [0.1, 0.5, 0.95, 0.95, 0.95]) {
    const t = performance.now();
    seq.currentTime = mid.duration * frac;
    out.push(`${(frac * 100).toFixed(0)}%: ${(performance.now() - t).toFixed(1)} ms`);
    renderUntil(s, s.currentTime + 0.05, null, [seq]);
  }
  console.log(`${f} (${mid.timeline.length} events, ${mid.duration.toFixed(0)} s): seek cost ${out.join(", ")}`);
}
