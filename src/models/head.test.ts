import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  eyeDirection,
  eyePlace,
  headCorners,
  headRings,
  headSurface,
  headWidthFactor,
} from './head.ts';
import { toVec3 } from './tuples.ts';
import { SPECIES } from './species.ts';
import type { SpeciesId } from './species.ts';
import { H, boundsOf, variant } from './test-body.ts';

describe('eyeDirection', () => {
  it('turns the eyes of a species out to its turn, at the angle above the horizontal of its snout', () => {
    for (const snout of ['short', 'long'] as const) {
      const place = eyePlace(snout).direction;
      const plain = eyeDirection({ ...SPECIES.rabbit, snout, eyes: { form: 'oval' } });
      expect(plain).toEqual(place);
      const [x, y, z] = eyeDirection({ ...SPECIES.rabbit, snout, eyes: { form: 'oval', out: 46 } });
      expect((Math.atan2(x, -z) * 180) / Math.PI).toBeCloseTo(46, 9);
      expect(Math.atan2(y, Math.hypot(x, z))).toBeCloseTo(
        Math.atan2(place[1], Math.hypot(place[0], place[2])),
        9,
      );
    }
  });
});

describe('headRings', () => {
  it('scales the head to the head width of the species, with the same height', () => {
    const form = { cheeks: 0.05, headWidth: 1.1 };
    const { mesh, body } = variant({ form });
    const head = boundsOf(mesh, 'head');
    expect(head.max[0] - head.min[0]).toBeCloseTo(1.1 * H, 6);
    expect(head.max[1] - (body.headCenter[1] - 0.5 * H)).toBeCloseTo(1.0 * H, 6);
    const rings = headRings({ ...SPECIES.rabbit, form });
    expect(2 * Math.max(...rings.map((ring) => ring.halfWidth))).toBeCloseTo(1.1, 9);
    expect(headWidthFactor(SPECIES.rabbit)).toBe(1);
  });

  it('moves the ears in with the surface of a narrower head', () => {
    const wide = variant({ ears: 'pointed' });
    const narrow = variant({ ears: 'pointed', form: { headWidth: 1.06 } });
    const corners = headCorners({ ...SPECIES.rabbit, form: { headWidth: 1.06 } });
    // The base of the ear stays a little inside the head surface.
    for (const { body } of [wide, narrow]) {
      const c = new Vector3(...body.headCenter);
      const base = new Vector3(...body.positions.earR);
      const surface = headSurface(
        H,
        body.headCenter,
        toVec3(base.clone().sub(c)),
        body === narrow.body ? corners : undefined,
      );
      expect(base.distanceTo(c)).toBeLessThan(new Vector3(...surface.point).distanceTo(c));
    }
    expect(narrow.body.positions.earR[0]).toBeLessThan(wide.body.positions.earR[0] - 0.04 * H);
  });

  it('gives the cat, the wolf, and the foxes the narrow heads of mockup.png', () => {
    // The mockup heads are 1.0 (cat), 1.1 (wolf), and 1.2 (fox) of their height wide. The cute
    // head of 1.32 H made each species a round ball.
    const widths: readonly (readonly [SpeciesId, number])[] = [
      ['cat', 1.08],
      ['wolf', 1.12],
      ['fox-red', 1.2],
      ['fox-tan', 1.2],
      ['dog', 1.22],
      ['rabbit', 1.32],
    ];
    for (const [id, width] of widths) {
      const rings = headRings(SPECIES[id]);
      expect(2 * Math.max(...rings.map((ring) => ring.halfWidth)), id).toBeCloseTo(width, 9);
    }
  });
});
