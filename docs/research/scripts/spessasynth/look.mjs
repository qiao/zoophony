import fs from "node:fs";
import { BasicMIDI, SpessaLog } from "spessasynth_core";
SpessaLog.setLogLevel(false,false,false);
for (const f of process.argv.slice(2)) {
  const raw = fs.readFileSync(f);
  const m = BasicMIDI.fromArrayBuffer(raw.buffer.slice(raw.byteOffset, raw.byteOffset+raw.byteLength));
  console.log(f, "format", m.format, "div", m.timeDivision, "lastVoiceEventTick", m.lastVoiceEventTick, "firstNoteOn", m.firstNoteOn, "duration", m.duration);
  console.log(" tempoChanges (stored order):", JSON.stringify(m.tempoChanges.slice(0, 16).map(t => [t.ticks, +t.tempo.toFixed(2)])));
  m.tracks.forEach((t, i) => { const tp = t.events.filter(e => e.statusByte === 0x51).map(e => e.ticks); if (tp.length) console.log("  track", i, "tempo ticks", JSON.stringify(tp.slice(0, 12))); });
  m.tracks.forEach((t, i) => console.log("  track", i, "events", t.events.length, "channels", JSON.stringify([...t.channels]), "first/last tick", t.events[0]?.ticks, t.events.at(-1)?.ticks));
}
