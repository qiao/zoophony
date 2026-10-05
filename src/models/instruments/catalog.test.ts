import { describe, expect, it } from 'vitest';

import { INSTRUMENT_COLORS } from '../colors.ts';
import { length } from '../math.ts';
import type { Vec3 } from '../math.ts';
import type { Rgb } from '../mesh.ts';
import { INSTRUMENT_BUDGETS, INSTRUMENT_IDS, buildInstrument } from './catalog.ts';
import { pieceBounds, pieceSize, triangleCount } from './piece.ts';
import type { InstrumentBone, InstrumentId, InstrumentModel } from './types.ts';

/**
 * The main length of each instrument in design 4.6, in meters: the axis of the main piece, and
 * the length along it.
 */
const DESIGN_SIZES = {
  violin: [0, 0.51],
  viola: [0, 0.51 * 1.15],
  cello: [1, 1.2 + 0.2],
  contrabass: [1, 1.6 * (1.2 + 0.2)],
  harp: [1, 1.4],
} as const satisfies Readonly<Record<InstrumentId, readonly [axis: 0 | 1 | 2, meters: number]>>;

/** The bow length of each bowed string in design 4.6, in meters. */
const BOW_LENGTHS = { violin: 0.57, viola: 0.57, cello: 0.63, contrabass: 0.63 } as const;

/** Checks that a point lies in the box of the piece on its bone, with a margin in meters. */
function expectOnPiece(model: InstrumentModel, bone: InstrumentBone, point: Vec3): void {
  const piece = model.pieces.find((p) => p.bone === bone);
  expect(piece, `${model.id}: no piece on ${bone}`).toBeDefined();
  if (!piece) {
    return;
  }
  const { min, max } = pieceBounds(piece);
  const margin = 0.03;
  for (let axis = 0; axis < 3; axis++) {
    expect(point[axis], `${model.id}: point outside the ${bone} piece`).toBeGreaterThanOrEqual(
      (min[axis] ?? 0) - margin,
    );
    expect(point[axis], `${model.id}: point outside the ${bone} piece`).toBeLessThanOrEqual(
      (max[axis] ?? 0) + margin,
    );
  }
}

describe('buildInstrument', () => {
  const models = INSTRUMENT_IDS.map((id) => buildInstrument(id));

  it('keeps each instrument with all its pieces within its budget (design 4.5)', () => {
    for (const model of models) {
      const count = triangleCount(model.pieces);
      expect(count, model.id).toBeGreaterThan(0);
      expect(count, model.id).toBeLessThanOrEqual(INSTRUMENT_BUDGETS[model.id]);
    }
  });

  it('gives each instrument the size of design 4.6', () => {
    for (const model of models) {
      const [axis, meters] = DESIGN_SIZES[model.id];
      expect(model.size[axis], model.id).toBeGreaterThan(meters * 0.98);
      expect(model.size[axis], model.id).toBeLessThan(meters * 1.02);
      const main = model.pieces[0];
      expect(main && pieceSize(main), model.id).toEqual(model.size);
    }
  });

  it('makes the bows of design 4.6', () => {
    for (const id of ['violin', 'viola', 'cello', 'contrabass'] as const) {
      const bow = buildInstrument(id).pieces.find((p) => p.bone === 'bow');
      expect(bow && pieceSize(bow)[0], id).toBeCloseTo(BOW_LENGTHS[id], 2);
    }
  });

  it('puts each piece on its own bone, with the main piece first', () => {
    for (const model of models) {
      const bones = model.pieces.map((p) => p.bone);
      expect(new Set(bones).size, model.id).toBe(bones.length);
      const hasInstrument = bones.includes('instrument');
      expect(bones[0] === 'instrument', model.id).toBe(hasInstrument);
      for (const piece of model.pieces) {
        expect(piece.parts.length, `${model.id} ${piece.bone}`).toBeGreaterThan(0);
      }
    }
  });

  it('puts each grip point on its piece', () => {
    for (const model of models) {
      const grips = Object.values(model.grips).filter((g) => g !== null);
      expect(grips.length, model.id).toBeGreaterThan(0);
      for (const grip of grips) {
        expectOnPiece(model, grip.bone, grip.at);
      }
    }
  });

  it('puts each target on its piece, with a unit normal', () => {
    for (const model of models) {
      for (const target of model.targets) {
        expectOnPiece(model, target.bone, target.from);
        expectOnPiece(model, target.bone, target.to);
        expect(length(target.normal), `${model.id} ${target.kind}`).toBeCloseTo(1, 9);
      }
    }
  });

  it('gives the violin family and the low strings their wood colors (design 4.5)', () => {
    const woodOf = (id: InstrumentId): Rgb | undefined =>
      buildInstrument(id).pieces[0]?.parts[0]?.color;
    expect(woodOf('violin')).toEqual(INSTRUMENT_COLORS.violinWood);
    expect(woodOf('viola')).toEqual(INSTRUMENT_COLORS.violinWood);
    expect(woodOf('cello')).toEqual(INSTRUMENT_COLORS.celloWood);
    expect(woodOf('contrabass')).toEqual(INSTRUMENT_COLORS.celloWood);
  });

  it('holds the violin and the viola under the chin, and stands the low strings on the floor', () => {
    for (const id of ['violin', 'viola'] as const) {
      const model = buildInstrument(id);
      expect(model.parent).toBe('chest');
      expect(model.grips.chin).not.toBeNull();
      expect(model.pieces[0]?.hold.anchor).toBe('head');
    }
    for (const id of ['cello', 'contrabass'] as const) {
      const model = buildInstrument(id);
      expect(model.parent).toBe('root');
      expect(model.grips.chin).toBeNull();
      expect(model.pieces[0]?.hold.anchor).toBe('floor');
      // The end pin tip is the origin, and the instrument stands on it.
      const main = model.pieces[0];
      expect(main && pieceBounds(main).min[1]).toBeCloseTo(0, 9);
    }
  });
});
