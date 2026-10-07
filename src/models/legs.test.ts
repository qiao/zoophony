import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { buildBiped } from './biped.ts';
import { seated } from './body-frame.ts';
import { FOOT } from './legs.ts';
import { toVec3 } from './tuples.ts';
import { MeshBuilder } from './mesh.ts';
import { SPECIES } from './species.ts';
import { H, SEAT, boundsOf, bottomOf, rabbit, topOf, variant } from './test-body.ts';
import {
  cornersOn,
  largestFold,
  openEdges,
  ringRadii,
  surfaceCount,
  volumeOf,
} from './test-limbs.ts';

describe('buildLegs', () => {
  it('rests the large round feet flat on the floor (design 4.5)', () => {
    const { mesh } = rabbit();
    const foot = boundsOf(mesh, 'footL');
    expect(foot.min[1]).toBeCloseTo(0, 6);
    expect(foot.max[1]).toBeCloseTo(FOOT.height * H, 6);
    expect(foot.max[2] - foot.min[2]).toBeCloseTo(FOOT.length * H, 6);
    expect(foot.max[0] - foot.min[0]).toBeCloseTo(FOOT.width * H, 6);
  });

  it('gives the short plump foot of the cute bodies, with the heel in place', () => {
    const { mesh, positions } = rabbit();
    const foot = boundsOf(mesh, 'footL');
    // 0.65 H long and 0.28 H high. The first foot was 0.72 H long and 0.25 H high, with the heel
    // at the same place, so the toes end 0.07 H further back, away from the music stands.
    expect(foot.max[1] / H).toBeCloseTo(0.28, 6);
    expect(foot.max[2] - positions.footL[2]).toBeCloseTo(0.22 * H, 6);
    expect(positions.footL[2] - foot.min[2]).toBeCloseTo(0.43 * H, 6);
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

  it('makes each leg one closed tube from the hip to the ankle, with no knee ball', () => {
    for (const stance of [seated(SEAT), { kind: 'standing' } as const]) {
      const builder = new MeshBuilder();
      buildBiped(builder, SPECIES.rabbit, stance);
      const mesh = builder.build();
      for (const side of ['L', 'R'] as const) {
        const leg = cornersOn(mesh, [`thigh${side}`, `shin${side}`]);
        // 9 rings of 8 sides and two caps. The first legs had a thigh, a knee ball, and a shin:
        // three closed parts of 180 triangles.
        expect(leg.length / 9, `${stance.kind} ${side}`).toBe(8 * 16 + 2 * 8);
        expect(surfaceCount(leg), `${stance.kind} ${side}`).toBe(1);
        expect(openEdges(leg), `${stance.kind} ${side}`).toBe(0);
        expect(volumeOf(leg), `${stance.kind} ${side}`).toBeGreaterThan(0);
      }
    }
  });

  it('gives the legs the radii of the cute bodies: 0.34, 0.30, 0.24, and 0.20 H', () => {
    for (const girth of [1, 0.75]) {
      const { mesh, body } = variant({ girth });
      const p = body.positions;
      const thigh = cornersOn(mesh, ['thighR']);
      const shin = cornersOn(mesh, ['shinR']);
      // The turn of the knee starts behind the knee by the radius of the shin, and ends below it
      // by the radius of the thigh.
      const knee = p.shinR;
      const radii: readonly (readonly [readonly number[], number])[] = [
        [ringRadii(thigh, p.thighR, [0, 0, 1]), 0.34],
        [ringRadii(thigh, [knee[0], knee[1], knee[2] + 0.24 * girth * H], [0, 0, 1]), 0.3],
        [ringRadii(shin, [knee[0], knee[1] - 0.3 * girth * H, knee[2]], [0, 1, 0]), 0.24],
        [ringRadii(shin, p.footR, [0, 1, 0]), 0.2],
      ];
      for (const [ring, radius] of radii) {
        expect(ring, `${girth} ${radius}`).toHaveLength(8);
        for (const r of ring) {
          expect(r / H, `${girth} ${radius}`).toBeCloseTo(radius * girth, 5);
        }
      }
    }
  });

  it('rounds the outer side of the seated knee: no face turns by 40° from its neighbor', () => {
    const { mesh, positions } = rabbit();
    for (const side of ['L', 'R'] as const) {
      // The edges above and in front of the knee joint. The faces there turn by at most 31° from
      // their neighbors. The knee ball of the first legs had faces 42° apart, and the flat ends of
      // the thigh and the shin had edges of 90°.
      const leg = cornersOn(mesh, [`thigh${side}`, `shin${side}`]);
      const fold = largestFold(leg, positions[`shin${side}`], 0.45 * H, [0, 1, -1]);
      expect(fold, side).toBeLessThan(40);
    }
  });
});
