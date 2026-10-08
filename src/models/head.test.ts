import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  HEAD_CORNERS,
  JAW_RING,
  eyeDirection,
  eyePlace,
  headCap,
  headCorners,
  headRings,
  headSurface,
  headWidthFactor,
} from './head.ts';
import { triangleNormal } from './mesh.ts';
import { toVec3 } from './tuples.ts';
import { SPECIES } from './species.ts';
import type { SpeciesId, SpeciesParams } from './species.ts';
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
      const xs = headCorners(SPECIES[id]).filter((_, i) => i % 3 === 0);
      expect(2 * Math.max(...xs), id).toBeCloseTo(width, 6);
      expect(-2 * Math.min(...xs), id).toBeCloseTo(width, 6);
    }
  });
});

/** The species with a faceted head (design 4.5). */
const FACETED: readonly SpeciesId[] = ['fox-red', 'wolf', 'cat', 'dog'];

/**
 * Gives a key for a corner, with its coordinates rounded to 1e-6.
 *
 * @param corners The corner list.
 * @param i The index of the corner.
 * @returns The key.
 */
function cornerKey(corners: readonly number[], i: number): string {
  return [0, 1, 2].map((k) => Math.round((corners[i * 3 + k] ?? 0) * 1e6) + 0).join(',');
}

/**
 * Gives the triangles of a corner list above the jaw ring, with their areas and unit normals.
 *
 * @param corners The corner list.
 * @returns The area and the normal of each triangle above the jaw ring.
 */
function facesAboveJaw(corners: readonly number[]): { area: number; normal: Vector3 }[] {
  const out: { area: number; normal: Vector3 }[] = [];
  for (let t = 0; t < corners.length / 9; t++) {
    const ys = [1, 4, 7].map((k) => corners[t * 9 + k] ?? 0);
    if (Math.min(...ys) < JAW_RING - 1e-9) {
      continue;
    }
    const normal = new Vector3(...triangleNormal(corners, t));
    out.push({ area: normal.length() / 2, normal: normal.normalize() });
  }
  return out;
}

describe('headCap', () => {
  it('gives the round head no cap', () => {
    expect(headCap(SPECIES.elephant)).toBeNull();
    expect(headCorners(SPECIES.elephant)).toHaveLength(HEAD_CORNERS.length);
  });

  it.each(FACETED)('closes the faceted head of the %s on its jaw ring', (id) => {
    const species: SpeciesParams = SPECIES[id];
    const cap = headCap(species) ?? [];
    const corners = headCorners(species);

    // Each edge of the closed head has a twin in the other direction, so the head has no hole.
    const edges = new Map<string, number>();
    for (let t = 0; t < corners.length / 9; t++) {
      for (let k = 0; k < 3; k++) {
        const from = cornerKey(corners, t * 3 + k);
        const to = cornerKey(corners, t * 3 + ((k + 1) % 3));
        edges.set(`${from} ${to}`, (edges.get(`${from} ${to}`) ?? 0) + 1);
      }
    }
    for (const [edge, count] of edges) {
      const [from, to] = edge.split(' ');
      expect(count, edge).toBe(1);
      expect(edges.get(`${to} ${from}`), edge).toBe(1);
    }

    // The cap stands on the jaw ring, keeps the head height of 1.0 H, and has each corner of the
    // jaw ring.
    const ys = cap.filter((_, i) => i % 3 === 1);
    expect(Math.min(...ys)).toBeCloseTo(JAW_RING, 9);
    expect(Math.max(...ys)).toBeCloseTo(0.5, 9);
    const capKeys = new Set(Array.from({ length: cap.length / 3 }, (_, i) => cornerKey(cap, i)));
    const jaw = headRings(species).at(-1);
    expect(jaw?.y).toBe(JAW_RING);
    const jawKeys = new Set(
      Array.from({ length: corners.length / 3 }, (_, i) => i)
        .filter((i) => Math.abs((corners[i * 3 + 1] ?? 0) - JAW_RING) < 1e-9)
        .map((i) => cornerKey(corners, i)),
    );
    expect(jawKeys.size).toBeGreaterThanOrEqual(12);
    for (const key of jawKeys) {
      expect(capKeys.has(key), key).toBe(true);
    }

    // The left half is the mirror image of the right half, triangle by triangle.
    const triangles = (mirror: number): string[] =>
      Array.from({ length: cap.length / 9 }, (_, t) =>
        [0, 1, 2]
          .map((k) =>
            [0, 1, 2]
              .map(
                (a) => Math.round((cap[t * 9 + k * 3 + a] ?? 0) * (a === 0 ? mirror : 1) * 1e6) + 0,
              )
              .join(','),
          )
          .toSorted()
          .join(' '),
      ).toSorted();
    expect(triangles(-1)).toEqual(triangles(1));
  });

  it('gives the fox a few large face planes in place of the small facets of the round head', () => {
    // The round head has 156 triangles above the jaw ring, and the faceted head of the fox 70.
    // Its front triangles are 1.7 times as large on average, so that the face shows large planes,
    // as the fox heads of lowpoly-animals.png.
    const faceted = facesAboveJaw(headCorners(SPECIES['fox-red']));
    const round = facesAboveJaw(HEAD_CORNERS);
    expect(faceted.length).toBeLessThan(0.5 * round.length);
    const meanFront = (faces: readonly { area: number; normal: Vector3 }[]): number => {
      const front = faces.filter((face) => face.normal.z < -0.2);
      return front.reduce((sum, face) => sum + face.area, 0) / front.length;
    };
    expect(meanFront(faceted)).toBeGreaterThan(1.5 * meanFront(round));
  });
});
