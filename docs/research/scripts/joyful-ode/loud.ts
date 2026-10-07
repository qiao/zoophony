// Measures candidate MIDI files through the app chain, as docs/research/demo-loudness.md does.
// Usage: node loud.ts <file.mid>...
// For each file: the integrated loudness at the gain 0 dB, the gain to -18 LUFS, the loudness
// range, the true peak, and the loudness of each 10 s window at the gain to -18 LUFS.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const W = new URL('../../../../', import.meta.url).pathname.replace(/\/$/u, '');
const { buildScore } = await import(`${W}/src/score/score.ts`);
const { layoutScene } = await import(`${W}/src/models/layout-scene.ts`);
const { mixSynthEvents, stageMix } = await import(`${W}/src/score/stage-mix.ts`);
const { packSynthEvents } = await import(`${W}/src/audio/synth-events.ts`);
const { OfflineHarness, TEST_SAMPLE_RATE, testBanks } = await import(`${W}/src/audio/test-banks.ts`);
const { SOUNDFONT_HEADROOM_DB } = await import(`${W}/src/audio/soundfont-info.ts`);
const { closeChain, runChain } = await import(`${W}/docs/research/scripts/demo-loudness/chain.ts`);
const { measure } = await import(`${W}/docs/research/scripts/demo-loudness/meter.ts`);

async function render(bytes: Uint8Array): Promise<{ left: Float32Array; right: Float32Array }> {
  const score = buildScore(bytes, 'auto').score;
  const events = mixSynthEvents(score.synthEvents, stageMix(score, layoutScene(score)));
  const run = new OfflineHarness(packSynthEvents(events), score.durationSec, await testBanks(score.presets));
  run.engine.enqueue({ type: 'play', countInSec: 0 });
  const frames = Math.ceil(((score.durationSec + 3) * TEST_SAMPLE_RATE) / 128) * 128;
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  const l = new Float32Array(128);
  const r = new Float32Array(128);
  for (let f = 0; f < frames; f += 128) {
    l.fill(0);
    r.fill(0);
    run.engine.render(f / TEST_SAMPLE_RATE, l, r);
    left.set(l, f);
    right.set(r, f);
  }
  return { left, right };
}

try {
  for (const path of process.argv.slice(2)) {
    const synth = await render(new Uint8Array(readFileSync(path)));
    const at = async (gain: number) =>
      runChain(synth, { inputDb: SOUNDFONT_HEADROOM_DB + gain });
    let gain = 0;
    let out = await at(gain);
    let m = measure(out.left, out.right, false);
    const zero = m.lufs;
    for (let step = 0; step < 5 && Math.abs(m.lufs + 18) > 0.05; step++) {
      gain = Math.round((gain - 18 - m.lufs) * 10) / 10;
      out = await at(gain);
      m = measure(out.left, out.right, false);
    }
    const full = measure(out.left, out.right, true);
    const step = 10 * TEST_SAMPLE_RATE;
    const windows: string[] = [];
    for (let s = 0; s + step <= out.left.length; s += step) {
      const w = measure(out.left.slice(s, s + step), out.right.slice(s, s + step), false);
      windows.push(Number.isFinite(w.lufs) ? w.lufs.toFixed(0) : '-inf');
    }
    const loud = windows.filter((w) => Number(w) >= -21).length;
    console.log(
      `${basename(path)}: at 0 dB ${zero.toFixed(2)} LUFS, gain ${gain.toFixed(1)} dB -> ` +
        `${full.lufs.toFixed(2)} LUFS, LRA ${full.lra.toFixed(1)} LU, true peak ` +
        `${full.truePeak.toFixed(2)} dBTP, windows >= -21 LUFS: ${loud}/${windows.length}`,
    );
    console.log(`  10 s windows (LUFS): ${windows.join(' ')}`);
  }
} finally {
  await closeChain();
}
