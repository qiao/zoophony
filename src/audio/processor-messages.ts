import type { SeatCommand, TransportCommand } from './block-scheduler.ts';
import type { ClockAnchor } from './clock.ts';
import type { EngineBank } from './engine.ts';
import type { SynthEventTable } from './synth-events.ts';

/** The name of the worklet processor in `registerProcessor()`. */
export const PROCESSOR_NAME = 'zoophony-synth';

/** A message from the `Player` to the worklet processor. */
export type ProcessorCommand =
  | {
      readonly type: 'score';
      readonly table: SynthEventTable;
      readonly durationSec: number;
      /** The gain of each synth channel in dB, from `channelGainsDb()` (design 6.1). */
      readonly channelGainsDb: readonly number[];
    }
  | { readonly type: 'banks'; readonly banks: readonly EngineBank[] }
  /**
   * The master gain of the synth. The `Player` sends no volume command, because the volume is a
   * node of the output chain (design 6.8). `processor.ts` keeps the command until the Safari
   * check of step 1 frees it (review of step 1, condition 3).
   */
  | { readonly type: 'volume'; readonly gain: number }
  | TransportCommand
  | SeatCommand;

/** A message from the worklet processor to the `Player`. */
export type ProcessorReply =
  | {
      readonly type: 'ready';
      /** The number of banks that the processor added. */
      readonly banks: number;
    }
  | { readonly type: 'anchor'; readonly anchor: ClockAnchor }
  | { readonly type: 'error'; readonly message: string };
