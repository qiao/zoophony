// After pause + play, is the sustain pedal (CC64) state kept? sendMIDIAllOff sets CC64=0 on ch 0-15.
import { loadBank, makeSynth, renderUntil, SpessaSynthSequencer } from "./q_common.mjs";
import { MIDIBuilder } from "spessasynth_core";
const bank = loadBank("../GeneralUserGS.sf3");
const m = new MIDIBuilder({ format: 1, timeDivision: 480, initialTempo: 120, name: "ped" });
m.addTrack("a", 0); m.addTrack("b", 1);
for (const tr of [1, 2]) { m.programChange(0, tr, 1, 0); m.controllerChange(0, tr, 1, 64, 127); m.noteOn(0, tr, 1, 60, 90); m.noteOff(100, tr, 1, 60); m.noteOn(3840, tr, 1, 62, 90); m.noteOff(3900, tr, 1, 62); }
m.flush();
const s = await makeSynth(bank);
const seq = new SpessaSynthSequencer(s);
seq.loadNewSongList([m]);
seq.play();
renderUntil(s, s.currentTime + 1.0, null, [seq]);
const cc = (ch) => s.midiChannels[ch].midiControllers[64] >> 7;
console.log(`before pause: CC64 ch1=${cc(1)} ch17=${cc(17)}`);
seq.pause(); renderUntil(s, s.currentTime + 0.1, null, [seq]);
seq.play(); renderUntil(s, s.currentTime + 0.1, null, [seq]);
console.log(`after pause + play: CC64 ch1=${cc(1)} ch17=${cc(17)} (file still has the pedal down)`);
