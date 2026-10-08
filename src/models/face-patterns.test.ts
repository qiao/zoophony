import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { headSurface } from './head.ts';
import { toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { srgb } from './mesh.ts';
import { SPECIES } from './species.ts';
import type { SpeciesParams } from './species.ts';
import { H, boundsOf, variant, verticesWithColor, volumeOn } from './test-body.ts';

/** The face patterns that the tests build (design 4.3). */
const FACE_PATTERNS: readonly SpeciesParams['facePattern'][] = [
  'none',
  'eye-patches',
  'cap',
  'stripe',
  'forehead-stripes',
  'face-disc',
  'eye-rings',
];

describe('addFacePattern', () => {
  it('builds each face pattern on the head surface, in the accent color', () => {
    const accent = srgb(SPECIES.rabbit.colors.accent);
    const belly = srgb(SPECIES.rabbit.colors.belly);
    // The cap adds no part. Its borders cut other triangles of the head than the border of the
    // lower face, and the cap cuts the head at the plane of the head center, so the round head
    // of the rabbit has 118 more triangles.
    const extra = {
      none: 0,
      'eye-patches': 96,
      cap: 118,
      stripe: 252,
      'forehead-stripes': 48,
      'face-disc': 96,
      'eye-rings': 96,
    };
    for (const facePattern of FACE_PATTERNS) {
      // The face disc and the eye rings have the belly color. The trunk has no muzzle of the
      // belly color, so the belly color on the head is only the face and the pattern.
      const disc = facePattern === 'face-disc' || facePattern === 'eye-rings';
      const snout = disc ? 'trunk' : 'short';
      const plain = variant({ snout, accentParts: ['face-pattern'] }).mesh;
      const { mesh, body } = variant({ facePattern, snout, accentParts: ['face-pattern'] });
      expect(mesh.bones.length / 3 - plain.bones.length / 3).toBe(extra[facePattern]);
      expect(volumeOn(mesh, 'head')).toBeGreaterThan(0);
      const pattern = verticesWithColor(mesh, disc ? belly : accent, ['head']);
      if (facePattern === 'none') {
        expect(pattern).toHaveLength(0);
        continue;
      }
      // Each vertex is near the surface of the head (1.0 is on it), and the pattern is symmetric.
      const center = new Vector3(...body.headCenter);
      for (const p of pattern) {
        const d = new Vector3(...p).sub(center);
        const { point } = headSurface(H, body.headCenter, toVec3(d));
        const r = d.length() / new Vector3(...point).distanceTo(center);
        // The boxes of a stripe stand a little above the flat crown.
        expect(r).toBeGreaterThan(0.9);
        expect(r).toBeLessThan(1.16);
      }
      const xs = pattern.map((p) => p[0]);
      expect(Math.min(...xs)).toBeCloseTo(-Math.max(...xs), 6);
    }
  });

  it('makes the eye patches larger than the eyes, so that they show around them', () => {
    const { mesh } = variant({ facePattern: 'eye-patches', accentParts: ['face-pattern'] });
    const patch = verticesWithColor(mesh, srgb(SPECIES.rabbit.colors.accent), ['head']).filter(
      (p) => p[0] > 0,
    );
    const eye = boundsOf(mesh, 'eyeR');
    const tall = (points: readonly Vec3[]): number =>
      Math.max(...points.map((p) => p[1])) - Math.min(...points.map((p) => p[1]));
    expect(tall(patch)).toBeGreaterThan(eye.max[1] - eye.min[1] + 0.12 * H);
    // The patch turns so that its lower end points down and out, as the pandas of mockup.png.
    const lowest = patch.reduce((a, b) => (b[1] < a[1] ? b : a));
    const highest = patch.reduce((a, b) => (b[1] > a[1] ? b : a));
    expect(lowest[0]).toBeGreaterThan(highest[0] + 0.05 * H);
  });

  it('puts the forehead stripes above the eyes, and the stripe of the badger over the head', () => {
    const accent = srgb(SPECIES.rabbit.colors.accent);
    const belly = srgb(SPECIES.rabbit.colors.belly);
    const cat = variant({ facePattern: 'forehead-stripes', accentParts: ['face-pattern'] });
    for (const p of verticesWithColor(cat.mesh, accent, ['head'])) {
      expect(p[1]).toBeGreaterThan(cat.body.positions.eyeR[1]);
      expect(p[2]).toBeLessThan(cat.body.headCenter[2]);
    }
    const badger = variant({ facePattern: 'stripe', accentParts: ['face-pattern'] });
    const c = badger.body.headCenter;
    // The middle stripe has the belly color on the top of the head, where the head has the fur
    // color, and the accent stripes reach the back of the head.
    const top = verticesWithColor(badger.mesh, belly, ['head']).filter(
      (p) => p[1] > c[1] + 0.45 * H,
    );
    expect(top.length).toBeGreaterThan(0);
    for (const p of top) {
      expect(Math.abs(p[0])).toBeLessThan(0.1 * H);
    }
    const back = verticesWithColor(badger.mesh, accent, ['head']).map((p) => p[2] - c[2]);
    expect(Math.max(...back)).toBeGreaterThan(0.2 * H);
  });
});
