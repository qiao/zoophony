import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { buildBiped } from './biped.ts';
import { seated } from './body-frame.ts';
import { LIMB_BULGE } from './body-parts.ts';
import { FOOT } from './legs.ts';
import { toVec3 } from './tuples.ts';
import { MeshBuilder } from './mesh.ts';
import { SPECIES } from './species.ts';
import { H, SEAT, boundsOf, bottomOf, rabbit, topOf, variant } from './test-body.ts';

describe('buildLegs', () => {
  it('rests the large round feet flat on the floor (design 4.5)', () => {
    const { mesh } = rabbit();
    const foot = boundsOf(mesh, 'footL');
    expect(foot.min[1]).toBeCloseTo(0, 6);
    expect(foot.max[1]).toBeCloseTo(FOOT.height * H, 6);
    expect(foot.max[2] - foot.min[2]).toBeCloseTo(FOOT.length * H, 6);
    expect(foot.max[0] - foot.min[0]).toBeCloseTo(FOOT.width * H, 6);
  });

  it('rests the feet on the floor for each size and seat height (design 4.5)', () => {
    for (const size of [0.75, 1, 1.35]) {
      for (const seat of [SEAT, 0.6]) {
        const builder = new MeshBuilder();
        buildBiped(builder, { ...SPECIES.rabbit, size }, seated(seat));
        const mesh = builder.build();
        // The mesh data holds 32-bit floats.
        expect(bottomOf(mesh, 'footL')).toBeCloseTo(0, 6);
        expect(bottomOf(mesh, 'footR')).toBeCloseTo(0, 6);
      }
    }
  });

  it('rests the feet on a foot ring above the floor, with the shin of a chair', () => {
    const builder = new MeshBuilder();
    const body = buildBiped(builder, SPECIES.rabbit, seated(0.7, 0.25));
    const mesh = builder.build();
    expect(bottomOf(mesh, 'footL')).toBeCloseTo(0.25, 6);
    const p = body.positions;
    // The shin is the seat height plus 0.2 H above the foot rest (design 4.5).
    expect(p.shinL[1] - p.footL[1]).toBeCloseTo(0.7 - 0.25 + 0.2 * H, 9);
    expect(topOf(mesh, 'earL') - 0.7).toBeCloseTo(topOf(rabbit().mesh, 'earL') - SEAT, 5);
  });

  it('stands on straight legs with the feet on the floor', () => {
    for (const size of [0.75, 1, 1.35]) {
      const h = H * size;
      const builder = new MeshBuilder();
      const body = buildBiped(builder, { ...SPECIES.rabbit, size }, { kind: 'standing' });
      const mesh = builder.build();
      const p = body.positions;
      expect(bottomOf(mesh, 'footL')).toBeCloseTo(0, 6);
      expect(bottomOf(mesh, 'footR')).toBeCloseTo(0, 6);
      // The knee is 0.45 H straight below the hip, and the shin reaches down to the ankle.
      expect(toVec3(new Vector3(...p.thighL).sub(new Vector3(...p.shinL)))).toEqual(
        [0, 0.45 * h, 0].map((v) => expect.closeTo(v, 9)),
      );
      expect(p.thighL[1]).toBeCloseTo(0.94 * h, 9);
      expect(p.shinL[1] - p.footL[1]).toBeCloseTo(0.39 * h, 9);
      // The top of the head is 2.4 H above the base of the torso, which is 0.75 H high.
      expect(topOf(mesh, 'head')).toBeCloseTo(0.77 * h + 2.3 * h, 2);
    }
  });

  it('gives the standing bear legs of 25% to 30% of its height (review of step 4, F3)', () => {
    const builder = new MeshBuilder();
    const body = buildBiped(builder, SPECIES.bear, { kind: 'standing' });
    const mesh = builder.build();
    let top = 0;
    for (let v = 0; v < mesh.positions.length / 3; v++) {
      top = Math.max(top, mesh.positions[v * 3 + 1] ?? 0);
    }
    // The bear was 2.02 m tall with legs of 41%. The reference bear has legs of about 25%. The
    // shorter torso of animals.webp makes it 1.63 m tall (was 1.67 m).
    expect(top).toBeCloseTo(1.63, 2);
    const legs = body.positions.thighL[1] / top;
    expect(legs).toBeGreaterThanOrEqual(0.25);
    expect(legs).toBeLessThanOrEqual(0.3);
  });

  it('makes round legs with a faceted knee (design 4.5)', () => {
    const { mesh } = variant({});
    // The thigh bulges by 1.1 at a third of its length, from the radius 0.32 H to 0.27 H.
    const thigh = boundsOf(mesh, 'thighL');
    const bulge = 2 * LIMB_BULGE * (0.32 - 0.05 / 3) * H;
    expect(thigh.max[0] - thigh.min[0]).toBeLessThanOrEqual(bulge + 1e-9);
    expect(thigh.max[0] - thigh.min[0]).toBeGreaterThan(bulge * Math.cos(Math.PI / 8));
    // The knee is an icosahedron of 0.27 H, 0.85 of its radius wide on each side of its center.
    const shin = boundsOf(mesh, 'shinL');
    const across = (1 + Math.sqrt(5)) / 2 / Math.hypot(1, (1 + Math.sqrt(5)) / 2);
    expect(shin.max[0] - shin.min[0]).toBeCloseTo(2 * across * 0.27 * H, 6);
  });
});
