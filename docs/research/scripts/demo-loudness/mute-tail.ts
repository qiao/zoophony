// Research script of docs/research/demo-loudness.md. It measures how fast the output of the app
// chain goes silent after a mute: the bar mute (the volume gain 0), or the mute of one seat that
// plays alone. It prints the time from the mute to 20, 40, and 60 dB below the level of the
// second before the mute, in windows of 10 ms.
// Usage: node mute-tail.ts <demo> <song second> <master | seat index ...> [--after] [--synth] [--dry]
// With --after, the bar mute calls setOutputVolume() of the chain, as the Player does after the
// fix of SD2. Else it sets the master gain of the synth, as the Player did before. With --synth,
// it measures the output of the synth with no output chain. With --dry, the room reverb of the
// synth is off too, so only the release of the voices stays.
import { SOUNDFONT_HEADROOM_DB } from '../../../../src/audio/soundfont-info.ts';
import { pieceGainDb } from '../../../../src/audio/demo-loudness.ts';
import { closeChain, runChain } from './chain.ts';
import { demoScore, renderDemo } from './synth.ts';
import type { Stereo, TimedCommand } from './synth.ts';

const [id = 'boulanger-matin', fromText = '60', ...rest] = process.argv.slice(2);
const after = rest.includes('--after');
const dry = rest.includes('--dry');
const synthOnly = dry || rest.includes('--synth');
const targets = rest.filter((arg) => !arg.startsWith('--'));
const from = Number(fromText);
/** The mute comes 3 s after the render start. */
const MUTE_AT = 3;
const RATE = 48_000;

function levels(audio: Stereo): number[] {
  const size = RATE / 100;
  const out: number[] = [];
  for (let start = 0; start + size <= audio.left.length; start += size) {
    let sum = 0;
    for (let i = start; i < start + size; i++) {
      sum += audio.left[i]! ** 2 + audio.right[i]! ** 2;
    }
    out.push(10 * Math.log10(sum / size + 1e-30));
  }
  return out;
}

function decay(audio: Stereo): string {
  const level = levels(audio);
  const mute = MUTE_AT * 100;
  const before = 10 * Math.log10(
    level.slice(mute - 100, mute).reduce((sum, value) => sum + 10 ** (value / 10), 0) / 100,
  );
  const times = [20, 40, 60].map((drop) => {
    // The last window above the threshold: the tail can rise again, for example a reverb.
    let last = -1;
    for (let i = mute; i < level.length; i++) {
      if (level[i]! > before - drop) {
        last = i;
      }
    }
    return `-${drop} dB at ${last < 0 ? '0' : ((last + 1 - mute) * 10).toString()} ms`;
  });
  return `level before ${before.toFixed(1)} dB | ${times.join(' | ')}`;
}

const score = await demoScore(id);
// SAFETY: the id is a demo id of the app.
const inputDb = SOUNDFONT_HEADROOM_DB + pieceGainDb(id as Parameters<typeof pieceGainDb>[0]);
try {
  for (const target of targets) {
    const commands: TimedCommand[] = [];
    if (target === 'master') {
      if (!after) {
        commands.push({ at: MUTE_AT, command: { type: 'volume', gain: 0 } });
      }
    } else {
      const seat = Number(target);
      score.seats.forEach((_, index) => {
        if (index !== seat) {
          commands.push({ at: 0, command: { type: 'seat', seatIndex: index, audible: false } });
        }
      });
      commands.push({ at: MUTE_AT, command: { type: 'seat', seatIndex: seat, audible: false } });
    }
    const synth = await renderDemo(id, { from, seconds: MUTE_AT + 4, commands, room: !dry });
    const volume = target === 'master' && after ? [{ at: MUTE_AT, gain: 0 }] : [];
    const out = synthOnly ? synth : await runChain(synth, { inputDb, volume });
    const name =
      target === 'master' ? 'bar mute' : `seat ${target} (${score.seats[Number(target)]!.section})`;
    console.log(`${id} at ${from} s, ${name}${after ? ', after' : ''}${synthOnly ? ', synth' : ''}${dry ? ', dry' : ''}: ${decay(out)}`);
  }
} finally {
  await closeChain();
}
