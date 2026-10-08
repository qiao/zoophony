import { describe, expect, it } from 'vitest';

import { BONE_NAMES } from '../src/models/rig.ts';
import { SCULPT_STEP, decodePacked } from '../src/models/sculpt.ts';
import type { SculptRegion } from '../src/models/sculpt.ts';
import { packShells, packSculpt, sculptConstant } from './build-sculpt.ts';
import type { RawShell } from './build-sculpt.ts';
import { sculptRig } from './sculpt-rig.ts';

/** The regions of the test shells. */
const REGIONS: readonly SculptRegion[] = [
  { color: '#915125', finish: 'fur' },
  { color: '#15110e', finish: 'lacquer' },
];

/** The index of each region name of the test shells. */
const REGION_INDEX = new Map([
  ['fur', 0],
  ['pupil', 1],
]);

/** A closed tetrahedron on the arm, with a blend at one corner, and its mirror image. */
const TETRA: RawShell = {
  name: 'armR',
  vertices: [
    [0.2, 0.5, 0],
    [0.3, 0.5, 0],
    [0.2, 0.6, 0],
    [0.2, 0.5, -0.1],
  ],
  skin: [
    ['upperArmR', 'upperArmR', 0],
    ['upperArmR', 'forearmR', 0.25],
    ['forearmR', 'upperArmR', 0.5],
    ['upperArmR', 'upperArmR', 0],
  ],
  triangles: [
    [0, 2, 1],
    [0, 1, 3],
    [0, 3, 2],
    [1, 2, 3],
  ],
  regions: ['fur', 'fur', 'pupil', 'fur'],
};

describe('packShells', () => {
  it('packs the corners, the skin, and the regions that decodePacked() reads back', () => {
    const mesh = decodePacked(packShells([TETRA], REGION_INDEX), REGIONS);

    expect(mesh.finishes).toEqual(Uint8Array.from([4, 4, 2, 4]));
    for (const [t, triangle] of TETRA.triangles.entries()) {
      for (const [k, vertex] of triangle.entries()) {
        const corner = t * 3 + k;
        for (let axis = 0; axis < 3; axis++) {
          expect(mesh.positions[corner * 3 + axis]).toBeCloseTo(
            TETRA.vertices[vertex]?.[axis] ?? NaN,
            6,
          );
        }
        const [bone = '', blendBone = '', weight = 0] = TETRA.skin[vertex] ?? [];
        expect(mesh.bones[corner]).toBe(BONE_NAMES.findIndex((name) => name === bone));
        expect(mesh.blendBones[corner]).toBe(
          BONE_NAMES.findIndex((name) => name === (weight > 0 ? blendBone : bone)),
        );
        expect(mesh.blendWeights[corner]).toBeCloseTo(weight, 2);
      }
    }
  });

  it('rounds a coordinate the same way on each side of the middle plane', () => {
    // Each x lies half way between two steps, where a plain rounding goes up on both sides.
    const half: RawShell = {
      ...TETRA,
      vertices: TETRA.vertices.map(([x, y, z]) => [x + 0.5 * SCULPT_STEP, y, z]),
    };
    const mirror: RawShell = { ...half, vertices: half.vertices.map(([x, y, z]) => [-x, y, z]) };
    const right = decodePacked(packShells([half], REGION_INDEX), REGIONS);
    const left = decodePacked(packShells([mirror], REGION_INDEX), REGIONS);

    for (let corner = 0; corner < right.bones.length; corner++) {
      expect(left.positions[corner * 3]).toBe(-(right.positions[corner * 3] ?? NaN));
    }
  });

  it('leaves out a triangle with no area after the packing', () => {
    const sliver: RawShell = {
      ...TETRA,
      vertices: [...TETRA.vertices, [0.2 + 0.1 * SCULPT_STEP, 0.5, 0]],
      skin: [...TETRA.skin, ['upperArmR', 'upperArmR', 0]],
      triangles: [...TETRA.triangles, [0, 4, 1]],
      regions: [...TETRA.regions, 'fur'],
    };

    expect(decodePacked(packShells([sliver], REGION_INDEX), REGIONS).finishes).toHaveLength(4);
  });

  it('refuses a bone that is not in the rig, and a weight above 0.5 (design 4.7)', () => {
    const unknown: RawShell = { ...TETRA, skin: [['wing', 'wing', 0], ...TETRA.skin.slice(1)] };
    const heavy: RawShell = {
      ...TETRA,
      skin: [['upperArmR', 'forearmR', 0.6], ...TETRA.skin.slice(1)],
    };

    expect(() => packShells([unknown], REGION_INDEX)).toThrow(/wing/);
    expect(() => packShells([heavy], REGION_INDEX)).toThrow(/0\.6/);
  });
});

describe('packSculpt', () => {
  it('moves the body of each stance with the hips of the rig', () => {
    const rig = sculptRig('fox-red');
    const sculpt = packSculpt(rig, {
      species: 'fox-red',
      regions: { fur: { color: '#915125', finish: 'fur' } },
      body: [{ ...TETRA, regions: TETRA.regions.map(() => 'fur') }],
      stances: { seated: [], standing: [] },
    });

    const [seated, standing] = sculpt.stances;
    expect(sculpt.h).toBe(rig.h);
    expect(seated?.bodyOffset).toEqual([0, 0, 0]);
    expect(standing?.bodyOffset[1]).toBeCloseTo(
      rig.stances.standing.bones.hips[1] - rig.stances.seated.bones.hips[1],
      12,
    );
    expect(standing?.stance).toEqual({ kind: 'standing' });
  });

  it('refuses a finish that is not known', () => {
    const raw = {
      species: 'fox-red',
      regions: { fur: { color: '#915125', finish: 'velvet' } },
      body: [],
      stances: {},
    };

    expect(() => packSculpt(sculptRig('fox-red'), raw)).toThrow(/velvet/);
  });
});

describe('sculptConstant', () => {
  it('names the constant of a sculpt module', () => {
    expect(sculptConstant('fox-red')).toBe('FOX_RED_SCULPT');
  });
});
