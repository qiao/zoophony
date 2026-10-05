// Q6: tempo events outside track 0; note on with no note off; two note ons on one key.
import { loadBank, makeSynth, renderUntil, SpessaSynthSequencer } from "./q_common.mjs";
import { MIDIBuilder, BasicMIDI, MIDIMessageTypes } from "spessasynth_core";

const bank = loadBank("../GeneralUserGS.sf3");
const tempoBytes = (bpm) => { const us = Math.round(60_000_000 / bpm); return [(us >> 16) & 255, (us >> 8) & 255, us & 255]; };

async function playAndLog(midi, seconds) {
  const s = await makeSynth(bank);
  const seq = new SpessaSynthSequencer(s);
  const ev = [];
  s.onEventCall = (e) => { if (e.type === "noteOn" || e.type === "noteOff") ev.push({ t: s.currentTime, type: e.type, ch: e.data.channel, key: e.data.midiNote }); };
  seq.loadNewSongList([midi]);
  const t0 = s.currentTime;
  seq.play();
  renderUntil(s, t0 + seconds, null, [seq]);
  return { s, seq, ev, t0 };
}

// A. Tempo: 120 BPM at 0 (track 0), 60 BPM at tick 1920 (track 0), 240 BPM at tick 960 (track 1).
// Correct times (480 ticks per beat): tick 960 = 1.0 s, tick 1920 = 1.5 s, tick 2880 = 3.5 s, tick 3840 = 5.5 s.
for (const variant of ["tempo in track 0 and track 1", "all tempo in track 0"]) {
  const m = new MIDIBuilder({ format: 1, timeDivision: 480, initialTempo: 120, name: "tempo" });
  m.addTrack("notes");
  m.setTempo(1920, 60);
  if (variant === "all tempo in track 0") m.setTempo(960, 240);
  else m.addEvent(960, 1, MIDIMessageTypes.setTempo, tempoBytes(240));
  m.programChange(0, 1, 0, 0);
  for (const tick of [0, 960, 1920, 2880, 3840]) { m.noteOn(tick, 1, 0, 60, 100); m.noteOff(tick + 100, 1, 0, 60); }
  m.flush();
  const expected = [0, 1.0, 1.5, 3.5, 5.5];
  const ticksToSec = [0, 960, 1920, 2880, 3840].map((t) => +m.midiTicksToSeconds(t).toFixed(4));
  const nt = m.getNoteTimes()[0].map((n) => +n.start.toFixed(4));
  console.log(`A. ${variant}:`);
  console.log(`   tempoChanges stored: ${JSON.stringify(m.tempoChanges.map((t) => [t.ticks, t.tempo]))}`);
  console.log(`   expected note starts      ${JSON.stringify(expected)}`);
  console.log(`   midiTicksToSeconds        ${JSON.stringify(ticksToSec)}`);
  console.log(`   getNoteTimes starts       ${JSON.stringify(nt)}`);
  console.log(`   duration                  ${m.duration.toFixed(4)} (expected: end tick 3940 = ${(5.5 + 100 / 480).toFixed(4)})`);
  const { ev, t0 } = await playAndLog(m, 6.0);
  const ons = ev.filter((e) => e.type === "noteOn").map((e) => +(e.t - t0).toFixed(3));
  console.log(`   Sequencer note on times   ${JSON.stringify(ons)} (block-quantized, relative to play)`);
  // Round trip through file bytes.
  const back = BasicMIDI.fromArrayBuffer(m.writeMIDI());
  console.log(`   after writeMIDI + parse: duration ${back.duration.toFixed(4)}, midiTicksToSeconds(3840)=${back.midiTicksToSeconds(3840).toFixed(4)}`);
  // Seek to 2.0 s: which note plays next and when?
  {
    const s = await makeSynth(bank);
    const seq = new SpessaSynthSequencer(s);
    const evs = [];
    s.onEventCall = (e) => { if (e.type === "noteOn") evs.push(+s.currentTime.toFixed(3)); };
    seq.loadNewSongList([m]);
    seq.play();
    renderUntil(s, s.currentTime + 0.1, null, [seq]);
    seq.currentTime = 2.0;
    const ts = s.currentTime;
    renderUntil(s, ts + 3.6, null, [seq]);
    console.log(`   seek to 2.0 s: next note ons after ${(evs.filter((x) => x >= ts).map((x) => +(x - ts).toFixed(3)))} s (expected 1.5 and 3.5)`);
  }
}

// B. Note on with no note off.
{
  const m = new MIDIBuilder({ format: 0, timeDivision: 480, initialTempo: 120, name: "nooff" });
  m.programChange(0, 0, 0, 48);            // strings (looped)
  m.noteOn(0, 0, 0, 64, 100);              // never released
  m.programChange(0, 0, 1, 0);
  m.noteOn(960, 0, 1, 72, 100); m.noteOff(1000, 0, 1, 72);
  m.noteOn(3840, 0, 1, 74, 100); m.noteOff(3880, 0, 1, 74); // song ends at tick 3880 = ~4.04 s
  m.flush();
  const nt = m.getNoteTimes()[0];
  console.log(`B. getNoteTimes for the note with no note off: start=${nt[0].start} length=${nt[0].length.toFixed(4)} (song duration ${m.duration.toFixed(4)})`);
  const { s, seq, t0 } = await playAndLog(m, 3.9);
  const v = s.synthCore.voices.filter((x) => x.isActive && x.channel === 0 && !x.isInRelease).length;
  console.log(`   at 3.9 s: ch0 voices not in release = ${v}`);
  renderUntil(s, t0 + 4.2, null, [seq]);
  const v2 = s.synthCore.voices.filter((x) => x.isActive && x.channel === 0 && !x.isInRelease).length;
  console.log(`   at 4.2 s (after song end): ch0 voices not in release = ${v2}, sequencer paused=${seq.paused}, isFinished=${seq.isFinished}`);
}

// C. Two note ons on one key before a note off.
{
  // C1: synth only. on(vel 100) at 0, on(vel 40) at 0.5, off at 1.0, off at 1.5.
  const s = await makeSynth(bank);
  s.programChange(0, 48);
  const t0 = s.currentTime;
  s.processMessage([0x90, 60, 100], 0, { time: t0 });
  s.processMessage([0x90, 60, 40], 0, { time: t0 + 0.5 });
  s.processMessage([0x80, 60, 0], 0, { time: t0 + 1.0 });
  s.processMessage([0x80, 60, 0], 0, { time: t0 + 1.5 });
  const snap = (label) => {
    const vs = s.synthCore.voices.filter((x) => x.isActive && x.channel === 0);
    console.log(`   ${label}: ` + JSON.stringify(vs.map((x) => ({ vel: x.velocity, noteID: x.noteID, release: x.isInRelease }))));
  };
  console.log("C1. synth, key 60 twice, then two note offs:");
  renderUntil(s, t0 + 0.75); snap("0.75 s (two notes on)");
  renderUntil(s, t0 + 1.2); snap("1.2 s (after first off)");
  renderUntil(s, t0 + 1.7); snap("1.7 s (after second off)");
  // C2: same with the Sequencer and getNoteTimes.
  const m = new MIDIBuilder({ format: 0, timeDivision: 480, initialTempo: 120, name: "dup" });
  m.programChange(0, 0, 0, 48);
  m.noteOn(0, 0, 0, 60, 100); m.noteOn(480, 0, 0, 60, 40); m.noteOff(960, 0, 0, 60); m.noteOff(1440, 0, 0, 60);
  m.noteOn(2000, 0, 0, 62, 1); m.noteOff(2010, 0, 0, 62);
  m.flush();
  console.log("C2. getNoteTimes:", JSON.stringify(m.getNoteTimes()[0].filter((n) => n.midiNote === 60).map((n) => ({ vel: n.velocity, start: n.start, length: n.length }))));
  // C3: a third case: on, on, off only (one off for two ons).
  const m3 = new MIDIBuilder({ format: 0, timeDivision: 480, initialTempo: 120, name: "dup2" });
  m3.programChange(0, 0, 0, 48);
  m3.noteOn(0, 0, 0, 60, 100); m3.noteOn(480, 0, 0, 60, 40); m3.noteOff(960, 0, 0, 60);
  m3.noteOn(2000, 0, 0, 62, 1); m3.noteOff(2010, 0, 0, 62);
  m3.flush();
  console.log("C3. on, on, one off -> getNoteTimes:", JSON.stringify(m3.getNoteTimes()[0].filter((n) => n.midiNote === 60).map((n) => ({ vel: n.velocity, start: n.start, length: +n.length.toFixed(4) }))));
  const r = await playAndLog(m3, 1.5);
  const vs = r.s.synthCore.voices.filter((x) => x.isActive && x.channel === 0 && x.midiNote === 60);
  console.log("C3. Sequencer at 1.5 s, key 60 voices:", JSON.stringify(vs.map((x) => ({ vel: x.velocity, release: x.isInRelease }))));
}
