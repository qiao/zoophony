import { MathUtils, Quaternion, Vector3 } from 'three';
import { INSTRUMENT_COLORS, SCENE_COLORS } from '../colors.ts';
import { transform } from '../mesh.ts';
import { toQuat, toVec3 } from '../tuples.ts';
import type { Vec3 } from '../tuples.ts';
import { box } from '../primitives.ts';
import { PieceBuilder, hold, pieceSize } from './piece.ts';
import type { InstrumentModel } from './types.ts';

/**
 * The sizes of the choir folder, in meters (design 4.6). In the folder axes, the spine runs along
 * y through the origin, and the two covers open to the singer at +z.
 */
export const CHOIR_FOLDER = {
  /** The size of one cover. */
  width: 0.2,
  height: 0.27,
  /** The angle between each cover and the plane x-y. The open folder is a flat V. */
  open: 15 * MathUtils.DEG2RAD,
} as const;

/**
 * Builds the choir folder (design 4.6). The singer holds it open in both hands in front of the
 * chest. The pages have the color of the sheet music on the stands.
 *
 * @returns The model.
 */
export function buildChoirFolder(): InstrumentModel {
  const f = CHOIR_FOLDER;
  const piece = new PieceBuilder();
  const outer: Vec3[] = [];
  for (const side of [-1, 1]) {
    // Each cover turns around the spine, so that its outer edge comes to the singer.
    const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -side * f.open);
    const rotation = toQuat(turn);
    const middle = new Vector3((side * f.width) / 2, 0, 0).applyQuaternion(turn);
    piece.add(
      box(f.width, f.height, 0.006),
      INSTRUMENT_COLORS.folder,
      transform(toVec3(middle), rotation),
    );
    const page = new Vector3((side * (f.width - 0.02)) / 2, 0, 0.005).applyQuaternion(turn);
    piece.add(
      box(f.width - 0.03, f.height - 0.03, 0.004),
      SCENE_COLORS.sheet,
      transform(toVec3(page), rotation),
    );
    outer.push(
      toVec3(new Vector3(side * (f.width - 0.03), -f.height / 4, -0.02).applyQuaternion(turn)),
    );
  }
  // The folder is 1.0 H below the head center and 0.75 H in front of it. It leans back 35°, so
  // that the pages face the eyes.
  const instrument = piece.build(
    'instrument',
    hold(
      'head',
      [0, -1.0, -0.75],
      toQuat(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -35 * MathUtils.DEG2RAD)),
    ),
  );
  const [left = [0, 0, 0], right = [0, 0, 0]] = outer;
  return {
    id: 'choir-folder',
    parent: 'chest',
    pieces: [instrument],
    grips: {
      palmL: { bone: 'instrument', at: left },
      palmR: { bone: 'instrument', at: right },
      mouth: null,
      chin: null,
    },
    targets: [],
    size: pieceSize(instrument),
  };
}
