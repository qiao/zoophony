import { INSTRUMENT_COLORS } from '../colors.ts';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { transform } from '../mesh.ts';
import { toQuat } from '../tuples.ts';
import { icosphere } from '../primitives.ts';
import { PieceBuilder, hold, pieceSize } from './piece.ts';
import type { InstrumentModel } from './types.ts';

/**
 * The distance of the tip of the baton from the grip, in meters. With the handle, the baton is
 * 0.51 m long (design 4.6). The first baton of 0.40 m looked short (UX audit 2026-10-05, AM1).
 */
export const BATON_TIP = 0.49;

/**
 * The radii of the stick of the baton at the grip and at the tip, in meters. The baton of
 * `bear-views.png` is a thick stick, about 2 cm at the paw. The first stick of 3 mm was a thin line
 * in the sheet page and on the stage.
 */
const BATON_RADII = [0.008, 0.0045] as const;

/**
 * The bent tip of the baton: its length in meters, and its bend toward the top side of the stick,
 * in radians. The tips of the batons of `bear-views.png` bend a little back, toward the bear. The
 * tip point of the motion stays on the axis of the stick, 1.7 cm from the bent end.
 */
const BATON_BEND = { length: 0.05, angle: (20 * Math.PI) / 180 } as const;

/**
 * Builds the baton of the conductor (design 4.6): a white stick that tapers to a tip that bends a
 * little, with a round handle. The grip is at the origin, and the stick runs along +x to the tip. In the bind
 * pose, it lies in the hanging right hand and points forward.
 *
 * @returns The model.
 */
export function buildBaton(): InstrumentModel {
  const color = INSTRUMENT_COLORS.baton;
  const piece = new PieceBuilder();
  piece.add(icosphere(0.016, 0), color, transform([0, 0, 0], undefined, [1.6, 1, 1]));
  const [gripRadius, tipRadius] = BATON_RADII;
  const bendAt = BATON_TIP - BATON_BEND.length;
  const bendRadius = gripRadius + ((tipRadius - gripRadius) * (bendAt - 0.02)) / (BATON_TIP - 0.02);
  piece.taper([0.02, 0, 0], [bendAt, 0, 0], gripRadius, bendRadius, 6, color);
  piece.taper(
    [bendAt, 0, 0],
    [
      bendAt + BATON_BEND.length * Math.cos(BATON_BEND.angle),
      BATON_BEND.length * Math.sin(BATON_BEND.angle),
      0,
    ],
    bendRadius,
    tipRadius,
    6,
    color,
  );
  // The x axis of the baton turns to -z, and its y axis stays up.
  const xAxis = new Vector3(0, 0, -1);
  const yAxis = new Vector3(0, 1, 0);
  const turn = new Quaternion().setFromRotationMatrix(
    new Matrix4().makeBasis(xAxis, yAxis, new Vector3().crossVectors(xAxis, yAxis)),
  );
  const baton = piece.build('baton', hold('palmR', [0, 0, -0.07], toQuat(turn)));
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
