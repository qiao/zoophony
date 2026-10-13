import { describe, expect, it } from 'vitest';

import { FINISH_ORDER } from './mesh.ts';
import { PACKED_STEP } from './packed-mesh.ts';
import {
  CORRECTIVE_STEP,
  STUDIO_BONES,
  STUDIO_PARENTS,
  packStudioMesh,
  unpackStudioMesh,
  weightSteps,
} from './studio-format.ts';
import type { StudioTriangle, StudioVertex } from './studio-format.ts';

describe('the bones of a studio body', () => {
  it('lists each parent before its children', () => {
    for (const [i, bone] of STUDIO_BONES.entries()) {
      const parent = STUDIO_PARENTS[bone];
      if (parent) {
        expect(STUDIO_BONES.indexOf(parent), bone).toBeLessThan(i);
      }
    }
  });
});

describe('the packed mesh of a studio body', () => {
  const vertices: StudioVertex[] = [
    { position: [0, 0, 0], skin: [[1, 1]] },
    {
      position: [0.5, -0.25, 1.75],
      skin: [
        [2, 0.5],
        [3, 0.3],
        [4, 0.2],
      ],
    },
    {
      position: [-0.5, 1, -0.125],
      skin: [
        [5, 0.4],
        [6, 0.3],
        [7, 0.2],
        [8, 0.1],
      ],
    },
  ];
  const triangles: StudioTriangle[] = [
    { corners: [0, 1, 2], color: [0.5, 0.25, 0.125], finish: 'matte' },
    { corners: [2, 1, 0], color: [1, 1, 1], finish: 'lacquer' },
    { corners: [1, 2, 0], color: [0.5, 0.25, 0.125], finish: 'matte' },
  ];
  const correctives = [
    [
      [0, 0, 0],
      [0.01, -0.02, 0.003],
      [0, 0, 0],
    ],
  ] as const;

  it('reads back the places, the skins, the triangles, the colors, and the correctives', () => {
    const mesh = unpackStudioMesh(packStudioMesh(vertices, triangles, correctives));

    expect([...mesh.positions]).toEqual([0, 0, 0, 0.5, -0.25, 1.75, -0.5, 1, -0.125]);
    expect([...mesh.joints]).toEqual([1, 0, 0, 0, 2, 3, 4, 0, 5, 6, 7, 8]);
    expect(mesh.weights[0]).toBe(1);
    expect(mesh.weights[4]).toBeCloseTo(0.5, 2);
    expect(mesh.weights[11]).toBeCloseTo(0.1, 2);
    expect([...mesh.corners]).toEqual([0, 1, 2, 2, 1, 0, 1, 2, 0]);
    expect(mesh.colors[0]).toBeCloseTo(0.5, 4);
    expect(mesh.colors[5]).toBeCloseTo(1, 4);
    expect([...mesh.finishes]).toEqual([
      FINISH_ORDER.indexOf('matte'),
      FINISH_ORDER.indexOf('lacquer'),
      FINISH_ORDER.indexOf('matte'),
    ]);
    expect(mesh.correctives).toHaveLength(1);
    expect(mesh.correctives[0]?.[3]).toBeCloseTo(0.01, 6);
    expect(mesh.correctives[0]?.[4]).toBeCloseTo(-0.02, 6);
    expect(mesh.correctives[0]?.[0]).toBe(0);
  });

  it('keeps each weight of a vertex within one step and their sum at 1', () => {
    const mesh = unpackStudioMesh(packStudioMesh(vertices, triangles, correctives));
    for (let v = 0; v < 3; v++) {
      const sum = [0, 1, 2, 3].reduce((s, k) => s + (mesh.weights[v * 4 + k] ?? 0), 0);
      expect(sum).toBeCloseTo(1, 6);
    }
    expect(weightSteps([0.4, 0.3, 0.2, 0.1])).toEqual([102, 77, 51, 25]);
  });

  it('rounds the places and the moves to their steps', () => {
    const near: StudioVertex[] = [{ position: [PACKED_STEP * 0.4, 0, 0], skin: [[0, 1]] }];
    const mesh = unpackStudioMesh(
      packStudioMesh(
        near,
        [{ corners: [0, 0, 0], color: [0, 0, 0], finish: 'matte' }],
        [[[CORRECTIVE_STEP * 0.4, 0, 0]]],
      ),
    );
    expect(mesh.positions[0]).toBe(0);
    expect(mesh.correctives[0]?.[0]).toBe(0);
  });

  it('refuses a vertex with more than four bones, and a triangle with no vertex', () => {
    const many: StudioVertex = {
      position: [0, 0, 0],
      skin: [0, 1, 2, 3, 4].map((bone) => [bone, 0.2] as const),
    };
    expect(() => packStudioMesh([many], [], [])).toThrow(/5 bones/);
    expect(() =>
      packStudioMesh(vertices, [{ corners: [0, 1, 9], color: [0, 0, 0], finish: 'matte' }], []),
    ).toThrow(/vertex 9/);
  });
});
