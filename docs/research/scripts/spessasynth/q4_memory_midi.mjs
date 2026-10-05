// Q4: play a MIDI built or edited in memory; write MIDI bytes; remove SysEx; move channels.
import fs from "node:fs";
import { loadBank, makeSynth, renderUntil, SpessaSynthSequencer } from "./q_common.mjs";
import { MIDIBuilder, BasicMIDI, MIDIMessageTypes } from "spessasynth_core";

const bank = loadBank("../GeneralUserGS.sf3");

// A. MIDIBuilder -> structured clone (what postMessage does) -> BasicMIDI.copyFrom (what the lib worklet does).
const b = new MIDIBuilder({ format: 1, timeDivision: 480, initialTempo: 100, name: "built" });
b.addTrack("violin");
b.programChange(0, 1, 0, 40);
for (let i = 0; i < 8; i++) { b.noteOn(i * 480, 1, 0, 60 + i, 90); b.noteOff(i * 480 + 400, 1, 0, 60 + i); }
b.flush();
try { structuredClone(b); console.log("A. structuredClone(MIDIBuilder): OK"); }
catch (e) { console.log("A. structuredClone(MIDIBuilder) threw:", e.name, e.message); }
const plain = BasicMIDI.copyFrom(b);
try {
  const cloned = structuredClone(plain);
  console.log("A. structuredClone(BasicMIDI.copyFrom(builder)): OK; has 'duration' key:", "duration" in cloned, "prototype is Object:", Object.getPrototypeOf(cloned) === Object.prototype);
  const inWorklet = BasicMIDI.copyFrom(cloned);
  const s = await makeSynth(bank);
  const seq = new SpessaSynthSequencer(s);
  let notes = 0;
  s.onEventCall = (e) => { if (e.type === "noteOn") notes++; };
  seq.loadNewSongList([inWorklet]);
  seq.play();
  renderUntil(s, s.currentTime + inWorklet.duration + 0.2, null, [seq]);
  console.log(`A. copied MIDI played: duration=${inWorklet.duration.toFixed(3)} s, note on events=${notes}, timeline=${inWorklet.timeline.length}`);
} catch (e) { console.log("A. clone path threw:", e.name, e.message); }

// B. Without flush(): does the sequencer see new events?
{
  const m = new MIDIBuilder({ format: 0, name: "noflush" });
  m.programChange(0, 0, 0, 40);
  m.noteOn(0, 0, 0, 60, 90); m.noteOff(960, 0, 0, 60);
  console.log(`B. MIDIBuilder before flush(): timeline=${m.timeline.length} duration=${m.duration}`);
  m.flush();
  console.log(`B. after flush(): timeline=${m.timeline.length} duration=${m.duration}`);
}

// C. Edit a parsed file: remove SysEx, move each track to its own channel, then flush and write.
const file = "../midi/Symphony5_1.mid";
const raw = fs.readFileSync(new URL(file, import.meta.url));
const mid = BasicMIDI.fromArrayBuffer(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength), "s5");
const count = (m, f) => m.tracks.reduce((a, t) => a + t.events.filter(f).length, 0);
const isSysex = (e) => e.statusByte === MIDIMessageTypes.systemExclusive;
const isVoice = (e) => e.statusByte >= 0x80 && e.statusByte < 0xf0;
console.log(`C. ${file}: tracks=${mid.tracks.length} events=${count(mid, () => true)} sysex=${count(mid, isSysex)} duration=${mid.duration.toFixed(2)} s`);
console.log("C. channels per track:", JSON.stringify(mid.tracks.map((t) => [...t.channels])));
// Remove SysEx.
for (const t of mid.tracks) for (let i = t.events.length - 1; i >= 0; i--) if (isSysex(t.events[i])) t.deleteEvent(i);
// Give each track with notes its own channel: n-th voice track -> channel n (skip 9), use FF 21 port for >15.
let next = 0;
for (const t of mid.tracks) {
  if (t.channels.size === 0) continue;
  let ch = next++;
  if (ch % 16 === 9) ch = next++;
  for (const e of t.events) if (isVoice(e)) e.statusByte = (e.statusByte & 0xf0) | (ch % 16);
}
const before = mid.timeline.length;
mid.flush();
console.log(`C. after edit + flush: sysex=${count(mid, isSysex)} timeline ${before} -> ${mid.timeline.length}; channels per track:`, JSON.stringify(mid.tracks.map((t) => [...t.channels])));
const bytes = mid.writeMIDI();
const back = BasicMIDI.fromArrayBuffer(bytes, "back");
console.log(`C. writeMIDI: ${bytes.byteLength} bytes; re-parsed events=${count(back, () => true)} (edited=${count(mid, () => true)}), duration ${back.duration.toFixed(3)} vs ${mid.duration.toFixed(3)}`);
{
  const s = await makeSynth(bank);
  const seq = new SpessaSynthSequencer(s);
  const chans = new Set();
  s.onEventCall = (e) => { if (e.type === "noteOn") chans.add(e.data.channel); };
  seq.loadNewSongList([mid]);
  seq.play();
  renderUntil(s, s.currentTime + 20, null, [seq]);
  console.log("C. edited MIDI played 20 s; note on channels seen:", JSON.stringify([...chans].sort((a, b) => a - b)));
}
