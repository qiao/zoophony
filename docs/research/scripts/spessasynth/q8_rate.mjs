// Q8: change sequencer.playbackRate during playback. Restart? Click? Time jump?
import { loadBank, makeSynth, renderUntil, SpessaSynthSequencer } from "./q_common.mjs";
import { MIDIBuilder } from "spessasynth_core";

const bank = loadBank("../GeneralUserGS.sf3");
// Long string chord 0 s -> 8 s on ch 0, and a note every 0.5 s on ch 1.
function build() {
  const m = new MIDIBuilder({ format: 0, timeDivision: 480, initialTempo: 120, name: "rate" });
  m.programChange(0, 0, 0, 48);
  m.programChange(0, 0, 1, 0);
  for (const k of [48, 55, 64]) m.noteOn(0, 0, 0, k, 90);
  for (const k of [48, 55, 64]) m.noteOff(7680, 0, 0, k);
  for (let i = 0; i < 16; i++) { m.noteOn(i * 480 + 10, 0, 1, 72, 80); m.noteOff(i * 480 + 200, 0, 1, 72); }
  m.flush();
  return m;
}

async function run(changeAt, rate) {
  const s = await makeSynth(bank);
  const seq = new SpessaSynthSequencer(s);
  const ons = [];
  s.onEventCall = (e) => { if (e.type === "noteOn" && e.data.channel === 1) ons.push(+s.currentTime.toFixed(4)); };
  seq.loadNewSongList([build()]);
  const t0 = s.currentTime;
  seq.play();
  const blocks = [];
  let songAt = null, songAfter = null;
  renderUntil(s, t0 + changeAt, (b) => blocks.push(b), [seq]);
  if (rate !== null) {
    songAt = seq.currentTime;
    seq.playbackRate = rate;
    songAfter = seq.currentTime;
  }
  const iChange = blocks.length;
  renderUntil(s, t0 + changeAt + 1.5, (b) => blocks.push(b), [seq]);
  return { s, seq, ons: ons.map((x) => +(x - t0).toFixed(3)), blocks, iChange, songAt, songAfter };
}

const ref = await run(1.6, null);
const fast = await run(1.6, 2);
const slow = await run(1.6, 0.5);
for (const [name, r] of [["no change", ref], ["rate 1 -> 2 at 1.6 s", fast], ["rate 1 -> 0.5 at 1.6 s", slow]]) {
  console.log(`${name}: ch1 note on times (synth s) = ${JSON.stringify(r.ons)}`);
  if (r.songAt !== null) console.log(`   song time just before set=${r.songAt.toFixed(4)} just after set=${r.songAfter.toFixed(4)} (no jump if equal)`);
}
// Compare audio after the change to the reference, up to the next ch1 note on (no new event in between).
for (const [name, r] of [["rate 2", fast], ["rate 0.5", slow]]) {
  let same = 0, firstDiff = null;
  for (let i = r.iChange; i < r.blocks.length; i++) {
    const a = r.blocks[i], b = ref.blocks[i];
    let eq = true;
    for (let k = 0; k < a.L.length; k++) if (a.L[k] !== b.L[k] || a.R[k] !== b.R[k]) { eq = false; break; }
    if (!eq) { firstDiff = a.t; break; }
    same++;
  }
  // Voices on ch 0 (the held chord) before and after the change.
  const v = (blk) => blk.voices;
  console.log(`${name}: ${same} blocks after the change are sample-identical to the reference; first difference at synth t=${firstDiff?.toFixed(4)} s`);
  console.log(`   total voices: block before change=${v(r.blocks[r.iChange - 1])}, first block after=${v(r.blocks[r.iChange])}`);
  // Largest step between two adjacent samples near the change vs the whole run (crude click check).
  const step = (from, to) => { let m = 0; let prev = r.blocks[from].L[0]; for (let i = from; i < to; i++) for (const x of r.blocks[i].L) { m = Math.max(m, Math.abs(x - prev)); prev = x; } return m; };
  console.log(`   max sample step: +-10 blocks around change=${step(r.iChange - 10, r.iChange + 10).toFixed(5)}, whole run=${step(1, r.blocks.length).toFixed(5)}`);
}
