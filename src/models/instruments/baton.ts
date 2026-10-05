import { INSTRUMENT_COLORS } from '../colors.ts';
import { basisRotation, transform } from '../math.ts';
import { icosphere } from '../primitives.ts';
import { PieceBuilder, hold, pieceSize } from './piece.ts';
import type { InstrumentModel } from './types.ts';

/** The distance of the tip of the baton from the grip, in meters. With the handle, the baton is 0.40 m long (design 4.6). */
export const BATON_TIP = 0.375;

/**
 * Builds the baton of the conductor (design 4.6): a thin white stick with a round handle. The grip
 * is at the origin, and the stick runs along +x to the tip. In the bind pose, it lies in the
 * hanging right hand and points forward.
 *
 * @returns The model.
 */
export function buildBaton(): InstrumentModel {
  const color = INSTRUMENT_COLORS.baton;
  const piece = new PieceBuilder();
  piece.add(icosphere(0.016, 0), color, transform([0, 0, 0], undefined, [1.6, 1, 1]));
  piece.rod([0.02, 0, 0], [BATON_TIP, 0, 0], 0.003, 4, color);
  const baton = piece.build(
    'baton',
    hold('palmR', [0, 0, -0.07], basisRotation([0, 0, -1], [0, 1, 0])),
  );
  const tip = [BATON_TIP, 0, 0] as const;
  return {
    id: 'baton',
    parent: 'chest',
    pieces: [baton],
    grips: { palmL: null, palmR: { bone: 'baton', at: [0, 0, 0] }, mouth: null, chin: null },
    targets: [{ kind: 'tip', bone: 'baton', from: tip, to: tip, normal: [1, 0, 0], keys: null }],
    size: pieceSize(baton),
  };
}
