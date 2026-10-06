// Research script of docs/research/demo-loudness.md. It writes the A/B files of the fixes of SD1
// and SD2 of docs/audits/2026-10-05-ux-design.md, at the output of the app chain:
// - ode-to-joy-choir-<label>.wav: 20 s of the full choir of the Beethoven 9 demo, from 160 s,
//   with the piece gain of pieceGainDb().
// - boulanger-mute-<label>.wav: 20 s of the Boulanger demo from 232 s. The bar mute comes at
//   8 s, and the unmute at 13 s.
// Usage: node ab.ts <out dir> before|after
// "before" mutes with the master gain of the synth, as the Player did before the fix of SD2.
// "after" calls setOutputVolume() of the chain, as the Player does after it.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { pieceGainDb } from '../../../../src/audio/demo-loudness.ts';
import { SOUNDFONT_HEADROOM_DB } from '../../../../src/audio/soundfont-info.ts';
import { closeChain, runChain } from './chain.ts';
import { measure } from './meter.ts';
import { renderDemo, writeWav } from './synth.ts';
import type { TimedCommand } from './synth.ts';

const [dir, label] = process.argv.slice(2);
if (!dir || (label !== 'before' && label !== 'after')) {
  throw new Error('Usage: node ab.ts <out dir> before|after');
}
mkdirSync(dir, { recursive: true });

try {
  const choir = await renderDemo('beethoven-9', { from: 160, seconds: 20 });
  const choirGain = pieceGainDb('beethoven-9');
  const choirOut = await runChain(choir, { inputDb: SOUNDFONT_HEADROOM_DB + choirGain });
  writeWav(join(dir, `ode-to-joy-choir-${label}.wav`), choirOut);
  const m = measure(choirOut.left, choirOut.right);
  console.log(
    `ode to joy choir ${label}: gain ${choirGain} dB, ${m.lufs.toFixed(2)} LUFS, ` +
      `true peak ${m.truePeak.toFixed(2)} dBTP`,
  );

  const mute: readonly [number, number][] = [
    [8, 0],
    [13, 1],
  ];
  const commands: TimedCommand[] =
    label === 'before'
      ? mute.map(([at, gain]) => ({ at, command: { type: 'volume', gain } }))
      : [];
  const boulanger = await renderDemo('boulanger-matin', { from: 232, seconds: 20, commands });
  const volume = label === 'after' ? mute.map(([at, gain]) => ({ at, gain })) : [];
  const muteOut = await runChain(boulanger, {
    inputDb: SOUNDFONT_HEADROOM_DB + pieceGainDb('boulanger-matin'),
    volume,
  });
  writeWav(join(dir, `boulanger-mute-${label}.wav`), muteOut);
  console.log(`boulanger mute ${label}: written`);
} finally {
  await closeChain();
}
