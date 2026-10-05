// Q5: what state does Sequencer seek (currentTime = t) restore, and do held notes restart?
import { loadBank, makeSynth, renderUntil, SpessaSynthSequencer } from "./q_common.mjs";
import { MIDIBuilder } from "spessasynth_core";

const bank = loadBank("../GeneralUserGS.sf3");
// 120 BPM, 480 ticks per beat: 960 ticks = 1 s.
function build() {
  const m = new MIDIBuilder({ format: 1, timeDivision: 480, initialTempo: 120, name: "seek" });
  m.addTrack("a");
  m.addTrack("b");
  // Track 1, channel 0: state changes before 5 s and one long note 0 s -> 10 s.
  m.controllerChange(0, 1, 0, 0, 0);       // bank select MSB 0
  m.programChange(0, 1, 0, 40);            // violin
  m.controllerChange(0, 1, 0, 7, 50);      // volume
  m.controllerChange(0, 1, 0, 10, 20);     // pan
  m.noteOn(0, 1, 0, 60, 100);              // long note, held at 5 s
  m.controllerChange(960, 1, 0, 11, 90);   // expression at 1 s
  m.pitchWheel(960, 1, 0, 10000);          // pitch bend at 1 s
  m.programChange(1920, 1, 0, 42);         // cello at 2 s (program change while note held)
  m.noteOff(9600, 1, 0, 60);               // 10 s
  // Track 2, channel 1: sustain pedal down at 3 s, short note 3 s -> 3.5 s (held by pedal).
  m.programChange(0, 2, 1, 0);
  m.controllerChange(2880, 2, 1, 64, 127);
  m.noteOn(2880, 2, 1, 72, 100);
  m.noteOff(3360, 2, 1, 72);
  m.noteOn(11000, 2, 1, 74, 100);
  m.noteOff(11500, 2, 1, 74);
  m.flush();
  return m;
}

async function setup() {
  const s = await makeSynth(bank);
  s.midiChannels[1].setSystemParameter("isMuted", false);
  const seq = new SpessaSynthSequencer(s);
  const ev = [];
  s.onEventCall = (e) => { if (e.type === "noteOn" || e.type === "noteOff") ev.push([s.currentTime.toFixed(3), e.type, e.data.channel, e.data.midiNote]); };
  seq.loadNewSongList([build()]);
  seq.play();
  return { s, seq, ev };
}
function state(s, ch) {
  const c = s.midiChannels[ch];
  const cc = (n) => c.midiControllers[n] >> 7;
  const v = s.synthCore.voices.filter((x) => x.isActive && x.channel === ch);
  return `ch${ch}: program=${c.patch.program} bankMSB=${c.patch.bankMSB} vol=${cc(7)} pan=${cc(10)} expr=${cc(11)} sustain=${cc(64)} pitchWheel=${c.midiParameters.pitchWheel} voices(active)=${v.length} voices(not in release)=${v.filter((x) => !x.isInRelease).length}`;
}

// A. Play from 0 to 5.5 s without seek (reference).
{
  const { s, seq } = await setup();
  renderUntil(s, s.currentTime + 5.5, null, [seq]);
  console.log("A. play 0 -> 5.5 s, no seek:\n  " + state(s, 0) + "\n  " + state(s, 1));
}
// B. Seek from 0.2 s to 5.0 s.
{
  const { s, seq, ev } = await setup();
  renderUntil(s, s.currentTime + 0.2, null, [seq]);
  ev.length = 0;
  seq.currentTime = 5.0;
  renderUntil(s, s.currentTime + 0.05, null, [seq]);
  console.log("B. seek 0.2 s -> 5.0 s, then 50 ms:\n  " + state(s, 0) + "\n  " + state(s, 1));
  console.log("   note events in the 50 ms after seek:", JSON.stringify(ev));
  console.log("   seq.currentTime =", seq.currentTime.toFixed(3));
  renderUntil(s, s.currentTime + 5.5, null, [seq]);
  console.log("   note events from 5.05 s to 10.55 s:", JSON.stringify(ev.slice(0, 8)));
}
// C. Seek while a channel is muted: does the mute stay?
{
  const { s, seq } = await setup();
  s.midiChannels[0].setSystemParameter("isMuted", true);
  renderUntil(s, s.currentTime + 0.2, null, [seq]);
  seq.currentTime = 4.0;
  renderUntil(s, s.currentTime + 0.05, null, [seq]);
  console.log("C. isMuted on ch 0 after seek:", s.midiChannels[0].systemParameters.isMuted);
}
// D. Pause at 5 s then play: are held notes started again?
{
  const { s, seq, ev } = await setup();
  renderUntil(s, s.currentTime + 5.0, null, [seq]);
  seq.pause();
  renderUntil(s, s.currentTime + 0.5, null, [seq]);
  const during = s.synthCore.voices.filter((x) => x.isActive && !x.isInRelease).length;
  ev.length = 0;
  seq.play();
  renderUntil(s, s.currentTime + 0.05, null, [seq]);
  console.log(`D. pause at 5 s: voices not in release during pause=${during}; after play(): ${state(s, 0)}`);
  console.log("   note events right after play():", JSON.stringify(ev));
}
// E. Seek backwards from 6 s to 1.5 s (note 60 started at 0 s, still held at 1.5 s).
{
  const { s, seq, ev } = await setup();
  renderUntil(s, s.currentTime + 6.0, null, [seq]);
  ev.length = 0;
  seq.currentTime = 1.5;
  renderUntil(s, s.currentTime + 0.05, null, [seq]);
  console.log("E. seek back 6 s -> 1.5 s:\n  " + state(s, 0));
  console.log("   note events after seek:", JSON.stringify(ev));
}
