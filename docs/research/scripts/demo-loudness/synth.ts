// Research script of docs/research/demo-loudness.md. It renders the synth output of a demo in
// Node with the SynthEngine of the worktree, the stage mix of the app, and the SoundFont of
// design 6.2, as the worklet does. The output chain comes after it (chain.ts).
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { patchedDemos } from '../../../../tools/patch-demos.ts';
import { buildScore } from '../../../../src/score/score.ts';
import { layoutScene } from '../../../../src/models/layout-scene.ts';
import { mixSynthEvents, stageMix } from '../../../../src/score/stage-mix.ts';
import { packSynthEvents } from '../../../../src/audio/synth-events.ts';
import { OfflineHarness, TEST_SAMPLE_RATE, testBanks } from '../../../../src/audio/test-banks.ts';
import type { EngineCommand } from '../../../../src/audio/engine.ts';
import type { Score } from '../../../../src/score/types.ts';

/** The repository root. */
export const ROOT = join(import.meta.dirname, '..', '..', '..', '..');

/** A stereo signal at 48 kHz. */
export interface Stereo {
  readonly left: Float32Array;
  readonly right: Float32Array;
}

/** A command that the render sends to the engine at a context time. */
export interface TimedCommand {
  /** Seconds after the render start. */
  readonly at: number;
  readonly command: EngineCommand | { readonly type: 'volume'; readonly gain: number };
}

/** The options of {@link renderDemo}. */
export interface RenderOptions {
  /** The song time of the render start. The render seeks there before it plays. */
  readonly from?: number;
  /** The length in seconds. The default is the song length plus 3 s of tail. */
  readonly seconds?: number;
  /** Commands during the render. */
  readonly commands?: readonly TimedCommand[];
  /** False to turn off the room reverb of the synth (the system parameter `reverbGain` 0). */
  readonly room?: boolean;
}

/**
 * Builds the score of a demo as the app does, with the section size "Auto".
 *
 * @param id The demo id, which is also the file name in `demos/src/`.
 * @returns The score.
 */
export async function demoScore(id: string): Promise<Score> {
  const demo = (await patchedDemos()).find((item) => item.file === `${id}.mid`);
  if (!demo) {
    throw new Error(`No demo ${id}.`);
  }
  const result = buildScore(demo.bytes, 'auto');
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.score;
}

/**
 * Renders the synth output of a demo with the stage mix (design 6.1).
 *
 * @param id The demo id.
 * @param options The start, the length, and the commands.
 * @returns The stereo output of the synth, before the output chain.
 */
export async function renderDemo(id: string, options: RenderOptions = {}): Promise<Stereo> {
  const score = await demoScore(id);
  const events = mixSynthEvents(score.synthEvents, stageMix(score, layoutScene(score)));
  const run = new OfflineHarness(
    packSynthEvents(events),
    score.durationSec,
    await testBanks(score.presets),
  );
  const engine = run.engine;
  if (options.room === false) {
    // SAFETY: a research render reads the private synth of the engine, as engine tests do.
    (engine as unknown as { synth: { setSystemParameter(name: string, value: number): void } })
      .synth.setSystemParameter('reverbGain', 0);
  }
  if (options.from) {
    engine.enqueue({ type: 'seek', songSec: options.from });
  }
  engine.enqueue({ type: 'play', countInSec: 0 });
  const seconds = options.seconds ?? score.durationSec - (options.from ?? 0) + 3;
  const frames = Math.ceil((seconds * TEST_SAMPLE_RATE) / 128) * 128;
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  const pending = [...(options.commands ?? [])].toSorted((a, b) => a.at - b.at);
  const l = new Float32Array(128);
  const r = new Float32Array(128);
  for (let frame = 0; frame < frames; frame += 128) {
    while (pending.length && pending[0]!.at * TEST_SAMPLE_RATE <= frame) {
      const { command } = pending.shift()!;
      if (command.type === 'volume') {
        engine.setVolume(command.gain);
      } else {
        engine.enqueue(command);
      }
    }
    l.fill(0);
    r.fill(0);
    engine.render(frame / TEST_SAMPLE_RATE, l, r);
    left.set(l, frame);
    right.set(r, frame);
  }
  return { left, right };
}

/**
 * Writes a 32-bit float stereo WAV file at 48 kHz.
 *
 * @param path The file path.
 * @param audio The signal.
 */
export function writeWav(path: string, audio: Stereo): void {
  const frames = audio.left.length;
  const data = new Float32Array(frames * 2);
  for (let i = 0; i < frames; i++) {
    data[2 * i] = audio.left[i]!;
    data[2 * i + 1] = audio.right[i]!;
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.byteLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(3, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(TEST_SAMPLE_RATE, 24);
  header.writeUInt32LE(TEST_SAMPLE_RATE * 8, 28);
  header.writeUInt16LE(8, 32);
  header.writeUInt16LE(32, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.byteLength, 40);
  writeFileSync(path, Buffer.concat([header, Buffer.from(data.buffer)]));
}
