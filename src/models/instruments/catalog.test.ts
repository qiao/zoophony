import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { INSTRUMENT_COLORS } from '../colors.ts';
import type { Vec3 } from '../tuples.ts';
import type { Rgb } from '../mesh.ts';
import { INSTRUMENT_IDS, buildInstrument } from './catalog.ts';
import { pieceBounds, pieceSize, triangleCount } from './piece.ts';
import { INSTRUMENT_BUDGETS } from './test-budgets.ts';
import type { InstrumentBone, InstrumentId, InstrumentModel } from './types.ts';

/**
 * The main length of each instrument model, in meters: the axis of the main piece, and the length
 * along it. The holds of design 4.6 and the layout depend on these lengths.
 */
const DESIGN_SIZES = {
  violin: [0, 0.51],
  viola: [0, 0.51 * 1.15],
  cello: [1, 1.2 + 0.2],
  contrabass: [1, 1.6 * (1.2 + 0.2)],
  harp: [1, 1.4],
  piano: [2, 2.0],
  'choir-folder': [1, 0.27],
  flute: [0, 0.57],
  oboe: [0, 0.55],
  clarinet: [0, 0.57],
  bassoon: [1, 1.15],
  horn: [1, 0.59],
  trumpet: [0, 0.41],
  trombone: [0, 0.95],
  tuba: [1, 0.95],
  timpani: [1, 0.72],
  'bass-drum': [1, 0.87],
  'snare-drum': [1, 0.4],
  cymbals: [0, 0.4],
  'small-percussion': [1, 0.49],
  xylophone: [0, 0.78],
  baton: [0, 0.51],
} as const satisfies Readonly<Record<InstrumentId, readonly [axis: 0 | 1 | 2, meters: number]>>;

/** The bow length of each bowed string, in meters. */
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

  it('gives each instrument its main length', () => {
    for (const model of models) {
      const [axis, meters] = DESIGN_SIZES[model.id];
      expect(model.size[axis], model.id).toBeGreaterThan(meters * 0.98);
      expect(model.size[axis], model.id).toBeLessThan(meters * 1.02);
      const main = model.pieces[0];
      expect(main && pieceSize(main), model.id).toEqual(model.size);
    }
  });

  it('makes the bows of the bowed strings', () => {
    for (const id of ['violin', 'viola', 'cello', 'contrabass'] as const) {
      const bow = buildInstrument(id).pieces.find((p) => p.bone === 'bow');
      expect(bow && pieceSize(bow)[0], id).toBeCloseTo(BOW_LENGTHS[id], 2);
    }
  });

  it('scales the violin and its bow by the violin scale of the species (design 4.6)', () => {
    const scaled = buildInstrument('violin', 4, 0.3);
    const [violin, bow] = ['instrument', 'bow'].map((bone) => {
      const piece = scaled.pieces.find((p) => p.bone === bone);
      return piece ? pieceSize(piece)[0] : NaN;
    });
    expect(scaled.size[0]).toBeCloseTo(0.3 * (buildInstrument('violin').size[0] ?? NaN), 6);
    expect(violin).toBeCloseTo(scaled.size[0] ?? NaN, 6);
    expect(bow).toBeCloseTo(0.3 * BOW_LENGTHS.violin, 2);
    // The other instruments ignore it.
    expect(buildInstrument('viola', 4, 0.3).size).toEqual(buildInstrument('viola').size);
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
        // The slide line ends where the slide brace is in the seventh position.
        if (target.kind !== 'slide') {
          expectOnPiece(model, target.bone, target.to);
        }
        expect(new Vector3(...target.normal).length(), `${model.id} ${target.kind}`).toBeCloseTo(
          1,
          9,
        );
      }
    }
  });

  it('gives the violin family and the low strings their varnished wood (design 4.5)', () => {
    const woodOf = (id: InstrumentId): readonly (readonly [Rgb, string])[] =>
      (buildInstrument(id).pieces[0]?.parts ?? []).map((part) => [part.color, part.finish]);
    for (const [id, top, wood] of [
      ['violin', INSTRUMENT_COLORS.violinTop, INSTRUMENT_COLORS.violinWood],
      ['viola', INSTRUMENT_COLORS.violinTop, INSTRUMENT_COLORS.violinWood],
      ['cello', INSTRUMENT_COLORS.celloTop, INSTRUMENT_COLORS.celloWood],
      ['contrabass', INSTRUMENT_COLORS.celloTop, INSTRUMENT_COLORS.celloWood],
    ] as const) {
      // The arched top plate, then the edges and the ribs of the body.
      expect(woodOf(id).slice(0, 2), id).toEqual([
        [top, 'varnish'],
        [wood, 'varnish'],
      ]);
    }
  });

  it('holds the violin and the viola under the chin, and the low strings on the floor', () => {
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
