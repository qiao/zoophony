import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { HEAD_RINGS, MAX_BROW, headCorners, headSurface } from './head.ts';
import { toVec3 } from './tuples.ts';
import { srgb } from './mesh.ts';
import type { MeshData } from './mesh.ts';
import { boneIndex } from './rig.ts';
import { SPECIES, plumpOf } from './species.ts';
import type { SpeciesParams } from './species.ts';
import { DEFAULT_BELLY, DEFAULT_NECK, MIN_NECK } from './trunk.ts';
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
    expect(topOf(mesh, 'chest')).toBeCloseTo(SEAT + 1.2 * H, 6);
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

  it('joins the torso and the head with a neck ring, with no neck tube (spec 2.5)', () => {
    const { mesh, body } = variant({});
    // The corners on `neck` are the ring of 0.36 H at the height of the head bone. The first neck
    // was a tube of 0.6 H from 1.05 H to 1.5 H above the seat.
    const { min, max } = boundsOf(mesh, 'neck');
    expect(min[1]).toBeCloseTo(body.positions.head[1], 6);
    expect(max[1]).toBeCloseTo(body.positions.head[1], 6);
    // The ring turns by half a side, so it has no corner at the sides.
    expect(max[0] - min[0]).toBeCloseTo(2 * 0.36 * Math.cos(Math.PI / 16) * H, 6);
  });

  it('makes a round pear torso with a full belly (design 4.5, spec 2.4)', () => {
    const { mesh, body } = variant({ form: {} });
    const spine = boundsOf(mesh, 'spine');
    // The torso is 1.28 H wide at the hips. The ring there has corners at the sides.
    expect(spine.max[0] - spine.min[0]).toBeCloseTo(1.28 * H, 6);
    // The ring of the hips has a corner at the front too: the belly, 1.16 times the half width.
    // The first belly was 1.08 times the half width.
    expect(body.positions.spine[2] - spine.min[2]).toBeCloseTo(1.16 * 0.64 * H, 6);
    // The back is 0.72 of the half width deep.
    expect(spine.max[2] - body.positions.spine[2]).toBeCloseTo(0.72 * 0.64 * H, 6);
  });

  it('makes the torso of a large species 1.25 and of a medium one 1.1 times wider (design 4.5)', () => {
    // The plump factor acts in full on the width of the hips and by half on the depth of the back.
    for (const [size, plump] of [
      [1.35, 1.25],
      [1.1, 1.1],
      [1, 1],
    ] as const) {
      const { mesh, body } = variant({ size, form: {} });
      const h = H * size;
      const spine = boundsOf(mesh, 'spine');
      expect(spine.max[0] - spine.min[0], `size ${size}`).toBeCloseTo(1.28 * plump * h, 6);
      expect(spine.max[2] - body.positions.spine[2], `size ${size}`).toBeCloseTo(
        0.72 * 0.64 * (1 + (plump - 1) / 2) * h,
        6,
      );
    }
    // A species can give its own factor.
    expect(plumpOf({ ...SPECIES.bear, form: { plump: 1.1 } })).toBe(1.1);
  });

  it('fills the shoulders and the space under the chin, so that no neck shows (spec 2.4)', () => {
    const { mesh, body } = variant({});
    // The half width of the torso at a height above the seat: the largest x of the chest
    // triangles that cross the height.
    const halfWidthAt = (y: number): number => {
      let widest = 0;
      for (let t = 0; t < mesh.bones.length / 3; t++) {
        const ys = [0, 1, 2].map((k) => mesh.positions[t * 9 + k * 3 + 1] ?? 0);
        if (
          mesh.bones[t * 3] === boneIndex('chest') &&
          Math.min(...ys) <= y &&
          Math.max(...ys) >= y
        ) {
          for (let k = 0; k < 3; k++) {
            widest = Math.max(widest, mesh.positions[t * 9 + k * 3] ?? 0);
          }
        }
      }
      return widest;
    };
    // The torso is 0.5 H wide at the shoulder joints, so the dome of each arm reaches 0.15 H
    // into it, and 0.45 H at 1.2 H, where the first torso was 0.34 H.
    expect(halfWidthAt(SEAT + 0.98 * H)).toBeGreaterThanOrEqual(0.5 * H - 1e-6);
    expect(halfWidthAt(SEAT + 1.2 * H)).toBeGreaterThanOrEqual(0.45 * H - 1e-6);
    // The chest ring of 0.45 H at 1.2 H joins the neck ring 0.1 H higher, so no neck tube shows.
    expect(body.positions.head[1] - topOf(mesh, 'chest')).toBeCloseTo(0.1 * H, 6);
  });

  it('gives each species its forms within their limits (design 4.3, spec 2.5)', () => {
    for (const [id, species] of Object.entries<SpeciesParams>(SPECIES)) {
      const form = species.form ?? {};
      // No species has a thin neck, and no brow is larger than 0.08 H.
      expect(form.neck ?? DEFAULT_NECK, id).toBeGreaterThanOrEqual(MIN_NECK);
      expect(form.brow ?? 0, id).toBeLessThanOrEqual(MAX_BROW);
      expect(form.belly ?? DEFAULT_BELLY, id).toBeGreaterThanOrEqual(1);
    }
    // The heavy and the bear groups have the full bellies of the polished images, and the foxes
    // and the deer the slim chests of animals.webp.
    expect(SPECIES.bear.form?.belly ?? 0).toBeGreaterThan(DEFAULT_BELLY);
    expect(SPECIES['fox-red'].form?.belly ?? Infinity).toBeLessThan(DEFAULT_BELLY);
  });

  it('moves the brow forward, scales the belly, and sizes the neck ring of a species', () => {
    const plain = variant({ form: {} });
    const formed = variant({ form: { brow: 0.06, belly: 1.3, neck: 0.4 } });
    // The front of the trunk grid at the height of a ring: the smallest z of its corners.
    const front = (mesh: MeshData, y: number): number => {
      const grid = new Set((['spine', 'head'] as const).map(boneIndex));
      let z = Infinity;
      for (let v = 0; v < mesh.bones.length; v++) {
        if (
          grid.has(mesh.bones[v] ?? -1) &&
          Math.abs((mesh.positions[v * 3 + 1] ?? 0) - y) < 1e-6
        ) {
          z = Math.min(z, mesh.positions[v * 3 + 2] ?? 0);
        }
      }
      return z;
    };
    // The ring 0.16 H above the head center is 0.06 H further forward.
    const brow = plain.body.headCenter[1] + 0.16 * H;
    expect(front(plain.mesh, brow) - front(formed.mesh, brow)).toBeCloseTo(0.06 * H, 6);
    // The belly ring at 0.3 H bulges to 1.3 of the half width.
    expect(plain.body.positions.spine[2] - front(formed.mesh, SEAT + 0.3 * H)).toBeCloseTo(
      1.3 * 0.64 * H,
      6,
    );
    // The neck ring is 0.4 H wide on each side.
    const neck = boundsOf(formed.mesh, 'neck');
    expect(neck.max[0]).toBeCloseTo(0.4 * Math.cos(Math.PI / 16) * H, 6);
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
