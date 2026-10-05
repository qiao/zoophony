import { describe, expect, it } from 'vitest';

import { buildBiped } from '../biped.ts';
import { IDENTITY, add, axisAngle, length, rotate, sub } from '../math.ts';
import type { Vec3 } from '../math.ts';
import { MeshBuilder } from '../mesh.ts';
import { buildPlayer } from '../player.ts';
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
  const body = buildBiped(builder, SPECIES.rabbit, CHAIR.seatHeight);
  const h = body.headHeight;
  return { ...body, mouth: add(body.headCenter, [0, -0.25 * h, -0.45 * h]) };
}

describe('attachInstrument', () => {
  it('gives the violin and the bow of step 3 at the same place (design 4.6)', () => {
    const builder = new MeshBuilder();
    const body = rabbit(builder);
    const placed = attachInstrument(builder, buildInstrument('violin'), body);
    const mesh = builder.build();
    const step3 = buildPlayer('rabbit', 'violin');

    expect(mesh.positions).toHaveLength(step3.mesh.positions.length);
    for (let i = 0; i < mesh.positions.length; i++) {
      expect(mesh.positions[i]).toBeCloseTo(step3.mesh.positions[i] ?? NaN, 5);
    }
    expect([...mesh.bones]).toEqual([...step3.mesh.bones]);
    expect([...mesh.colors]).toEqual([...step3.mesh.colors]);
    for (const bone of ['instrument', 'bow'] as const) {
      const at = placed.bones.get(bone) ?? [NaN, NaN, NaN];
      const step3At = step3.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0];
      expect(length(sub(at, step3At))).toBeLessThan(1e-9);
    }
  });

  it('puts each piece on its bone with the color and the group of its parts', () => {
    const builder = new MeshBuilder();
    const body = rabbit();
    const model = buildInstrument('violin');
    const placed = attachInstrument(builder, model, body);
    const mesh = builder.build();
    const triangles = model.pieces.flatMap((piece) =>
      piece.parts.flatMap((part) =>
        Array.from({ length: part.corners.length / 9 }, () => piece.bone),
      ),
    );
    expect(mesh.bones.length / 3).toBe(triangles.length);
    for (const [t, bone] of triangles.entries()) {
      expect(mesh.bones[t * 3]).toBe(boneIndex(bone));
    }
    expect([...placed.bones.keys()]).toEqual(['instrument', 'bow']);
  });
});

describe('holdInstrument', () => {
  const body = rabbit();

  it('puts the bow grip in the hanging right hand', () => {
    const placed = holdInstrument(buildInstrument('violin'), body);
    const grip = placePoint(placed, { bone: 'bow', at: [0, 0, 0] });
    expect(length(sub(grip, body.palmR))).toBeCloseTo(0.07 * body.headHeight, 9);
  });

  it('places a piece on the instrument in the axes of the instrument piece', () => {
    const turn = axisAngle([0, 1, 0], Math.PI / 2);
    const main = new PieceBuilder().build('instrument', hold('mouth', [0, 0, -1], turn));
    const slide = new PieceBuilder().build('slide', hold('instrument', [0, 0, 0], turn, [1, 0, 0]));
    const model: InstrumentModel = {
      ...buildInstrument('violin'),
      pieces: [slide, main],
    };
    const [placedSlide, placedMain] = holdInstrument(model, body);
    const origin: Vec3 = add(body.mouth, [0, 0, -body.headHeight]);
    expect(placedMain?.at.position).toEqual(origin);
    // The +x axis of the instrument turns to -z, so the slide is 1 m in front of the origin.
    const slideAt = placedSlide?.at.position ?? [NaN, NaN, NaN];
    expect(length(sub(slideAt, add(origin, [0, 0, -1])))).toBeLessThan(1e-12);
    const slideX = rotate(placedSlide?.at.rotation ?? IDENTITY, [1, 0, 0]);
    expect(length(sub(slideX, [-1, 0, 0]))).toBeLessThan(1e-12);
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
