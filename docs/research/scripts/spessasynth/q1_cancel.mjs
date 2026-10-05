// Q1: Can a note on that is queued with a future time be cancelled?
// Method: queue note on (ch 0, key 60) at t=0.5 s and note off at t=1.0 s.
// At t=0.1 s apply one action at once. Then render to 0.8 s and look for sound.
// The lib maps: stopAll(force) -> stopAllChannels(force); reset() -> synth.reset();
// controllerChange(...) without time -> processMessage at once.
import { loadBank, makeSynth, renderUntil } from "./q_common.mjs";

const bank = loadBank("../GeneralUserGS.sf3");

const actions = {
  "none": () => {},
  "CC123 all notes off (ch 0)": (s) => s.processMessage([0xb0, 123, 0]),
  "CC120 all sound off (ch 0)": (s) => s.processMessage([0xb0, 120, 0]),
  "CC121 reset all controllers (ch 0)": (s) => s.processMessage([0xb0, 121, 0]),
  "stopAllChannels(false) = lib stopAll()": (s) => s.stopAllChannels(false),
  "stopAllChannels(true) = lib stopAll(true)": (s) => s.stopAllChannels(true),
  "reset() = lib reset()": (s) => s.reset(),
  "MIDI system reset 0xFF": (s) => s.processMessage([0xff]),
  "isMuted=true on ch 0 (kept)": (s) => s.midiChannels[0].setSystemParameter("isMuted", true),
};

for (const [name, act] of Object.entries(actions)) {
  const s = await makeSynth(bank);
  s.programChange(0, 48); // strings
  const t0 = s.currentTime;
  s.processMessage([0x90, 60, 100], 0, { time: t0 + 0.5 });
  s.processMessage([0x80, 60, 0], 0, { time: t0 + 1.0 });
  renderUntil(s, t0 + 0.1);
  const before = s.synthCore.eventQueue.length;
  act(s);
  const after = s.synthCore.eventQueue.length;
  const blocks = renderUntil(s, t0 + 0.8);
  const late = blocks.filter((b) => b.t >= t0 + 0.5);
  const peak = Math.max(...late.map((b) => b.peak));
  const maxVoices = Math.max(...late.map((b) => b.voices));
  console.log(`${name.padEnd(42)} queue before=${before} after=${after}  after 0.5 s: maxVoices=${maxVoices} peak=${peak.toFixed(4)}`);
}

// Equal times: is the send order kept?
for (const order of [["noteOn", "cc123"], ["cc123", "noteOn"]]) {
  const s = await makeSynth(bank);
  s.programChange(0, 48);
  const T = s.currentTime + 0.2;
  for (const o of order) {
    if (o === "noteOn") s.processMessage([0x90, 60, 100], 0, { time: T });
    else s.processMessage([0xb0, 123, 0], 0, { time: T });
  }
  const blocks = renderUntil(s, T + 0.3);
  const v = blocks.filter((b) => b.t > T).map((b) => b.voices);
  const held = s.synthCore.voices.filter((x) => x.isActive && !x.isInRelease).length;
  console.log(`same time, send order ${order.join(" then ")}: voices not in release at T+0.3 s = ${held}`);
}

// Queued event for a channel that does not exist.
{
  const s = await makeSynth(bank);
  const T = s.currentTime + 0.05;
  s.processMessage([0x90, 60, 100], 16, { time: T }); // channel 16 does not exist (16 channels)
  s.processMessage([0x90, 62, 100], 0, { time: T + 0.01 });
  try {
    renderUntil(s, T + 0.1);
    console.log("queued event to channel 16 (missing): no error");
  } catch (e) {
    console.log("queued event to channel 16 (missing): process() threw:", e.constructor.name, e.message);
    console.log("  queue length after throw:", s.synthCore.eventQueue.length);
  }
  try {
    s.processMessage([0x90, 60, 100], 16);
    console.log("immediate event to channel 16 (missing): no error");
  } catch (e) {
    console.log("immediate event to channel 16 (missing): processMessage threw:", e.constructor.name, e.message);
  }
}
