import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { buildBiped } from './biped.ts';
import { seated } from './body-frame.ts';
import { SEATED_LEGS, STANDING_LEGS } from './legs.ts';
import { toVec3 } from './tuples.ts';
import { MeshBuilder } from './mesh.ts';
import { SPECIES, plumpOf } from './species.ts';
import type { LegForm, SpeciesId } from './species.ts';
import { H, SEAT, boundsOf, bottomOf, rabbit, topOf, variant } from './test-body.ts';
import {
  cornersOn,
  largestFold,
  openEdges,
  ringRadii,
  surfaceCount,
  volumeOf,
} from './test-limbs.ts';

/** The leg groups of design 4.5. */
const FORMS: readonly LegForm[] = ['hare', 'digitigrade', 'hoofed', 'pillar', 'small-paw'];

describe('buildLegs', () => {
  it('gives each species the leg group of its family (design 4.3)', () => {
    const groups: Readonly<Record<LegForm, readonly SpeciesId[]>> = {
      hare: ['rabbit'],
      digitigrade: ['fox-red', 'fox-tan', 'wolf', 'cat', 'dog'],
      hoofed: ['deer'],
      pillar: [
        'bear',
        'polar-bear',
        'panda',
        'hippo',
        'elephant',
        'rhino',
        'pig',
        'beaver',
        'badger',
      ],
      'small-paw': ['mouse', 'meerkat', 'monkey', 'penguin'],
    };
    for (const form of FORMS) {
      for (const id of groups[form]) {
        expect(SPECIES[id].legs, id).toBe(form);
      }
    }
    expect(Object.values(groups).flat()).toHaveLength(Object.keys(SPECIES).length);
  });

  it('stands the digitigrade legs on a hock 0.34 H above the floor (design 4.5)', () => {
    // The fox, the cat, the dog, the wolf, and the deer of lowpoly-animals.png have a hock: the
    // lower leg goes back from the knee, and the long bones of the foot go down and forward to the
    // paw. The first legs of the leg groups had a lower leg straight down to an ankle at 0.1 H.
    for (const form of ['digitigrade', 'hoofed'] as const) {
      const { foot, hock } = SEATED_LEGS[form];
      const { mesh, body } = variant({ legs: form });
      const p = body.positions;
      const bounds = boundsOf(mesh, 'footL');
      expect(p.footL[1] / H, form).toBeCloseTo(hock.height, 6);
      expect((p.footL[2] - p.shinL[2]) / H, form).toBeCloseTo(hock.back, 6);
      expect(p.footL[0], form).toBeCloseTo(p.shinL[0], 9);

      // The paw is flat on the floor, under the knee, and the toes point forward.
      expect(bounds.min[1], form).toBeCloseTo(0, 6);
      const toes = p.shinL[2] - (hock.forward + foot.length - foot.heelBack) * H;
      expect(bounds.min[2], form).toBeCloseTo(toes, 6);

      // The long bones of the foot reach up into the end of the lower leg at the hock.
      expect(bounds.max[1], form).toBeGreaterThan(p.footL[1]);
    }
  });

  it('rests the foot or the paw of each leg group flat on the floor (design 4.5)', () => {
    for (const form of FORMS) {
      const { foot, hock } = SEATED_LEGS[form];
      if (hock) {
        continue;
      }
      const { mesh, body } = variant({ legs: form });
      const bounds = boundsOf(mesh, 'footL');
      expect(bounds.min[1], form).toBeCloseTo(0, 6);
      expect(bounds.max[1], form).toBeCloseTo(foot.height * H, 6);
      expect(bounds.max[2] - bounds.min[2], form).toBeCloseTo(foot.length * H, 6);
      expect(bounds.max[0] - bounds.min[0], form).toBeCloseTo(foot.width * H, 6);
      // The heel is behind the ankle, and the toes point forward.
      expect(bounds.max[2] - body.positions.footL[2], form).toBeCloseTo(foot.heelBack * H, 6);
    }
  });

  it('gives the small species small paws, and the heavy species wide pads', () => {
    // The shoe of 2026-10-07 was 0.48 H wide for each species. The paws of the reference are
    // about 0.27 H wide (lowpoly-animals.png).
    for (const form of ['hare', 'digitigrade', 'small-paw'] as const) {
      expect(SEATED_LEGS[form].foot.width, form).toBeLessThanOrEqual(0.3);
    }
    expect(SEATED_LEGS.pillar.foot.width).toBeGreaterThan(2 * SEATED_LEGS.pillar.tube.shin[1]);
  });

  it('gives the rabbit a long flat foot, three times as long as it is wide (design 4.5)', () => {
    // The rabbits of lowpoly-animals.png have feet of 0.8 to 0.9 H by 0.27 H. The paw of the first
    // leg groups was 0.5 H by 0.28 H, and the shoe before them 0.65 H by 0.48 H.
    const { mesh } = rabbit();
    const foot = boundsOf(mesh, 'footL');
    const length = foot.max[2] - foot.min[2];
    const width = foot.max[0] - foot.min[0];
    expect(length / width).toBeGreaterThan(2.99);
    expect(length / H).toBeGreaterThan(0.8);
    expect(foot.max[1] / H).toBeLessThan(0.2);
  });

  it('keeps the toes of each species within 1.11 H in front of the hip, away from the stands', () => {
    // With the toes 0.05 m further forward, the feet touched the legs of the shared music stands,
    // and the stages grew (design 4.5).
    for (const [id, species] of Object.entries(SPECIES)) {
      const builder = new MeshBuilder();
      const body = buildBiped(builder, species, seated(SEAT));
      const mesh = builder.build();
      const h = body.headHeight;
      const toes = body.positions.thighL[2] - boundsOf(mesh, 'footL').min[2];
      expect(toes / h, id).toBeLessThanOrEqual(1.11);
    }
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
    // The knee is above the seat, and the ankle 0.1 H above the foot rest (design 4.5).
    const knee = SEATED_LEGS.hare.knee.height;
    expect(p.shinL[1] - p.footL[1]).toBeCloseTo(0.7 - 0.25 + (knee - 0.1) * H, 9);
    expect(topOf(mesh, 'earL') - 0.7).toBeCloseTo(topOf(rabbit().mesh, 'earL') - SEAT, 5);
  });

  it('stands each leg group on its feet, with the knee at the place of its group', () => {
    for (const form of FORMS) {
      const { knee, spread, hock, plump } = STANDING_LEGS[form];
      for (const size of [0.75, 1, 1.35]) {
        const h = H * size;
        const species = { ...SPECIES.rabbit, legs: form, size };
        const builder = new MeshBuilder();
        const body = buildBiped(builder, species, { kind: 'standing' });
        const mesh = builder.build();
        const p = body.positions;
        const label = `${form} ${size}`;
        const k = plump ? plumpOf(species) : 1;
        expect(bottomOf(mesh, 'footL'), label).toBeCloseTo(0, 6);
        expect(bottomOf(mesh, 'footR'), label).toBeCloseTo(0, 6);

        // The hip keeps its place, and the knee is below it at the spread of the group.
        expect(p.thighL[1], label).toBeCloseTo(0.94 * h, 9);
        expect(toVec3(new Vector3(...p.thighL).sub(new Vector3(...p.shinL)))).toEqual(
          [p.thighL[0] + spread * k * h, knee.drop * h, knee.forward * h].map((v) =>
            expect.closeTo(v, 9),
          ),
        );

        // The ankle is 0.1 H above the floor, or the hock is at its height.
        expect(p.footL[1] / h, label).toBeCloseTo(hock ? hock.height : 0.1, 9);

        // The top of the head is 2.3 H above the base of the torso, which is 0.77 H high.
        expect(topOf(mesh, 'head'), label).toBeCloseTo(0.77 * h + 2.3 * h, 2);
      }
    }
  });

  it('stands the soloists of the small species on thin legs (design 4.5)', () => {
    // The round standing leg of the cute bodies was 0.48 to 0.40 H wide below the knee.
    for (const form of ['hare', 'digitigrade', 'small-paw'] as const) {
      const builder = new MeshBuilder();
      const body = buildBiped(builder, { ...SPECIES.rabbit, legs: form }, { kind: 'standing' });
      const mesh = builder.build();
      const shin = boundsOf(mesh, 'shinL');
      expect((shin.max[0] - shin.min[0]) / body.headHeight, form).toBeLessThan(0.34);
    }
  });

  it('stands the heavy species on two columns as wide as the torso (design 4.5)', () => {
    // The bear of orchestra-latest.png stands on legs about 0.8 H long and 0.75 H wide. The round
    // standing leg of the cute bodies was 0.48 to 0.40 H wide below the knee.
    for (const id of ['bear', 'elephant', 'badger'] as const) {
      const species = SPECIES[id];
      const builder = new MeshBuilder();
      const body = buildBiped(builder, species, { kind: 'standing' });
      const mesh = builder.build();
      const h = body.headHeight;
      const k = plumpOf(species);
      const { tube, spread } = STANDING_LEGS.pillar;

      // The lower leg at the ankle is as wide as its scaled radius, with no narrow ankle.
      const shin = boundsOf(mesh, 'shinL');
      const width = (shin.max[0] - shin.min[0]) / h;
      expect(width, id).toBeGreaterThan(2 * tube.shin[1] * k * 0.95);
      expect(width, id).toBeLessThan(2 * tube.shin[0] * k * 1.1);

      // The knees stand at the spread, and the two legs keep apart.
      expect(-body.positions.shinL[0] / h, id).toBeCloseTo(spread * k, 6);
      expect(shin.max[0], id).toBeLessThan(0);
    }
    expect(2 * STANDING_LEGS.pillar.tube.shin[0] * plumpOf(SPECIES.bear)).toBeCloseTo(0.75, 2);
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

  it('lays the haunch on the seat as a flat oval, and hangs a thin lower leg (design 4.5)', () => {
    // The human leg of 2026-10-07 was a round thigh tube 0.68 H wide on each species, with a
    // lower leg of 0.48 to 0.40 H. The reference animals have a haunch on the seat, and lower legs
    // of 0.27 to 0.34 H (docs/research/2026-10-07-animal-anatomy-plan.md, 3.1).
    for (const girth of [1, 0.75]) {
      for (const form of FORMS) {
        const { tube, knee } = SEATED_LEGS[form];
        const { mesh, body } = variant({ legs: form, girth });
        const p = body.positions;
        const label = `${form} ${girth}`;
        const size = girth * H;

        // The haunch: as wide as its radius, and lower by its flat factor.
        const thigh = cornersOn(mesh, ['thighR']);
        const axis = toVec3(new Vector3(...p.shinR).sub(new Vector3(...p.thighR)));
        const hip = ringRadii(thigh, p.thighR, axis);
        expect(hip, label).toHaveLength(8);
        expect(Math.max(...hip) / size, label).toBeCloseTo(tube.hip, 5);
        expect(Math.min(...hip) / size, label).toBeCloseTo(tube.hip * tube.flat, 5);

        // It lies on the seat, a little into the soft fur, as the thigh of the cute bodies. The
        // hip keeps its height of 0.3 H for each girth, so a thin body sits a little higher.
        const bottom = (bottomOf(mesh, 'thighR') - SEAT) / H;
        expect(bottom, label).toBeGreaterThan(-0.06);
        if (girth === 1) {
          expect(bottom, label).toBeLessThanOrEqual(0);
        }

        // The knee is lower than the hip, at the front of the seat.
        expect((p.shinR[1] - SEAT) / H, label).toBeCloseTo(knee.height, 9);
        expect((p.thighR[2] - p.shinR[2]) / H, label).toBeCloseTo(knee.forward, 9);

        // The lower leg at the ankle.
        const shin = cornersOn(mesh, ['shinR']);
        const down = toVec3(new Vector3(...p.footR).sub(new Vector3(...p.shinR)));
        const ankle = ringRadii(shin, p.footR, down);
        // The ring of the ankle turns by half a side, and its depth scales it to the front.
        const corners = Array.from({ length: 8 }, (_, i) => {
          const angle = ((i + 0.5) / 8) * 2 * Math.PI;
          return tube.shin[1] * Math.hypot(Math.sin(angle), tube.depth * Math.cos(angle));
        });
        expect(ankle, label).toHaveLength(8);
        expect(Math.min(...ankle) / size, label).toBeCloseTo(Math.min(...corners), 5);
        expect(Math.max(...ankle) / size, label).toBeCloseTo(Math.max(...corners), 5);
      }
    }

    for (const form of ['hare', 'digitigrade', 'small-paw'] as const) {
      expect(2 * SEATED_LEGS[form].tube.shin[0], form).toBeLessThanOrEqual(0.34);
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
