import { describe, expect, it } from 'vitest';

import { buildBiped } from './biped.ts';
import { seated } from './body-frame.ts';
import type { Stance } from './body-frame.ts';
import { MeshBuilder } from './mesh.ts';
import { boneIndex } from './rig.ts';
import { decodeSculpt, placeSculpt } from './sculpt.ts';
import { FOX_RED_SCULPT } from './sculpts/fox-red.ts';
import { SPECIES } from './species.ts';

/** The head height of the red fox, in meters. */
const H = 0.38;

describe('placeSculpt', () => {
  it('fits the seated legs to each seat with a drop of 0.35 m to the feet', () => {
    const chair = placeSculpt(FOX_RED_SCULPT, H, seated(0.35, 0, 0.02));
    const highStool = placeSculpt(FOX_RED_SCULPT, H, seated(0.7, 0.35));

    expect(chair?.legs.stance).toEqual({ kind: 'seated', seatHeight: 0.35 });
    expect(chair?.offset).toEqual([0, 0, -0.02]);
    expect(highStool?.legs.stance).toEqual({ kind: 'seated', seatHeight: 0.35 });
    expect(highStool?.offset).toEqual([0, 0.35, -0]);
  });

  it('fits the standing legs to a standing body', () => {
    const standing = placeSculpt(FOX_RED_SCULPT, H, { kind: 'standing' });

    expect(standing?.legs.stance).toEqual({ kind: 'standing' });
    expect(standing?.offset).toEqual([0, 0, 0]);
  });

  it('fits no legs to the bench of the piano, or to a body of another size', () => {
    expect(placeSculpt(FOX_RED_SCULPT, H, seated(0.45))).toBeNull();
    expect(placeSculpt(FOX_RED_SCULPT, 1.1 * H, seated(0.35))).toBeNull();
  });
});

describe('the sculpt of the red fox (design 4.4)', () => {
  const stances: readonly Stance[] = [seated(0.35), { kind: 'standing' }];

  it('was built around the bones of the current skeleton', () => {
    // A change of the skeleton makes the sculpt out of date: `node tools/build-sculpt.ts
    // fox-red` builds it again around the new bones.
    for (const [i, stance] of stances.entries()) {
      const body = buildBiped(new MeshBuilder(), SPECIES['fox-red'], stance);
      const legs = FOX_RED_SCULPT.stances[i];
      for (const [name, place] of Object.entries(body.positions)) {
        const built = legs?.bones[name] ?? [NaN, NaN, NaN];
        for (let axis = 0; axis < 3; axis++) {
          expect(built[axis], `${stance.kind} ${name}`).toBeCloseTo(place[axis] ?? NaN, 5);
        }
      }
    }
  });

  it('gives each corner at most two bones, a parent and its child, with a weight to 0.5', () => {
    for (const legs of FOX_RED_SCULPT.stances) {
      const mesh = decodeSculpt(FOX_RED_SCULPT, legs);
      for (let corner = 0; corner < mesh.bones.length; corner++) {
        const weight = mesh.blendWeights[corner] ?? NaN;
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(0.5);
        if (weight === 0) {
          expect(mesh.blendBones[corner]).toBe(mesh.bones[corner]);
        }
      }
    }
  });

  it('puts the eyes, the hands, and the feet on their bones as rigid parts (design 4.7)', () => {
    const [legs] = FOX_RED_SCULPT.stances;
    if (!legs) {
      throw new Error('The sculpt has no stance.');
    }

    const mesh = decodeSculpt(FOX_RED_SCULPT, legs);
    const rigid = new Set(
      (['eyeL', 'eyeR', 'handL', 'handR', 'fingersL', 'fingersR', 'footL', 'footR'] as const).map(
        boneIndex,
      ),
    );
    const found = new Set<number>();
    for (let corner = 0; corner < mesh.bones.length; corner++) {
      const bone = mesh.bones[corner] ?? -1;
      if (rigid.has(bone)) {
        found.add(bone);
        expect(mesh.blendWeights[corner]).toBe(0);
      }
    }
    expect(found).toEqual(rigid);
  });

  it('gives the body of a seated fox the mesh of the sculpt, moved forward on the chair', () => {
    const forward = 0.03;
    const builder = new MeshBuilder();
    buildBiped(builder, SPECIES['fox-red'], seated(0.35, 0, forward));
    const mesh = builder.build();
    const legs = FOX_RED_SCULPT.stances[0];
    const sculpt = legs ? decodeSculpt(FOX_RED_SCULPT, legs) : null;

    expect(mesh.positions.length).toBe(sculpt?.positions.length);
    expect(mesh.positions[2]).toBeCloseTo((sculpt?.positions[2] ?? NaN) - forward, 6);
  });

  it('keeps the parametric body on the bench of the piano', () => {
    const builder = new MeshBuilder();
    buildBiped(builder, SPECIES['fox-red'], seated(0.45));
    const { sculpt: _sculpt, ...parametric } = SPECIES['fox-red'];
    const plain = new MeshBuilder();
    buildBiped(plain, parametric, seated(0.45));

    expect(builder.build().positions).toEqual(plain.build().positions);
  });
});
