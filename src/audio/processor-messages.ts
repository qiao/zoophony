import type { TransportCommand } from './block-scheduler.ts';
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
    }
  | { readonly type: 'banks'; readonly banks: readonly EngineBank[] }
  | { readonly type: 'volume'; readonly gain: number }
  | TransportCommand;

/** The render time statistics of the processor, for the spike page. */
export interface RenderStats {
  /** The number of blocks that the processor rendered while the song played. */
  readonly blocks: number;
  /** The number of these blocks with a render time above the block length (2.7 ms at 48 kHz). */
  readonly slowBlocks: number;
  /** The longest render time of a block, in milliseconds. */
  readonly maxRenderMs: number;
  /**
   * The timer of the render time. Chromium has no `performance` in a worklet, so the processor
   * then uses `Date.now()`. Its 1 ms steps count only the blocks of 3 ms or more as slow.
   */
  readonly timer: 'performance.now' | 'Date.now';
}

/** A message from the worklet processor to the `Player`. */
export type ProcessorReply =
  | {
      readonly type: 'ready';
      /** The number of banks that the processor added. */
      readonly banks: number;
    }
  | { readonly type: 'anchor'; readonly anchor: ClockAnchor }
  | { readonly type: 'stats'; readonly stats: RenderStats }
  | { readonly type: 'error'; readonly message: string };
