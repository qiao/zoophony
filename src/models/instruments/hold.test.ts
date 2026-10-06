import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { buildBiped, seated } from '../biped.ts';
import { IDENTITY, toQuat } from '../tuples.ts';
import { FINISH_ORDER, MeshBuilder } from '../mesh.ts';
import { CHAIR } from '../props.ts';
import { boneIndex } from '../rig.ts';
import { SPECIES } from '../species.ts';
import { buildInstrument } from './catalog.ts';
import { attachInstrument, holdInstrument, placePoint } from './hold.ts';
import type { HoldBody } from './hold.ts';
import { PieceBuilder, hold } from './piece.ts';
import type { InstrumentModel } from './types.ts';

/** Builds the seated rabbit of step 3 and its hold points. */
function rabbit(builder = new MeshBuilder()): HoldBody {
  return buildBiped(builder, SPECIES.rabbit, seated(CHAIR.seatHeight));
}

describe('attachInstrument', () => {
  it('puts each piece on its bone with the finish of its parts', () => {
    const builder = new MeshBuilder();
    const body = rabbit();
    const model = buildInstrument('cello');
    const placed = attachInstrument(builder, model, body);
    const mesh = builder.build();
    const triangles = model.pieces.flatMap((piece) =>
      piece.parts.flatMap((part) =>
        Array.from({ length: part.corners.length / 9 }, () => [piece.bone, part.finish] as const),
      ),
    );
    expect(mesh.bones.length / 3).toBe(triangles.length);
    for (const [t, [bone, finish]] of triangles.entries()) {
      expect(mesh.bones[t * 3]).toBe(boneIndex(bone));
      expect(mesh.finishes[t]).toBe(FINISH_ORDER.indexOf(finish));
    }
    expect([...placed.bones.keys()]).toEqual(['instrument', 'bow']);
  });
});

describe('holdInstrument', () => {
  const body = rabbit();

  it('puts the end pin of the cello on the floor in front of the player', () => {
    const [cello] = holdInstrument(buildInstrument('cello'), body);
    const pin = cello?.at.position ?? [NaN, NaN, NaN];
    expect(pin[1]).toBe(0);
    expect(pin[2]).toBeLessThan(-0.5);
  });

  it('puts the bow grip in the hanging right hand', () => {
    const placed = holdInstrument(buildInstrument('viola'), body);
    const grip = placePoint(placed, { bone: 'bow', at: [0, 0, 0] });
    expect(new Vector3(...grip).distanceTo(new Vector3(...body.palmR))).toBeCloseTo(
      0.07 * body.headHeight,
      9,
    );
  });

  it('places a piece on the instrument in the axes of the instrument piece', () => {
    const turn = toQuat(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2));
    const main = new PieceBuilder().build('instrument', hold('mouth', [0, 0, -1], turn));
    const slide = new PieceBuilder().build('slide', hold('instrument', [0, 0, 0], turn, [1, 0, 0]));
    const model: InstrumentModel = {
      ...buildInstrument('violin'),
      pieces: [slide, main],
    };
    const [placedSlide, placedMain] = holdInstrument(model, body);
    const origin = new Vector3(...body.mouth).add(new Vector3(0, 0, -body.headHeight));
    expect(placedMain?.at.position).toEqual(origin.toArray());
    // The +x axis of the instrument turns to -z, so the slide is 1 m in front of the origin.
    const slideAt = new Vector3(...(placedSlide?.at.position ?? [NaN, NaN, NaN]));
    expect(slideAt.distanceTo(origin.clone().add(new Vector3(0, 0, -1)))).toBeLessThan(1e-12);
    const slideX = new Vector3(1, 0, 0).applyQuaternion(
      new Quaternion(...(placedSlide?.at.rotation ?? IDENTITY)),
    );
    expect(slideX.distanceTo(new Vector3(-1, 0, 0))).toBeLessThan(1e-12);
  });

  it('refuses a piece on the instrument when the model has no instrument piece', () => {
    const slide = new PieceBuilder().build('slide', hold('instrument'));
    const model: InstrumentModel = { ...buildInstrument('violin'), pieces: [slide] };
    expect(() => holdInstrument(model, body)).toThrow(/no instrument piece/);
  });

  it('refuses an instrument piece on the instrument', () => {
    const main = new PieceBuilder().build('instrument', hold('instrument'));
    const model: InstrumentModel = { ...buildInstrument('violin'), pieces: [main] };
    expect(() => holdInstrument(model, body)).toThrow(/cannot follow itself/);
  });

  it('refuses a point on a bone with no piece', () => {
    const placed = holdInstrument(buildInstrument('violin'), body);
    expect(() => placePoint(placed, { bone: 'slide', at: [0, 0, 0] })).toThrow(/slide/);
  });
});
