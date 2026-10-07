import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { LIMB_BULGE } from './body-parts.ts';
import { HEAD_RINGS, headCorners, headSurface } from './head.ts';
import { toVec3 } from './tuples.ts';
import { srgb } from './mesh.ts';
import { boneIndex } from './rig.ts';
import { SPECIES } from './species.ts';
import {
  H,
  SEAT,
  boundsOf,
  bottomOf,
  rabbit,
  topOf,
  variant,
  verticesWithColor,
} from './test-body.ts';

describe('buildTrunk', () => {
  it('puts the top of the head 2.3 H above the seat, with H 0.38 m (design 4.5)', () => {
    const { mesh } = rabbit();
    expect(topOf(mesh, 'head')).toBeCloseTo(SEAT + 2.3 * H, 6);
  });

  it('puts the torso above the chest bone on `chest`, with the arms (design 4.7)', () => {
    const { mesh, positions } = rabbit();
    const chest = positions.chest[1];
    expect(chest).toBeCloseTo(SEAT + 0.75 * H, 9);
    expect(bottomOf(mesh, 'chest')).toBeCloseTo(chest, 6);
    expect(topOf(mesh, 'chest')).toBeCloseTo(SEAT + 1.35 * H, 6);
    // The rings below the chest bone follow `spine`. The triangles of the band between the last
    // of them (0.6 H) and the chest ring join the two bones, so the torso has no seam.
    expect(topOf(mesh, 'spine')).toBeCloseTo(SEAT + 0.6 * H, 6);
    expect(bottomOf(mesh, 'spine')).toBeCloseTo(SEAT, 6);
    const spine = boneIndex('spine');
    const chestBone = boneIndex('chest');
    let joined = 0;
    for (let t = 0; t < mesh.bones.length / 3; t++) {
      const bones = new Set([0, 1, 2].map((k) => mesh.bones[t * 3 + k]));
      if (bones.has(spine) && bones.has(chestBone)) {
        joined++;
        expect(
          Math.min(...[0, 1, 2].map((k) => mesh.positions[t * 9 + k * 3 + 1] ?? 0)),
        ).toBeCloseTo(SEAT + 0.6 * H, 6);
      }
    }
    // The band has two triangles for each of the 16 sides.
    expect(joined).toBe(32);
  });

  it('makes the cute head of the polished images: 1.32 H wide and 1.0 H tall (design 4.5)', () => {
    const { mesh, positions } = rabbit();
    const head = boundsOf(mesh, 'head');
    const center = positions.head[1] + 0.5 * H;
    // The head bone is 0.5 H below the head center.
    expect(head.max[1] - (center - 0.5 * H)).toBeCloseTo(1.0 * H, 6);
    // The widest rings have corners at the sides, so the head is 1.32 H wide.
    expect(head.max[0] - head.min[0]).toBeCloseTo(1.32 * H, 6);
    const cheeks = HEAD_RINGS.reduce((a, b) => (b.halfWidth > a.halfWidth ? b : a));
    expect(2 * cheeks.halfWidth).toBeCloseTo(1.32, 9);
    // The full cheeks are low: the widest ring is 0.12 H below the head center. The first round
    // head was widest 0.04 H above it.
    expect(cheeks.y).toBeCloseTo(-0.12, 9);
    // The crown is round: 0.04 H below the top, the head is still 0.4 of its width.
    const crown = HEAD_RINGS.filter((ring) => ring.y > 0.4 && ring.y < 0.5);
    expect(Math.max(...crown.map((ring) => ring.halfWidth))).toBeGreaterThan(0.4 * 0.63);
    // The face is full: the front of the cheeks below the eyes is the front of the head, and it
    // is almost as wide as the cheeks. The head of animals.webp came to a point there.
    const face = HEAD_RINGS.reduce((a, b) => (b.front > a.front ? b : a));
    expect(face.y).toBeLessThan(-0.15);
    expect(face.front).toBeLessThan(0.65);
    expect(face.halfWidth).toBeGreaterThan(0.8 * cheeks.halfWidth);
  });

  it('gives the head the cheeks of the species, and the eyes follow its surface', () => {
    // The deer has narrow cheeks, so that its head keeps 0.03 m from the neck of its harp.
    const { mesh, body } = variant({ form: { cheeks: -0.03 } });
    const head = boundsOf(mesh, 'head');
    expect(head.max[0] - head.min[0]).toBeCloseTo(2 * 0.6 * H, 6);
    const c = new Vector3(...body.headCenter);
    const eye = new Vector3(...body.positions.eyeR);
    const corners = headCorners({ ...SPECIES.rabbit, form: { cheeks: -0.03 } });
    const { point } = headSurface(H, body.headCenter, toVec3(eye.clone().sub(c)), corners);
    const inside = new Vector3(...point).distanceTo(c) - eye.distanceTo(c);
    expect(inside).toBeGreaterThan(0);
    expect(inside).toBeLessThan(0.02 * H);
  });

  it('gives the beagle a cap of the accent color, with a blaze of the belly color', () => {
    const { mesh, body } = variant({ facePattern: 'cap', accentParts: ['face-pattern'] });
    const c = body.headCenter;
    const accent = verticesWithColor(mesh, srgb(SPECIES.rabbit.colors.accent), ['head']);
    const belly = verticesWithColor(mesh, srgb(SPECIES.rabbit.colors.belly), ['head']);
    // The cap covers the crown and the eyes, and it ends below the eyes.
    expect(Math.max(...accent.map((p) => p[1] - c[1]))).toBeCloseTo(0.5 * H, 6);
    expect(Math.min(...accent.map((p) => p[1] - c[1]))).toBeLessThan(
      body.positions.eyeR[1] - c[1] - 0.1 * H,
    );
    // The blaze runs up the middle of the face to the crown, and the muzzle below is white.
    const blaze = belly.filter((p) => p[2] < c[2] && Math.abs(p[0] - c[0]) < 0.1 * H);
    expect(Math.max(...blaze.map((p) => p[1] - c[1]))).toBeGreaterThan(0.4 * H);
    expect(Math.min(...belly.map((p) => p[1] - c[1]))).toBeLessThan(-0.4 * H);
    for (const p of accent) {
      expect(p[2] < c[2] && Math.abs(p[0] - c[0]) < 0.05 * H).toBe(false);
    }
  });

  it('gives the belly color to the lower face, up to the eyes (design 4.3)', () => {
    const { mesh, body } = variant({});
    const belly = srgb(SPECIES.rabbit.colors.belly);
    const fur = srgb(SPECIES.rabbit.colors.fur);
    const face = verticesWithColor(mesh, belly, ['head']);
    const top = Math.max(...face.map((p) => p[1] - body.positions.eyeR[1]));
    // The lower face ends at the eyes, and the forehead above it keeps the fur color.
    expect(Math.abs(top)).toBeLessThan(0.05 * H);
    // The cheeks at the sides of the head have the belly color, as the white cheeks of the fox.
    expect(Math.max(...face.map((p) => p[0] - body.headCenter[0]))).toBeGreaterThan(0.6 * H);
    const back = verticesWithColor(mesh, fur, ['head']).map((p) => p[2] - body.headCenter[2]);
    expect(Math.max(...back)).toBeGreaterThan(0.45 * H);
  });

  it('makes a short thick neck under the head (design 4.5)', () => {
    const { mesh, body } = variant({});
    const { min, max } = boundsOf(mesh, 'neck');
    // The faceted tube bulges by 1.1 at a third of its length, where its radius is 0.29 H.
    expect(max[0] - min[0]).toBeLessThanOrEqual(2 * LIMB_BULGE * 0.29 * H + 1e-9);
    expect(max[0] - min[0]).toBeGreaterThan(2 * 0.29 * H);
    expect(min[1]).toBeCloseTo(SEAT + 1.05 * H, 6);
    // The neck ends inside the head, and the torso reaches the chin.
    expect(max[1]).toBeLessThan(body.headCenter[1] - 0.25 * H);
    expect(topOf(mesh, 'chest')).toBeGreaterThan(body.headCenter[1] - 0.5 * H);
  });

  it('makes a round pear torso (design 4.5)', () => {
    const { mesh, body } = variant({});
    const spine = boundsOf(mesh, 'spine');
    // The torso is 1.28 H wide at the hips. The ring there has corners at the sides.
    expect(spine.max[0] - spine.min[0]).toBeCloseTo(1.28 * H, 6);
    // The ring of the hips has a corner at the front too: the belly, 1.08 times the half width.
    expect(body.positions.spine[2] - spine.min[2]).toBeCloseTo(1.08 * 0.64 * H, 6);
    // The back is 0.72 of the half width deep.
    expect(spine.max[2] - body.positions.spine[2]).toBeCloseTo(0.72 * 0.64 * H, 6);
  });

  it('gives the belly color to a stripe down the front of the torso (design 4.3)', () => {
    const belly = srgb(SPECIES.wolf.colors.belly);
    const { mesh, body } = variant({ colors: SPECIES.wolf.colors });
    const stripe = verticesWithColor(mesh, belly, ['spine', 'chest']);
    expect(stripe.length).toBeGreaterThan(0);
    // The stripe is on the front, and it is narrower than the torso.
    const spine = boundsOf(mesh, 'spine');
    for (const p of stripe) {
      expect(p[2]).toBeLessThanOrEqual(body.positions.spine[2]);
    }
    const xs = stripe.map((p) => p[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.75 * (spine.max[0] - spine.min[0]));
  });
});
