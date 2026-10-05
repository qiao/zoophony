import { SoundBankLoader, SpessaLog, SpessaSynthProcessor } from 'spessasynth_core';

import {
  INITIAL_TRANSPORT,
  applyCommand,
  chaseEvents,
  notePairs,
  planBlock,
  restartNotes,
  takeEvent,
} from './block-scheduler.ts';
import type { TransportCommand, TransportState } from './block-scheduler.ts';
import type { ClockAnchor } from './clock.ts';
import { synthChannelCount } from './synth-events.ts';
import type { SynthEventTable } from './synth-events.ts';

/** The number of frames in one render quantum of Web Audio. */
export const BLOCK_FRAMES = 128;

/** One PCM SF2 sound bank for the synth. */
export interface EngineBank {
  /** A unique id. A bank with the same id replaces the old one. */
  readonly id: string;
  /** The bytes of the PCM SF2 file. */
  readonly data: ArrayBuffer;
}

/** The function that gets each clock anchor of the engine. */
export type AnchorListener = (anchor: ClockAnchor) => void;

const EMPTY_TABLE: SynthEventTable = {
  timeSec: new Float64Array(0),
  channel: new Uint16Array(0),
  kind: new Uint8Array(0),
  data1: new Uint8Array(0),
  data2: new Uint8Array(0),
  seatIndex: new Int16Array(0),
};

/**
 * The synth of the worklet processor: spessasynth_core, driven by the block scheduler
 * (design 6.4). It has no Web Audio dependency, so Node tests can render with it offline.
 */
export class SynthEngine {
  /** TypeScript private, so that a test can read the channel state with element access. */
  private readonly synth: SpessaSynthProcessor;
  readonly #blockSec: number;
  readonly #onAnchor: AnchorListener;
  readonly #message = new Uint8Array(3);
  readonly #commands: TransportCommand[] = [];
  #table = EMPTY_TABLE;
  #durationSec = 0;
  #channelCount = 16;
  #state: TransportState = INITIAL_TRANSPORT;
  /** The note on of each note end (design 6.5). */
  #pairs: Int32Array = new Int32Array(0);
  /** 1 for each note on that the synth plays now. */
  #sounding: Uint8Array = new Uint8Array(0);
  #lastAnchorTime = -Infinity;

  /**
   * Creates the synth.
   *
   * @param sampleRate The sample rate in Hz.
   * @param onAnchor The function that gets each clock anchor.
   */
  constructor(sampleRate: number, onAnchor: AnchorListener) {
    SpessaLog.setLogLevel(false, true, false);
    this.synth = new SpessaSynthProcessor(sampleRate, {
      effectsEnabled: true,
      eventsEnabled: false,
    });
    this.#blockSec = BLOCK_FRAMES / sampleRate;
    this.#onAnchor = onAnchor;
  }

  /** True while the song plays. */
  get playing(): boolean {
    return this.#state.playing;
  }

  /** The number of synth channels. */
  get channelCount(): number {
    return this.synth.midiChannels.length;
  }

  /**
   * Sets the events of a new score, and stops at the song start. The engine first makes all
   * channels of the score, then resets the synth, so that channel 10 of each port is a drum
   * channel (design 6.4).
   *
   * @param table The synth events.
   * @param durationSec The song length.
   */
  loadScore(table: SynthEventTable, durationSec: number): void {
    this.#channelCount = synthChannelCount(table);
    while (this.synth.midiChannels.length < this.#channelCount) {
      this.synth.createMIDIChannel();
    }
    this.synth.stopAllChannels(true);
    this.synth.reset();
    this.#table = table;
    this.#durationSec = durationSec;
    this.#state = { ...INITIAL_TRANSPORT, rate: this.#state.rate };
    this.#pairs = notePairs(table, this.#channelCount);
    this.#sounding = new Uint8Array(table.timeSec.length);
    this.#commands.length = 0;
  }

  /**
   * Adds sound banks. Each add resets the synth, so all banks must load before play
   * (design 6.3).
   *
   * @param banks The PCM SF2 banks.
   */
  addBanks(banks: readonly EngineBank[]): void {
    for (const bank of banks) {
      this.synth.soundBankManager.addSoundBank(SoundBankLoader.fromArrayBuffer(bank.data), bank.id);
    }
  }

  /**
   * Puts a transport command in the queue. The next block applies it.
   *
   * @param command The command.
   */
  enqueue(command: TransportCommand): void {
    this.#commands.push(command);
  }

  /**
   * Sets the master gain of the synth.
   *
   * @param gain The gain, 1 for the default level.
   */
  setVolume(gain: number): void {
    this.synth.setSystemParameter('gain', gain);
  }

  /**
   * Renders one block of 128 frames (design 6.4): applies the commands, sends the due events,
   * renders, and posts a clock anchor after a change and one time each second.
   *
   * @param contextTime The context time at the block start.
   * @param left The left output, 128 samples.
   * @param right The right output, 128 samples.
   */
  render(contextTime: number, left: Float32Array, right: Float32Array): void {
    let changed = false;
    for (const command of this.#commands) {
      changed = this.#apply(command) || changed;
    }
    this.#commands.length = 0;
    const start = this.#state;
    const plan = planBlock(start, this.#table.timeSec, this.#blockSec, this.#durationSec);
    for (let i = plan.from; i < plan.to; i++) {
      if (takeEvent(this.#table, i, this.#pairs, this.#sounding)) {
        this.#send(i);
      }
    }
    this.#state = plan.state;
    if (plan.ended) {
      this.#releaseAll();
    }
    this.synth.process(left, right);
    if (changed || (start.playing && contextTime - this.#lastAnchorTime >= 1)) {
      this.#post({
        contextTime,
        songTime: start.songSec,
        rate: start.playing ? start.rate : 0,
      });
    }
    if (plan.ended) {
      this.#post({
        contextTime: contextTime + (this.#durationSec - start.songSec) / start.rate,
        songTime: this.#durationSec,
        rate: 0,
      });
    }
  }

  #post(anchor: ClockAnchor): void {
    this.#lastAnchorTime = anchor.contextTime;
    this.#onAnchor(anchor);
  }

  #apply(command: TransportCommand): boolean {
    const result = applyCommand(this.#state, command, this.#table.timeSec, this.#durationSec);
    this.#state = result.state;
    const { cursor } = result.state;
    if (result.actions.release) {
      this.#releaseAll();
    }
    if (result.actions.chase) {
      this.synth.reset();
      for (const index of chaseEvents(this.#table, cursor)) {
        this.#send(index);
      }
    }
    if (result.actions.restartHeld) {
      for (const index of restartNotes(this.#table, cursor, this.#channelCount)) {
        this.#sounding[index] = 1;
        this.#send(index);
      }
    }
    return result.changed;
  }

  /** Releases all notes. No note on sounds after it, so no later note end is sent. */
  #releaseAll(): void {
    this.synth.stopAllChannels(false);
    this.#sounding.fill(0);
  }

  #send(index: number): void {
    const table = this.#table;
    const channel = table.channel[index] ?? 0;
    const message = this.#message;
    message[0] = (table.kind[index] ?? 0) | (channel % 16);
    message[1] = table.data1[index] ?? 0;
    message[2] = table.data2[index] ?? 0;
    this.synth.processMessage(message, channel - (channel % 16));
  }
}
