// Q3: more than 16 channels.
import { loadBank, makeSynth, renderUntil, SpessaSynthSequencer } from "./q_common.mjs";
import { MIDIBuilder, BasicMIDI } from "spessasynth_core";

const bank = loadBank("../GeneralUserGS.sf3");

// A. createMIDIChannel (lib addNewChannel posts "addNewChannel" -> createMIDIChannel()).
{
  const s = await makeSynth(bank);
  console.log("A. channels at start:", s.midiChannels.length);
  for (let i = 0; i < 16; i++) s.createMIDIChannel();
  console.log("A. channels after 16 x createMIDIChannel():", s.midiChannels.length);
  const drums = (from, to) => s.midiChannels.slice(from, to).map((c, i) => (c.drumChannel ? from + i : null)).filter((x) => x !== null);
  console.log("A. drum channels right after create:", JSON.stringify(drums(0, 32)));
  s.reset();
  console.log("A. drum channels after reset():", JSON.stringify(drums(0, 32)));
  // Note on channel 20 by channelOffset 16 (lib noteOn(20, ...) sends status 0x94 with offset 16).
  s.programChange(20, 40);
  s.processMessage([0x94, 60, 100], 16);
  renderUntil(s, s.currentTime + 0.05);
  const v = s.synthCore.voices.filter((x) => x.isActive).map((x) => x.channel);
  console.log("A. active voices after note on (status 0x94, offset 16) are on channel(s):", JSON.stringify([...new Set(v)]), "program of ch 20:", s.midiChannels[20].patch.program);
  // Outputs: with 16 output pairs, channel 20 goes to output 20 % 16 = 4.
  const outs = Array.from({ length: 16 }, () => [new Float32Array(128), new Float32Array(128)]);
  const eL = new Float32Array(128), eR = new Float32Array(128);
  s.processSplit(outs, eL, eR);
  const nz = outs.map((o, i) => (o[0].some((x) => x !== 0) ? i : null)).filter((x) => x !== null);
  console.log("A. non-silent dry outputs (of 16) for a note on channel 20:", JSON.stringify(nz));
  // Many channels: is there a hard cap?
  for (let i = 0; i < 256 - 32; i++) s.createMIDIChannel();
  s.reset();
  s.programChange(255, 40);
  s.processMessage([0x9f, 60, 100], 240);
  renderUntil(s, s.currentTime + 0.02);
  console.log("A. with", s.midiChannels.length, "channels, note on channel 255 voices:", s.midiChannels[255].voiceCount);
}

// B. MIDI port meta events (FF 21) in a file played by the Sequencer.
function buildMultiPort(ports) {
  const m = new MIDIBuilder({ format: 1, timeDivision: 480, initialTempo: 120, name: "ports" });
  ports.forEach((port, i) => {
    m.addTrack(`t${i}`, port);
    const tr = i + 1;
    m.programChange(0, tr, 0, 40 + (i % 8));
    m.noteOn(10 + i, tr, 0, 60 + (i % 12), 100);
    m.noteOff(960, tr, 0, 60 + (i % 12));
  });
  m.flush();
  return m;
}
for (const ports of [[0, 1, 2], [0, 1, 2, 3, 4, 5, 6, 7], Array.from({ length: 20 }, (_, i) => i)]) {
  const s = await makeSynth(bank);
  const seq = new SpessaSynthSequencer(s);
  const seen = new Set();
  s.onEventCall = (e) => { if (e.type === "noteOn") seen.add(e.data.channel); };
  const midi = buildMultiPort(ports);
  seq.loadNewSongList([midi]);
  seq.play();
  renderUntil(s, s.currentTime + 0.3, null, [seq]);
  console.log(`B. ports ${JSON.stringify(ports).slice(0, 40)}: isMultiPort=${midi.isMultiPort} synth channels=${s.midiChannels.length} note on channels=${JSON.stringify([...seen].sort((a, b) => a - b))}`);
  console.log(`   portChannelOffsetMap=${JSON.stringify(midi.portChannelOffsetMap)}`);
  const nt = midi.getNoteTimes();
  console.log(`   getNoteTimes: arrays=${nt.length}, notes in array 0=${nt[0].length}`);
}

// C. Sequencer: one track per port, but only port numbers 0 and 5 (gap).
{
  const s = await makeSynth(bank);
  const seq = new SpessaSynthSequencer(s);
  const seen = new Set();
  s.onEventCall = (e) => { if (e.type === "noteOn") seen.add(e.data.channel); };
  const midi = buildMultiPort([5, 0]);
  seq.loadNewSongList([midi]);
  seq.play();
  renderUntil(s, s.currentTime + 0.3, null, [seq]);
  console.log(`C. ports [5,0]: synth channels=${s.midiChannels.length} note on channels=${JSON.stringify([...seen])}`);
}
