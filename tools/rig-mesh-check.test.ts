import { describe, expect, it } from 'vitest';

import { STUDIO_BODIES } from '../src/models/studio-body.ts';
import type { StudioMesh } from '../src/models/studio-format.ts';
import type { Vec3 } from '../src/models/tuples.ts';
import {
  LIMB_JOINTS,
  objVertices,
  standingError,
  thinFaces,
  triangleLine,
} from './rig-mesh-check.ts';
import type { ThinRule } from './rig-mesh-check.ts';
import { STUDIO_TRIANGLE_BUDGET } from './studio-budgets.ts';

/** The rule of the test: a corner below 10°, an edge of 0.1 u or more, and 0.05 u to the joint. */
const RULE: ThinRule = { angle: 10, length: 0.1, near: 0.05 };

/**
 * Makes a mesh of triangles from their corners.
 *
 * @param triangles The three corners of each triangle.
 * @returns The places and the corners of the mesh.
 */
function mesh(
  triangles: readonly (readonly [Vec3, Vec3, Vec3])[],
): Pick<StudioMesh, 'positions' | 'corners'> {
  return {
    positions: new Float32Array(triangles.flat(2)),
    corners: new Uint32Array(triangles.flatMap((_, t) => [t * 3, t * 3 + 1, t * 3 + 2])),
  };
}

describe('thinFaces', () => {
  // The left elbow at (0.3, 1, 0), and the right knee at (-0.1, 0.4, 0).
  const heads = { forearm_L: [0.3, 1, 0], shin_R: [-0.1, 0.4, 0] } satisfies Record<string, Vec3>;

  it('lists a long thin face across a joint, at the nearest joint', () => {
    const faces = thinFaces(
      mesh([
        // 0: 0.2 m long and 0.01 m wide, across the elbow.
        [
          [0.2, 1.01, 0],
          [0.4, 1.01, 0],
          [0.3, 1.02, 0],
        ],
        // 1: a fat face across the elbow.
        [
          [0.2, 0.97, 0],
          [0.4, 0.97, 0],
          [0.3, 1.1, 0],
        ],
        // 2: a thin face far from each joint.
        [
          [1, 2, 0],
          [1.2, 2, 0],
          [1.1, 2.01, 0],
        ],
        // 3: a short thin face at the knee.
        [
          [-0.12, 0.4, 0],
          [-0.08, 0.4, 0],
          [-0.1, 0.401, 0],
        ],
      ]),
      heads,
      RULE,
      1,
    );

    expect(faces.map((face) => [face.face, face.bone])).toEqual([[0, 'forearm_L']]);
    expect(faces[0]?.length).toBeCloseTo(0.2, 6);
    expect(faces[0]?.distance).toBeCloseTo(0.01, 6);
    expect(faces[0]?.angle).toBeLessThan(10);
  });

  it('reads the lengths of the rule in units of the studio', () => {
    // At 0.5 m for each unit, the rule wants an edge of 0.05 m and a joint within 0.025 m.
    const short = mesh([
      [
        [0.27, 1.005, 0],
        [0.33, 1.005, 0],
        [0.3, 1.008, 0],
      ],
    ]);
    expect(thinFaces(short, heads, RULE, 1)).toEqual([]);
    expect(thinFaces(short, heads, RULE, 0.5).map((face) => face.face)).toEqual([0]);
  });

  it('looks at the joints of the arms and the legs of the studio bodies', () => {
    const body = STUDIO_BODIES['studio-rabbit'];
    for (const [bone] of LIMB_JOINTS) {
      expect(body.heads[`${bone}_L`]).toBeDefined();
    }
  });
});

describe('triangleLine', () => {
  it('passes a rig at the budget of a studio body, and stops a rig above it', () => {
    expect(triangleLine(STUDIO_TRIANGLE_BUDGET)).toContain(
      `of the budget of ${STUDIO_TRIANGLE_BUDGET}`,
    );
    expect(() => triangleLine(STUDIO_TRIANGLE_BUDGET + 1)).toThrow('the check stops');
  });
});

describe('the standing check', () => {
  it('turns the source of the studio axes into the model axes, in meters', () => {
    const [v] = objVertices('# source\nv 0.1 0.2 0.3\nf 1 1 1\n', 2);
    expect(v?.toArray()).toEqual([-0.2, 0.4, -0.6]);
  });

  it('refuses a body that does not stand', () => {
    expect(() => standingError(new Uint8Array(), STUDIO_BODIES['studio-bear'], '')).toThrow(
      'does not stand',
    );
  });
});
