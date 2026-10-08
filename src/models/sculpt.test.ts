import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { buildBiped } from './biped.ts';
import { seated } from './body-frame.ts';
import type { Stance } from './body-frame.ts';
import { MeshBuilder } from './mesh.ts';
import type { MeshData } from './mesh.ts';
import { boneIndex, makeSkeleton } from './rig.ts';
import { proportionsOf } from './proportions.ts';
import { decodeSculpt, placeSculpt } from './sculpt.ts';
import type { SculptLegs } from './sculpt.ts';
import { FOX_RED_SCULPT } from './sculpts/fox-red.ts';
import { SPECIES } from './species.ts';
import type { SpeciesParams } from './species.ts';
import { joinsAtMostOneJoint } from './test-body.ts';

/** The head height of the red fox, in meters, from its skeleton. */
const H = proportionsOf(SPECIES['fox-red']).headHeight;

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

/** The most triangles of a body (design 4.4, 4.5). */
const BODY_BUDGET = 2600;

/**
 * Gives the stance of a body that the legs of a sculpt fit.
 *
 * @param legs The legs of one stance of a sculpt.
 * @returns The stance.
 */
function stanceOf(legs: SculptLegs): Stance {
  return legs.stance.kind === 'seated' ? seated(legs.stance.seatHeight) : { kind: 'standing' };
}

/** Each species with a sculpt: its id, its parameters, and its sculpt. */
const SCULPTED = Object.entries(SPECIES).flatMap(([id, value]) => {
  const params: SpeciesParams = value;
  return params.sculpt ? [{ id, params, sculpt: params.sculpt }] : [];
});

/** The parent of each bone, as an index in `BONE_NAMES`, or -1 for the root. */
const PARENTS = (() => {
  const body = buildBiped(new MeshBuilder(), SPECIES.rabbit, seated(0.35));
  const at = body.headCenter;
  const skeleton = makeSkeleton(
    { ...body.positions, instrument: at, bow: at, malletL: at, malletR: at, baton: at, slide: at },
    'chest',
  );
  return skeleton.parents;
})();

/**
 * Counts the open edges of a mesh: for each directed edge from one corner position to the next,
 * the uses of the edge that the reverse edge does not match. A closed surface, or a set of closed
 * surfaces, has none.
 *
 * @param mesh The mesh.
 * @returns The number of open edges.
 */
function openEdges(mesh: MeshData): number {
  const key = (corner: number): string =>
    [0, 1, 2].map((axis) => mesh.positions[corner * 3 + axis]).join(',');
  const uses = new Map<string, number>();
  for (let t = 0; t < mesh.bones.length / 3; t++) {
    for (let k = 0; k < 3; k++) {
      const edge = `${key(t * 3 + k)}>${key(t * 3 + ((k + 1) % 3))}`;
      uses.set(edge, (uses.get(edge) ?? 0) + 1);
    }
  }

  let open = 0;
  for (const [edge, count] of uses) {
    const [from = '', to = ''] = edge.split('>');
    open += Math.max(0, count - (uses.get(`${to}>${from}`) ?? 0));
  }
  return open;
}

/**
 * Gives the corners of one triangle of a mesh.
 *
 * @param mesh The mesh.
 * @param t The triangle.
 * @returns The three corners.
 */
function cornersOf(mesh: MeshData, t: number): [Vector3, Vector3, Vector3] {
  const at = (k: number): Vector3 => new Vector3().fromArray(mesh.positions, (t * 3 + k) * 3);
  return [at(0), at(1), at(2)];
}

describe('openEdges', () => {
  it('finds no open edge on a closed tetrahedron, and three when a face is missing', () => {
    const faces = [
      [0, 2, 1],
      [0, 1, 3],
      [0, 3, 2],
      [1, 2, 3],
    ];
    const points = [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const meshOf = (count: number): MeshData => ({
      positions: Float32Array.from(
        faces.slice(0, count).flatMap((face) => face.flatMap((v) => points[v] ?? [])),
      ),
      colors: new Float32Array(count * 9),
      bones: new Uint8Array(count * 3),
      blendBones: new Uint8Array(count * 3),
      blendWeights: new Float32Array(count * 3),
      finishes: new Uint8Array(count),
      fillers: new Uint8Array(count),
    });

    expect(openEdges(meshOf(4))).toBe(0);
    expect(openEdges(meshOf(3))).toBe(3);
  });
});

describe('each sculpt (design 4.4)', () => {
  it('has a sculpt for the red fox at least', () => {
    expect(SCULPTED.map(({ id }) => id)).toContain('fox-red');
  });

  for (const { id, params, sculpt } of SCULPTED) {
    describe(id, () => {
      it('was built around the bones of the current skeleton, in each stance', () => {
        // A change of the skeleton makes the sculpt out of date: `pnpm sculpt <species>` builds
        // it again around the new bones.
        // The first legs sit on a seat of 0.35 m, and the last legs stand. The legs of the bench
        // of the piano can come between them (design 4.4).
        expect(sculpt.stances[0]?.stance).toEqual({ kind: 'seated', seatHeight: 0.35 });
        expect(sculpt.stances.at(-1)?.stance).toEqual({ kind: 'standing' });
        for (const legs of sculpt.stances) {
          const stance = stanceOf(legs);
          const body = buildBiped(new MeshBuilder(), params, stance);
          expect(sculpt.h).toBeCloseTo(body.headHeight, 9);
          for (const [name, place] of Object.entries(body.positions)) {
            const built = legs.bones[name] ?? [NaN, NaN, NaN];
            for (let axis = 0; axis < 3; axis++) {
              expect(built[axis], `${stance.kind} ${name}`).toBeCloseTo(place[axis] ?? NaN, 5);
            }
          }
        }
      });

      it('has the current colors of the species', () => {
        const colors = sculpt.regions.map((region) => region.color);

        expect(colors).toContain(params.colors.fur);
        expect(colors).toContain(params.colors.belly);
        expect(colors).toContain(params.eyes.iris ?? '#000000');
        if (params.accentParts.length > 0) {
          expect(colors).toContain(params.colors.accent);
        }
      });

      for (const [i, legs] of sculpt.stances.entries()) {
        const mesh = decodeSculpt(sculpt, legs);
        const kind =
          legs.stance.kind === 'seated' ? `seated (${legs.stance.seatHeight} m)` : 'standing';

        it(`keeps the ${kind} body within ${BODY_BUDGET} triangles`, () => {
          expect(mesh.bones.length / 3).toBeLessThanOrEqual(BODY_BUDGET);
        });

        it(`decodes the ${kind} body to closed shells of finite triangles that face out`, () => {
          let volume = 0;
          for (let t = 0; t < mesh.bones.length / 3; t++) {
            const [a, b, c] = cornersOf(mesh, t);
            const normal = new Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
            expect([a, b, c].every((p) => p.toArray().every(Number.isFinite))).toBe(true);
            expect(normal.length(), `triangle ${t}`).toBeGreaterThan(0);
            volume += a.dot(new Vector3().crossVectors(b, c)) / 6;
          }

          expect(openEdges(mesh)).toBe(0);
          expect(volume).toBeGreaterThan(0);
        });

        it(`gives each ${kind} corner a bone, or a bone and its parent or child`, () => {
          for (let corner = 0; corner < mesh.bones.length; corner++) {
            const bone = mesh.bones[corner] ?? -1;
            const blendBone = mesh.blendBones[corner] ?? -1;
            const weight = mesh.blendWeights[corner] ?? NaN;
            expect(weight).toBeGreaterThanOrEqual(0);
            expect(weight).toBeLessThanOrEqual(0.5);
            if (weight === 0) {
              expect(blendBone).toBe(bone);
            } else {
              expect(PARENTS[bone] === blendBone || PARENTS[blendBone] === bone).toBe(true);
            }
          }
          for (let t = 0; t < mesh.bones.length / 3; t++) {
            expect(joinsAtMostOneJoint(mesh, t), `triangle ${t}`).toBe(true);
          }
        });

        if (i === 0) {
          it('puts the eyes, the hands, and the feet on their bones as rigid parts (4.7)', () => {
            const rigid = new Set(
              (
                [
                  'eyeL',
                  'eyeR',
                  'handL',
                  'handR',
                  'fingersL',
                  'fingersR',
                  'footL',
                  'footR',
                ] as const
              ).map(boneIndex),
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
        }
      }
    });
  }
});

describe('the sculpt of the red fox (design 4.4)', () => {
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
