import fs from "node:fs"; import path from "node:path";
import { BasicMIDI, SpessaLog } from "spessasynth_core";
SpessaLog.setLogLevel(false,false,false);
const root = "../midi";
const files = [];
(function walk(d){ for (const f of fs.readdirSync(d)) { const p = path.join(d,f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.midi?$/i.test(f)) files.push(p);} })(root);
for (const f of files) {
  const raw = fs.readFileSync(f);
  try {
    const m = BasicMIDI.fromArrayBuffer(raw.buffer.slice(raw.byteOffset, raw.byteOffset+raw.byteLength));
    const sys = m.tracks.reduce((a,t)=>a+t.events.filter(e=>e.statusByte===0xf0).length,0);
    const tempoTracks = m.tracks.map((t,i)=>t.events.some(e=>e.statusByte===0x51)?i:null).filter(x=>x!==null);
    const multi = m.tracks.filter(t=>t.channels.size>1).length;
    const ports = m.tracks.reduce((a,t)=>a+t.events.filter(e=>e.statusByte===0x21).length,0);
    console.log(path.relative(root,f).padEnd(50), "tracks", m.tracks.length, "sysex", sys, "tempoTracks", JSON.stringify(tempoTracks), "tempos", m.tempoChanges.length-1, "multiChTracks", multi, "portEv", ports, "dur", m.duration.toFixed(1));
  } catch (e) { console.log(f, "ERR", e.message); }
}
