// Q2: cost of many queued events.
// processMessage pushes to an array and sorts the whole array on each push.
// processSplit removes due events with shift().
import { loadBank, makeSynth, renderUntil, BLOCK, SR } from "./q_common.mjs";
import { performance } from "node:perf_hooks";

const bank = loadBank("../ss/split/prog048.sf3".replace("../ss/", "./"));

async function enqueueCost(n, orderName) {
  const s = await makeSynth(bank);
  const t0 = s.currentTime;
  const times = Array.from({ length: n }, (_, i) => t0 + 0.01 + (2 * i) / n);
  if (orderName === "random") times.sort(() => Math.random() - 0.5);
  if (orderName === "reverse") times.reverse();
  const a = performance.now();
  for (let i = 0; i < n; i++) s.processMessage([0xb0, 1, i & 127], 0, { time: times[i] });
  const enqueueMs = performance.now() - a;
  // Render 2.1 s and time each block (CC events only, so voice cost is zero).
  const L = new Float32Array(BLOCK), R = new Float32Array(BLOCK);
  let maxBlock = 0, total = 0, blocks = 0;
  while (s.currentTime < t0 + 2.1) {
    const b = performance.now();
    s.process(L, R);
    const d = performance.now() - b;
    maxBlock = Math.max(maxBlock, d); total += d; blocks++;
  }
  return { n, orderName, enqueueMs, perEventUs: (enqueueMs * 1000) / n, maxBlockMs: maxBlock, meanBlockMs: total / blocks, left: s.synthCore.eventQueue.length };
}

for (const n of [1000, 5000, 10000, 20000]) {
  for (const o of ["ascending", "random"]) {
    const r = await enqueueCost(n, o);
    console.log(`n=${String(r.n).padStart(5)} ${r.orderName.padEnd(9)} enqueue total=${r.enqueueMs.toFixed(1)} ms (${r.perEventUs.toFixed(1)} us/event)  render: max block=${r.maxBlockMs.toFixed(3)} ms mean block=${r.meanBlockMs.toFixed(4)} ms  left=${r.left}`);
  }
}

// Steady look-ahead: queue holds ~W events; add one event per call (the normal scheduler case).
for (const W of [100, 1000, 10000]) {
  const s = await makeSynth(bank);
  const t0 = s.currentTime;
  for (let i = 0; i < W; i++) s.processMessage([0xb0, 1, 0], 0, { time: t0 + 10 + i * 1e-4 });
  const a = performance.now();
  const K = 2000;
  for (let i = 0; i < K; i++) s.processMessage([0xb0, 1, 0], 0, { time: t0 + 11 + i * 1e-4 });
  const d = performance.now() - a;
  console.log(`queue size ~${W}: one more push costs ${((d * 1000) / K).toFixed(1)} us (mean of ${K})`);
}

// Burst: 2000 note on events due in the same block (worst case for one render quantum).
{
  const s = await makeSynth(bank);
  s.programChange(0, 48);
  const T = s.currentTime + 0.05;
  for (let i = 0; i < 2000; i++) s.processMessage([0xb0, 1, i & 127], 0, { time: T });
  const L = new Float32Array(BLOCK), R = new Float32Array(BLOCK);
  let maxBlock = 0;
  while (s.currentTime < T + 0.01) { const b = performance.now(); s.process(L, R); maxBlock = Math.max(maxBlock, performance.now() - b); }
  console.log(`2000 CC events due in one block: that block took ${maxBlock.toFixed(2)} ms (budget at 48 kHz: ${(1000 * BLOCK / SR).toFixed(2)} ms)`);
}

// Proxy for postMessage cost: structured clone of the lib message shape, 10,000 times.
{
  const msg = (i) => ({ type: "midiMessage", channelNumber: -1, data: { messageData: new Uint8Array([0x90, 60, 100]), channelOffset: 0, options: { time: i } } });
  const a = performance.now();
  for (let i = 0; i < 10000; i++) structuredClone(msg(i));
  console.log(`structuredClone of 10,000 lib midiMessage objects: ${(performance.now() - a).toFixed(1)} ms (proxy only, not postMessage)`);
}
