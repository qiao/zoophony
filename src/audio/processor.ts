import { SynthEngine } from './engine.ts';
import { PROCESSOR_NAME } from './processor-messages.ts';
import type { ProcessorCommand, ProcessorReply } from './processor-messages.ts';

// The members of AudioWorkletGlobalScope that this module uses. TypeScript has no lib for this
// scope, so these declarations stay local to the module.
declare const sampleRate: number;

declare const currentTime: number;

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}

declare function registerProcessor(
  name: string,
  processorConstructor: new () => AudioWorkletProcessor,
): void;

type ProcessArguments = [inputs: Float32Array[][], outputs: Float32Array[][]];

/** The worklet processor: spessasynth_core and the block scheduler (design 6.4). */
class SynthProcessor extends AudioWorkletProcessor {
  readonly #engine: SynthEngine;
  #failed = false;

  constructor() {
    super();
    this.#engine = new SynthEngine(sampleRate, (anchor) => {
      this.#reply({ type: 'anchor', anchor });
    });
    this.port.addEventListener('message', (event: MessageEvent<ProcessorCommand>) => {
      this.#receive(event.data);
    });
    this.port.start();
  }

  process(...[, outputs]: ProcessArguments): boolean {
    const left = outputs[0]?.[0];
    const right = outputs[0]?.[1] ?? left;
    if (!left || !right || this.#failed) {
      return true;
    }
    try {
      this.#engine.render(currentTime, left, right);
    } catch (error) {
      // A throw from process() would stop the processor for good, so the processor stays
      // silent and reports the error.
      this.#failed = true;
      this.#reply({ type: 'error', message: String(error) });
      return true;
    }
    return true;
  }

  #receive(command: ProcessorCommand): void {
    try {
      switch (command.type) {
        case 'score':
          this.#engine.loadScore(command.table, command.durationSec, command.channelGainsDb);
          break;
        case 'banks':
          this.#engine.addBanks(command.banks);
          this.#reply({ type: 'ready', banks: command.banks.length });
          break;
        case 'volume':
          this.#engine.setVolume(command.gain);
          break;
        default:
          this.#engine.enqueue(command);
      }
    } catch (error) {
      this.#reply({ type: 'error', message: String(error) });
    }
  }

  #reply(message: ProcessorReply): void {
    // A MessagePort has no target origin. The second argument is the empty transfer list.
    this.port.postMessage(message, []);
  }
}

registerProcessor(PROCESSOR_NAME, SynthProcessor);
