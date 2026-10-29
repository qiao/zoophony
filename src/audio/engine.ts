import { SoundBankLoader, SpessaLog, SpessaSynthProcessor } from 'spessasynth_core';
import type { BasicPreset, ChorusProcessor, ChorusProcessorSnapshot } from 'spessasynth_core';

import {
  INITIAL_TRANSPORT,
  applyCommand,
  audibilityPlan,
  channelSeats,
  chaseEvents,
  notePairs,
  planBlock,
  restartNotes,
  takeEvent,
} from './block-scheduler.ts';
import type {
  BlockPlan,
  SeatCommand,
  TransportCommand,
  TransportState,
} from './block-scheduler.ts';
import type { ClockAnchor } from './clock.ts';
import { synthChannelCount } from './synth-events.ts';
import type { SynthEventTable } from './synth-events.ts';

/** The status nibble of a MIDI note off. */
const NOTE_OFF = 0x80;

/** The status nibble of a MIDI note on. */
const NOTE_ON = 0x90;

/** The status nibble of a MIDI control change. */
const CONTROL_CHANGE = 0xb0;

/** The controller number of the sustain pedal. */
const SUSTAIN_PEDAL = 64;

/**
 * The blocks that the warm-up renders while its notes hold: 80 ms at 48 kHz, so that the
 * envelopes reach their later stages.
 */
const WARM_UP_HOLD_BLOCKS = 30;

/** The blocks that the warm-up renders after it releases its notes: 40 ms at 48 kHz. */
const WARM_UP_RELEASE_BLOCKS = 15;

/** The blocks of the song start that the warm-up renders with the block scheduler. */
const WARM_UP_START_BLOCKS = 8;

/** The number of frames in one render quantum of Web Audio. */
export const BLOCK_FRAMES = 128;

/**
 * The settings of the reverb of the synth (design 6.1): the values of the GS macro "Room 1".
 * The reverb send of each channel (CC 91) comes from the depth of its seats, so this short room
 * makes the back rows sound farther away. The hall reverb of the `Player` gives the long tail.
 */
export const ROOM_REVERB = {
  character: 0,
  preLowpass: 3,
  time: 80,
  level: 64,
  delayFeedback: 0,
  preDelayTime: 0,
} as const;

/**
 * A chorus that adds nothing, and costs nothing in each block. An orchestra has no chorus, so
 * the synth has none (design 6.1). A reset of the synth writes the values of a GS chorus macro
 * into the fields. They change nothing, because `process()` adds nothing.
 */
class SilentChorus implements ChorusProcessor {
  level = 64;
  preLowpass = 0;
  feedback = 8;
  delay = 80;
  rate = 3;
  depth = 19;
  sendLevelToReverb = 0;
  sendLevelToDelay = 0;

  /** Adds nothing to the outputs. */
  process(): void {
    // The chorus is off.
  }

  /** Gives the values of the chorus. */
  getSnapshot(): ChorusProcessorSnapshot {
    return {
      level: this.level,
      preLowpass: this.preLowpass,
      feedback: this.feedback,
      delay: this.delay,
      rate: this.rate,
      depth: this.depth,
      sendLevelToReverb: this.sendLevelToReverb,
      sendLevelToDelay: this.sendLevelToDelay,
    };
  }
}

/** One PCM SF2 sound bank for the synth. */
export interface EngineBank {
  /** A unique id. A bank with the same id replaces the old one. */
  readonly id: string;
  /** The bytes of the PCM SF2 file. */
  readonly data: ArrayBuffer;
}

/** A command that the next block applies: a transport command or a seat audibility flag. */
type EngineCommand = TransportCommand | SeatCommand;

/** The function that gets each clock anchor of the engine. */
type AnchorListener = (anchor: ClockAnchor) => void;

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
  /** The output of the warm-up, which nobody hears. */
  readonly #scratchLeft = new Float32Array(BLOCK_FRAMES);
  readonly #scratchRight = new Float32Array(BLOCK_FRAMES);
  readonly #commands: EngineCommand[] = [];
  #table = EMPTY_TABLE;
  #durationSec = 0;
  #channelCount = 16;
  #state: TransportState = INITIAL_TRANSPORT;
  /** The note on of each note end (design 6.5). */
  #pairs: Int32Array = new Int32Array(0);
  /** 1 for each note on that the synth plays now. */
  #sounding: Uint8Array = new Uint8Array(0);
  /** 1 for each silent seat, by seat index (design 6.6). */
  #silent: Uint8Array = new Uint8Array(0);
  /** The seats that have notes on each channel. */
  #seatsOfChannels: readonly Int16Array[] = [];
  #lastAnchorTime = -Infinity;
  /** The linear gain of each synth channel, which each reset of the synth gets again. */
  #channelGains: readonly number[] = [];
  /** The number of the score: 1 after the first `loadScore()` (design 6.7). */
  #loads = 0;
  /** True until the first block after `loadScore()` posts its anchor. */
  #loadAnchor = false;
  /** True when a seat flag of the current block changed, until the block plans the change. */
  #seatsChanged = false;
  /** The seats that became silent in the current block. */
  readonly #silenced: number[] = [];

  /**
   * Creates the synth with no chorus and with the room reverb of {@link ROOM_REVERB}. The reverb
   * lock keeps the room after each reset of the synth (design 6.1).
   *
   * @param sampleRate The sample rate in Hz.
   * @param onAnchor The function that gets each clock anchor.
   */
  constructor(sampleRate: number, onAnchor: AnchorListener) {
    SpessaLog.setLogLevel(false, true, false);
    this.synth = new SpessaSynthProcessor(sampleRate, {
      effectsEnabled: true,
      eventsEnabled: false,
      chorusProcessor: new SilentChorus(),
    });
    Object.assign(this.synth.reverbProcessor, ROOM_REVERB);
    this.synth.setSystemParameter('reverbLock', true);
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
   * channel (design 6.4). All seats are audible again (design 6.6). The next block posts an
   * anchor at the song start with the new load number, so that the `Player` can tell the anchors
   * of the new score from the old ones (design 6.7).
   *
   * @param table The synth events.
   * @param durationSec The song length.
   * @param channelGainsDb The gain of each synth channel in dB (design 6.1). A channel with no
   *   entry gets 0.
   */
  loadScore(
    table: SynthEventTable,
    durationSec: number,
    channelGainsDb: readonly number[] = [],
  ): void {
    this.#channelCount = synthChannelCount(table);
    while (this.synth.midiChannels.length < this.#channelCount) {
      this.synth.createMIDIChannel();
    }
    this.#channelGains = channelGainsDb.map((db) => 10 ** (db / 20));
    this.synth.stopAllChannels(true);
    this.#reset();
    this.#table = table;
    this.#durationSec = durationSec;
    this.#state = { ...INITIAL_TRANSPORT, rate: this.#state.rate };
    this.#pairs = notePairs(table, this.#channelCount);
    this.#sounding = new Uint8Array(table.timeSec.length);
    this.#seatsOfChannels = channelSeats(table, this.#channelCount);
    this.#silent = new Uint8Array(
      table.seatIndex.reduce((max, seat) => Math.max(max, seat), -1) + 1,
    );
    this.#commands.length = 0;
    this.#seatsChanged = false;
    this.#silenced.length = 0;
    this.#loads += 1;
    this.#loadAnchor = true;
  }

  /**
   * Adds sound banks, then warms up the voice code with the presets of the score. Each add resets
   * the synth, so all banks must load before play (design 6.3). The `Player` sends the banks of a
   * load after its score, also when the list is empty, so each load warms up.
   *
   * @param banks The PCM SF2 banks.
   */
  addBanks(banks: readonly EngineBank[]): void {
    for (const bank of banks) {
      this.synth.soundBankManager.addSoundBank(SoundBankLoader.fromArrayBuffer(bank.data), bank.id);
    }
    this.#warmUp();
  }

  /**
   * Puts a transport command or a seat audibility flag in the queue. The next block applies it.
   *
   * @param command The command.
   */
  enqueue(command: EngineCommand): void {
    this.#commands.push(command);
  }

  /**
   * Renders one block of 128 frames (design 6.4): applies the commands, sends the due events,
   * renders, and posts a clock anchor after a change and one time each second. The seat flags of
   * all commands of the block go into one plan, so a solo costs one walk over the events
   * (design 6.6).
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
    if (this.#seatsChanged) {
      this.#seatsChanged = false;
      this.#applyAudibility();
      this.#silenced.length = 0;
    }
    const start = this.#state;
    const plan = this.#advance(left, right);
    if (changed || this.#loadAnchor || (start.playing && contextTime - this.#lastAnchorTime >= 1)) {
      this.#loadAnchor = false;
      this.#post({
        contextTime,
        songTime: start.songSec,
        rate: start.playing ? start.rate : 0,
        load: this.#loads,
      });
    }
    if (plan.ended) {
      this.#post({
        contextTime: contextTime + (this.#durationSec - start.songSec) / start.rate,
        songTime: this.#durationSec,
        rate: 0,
        load: this.#loads,
      });
    }
  }

  /**
   * Sends the events of one block, moves the transport, and renders the block.
   *
   * @param left The left output, 128 samples.
   * @param right The right output, 128 samples.
   * @returns The plan of the block.
   */
  #advance(left: Float32Array, right: Float32Array): BlockPlan {
    const plan = planBlock(this.#state, this.#table.timeSec, this.#blockSec, this.#durationSec);
    if (plan.restartHeld) {
      this.#restartHeld(plan.from);
    }
    for (let i = plan.from; i < plan.to; i++) {
      if (takeEvent(this.#table, i, this.#pairs, this.#sounding, this.#silent)) {
        this.#send(i);
      }
    }
    this.#state = plan.state;
    if (plan.ended) {
      this.#releaseAll();
    }
    this.synth.process(left, right);
    return plan;
  }

  /**
   * Renders the presets of the score with the master gain 0, so that the first note of each
   * preset does not run cold code on the audio thread. With no warm-up, a slow block of 3 to 5 ms
   * comes at the first notes of a process, and 1.5 ms at the first notes of a preset in the middle
   * of a song.
   *
   * The warm-up has two parts:
   *
   * 1. It sends the events of the score in order with the first note on of each preset, and no
   *    other note. It renders while these notes hold and after their release.
   * 2. It plays the start of the song with the block scheduler.
   *
   * The gain 0 makes the voices and the effect inputs exactly 0. Then the warm-up stops all
   * voices, resets the synth as `loadScore()` does, and restores the gain. It posts no anchor. It
   * runs only while the transport is stopped at the song start, as after `loadScore()`.
   */
  #warmUp(): void {
    const table = this.#table;
    const state = this.#state;
    if (table.timeSec.length === 0 || state.playing || state.cursor !== 0) {
      return;
    }
    const gain = this.synth.systemParameters.gain;
    this.synth.setSystemParameter('gain', 0);
    const presets = new Set<BasicPreset>();
    for (let i = 0; i < table.timeSec.length; i++) {
      const kind = table.kind[i];
      if (kind === NOTE_ON && (table.data2[i] ?? 0) > 0) {
        const preset = this.synth.midiChannels[table.channel[i] ?? 0]?.preset;
        if (preset && !presets.has(preset)) {
          presets.add(preset);
          this.#send(i);
        }
      } else if (kind !== NOTE_OFF && kind !== NOTE_ON) {
        this.#send(i);
      }
    }
    this.#renderScratch(WARM_UP_HOLD_BLOCKS);
    this.synth.stopAllChannels(false);
    this.#renderScratch(WARM_UP_RELEASE_BLOCKS);
    this.synth.stopAllChannels(true);
    this.#reset();
    this.#state = { ...state, playing: true };
    for (let i = 0; i < WARM_UP_START_BLOCKS && this.#state.playing; i++) {
      this.#advance(this.#scratchLeft, this.#scratchRight);
    }
    this.synth.stopAllChannels(true);
    this.#reset();
    this.#sounding.fill(0);
    this.#state = state;
    this.synth.setSystemParameter('gain', gain);
  }

  /**
   * Resets the synth, then sets the gain of each channel again. A reset of spessasynth_core can
   * reset the channels, so each reset of the engine runs here.
   */
  #reset(): void {
    this.synth.reset();
    this.synth.midiChannels.forEach((channel, index) => {
      channel.setSystemParameter('gain', this.#channelGains[index] ?? 1);
    });
  }

  /** Renders blocks into the scratch buffers. */
  #renderScratch(blocks: number): void {
    for (let i = 0; i < blocks; i++) {
      this.synth.process(this.#scratchLeft, this.#scratchRight);
    }
  }

  #post(anchor: ClockAnchor): void {
    this.#lastAnchorTime = anchor.contextTime;
    this.#onAnchor(anchor);
  }

  #apply(command: EngineCommand): boolean {
    if (command.type === 'seat') {
      this.#setSeatFlag(command.seatIndex, command.audible);
      return false;
    }
    const result = applyCommand(this.#state, command, this.#table.timeSec, this.#durationSec);
    this.#state = result.state;
    const { cursor } = result.state;
    if (result.actions.release) {
      this.#releaseAll();
    }
    if (result.actions.chase) {
      this.#reset();
      for (const index of chaseEvents(this.#table, cursor)) {
        this.#send(index);
      }
    }
    return result.changed;
  }

  /**
   * Starts the held notes at a cursor again, by the rule of design 6.5, at the start point of a
   * play or after a seek during play.
   *
   * @param cursor The index of the first event after the start point.
   */
  #restartHeld(cursor: number): void {
    for (const index of restartNotes(this.#table, cursor, this.#channelCount, this.#silent)) {
      this.#sounding[index] = 1;
      this.#send(index);
    }
  }

  /**
   * Sets the audibility flag of a seat. The block plans the change after all its commands
   * ({@link SynthEngine.render}).
   */
  #setSeatFlag(seatIndex: number, audible: boolean): void {
    if (seatIndex < 0 || seatIndex >= this.#silent.length) {
      return;
    }
    this.#silent[seatIndex] = audible ? 0 : 1;
    this.#seatsChanged = true;
    if (!audible) {
      this.#silenced.push(seatIndex);
    }
  }

  /**
   * Makes the sounding notes agree with the seat flags. While the song plays, the held notes of a
   * silent seat end at once, and the held notes of an audible seat start again by the rule of 6.5
   * (design 6.6).
   */
  #applyAudibility(): void {
    // In the count-in and while paused, no held note sounds. The next start point reads the flags.
    if (!this.#state.playing || this.#state.startSec !== null) {
      return;
    }
    const plan = audibilityPlan(
      this.#table,
      this.#state.cursor,
      this.#seatsOfChannels,
      this.#sounding,
      this.#silent,
      this.#silenced,
    );
    for (const index of plan.ends) {
      this.#sounding[index] = 0;
      this.#sendNoteOff(index);
    }
    for (const channel of plan.stopChannels) {
      this.synth.midiChannels[channel]?.stopAllNotes(false);
    }
    for (const channel of plan.releaseChannels) {
      this.#releasePedal(channel);
    }
    for (const index of plan.starts) {
      this.#sounding[index] = 1;
      this.#send(index);
    }
  }

  /**
   * Releases the notes that the sustain pedal of a channel holds, and keeps the pedal down for
   * the later notes (design 6.6). spessasynth_core only marks a voice as held at a note off while
   * the pedal is down, and a pedal up releases each held voice of the channel.
   *
   * @param channel The synth channel.
   */
  #releasePedal(channel: number): void {
    const pedal = (this.synth.midiChannels[channel]?.midiControllers[SUSTAIN_PEDAL] ?? 0) >> 7;
    if (pedal < 64) {
      return;
    }
    this.#sendControl(channel, SUSTAIN_PEDAL, 0);
    this.#sendControl(channel, SUSTAIN_PEDAL, pedal);
  }

  /** Sends a control change to a synth channel. */
  #sendControl(channel: number, controller: number, value: number): void {
    const message = this.#message;
    message[0] = CONTROL_CHANGE | (channel % 16);
    message[1] = controller;
    message[2] = value;
    this.synth.processMessage(message, channel - (channel % 16));
  }

  /** Releases all notes. No note on sounds after it, so no later note end is sent. */
  #releaseAll(): void {
    this.synth.stopAllChannels(false);
    this.#sounding.fill(0);
  }

  /** Sends a note off for the channel and the key of a note on. */
  #sendNoteOff(index: number): void {
    const table = this.#table;
    const channel = table.channel[index] ?? 0;
    const message = this.#message;
    message[0] = NOTE_OFF | (channel % 16);
    message[1] = table.data1[index] ?? 0;
    message[2] = 0;
    this.synth.processMessage(message, channel - (channel % 16));
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
