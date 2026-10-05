// Mute options per channel: isMuted (kills notes, drops note on) vs gain 0 (notes keep running).
import { loadBank, makeSynth, renderUntil } from "./q_common.mjs";
const bank = loadBank("../GeneralUserGS.sf3");
for (const mode of ["isMuted", "gain"]) {
  const s = await makeSynth(bank);
  s.programChange(0, 48);
  const t0 = s.currentTime;
  s.noteOn(0, 60, 100);
  const blocks = [];
  renderUntil(s, t0 + 0.5, (b) => blocks.push(b));
  const iMute = blocks.length;
  if (mode === "isMuted") s.midiChannels[0].setSystemParameter("isMuted", true); else s.midiChannels[0].setSystemParameter("gain", 0);
  renderUntil(s, t0 + 1.0, (b) => blocks.push(b));
  const iUn = blocks.length;
  if (mode === "isMuted") s.midiChannels[0].setSystemParameter("isMuted", false); else s.midiChannels[0].setSystemParameter("gain", 1);
  renderUntil(s, t0 + 1.5, (b) => blocks.push(b));
  const pk = (a, b) => Math.max(...blocks.slice(a, b).map((x) => x.peak));
  const step = (a, b) => { let m = 0, p = blocks[a].L[0]; for (let i = a; i < b; i++) for (const x of blocks[i].L) { m = Math.max(m, Math.abs(x - p)); p = x; } return m; };
  console.log(`${mode}: peak before=${pk(iMute - 20, iMute).toFixed(4)} while muted=${pk(iMute + 1, iUn).toFixed(4)} after unmute=${pk(iUn, blocks.length).toFixed(4)}; max step at mute=${step(iMute - 2, iMute + 2).toFixed(4)} at unmute=${step(iUn - 2, iUn + 2).toFixed(4)} typical=${step(iMute - 40, iMute - 4).toFixed(4)}; voices while muted=${blocks[iUn - 1].voices}`);
}
